"use client";

import React from "react";
import { Download, Expand, Loader2, Play, Square, Trash2 } from "lucide-react";
import type { SavedGeneration } from "@/types";
import { getCompositionKey, getPromptText } from "@/utils/generationListUtils";

const PROMPT_PREVIEW_LENGTH = 120;

interface GenerationCardProps {
  generation: SavedGeneration;
  promptQuery: string;
  isPlaying: boolean;
  isDeleting: boolean;
  isPromptExpanded: boolean;
  onTogglePromptExpand: (generationId: string) => void;
  onPlayToggle: (generation: SavedGeneration) => void;
  onDownload: (generation: SavedGeneration) => void;
  onExpand: (generationId: string) => void;
  onDelete: (generationId: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
}

const GenerationCard: React.FC<GenerationCardProps> = ({
  generation,
  promptQuery,
  isPlaying,
  isDeleting,
  isPromptExpanded,
  onTogglePromptExpand,
  onPlayToggle,
  onDownload,
  onExpand,
  onDelete,
  renderHighlightedText,
}) => {
  const title = generation.title || "Untitled";
  const key = getCompositionKey(generation);
  const promptText = getPromptText(generation) || "No prompt saved.";
  const createdAtText = new Date(generation.created_at).toLocaleString();
  const canExpandPrompt = promptText.length > PROMPT_PREVIEW_LENGTH;
  const promptPreviewText =
    canExpandPrompt && !isPromptExpanded
      ? `${promptText.slice(0, PROMPT_PREVIEW_LENGTH).trimEnd()}...`
      : promptText;

  return (
    <article className="bg-surface-800 border border-surface-600 rounded p-4 flex flex-col">
      <h2 className="text-sm font-medium line-clamp-2">
        {renderHighlightedText(title, promptQuery)}
      </h2>

      <div className="mt-2">
        <p className="text-xs text-text-secondary break-words" title={promptText}>
          Prompt: {renderHighlightedText(promptPreviewText, promptQuery)}
          {canExpandPrompt && (
            <button
              type="button"
              onClick={() => onTogglePromptExpand(generation.id)}
              aria-expanded={isPromptExpanded}
              aria-label={isPromptExpanded ? "Collapse full prompt" : "Expand full prompt"}
              className="ml-1 inline text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              {isPromptExpanded ? "[less]" : "[...]"}
            </button>
          )}
        </p>
      </div>

      <div className="mt-3 space-y-1 text-[11px] font-mono text-text-muted">
        <p>Model: {renderHighlightedText(generation.model, promptQuery)}</p>
        <p>Key: {renderHighlightedText(key, promptQuery)}</p>
        <p>{renderHighlightedText(createdAtText, promptQuery)}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onPlayToggle(generation)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
        >
          {isPlaying ? <Square size={13} /> : <Play size={13} />}
          {isPlaying ? "Stop" : "Play"}
        </button>

        <button
          type="button"
          onClick={() => onDownload(generation)}
          className="w-9 flex items-center justify-center rounded bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
          aria-label={`Download ${title || "generation"}`}
        >
          <Download size={14} />
        </button>

        <button
          type="button"
          onClick={() => onExpand(generation.id)}
          className="w-9 flex items-center justify-center rounded bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
          aria-label={`Expand ${title || "generation"}`}
        >
          <Expand size={14} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(generation.id)}
          disabled={isDeleting}
          className={`w-9 flex items-center justify-center rounded transition-colors ${
            isDeleting
              ? "bg-surface-700 text-text-muted cursor-not-allowed"
              : "bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300"
          }`}
          aria-label={`Delete ${title || "generation"}`}
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </article>
  );
};

export default GenerationCard;
