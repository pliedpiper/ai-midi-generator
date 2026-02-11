"use client";

import React from "react";
import type { MidiComposition, SavedGeneration, SnapOptions } from "@/types";
import {
  generateMidiBlob,
  getTransportBeatPosition,
  playComposition,
  stopPlayback,
} from "@/utils/midiUtils";
import { buildMidiDownloadFilename } from "@/utils/downloadFilename";
import {
  searchGenerations,
  sortGenerations,
  type GenerationSortOption,
} from "@/utils/generationListUtils";
import { parseKeyString } from "@/utils/scaleUtils";

const PAGE_SIZE = 50;

const calculateDurationBeats = (composition: MidiComposition): number =>
  composition.tracks.reduce((trackMax, track) => {
    const noteMax = track.notes.reduce(
      (noteEndMax, note) =>
        Math.max(noteEndMax, note.time + Math.max(note.duration, 0.001)),
      0
    );
    return Math.max(trackMax, noteMax);
  }, 0);

const getSnapOptions = (generation: SavedGeneration): SnapOptions | undefined => {
  const prefs = generation.prefs;
  if (!prefs) return undefined;

  if (prefs.key === null) {
    const parsed = parseKeyString(generation.composition?.key ?? "");
    if (parsed) {
      return {
        scaleRoot: parsed.scaleRoot,
        scaleType: parsed.scaleType,
      };
    }
  }

  const scaleRoot = typeof prefs.scaleRoot === "number" ? prefs.scaleRoot : 0;
  const scaleType = typeof prefs.scaleType === "string" ? prefs.scaleType : "major";

  return { scaleRoot, scaleType };
};

type GenerationPagePayload = {
  generations?: unknown;
  pagination?: {
    hasMore?: unknown;
    nextOffset?: unknown;
  };
};

type GenerationDetailPayload = {
  generation?: unknown;
};

type SavedGenerationWithComposition = SavedGeneration & { composition: MidiComposition };

const hasComposition = (
  generation: SavedGeneration
): generation is SavedGenerationWithComposition =>
  generation.composition !== null;

const normalizeGeneration = (raw: unknown): SavedGeneration | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<SavedGeneration>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.model !== "string" ||
    typeof candidate.attempt_index !== "number" ||
    !candidate.prefs ||
    typeof candidate.prefs !== "object" ||
    typeof candidate.created_at !== "string"
  ) {
    return null;
  }

  const composition =
    candidate.composition && typeof candidate.composition === "object"
      ? (candidate.composition as MidiComposition)
      : null;

  return {
    id: candidate.id,
    title: candidate.title,
    model: candidate.model,
    attempt_index: candidate.attempt_index,
    prefs: candidate.prefs as SavedGeneration["prefs"],
    composition,
    composition_key:
      typeof candidate.composition_key === "string"
        ? candidate.composition_key
        : composition?.key ?? null,
    track_count:
      typeof candidate.track_count === "number" && Number.isFinite(candidate.track_count)
        ? Math.max(0, Math.round(candidate.track_count))
        : composition
          ? composition.tracks.length
          : null,
    duration_beats:
      typeof candidate.duration_beats === "number" && Number.isFinite(candidate.duration_beats)
        ? Math.max(0, candidate.duration_beats)
        : composition
          ? calculateDurationBeats(composition)
          : null,
    created_at: candidate.created_at,
  };
};

