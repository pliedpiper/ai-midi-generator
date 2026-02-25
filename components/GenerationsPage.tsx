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
    <div className="relative min-h-screen overflow-hidden bg-surface-900 text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgb(var(--surface-700)_/_0.5),transparent_35%),radial-gradient(circle_at_88%_14%,rgb(var(--accent)_/_0.12),transparent_32%),linear-gradient(135deg,rgb(var(--surface-900))_0%,rgb(var(--surface-800))_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-500/50 to-transparent" />
      </div>

      <AppHeader userEmail={userEmail} variant="compact" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-28 sm:px-6 md:px-8 md:pt-32">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 rounded-[2rem] border border-surface-600/70 bg-surface-900/55 px-5 py-7 backdrop-blur-xl sm:px-8 md:px-10">
            <h1 className="text-3xl font-medium sm:text-4xl">My Generations</h1>
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
                  className="w-full rounded-xl border border-surface-600 bg-surface-800 pl-9 pr-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
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
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
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
                    Search results are filtered server-side and ranked by relevance.
                  </p>
                )}
                {state.activeSearchQuery.trim().length > 0 && state.hasMore && (
                  <p className="text-xs text-text-muted">
                    Load more to keep searching older generations.
                  </p>
                )}
              </div>
            )}
          </div>

          {state.error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          {state.loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-surface-600/70 bg-surface-800/60 px-4 py-3 text-sm text-text-secondary">
              <Loader2 size={16} className="animate-spin" />
              Loading generations...
            </div>
          ) : state.generations.length === 0 ? (
            <div className="rounded-2xl border border-surface-600/70 bg-surface-800/60 px-4 py-6 text-sm text-text-secondary backdrop-blur-sm">
              No saved generations yet.
            </div>
          ) : state.visibleGenerations.length === 0 ? (
            <div className="rounded-2xl border border-surface-600/70 bg-surface-800/60 px-4 py-6 text-sm text-text-secondary backdrop-blur-sm">
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
                    onDownload={(item) => {
                      void state.handleDownload(item);
                    }}
                    onExpand={(id) => {
                      void state.handleExpand(id);
                    }}
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
                    className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
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
            void state.handleDownload(state.expandedGeneration);
          }
        }}
      />
    </div>
  );
};

export default GenerationsPage;
