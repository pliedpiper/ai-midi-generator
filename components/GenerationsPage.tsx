"use client";

import React from "react";
import { Loader2, Search } from "lucide-react";
import { getHighlightParts, type GenerationSortOption } from "@/utils/generationListUtils";
import AppHeader from "./AppHeader";
import ExpandedGenerationModal from "./ExpandedGenerationModal";
import GenerationCard from "@/components/generations/GenerationCard";
import { useGenerationsPage } from "@/hooks/useGenerationsPage";

interface GenerationsPageProps {
  userEmail: string;
}

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
  const state = useGenerationsPage();

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary md:flex">
      <AppHeader userEmail={userEmail} />

      <main className="flex-1 px-4 py-8 md:px-10 md:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-medium">My Generations</h1>
            <p className="text-sm text-text-secondary mt-1">
              Saved outputs are attached to your account and available across sessions.
            </p>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Search saved generations</span>
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  value={state.promptQuery}
                  onChange={(event) => state.setPromptQuery(event.target.value)}
                  placeholder="Search title, prompt, model, key, or date..."
                  className="w-full bg-surface-800 border border-surface-600 rounded pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent outline-none transition-colors"
                />
              </label>

              <label className="md:w-60">
                <span className="sr-only">Sort generations</span>
                <select
                  value={state.sortOption}
                  onChange={(event) =>
                    state.setSortOption(event.target.value as GenerationSortOption)
                  }
                  disabled={state.promptQuery.trim().length > 0}
                  className={`w-full border rounded px-3 py-2 text-sm outline-none transition-colors ${
                    state.promptQuery.trim().length > 0
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

            {!state.loading && state.generations.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-text-muted">
                  Showing {state.visibleGenerations.length} of {state.generations.length}
                </p>
                {state.activeSearchQuery.trim().length > 0 && (
                  <p className="text-xs text-text-muted">
                    Search results are ranked by relevance, then recency.
                  </p>
                )}
                {state.activeSearchQuery.trim().length > 0 && state.hasMore && (
                  <p className="text-xs text-text-muted">
                    Searching your full library. Load more to continue.
                  </p>
                )}
              </div>
            )}
          </div>

          {state.error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {state.error}
            </div>
          )}

          {state.loading ? (
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading generations...
            </div>
          ) : state.generations.length === 0 ? (
            <div className="px-4 py-6 border border-surface-600 rounded bg-surface-800 text-sm text-text-secondary">
              No saved generations yet.
            </div>
          ) : state.visibleGenerations.length === 0 ? (
            <div className="px-4 py-6 border border-surface-600 rounded bg-surface-800 text-sm text-text-secondary">
              No generations match that prompt search.
            </div>
          ) : (
            <div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.visibleGenerations.map((generation) => (
                  <GenerationCard
                    key={generation.id}
                    generation={generation}
                    promptQuery={state.promptQuery}
                    isPlaying={state.playingId === generation.id}
                    isDeleting={state.deletingId === generation.id}
                    isPromptExpanded={state.expandedPromptIds.has(generation.id)}
                    onTogglePromptExpand={state.togglePromptExpansion}
                    onPlayToggle={(item) => {
                      void state.handlePlayToggle(item);
                    }}
                    onDownload={state.handleDownload}
                    onExpand={state.setExpandedGenerationId}
                    onDelete={(id) => {
                      void state.handleDelete(id);
                    }}
                    renderHighlightedText={renderHighlightedText}
                  />
                ))}
              </div>

              {state.hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      void state.handleLoadMore();
                    }}
                    disabled={state.loadingMore}
                    className={`rounded border px-4 py-2 text-sm transition-colors ${
                      state.loadingMore
                        ? "cursor-not-allowed border-surface-600 bg-surface-700 text-text-muted"
                        : "border-surface-600 bg-surface-800 text-text-primary hover:border-surface-500 hover:bg-surface-700"
                    }`}
                  >
                    {state.loadingMore
                      ? "Loading..."
                      : state.activeSearchQuery.trim().length > 0
                        ? "Load more matches"
                        : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ExpandedGenerationModal
        generation={state.expandedGeneration}
        isOpen={state.expandedGeneration !== null}
        isPlaying={state.expandedGeneration?.id === state.playingId}
        currentBeat={state.expandedGeneration?.id === state.playingId ? state.currentBeat : 0}
        onClose={() => state.setExpandedGenerationId(null)}
        onPlay={() => {
          if (state.expandedGeneration) {
            void state.handlePlayToggle(state.expandedGeneration);
          }
        }}
        onStop={state.handleStopPlayback}
        onDownload={() => {
          if (state.expandedGeneration) {
            state.handleDownload(state.expandedGeneration);
          }
        }}
      />
    </div>
  );
};

export default GenerationsPage;