export const useGenerationsPage = () => {
  const requestCounterRef = React.useRef(0);
  const detailRequestsRef = React.useRef<Map<string, Promise<SavedGeneration>>>(
    new Map()
  );
  const [generations, setGenerations] = React.useState<SavedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [nextOffset, setNextOffset] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [expandedGenerationId, setExpandedGenerationId] = React.useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = React.useState(0);
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

  const loadGenerations = React.useCallback(async (
    offset: number,
    append: boolean,
    query: string
  ) => {
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
        const data: unknown = await response.json().catch(() => ({}));
        const payload = data as { error?: unknown };
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Failed to load generations.";
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
  }, []);

  React.useEffect(() => {
    void loadGenerations(0, false, deferredPromptQuery);
  }, [deferredPromptQuery, loadGenerations]);

  React.useEffect(() => {
    const detailRequests = detailRequestsRef.current;
    return () => {
      stopPlayback();
      detailRequests.clear();
    };
  }, []);

  React.useEffect(() => {
    if (playingId === null) return;
    const activeGeneration = generations.find((item) => item.id === playingId);
    if (!activeGeneration?.composition) return;

    let animationFrame = 0;
    const tempo = activeGeneration.composition.tempo;
    const maxBeat = activeGeneration.composition.tracks.reduce((trackMax, track) => {
      const noteMax = track.notes.reduce(
        (noteEndMax, note) =>
          Math.max(noteEndMax, note.time + Math.max(note.duration, 0.001)),
        0
      );
      return Math.max(trackMax, noteMax);
    }, 0);

    const updateBeat = () => {
      const beat = getTransportBeatPosition(tempo);
      setCurrentBeat(beat);

      if (beat >= maxBeat + 0.05) {
        stopPlayback();
        setPlayingId(null);
        setCurrentBeat(0);
        return;
      }

      animationFrame = requestAnimationFrame(updateBeat);
    };

    animationFrame = requestAnimationFrame(updateBeat);
    return () => cancelAnimationFrame(animationFrame);
  }, [playingId, generations]);

  React.useEffect(() => {
    if (expandedGenerationId === null) return;
    const hasExpandedGeneration = generations.some(
      (item) => item.id === expandedGenerationId && item.composition
    );
    if (!hasExpandedGeneration) {
      setExpandedGenerationId(null);
    }
  }, [generations, expandedGenerationId]);

  React.useEffect(() => {
    if (playingId === null) return;
    const isVisible = visibleGenerations.some((item) => item.id === playingId);
    if (!isVisible) {
      stopPlayback();
      setPlayingId(null);
      setCurrentBeat(0);
    }
  }, [playingId, visibleGenerations]);

  const ensureCompositionLoaded = React.useCallback(
    async (generation: SavedGeneration): Promise<SavedGeneration> => {
      if (generation.composition) {
        return generation;
      }

      const existingRequest = detailRequestsRef.current.get(generation.id);
      if (existingRequest) {
        return existingRequest;
      }

      const request = (async () => {
        const response = await fetch(`/api/generations/${generation.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const data: unknown = await response.json().catch(() => ({}));
          const payload = data as { error?: unknown };
          const message =
            typeof payload.error === "string"
              ? payload.error
              : "Failed to load generation details.";
          throw new Error(message);
        }

        const data: unknown = await response.json();
        const payload = data as GenerationDetailPayload;
        const normalized = normalizeGeneration(payload.generation);
        if (!normalized?.composition) {
          throw new Error("Generation details are missing composition data.");
        }
        const fullComposition = normalized.composition;

        setGenerations((prev) =>
          prev.map((item) =>
            item.id === generation.id
              ? {
                  ...item,
                  ...normalized,
                  composition: fullComposition,
                  composition_key:
                    normalized.composition_key ?? fullComposition.key,
                  track_count:
                    normalized.track_count ?? fullComposition.tracks.length,
                  duration_beats:
                    normalized.duration_beats ??
                    calculateDurationBeats(fullComposition),
                }
              : item
          )
        );

        return {
          ...generation,
          ...normalized,
          composition: fullComposition,
          composition_key: normalized.composition_key ?? fullComposition.key,
          track_count: normalized.track_count ?? fullComposition.tracks.length,
          duration_beats:
            normalized.duration_beats ?? calculateDurationBeats(fullComposition),
        };
      })();

      detailRequestsRef.current.set(generation.id, request);
      try {
        return await request;
      } finally {
        detailRequestsRef.current.delete(generation.id);
      }
    },
    []
  );

  const handlePlayToggle = async (generation: SavedGeneration) => {
    if (playingId === generation.id) {
      stopPlayback();
      setPlayingId(null);
      setCurrentBeat(0);
      return;
    }

    try {
      const playableGeneration = await ensureCompositionLoaded(generation);
      if (!playableGeneration.composition) {
        throw new Error("Generation has no composition data.");
      }

      await playComposition(
        playableGeneration.composition,
        getSnapOptions(playableGeneration)
      );
      setPlayingId(playableGeneration.id);
      setCurrentBeat(0);
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "Playback failed.");
      setPlayingId(null);
      setCurrentBeat(0);
    }
  };

  const handleDelete = async (generationId: string) => {
    setDeletingId(generationId);
    setError(null);
    try {
      const response = await fetch(`/api/generations/${generationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const payload = data as { error?: unknown };
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Failed to delete generation.";
        throw new Error(message);
      }

      if (playingId === generationId) {
        stopPlayback();
        setPlayingId(null);
        setCurrentBeat(0);
      }

      setGenerations((prev) => prev.filter((item) => item.id !== generationId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete generation."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadMore = React.useCallback(async () => {
    if (!hasMore || nextOffset === null || loadingMore) {
      return;
    }

    await loadGenerations(nextOffset, true, deferredPromptQuery);
  }, [deferredPromptQuery, hasMore, loadGenerations, loadingMore, nextOffset]);

  const handleDownload = async (generation: SavedGeneration) => {
    try {
      const downloadableGeneration = await ensureCompositionLoaded(generation);
      if (!downloadableGeneration.composition) {
        throw new Error("Generation has no composition data.");
      }

      const blob = generateMidiBlob(
        downloadableGeneration.composition,
        getSnapOptions(downloadableGeneration)
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildMidiDownloadFilename({
        title:
          downloadableGeneration.title ||
          downloadableGeneration.composition?.title,
        key: downloadableGeneration.composition?.key,
        tempo: downloadableGeneration.composition?.tempo,
        fallbackTitle: `generation-${
          downloadableGeneration.attempt_index || downloadableGeneration.id
        }`,
      });
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download generation."
      );
    }
  };

  const handleExpand = async (generationId: string) => {
    const generation = generations.find((item) => item.id === generationId);
    if (!generation) {
      return;
    }

    setError(null);
    try {
      const expanded = await ensureCompositionLoaded(generation);
      if (!expanded.composition) {
        throw new Error("Generation has no composition data.");
      }
      setExpandedGenerationId(expanded.id);
    } catch (expandError) {
      setError(
        expandError instanceof Error
          ? expandError.message
          : "Failed to open generation details."
      );
    }
  };

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

  const handleStopPlayback = React.useCallback(() => {
    stopPlayback();
    setPlayingId(null);
    setCurrentBeat(0);
  }, []);

  const expandedGeneration =
    generations.find(
      (item): item is SavedGenerationWithComposition =>
        item.id === expandedGenerationId && hasComposition(item)
    ) ?? null;

  return {
    loading,
    loadingMore,
    hasMore,
    error,
    generations,
    visibleGenerations,
    playingId,
    deletingId,
    expandedGenerationId,
    expandedGeneration,
    currentBeat,
    promptQuery,
    activeSearchQuery: deferredPromptQuery,
    sortOption,
    expandedPromptIds,
    setPromptQuery,
    setSortOption,
    setExpandedGenerationId,
    handleExpand,
    handleLoadMore,
    handlePlayToggle,
    handleDelete,
    handleDownload,
    togglePromptExpansion,
    handleStopPlayback,
  };
};
