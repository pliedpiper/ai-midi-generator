"use client";

import React from "react";
import type { SavedGeneration } from "@/types";
import {
  searchGenerations,
  sortGenerations,
  type GenerationSortOption,
} from "@/utils/generationListUtils";
import { getErrorMessageFromResponse } from "@/utils/http";
import {
  normalizeGeneration,
  type GenerationPagePayload,
} from "@/hooks/generations/normalizeGeneration";

const PAGE_SIZE = 50;

type LoadGenerationsInput = {
  offset: number;
  append: boolean;
  query: string;
};

type UseGenerationsCollectionResult = {
  generations: SavedGeneration[];
  setGenerations: React.Dispatch<React.SetStateAction<SavedGeneration[]>>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  nextOffset: number | null;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  promptQuery: string;
  setPromptQuery: React.Dispatch<React.SetStateAction<string>>;
  activeSearchQuery: string;
  sortOption: GenerationSortOption;
  setSortOption: React.Dispatch<React.SetStateAction<GenerationSortOption>>;
  visibleGenerations: SavedGeneration[];
  expandedPromptIds: Set<string>;
  togglePromptExpansion: (generationId: string) => void;
  loadGenerations: (input: LoadGenerationsInput) => Promise<void>;
  handleLoadMore: () => Promise<void>;
};

export const useGenerationsCollection = (): UseGenerationsCollectionResult => {
  const requestCounterRef = React.useRef(0);
  const [generations, setGenerations] = React.useState<SavedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [nextOffset, setNextOffset] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [promptQuery, setPromptQuery] = React.useState("");
  const deferredPromptQuery = React.useDeferredValue(promptQuery);
  const [sortOption, setSortOption] = React.useState<GenerationSortOption>("newest");
  const [expandedPromptIds, setExpandedPromptIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const visibleGenerations = React.useMemo(() => {
    if (deferredPromptQuery.trim().length > 0) {
      return searchGenerations(generations, deferredPromptQuery);
    }
    return sortGenerations(generations, sortOption);
  }, [deferredPromptQuery, generations, sortOption]);

  const loadGenerations = React.useCallback(
    async ({ offset, append, query }: LoadGenerationsInput) => {
      const normalizedQuery = query.trim();
      const requestId = requestCounterRef.current + 1;
      requestCounterRef.current = requestId;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLoadingMore(false);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (normalizedQuery.length > 0) {
          params.set("q", normalizedQuery);
        }

        const response = await fetch(`/api/generations?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const message = await getErrorMessageFromResponse(
            response,
            "Failed to load generations."
          );
          throw new Error(message);
        }

        const data: unknown = await response.json();
        const payload = data as GenerationPagePayload;
        const items = Array.isArray(payload.generations) ? payload.generations : [];
        const mappedItems = items
          .map((item) => normalizeGeneration(item))
          .filter((item): item is SavedGeneration => item !== null);

        if (requestCounterRef.current !== requestId) {
          return;
        }

        setGenerations((prev) => {
          const existingById = new Map(prev.map((item) => [item.id, item]));

          const mergedIncoming = mappedItems.map((item) => {
            const existing = existingById.get(item.id);
            if (!existing) {
              return item;
            }

            return {
              ...item,
              composition: item.composition ?? existing.composition,
              composition_key: item.composition_key ?? existing.composition_key ?? null,
              track_count: item.track_count ?? existing.track_count ?? null,
              duration_beats: item.duration_beats ?? existing.duration_beats ?? null,
            };
          });

          if (!append) {
            return mergedIncoming;
          }

          const seen = new Set(prev.map((item) => item.id));
          const deduped = mergedIncoming.filter((item) => !seen.has(item.id));
          return [...prev, ...deduped];
        });

        const pageInfo = payload.pagination ?? {};
        setHasMore(pageInfo.hasMore === true);
        setNextOffset(
          typeof pageInfo.nextOffset === "number" && Number.isFinite(pageInfo.nextOffset)
            ? pageInfo.nextOffset
            : null
        );
      } catch (loadError) {
        if (requestCounterRef.current !== requestId) {
          return;
        }
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load generations."
        );
      } finally {
        if (requestCounterRef.current !== requestId) {
          return;
        }

        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  React.useEffect(() => {
    void loadGenerations({ offset: 0, append: false, query: deferredPromptQuery });
  }, [deferredPromptQuery, loadGenerations]);

  const handleLoadMore = React.useCallback(async () => {
    if (!hasMore || nextOffset === null || loadingMore) {
      return;
    }

    await loadGenerations({
      offset: nextOffset,
      append: true,
      query: deferredPromptQuery,
    });
  }, [deferredPromptQuery, hasMore, loadGenerations, loadingMore, nextOffset]);

  const togglePromptExpansion = React.useCallback((generationId: string) => {
    setExpandedPromptIds((prev) => {
      const next = new Set(prev);
      if (next.has(generationId)) {
        next.delete(generationId);
      } else {
        next.add(generationId);
      }
      return next;
    });
  }, []);

  return {
    generations,
    setGenerations,
    loading,
    loadingMore,
    hasMore,
    nextOffset,
    error,
    setError,
    promptQuery,
    setPromptQuery,
    activeSearchQuery: deferredPromptQuery,
    sortOption,
    setSortOption,
    visibleGenerations,
    expandedPromptIds,
    togglePromptExpansion,
    loadGenerations,
    handleLoadMore,
  };
};
