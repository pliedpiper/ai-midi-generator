"use client";

import React from "react";
import {
  Download,
  Expand,
  Loader2,
  Play,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import type { SavedGeneration, SnapOptions } from "@/types";
import {
  generateMidiBlob,
  getTransportBeatPosition,
  playComposition,
  stopPlayback,
} from "@/utils/midiUtils";
import { buildMidiDownloadFilename } from "@/utils/downloadFilename";
import {
  getHighlightParts,
  getPromptText,
  getCompositionKey,
  searchGenerations,
  sortGenerations,
  type GenerationSortOption,
} from "@/utils/generationListUtils";
import AppHeader from "./AppHeader";
import ExpandedGenerationModal from "./ExpandedGenerationModal";

interface GenerationsPageProps {
  userEmail: string;
}

const getSnapOptions = (
  generation: SavedGeneration,
): SnapOptions | undefined => {
  const prefs = generation.prefs;
  if (!prefs) return undefined;

  const scaleRoot = typeof prefs.scaleRoot === "number" ? prefs.scaleRoot : 0;
  const scaleType =
    typeof prefs.scaleType === "string" ? prefs.scaleType : "major";

  return {
    scaleRoot,
    scaleType,
  };
};

const SORT_OPTIONS: Array<{ value: GenerationSortOption; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest first" },
  { value: "shortest", label: "Shortest first" },
  { value: "mostTracks", label: "Most tracks" },
  { value: "fewestTracks", label: "Fewest tracks" },
  { value: "keyAsc", label: "Key (A-Z)" },
  { value: "keyDesc", label: "Key (Z-A)" },
];

const renderHighlightedText = (
  text: string,
  searchQuery: string,
): React.ReactNode =>
  getHighlightParts(text, searchQuery).map((part, index) =>
    part.matched ? (
      <mark
        key={`${part.text}-${index}`}
        className="bg-accent/20 text-text-primary rounded px-0.5"
      >
        {part.text}
      </mark>
    ) : (
      <React.Fragment key={`${part.text}-${index}`}>{part.text}</React.Fragment>
    ),
  );

const GenerationsPage: React.FC<GenerationsPageProps> = ({ userEmail }) => {
  const [generations, setGenerations] = React.useState<SavedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [expandedGenerationId, setExpandedGenerationId] = React.useState<
    string | null
  >(null);
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const [promptQuery, setPromptQuery] = React.useState("");
  const [sortOption, setSortOption] =
    React.useState<GenerationSortOption>("newest");
  const [expandedPromptIds, setExpandedPromptIds] = React.useState<Set<string>>(
    () => new Set(),
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
        const data = await response.json().catch(() => ({}));
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Failed to load generations.";
        throw new Error(message);
      }

      const data = await response.json();
      const items = Array.isArray(data?.generations) ? data.generations : [];
      setGenerations(items as SavedGeneration[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load generations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGenerations();
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

    let animationFrame: number;
    const tempo = activeGeneration.composition.tempo;
    const maxBeat = activeGeneration.composition.tracks.reduce(
      (trackMax, track) => {
        const noteMax = track.notes.reduce(
          (noteEndMax, note) =>
            Math.max(noteEndMax, note.time + Math.max(note.duration, 0.001)),
          0,
        );
        return Math.max(trackMax, noteMax);
      },
      0,
    );

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
      (item) => item.id === expandedGenerationId,
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
      setError(
        playError instanceof Error ? playError.message : "Playback failed.",
      );
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
        const data = await response.json().catch(() => ({}));
        const message =
          typeof data?.error === "string"
            ? data.error
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
          : "Failed to delete generation.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (generation: SavedGeneration) => {
    const blob = generateMidiBlob(
      generation.composition,
      getSnapOptions(generation),
    );
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

  const expandedGeneration =
    generations.find((item) => item.id === expandedGenerationId) ?? null;

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary md:flex">
      <AppHeader userEmail={userEmail} />

      <main className="flex-1 px-4 py-8 md:px-10 md:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-medium">My Generations</h1>
            <p className="text-sm text-text-secondary mt-1">
              Saved outputs are attached to your account and available across
              sessions.
            </p>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Search by prompt text</span>
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  value={promptQuery}
                  onChange={(event) => setPromptQuery(event.target.value)}
                  placeholder="Search by prompt text..."
                  className="w-full bg-surface-800 border border-surface-600 rounded pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent outline-none transition-colors"
                />
              </label>

              <label className="md:w-60">
                <span className="sr-only">Sort generations</span>
                <select
                  value={sortOption}
                  onChange={(event) =>
                    setSortOption(event.target.value as GenerationSortOption)
                  }
                  disabled={promptQuery.trim().length > 0}
                  className={`w-full border rounded px-3 py-2 text-sm outline-none transition-colors ${
                    promptQuery.trim().length > 0
                      ? "bg-surface-700 border-surface-600 text-text-muted cursor-not-allowed"
                      : "bg-surface-800 border-surface-600 text-text-primary focus:border-accent"
                  }`}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!loading && generations.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-text-muted">
                  Showing {visibleGenerations.length} of {generations.length}
                </p>
                {promptQuery.trim().length > 0 && (
                  <p className="text-xs text-text-muted">
                    Search results are ranked by relevance, then recency.
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading generations...
            </div>
          ) : generations.length === 0 ? (
            <div className="px-4 py-6 border border-surface-600 rounded bg-surface-800 text-sm text-text-secondary">
              No saved generations yet.
            </div>
          ) : visibleGenerations.length === 0 ? (
            <div className="px-4 py-6 border border-surface-600 rounded bg-surface-800 text-sm text-text-secondary">
              No generations match that prompt search.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleGenerations.map((generation) => {
                const title = generation.title || "Untitled";
                const key = getCompositionKey(generation);
                const promptText =
                  getPromptText(generation) || "No prompt saved.";
                const createdAtText = new Date(
                  generation.created_at,
                ).toLocaleString();
                const isPromptExpanded = expandedPromptIds.has(generation.id);
                const canExpandPrompt = promptText.length > 120;

                return (
                  <article
                    key={generation.id}
                    className="bg-surface-800 border border-surface-600 rounded p-4 flex flex-col"
                  >
                    <h2 className="text-sm font-medium line-clamp-2">
                      {renderHighlightedText(title, promptQuery)}
                    </h2>

                    <div className="mt-2">
                      <p
                        className={`text-xs text-text-secondary break-words ${
                          isPromptExpanded ? "" : "line-clamp-2"
                        }`}
                        title={promptText}
                      >
                        Prompt: {renderHighlightedText(promptText, promptQuery)}
                      </p>
                      {canExpandPrompt && (
                        <button
                          type="button"
                          onClick={() => togglePromptExpansion(generation.id)}
                          aria-expanded={isPromptExpanded}
                          className="mt-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
                        >
                          {isPromptExpanded ? "Show less" : "Show full prompt"}
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-[11px] font-mono text-text-muted">
                      <p>
                        Model:{" "}
                        {renderHighlightedText(generation.model, promptQuery)}
                      </p>
                      <p>Key: {renderHighlightedText(key, promptQuery)}</p>
                      <p>{renderHighlightedText(createdAtText, promptQuery)}</p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(generation)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                      >
                        {playingId === generation.id ? (
                          <Square size={13} />
                        ) : (
                          <Play size={13} />
                        )}
                        {playingId === generation.id ? "Stop" : "Play"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(generation)}
                        className="w-9 flex items-center justify-center rounded bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                        aria-label={`Download ${title || "generation"}`}
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedGenerationId(generation.id)}
                        className="w-9 flex items-center justify-center rounded bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                        aria-label={`Expand ${title || "generation"}`}
                      >
                        <Expand size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(generation.id)}
                        disabled={deletingId === generation.id}
                        className={`w-9 flex items-center justify-center rounded transition-colors ${
                          deletingId === generation.id
                            ? "bg-surface-700 text-text-muted cursor-not-allowed"
                            : "bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300"
                        }`}
                        aria-label={`Delete ${title || "generation"}`}
                      >
                        {deletingId === generation.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ExpandedGenerationModal
        generation={expandedGeneration}
        isOpen={expandedGeneration !== null}
        isPlaying={expandedGeneration?.id === playingId}
        currentBeat={expandedGeneration?.id === playingId ? currentBeat : 0}
        onClose={() => setExpandedGenerationId(null)}
        onPlay={() => {
          if (expandedGeneration) {
            void handlePlayToggle(expandedGeneration);
          }
        }}
        onStop={() => {
          stopPlayback();
          setPlayingId(null);
          setCurrentBeat(0);
        }}
        onDownload={() => {
          if (expandedGeneration) {
            handleDownload(expandedGeneration);
          }
        }}
      />
    </div>
  );
};

export default GenerationsPage;
