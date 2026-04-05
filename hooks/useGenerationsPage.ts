"use client";

import React from "react";
import type { SavedGeneration } from "@/types";
import { stopPlayback } from "@/utils/midiUtils";
import { getErrorMessageFromResponse } from "@/utils/http";
import { downloadMidiComposition } from "@/utils/midiDownload";
import {
  hasComposition,
  type SavedGenerationWithComposition,
} from "@/hooks/generations/normalizeGeneration";
import { useGenerationDetails } from "@/hooks/generations/useGenerationDetails";
import { useGenerationsCollection } from "@/hooks/generations/useGenerationsCollection";
import { useGenerationsPlayback } from "@/hooks/generations/useGenerationsPlayback";

export const useGenerationsPage = () => {
  const {
    generations,
    setGenerations,
    loading,
    loadingMore,
    hasMore,
    error,
    setError,
    promptQuery,
    setPromptQuery,
    activeSearchQuery,
    sortOption,
    setSortOption,
    visibleGenerations,
    expandedPromptIds,
    togglePromptExpansion,
    handleLoadMore,
  } = useGenerationsCollection();

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [expandedGenerationId, setExpandedGenerationId] = React.useState<string | null>(null);

  const { ensureCompositionLoaded, clearDetailRequests } = useGenerationDetails({
    setGenerations,
  });

  const {
    playingId,
    currentBeat,
    handlePlayToggle,
    handleStopPlayback,
    stopAndResetPlayback,
  } = useGenerationsPlayback({
    generations,
    visibleGenerations,
    ensureCompositionLoaded,
    setError,
  });

  React.useEffect(() => {
    return () => {
      stopPlayback();
      clearDetailRequests();
    };
  }, [clearDetailRequests]);

  React.useEffect(() => {
    if (expandedGenerationId === null) return;
    const hasExpandedGeneration = generations.some(
      (item) => item.id === expandedGenerationId && item.composition
    );
    if (!hasExpandedGeneration) {
      setExpandedGenerationId(null);
    }
  }, [generations, expandedGenerationId]);

  const handleDelete = React.useCallback(
    async (generationId: string) => {
      setDeletingId(generationId);
      setError(null);
      try {
        const response = await fetch(`/api/generations/${generationId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const message = await getErrorMessageFromResponse(
            response,
            "Failed to delete generation."
          );
          throw new Error(message);
        }

        if (playingId === generationId) {
          stopAndResetPlayback();
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
    },
    [playingId, setError, setGenerations, stopAndResetPlayback]
  );

  const handleDownload = React.useCallback(
    async (generation: SavedGeneration) => {
      try {
        const downloadableGeneration = await ensureCompositionLoaded(generation);
        if (!downloadableGeneration.composition) {
          throw new Error("Generation has no composition data.");
        }

        await downloadMidiComposition({
          composition: downloadableGeneration.composition,
          title: downloadableGeneration.title,
          fallbackTitle: `generation-${
            downloadableGeneration.attempt_index || downloadableGeneration.id
          }`,
        });
      } catch (downloadError) {
        setError(
          downloadError instanceof Error
            ? downloadError.message
            : "Failed to download generation."
        );
      }
    },
    [ensureCompositionLoaded, setError]
  );

  const handleExpand = React.useCallback(
    async (generationId: string) => {
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
    },
    [ensureCompositionLoaded, generations, setError]
  );

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
    activeSearchQuery,
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
