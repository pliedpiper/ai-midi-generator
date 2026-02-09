"use client";

import React from "react";
import type { SavedGeneration, SnapOptions } from "@/types";
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

export const useGenerationsPage = () => {
  const [generations, setGenerations] = React.useState<SavedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [expandedGenerationId, setExpandedGenerationId] = React.useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const [promptQuery, setPromptQuery] = React.useState("");
  const [sortOption, setSortOption] = React.useState<GenerationSortOption>("newest");
  const [expandedPromptIds, setExpandedPromptIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const visibleGenerations = React.useMemo(() => {
    if (promptQuery.trim().length > 0) {
      return searchGenerations(generations, promptQuery);
    }
    return sortGenerations(generations, sortOption);
  }, [generations, promptQuery, sortOption]);

  const loadGenerations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generations", { cache: "no-store" });
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
      const payload = data as { generations?: unknown };
      const items = Array.isArray(payload.generations) ? payload.generations : [];
      setGenerations(items as SavedGeneration[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load generations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadGenerations();
  }, [loadGenerations]);

  React.useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  React.useEffect(() => {
    if (playingId === null) return;
    const activeGeneration = generations.find((item) => item.id === playingId);
    if (!activeGeneration) return;

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
    const hasExpandedGeneration = generations.some((item) => item.id === expandedGenerationId);
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

  const handlePlayToggle = async (generation: SavedGeneration) => {
    if (playingId === generation.id) {
      stopPlayback();
      setPlayingId(null);
      setCurrentBeat(0);
      return;
    }

    try {
      await playComposition(generation.composition, getSnapOptions(generation));
      setPlayingId(generation.id);
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

  const handleDownload = (generation: SavedGeneration) => {
    const blob = generateMidiBlob(generation.composition, getSnapOptions(generation));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildMidiDownloadFilename({
      title: generation.title || generation.composition?.title,
      key: generation.composition?.key,
      tempo: generation.composition?.tempo,
      fallbackTitle: `generation-${generation.attempt_index || generation.id}`,
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    generations.find((item) => item.id === expandedGenerationId) ?? null;

  return {
    loading,
    error,
    generations,
    visibleGenerations,
    playingId,
    deletingId,
    expandedGenerationId,
    expandedGeneration,
    currentBeat,
    promptQuery,
    sortOption,
    expandedPromptIds,
    setPromptQuery,
    setSortOption,
    setExpandedGenerationId,
    handlePlayToggle,
    handleDelete,
    handleDownload,
    togglePromptExpansion,
    handleStopPlayback,
  };
};
