"use client";

import React, { useState, useCallback } from "react";
import {
  AttemptResult,
  GenerationStatus,
  UserPreferences,
  SnapOptions,
} from "../types";
import { generateAttempt } from "../services/openRouterService";
import {
  generateMidiBlob,
  stopPlayback,
  playComposition,
  PlaybackError,
  getTransportBeatPosition,
} from "../utils/midiUtils";
import { parseKeyString } from "../utils/scaleUtils";
import InputForm from "./InputForm";
import AttemptCard from "./AttemptCard";
import ExpandedAttemptModal from "./ExpandedAttemptModal";
import AppHeader from "./AppHeader";

interface GeneratorAppProps {
  userEmail: string;
  initialHasApiKey: boolean;
}

// Helper to extract snap options from preferences
const getSnapOptions = (
  prefs: UserPreferences | null,
  compositionKey?: string | null,
): SnapOptions | undefined => {
  if (!prefs) return undefined;

  if (prefs.key === null && typeof compositionKey === "string") {
    const parsed = parseKeyString(compositionKey);
    if (parsed) {
      return {
        scaleRoot: parsed.scaleRoot,
        scaleType: parsed.scaleType,
      };
    }
  }

  return { scaleRoot: prefs.scaleRoot, scaleType: prefs.scaleType };
};

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const MAX_PARALLEL_ATTEMPTS = 2;

const GeneratorApp: React.FC<GeneratorAppProps> = ({
  userEmail,
  initialHasApiKey,
}) => {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [lastPrefs, setLastPrefs] = useState<UserPreferences | null>(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(
    null,
  );
  const [currentBeat, setCurrentBeat] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [showApiKeyForm, setShowApiKeyForm] = useState(!initialHasApiKey);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // Initialize empty slots based on requested count
  const resetAttempts = (count: number) => {
    // Stop any playing audio before resetting
    stopPlayback();
    setAttempts(
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        status: "pending",
      })),
    );
    setPlayingId(null);
    setErrorMsg(null);
    setPlaybackError(null);
    setExpandedAttemptId(null);
    setCurrentBeat(0);
  };

  const handleSaveApiKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiKeyError(null);

    const normalized = apiKeyInput.trim();
    if (!normalized) {
      setApiKeyError("API key is required.");
      return;
    }

    setIsSavingApiKey(true);
    try {
      const response = await fetch("/api/user/openrouter-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: normalized }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Failed to save API key.";
        throw new Error(message);
      }

      setHasApiKey(true);
      setShowApiKeyForm(false);
      setApiKeyInput("");
    } catch (error) {
      setApiKeyError(
        error instanceof Error ? error.message : "Failed to save API key.",
      );
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleGenerate = async (prefs: UserPreferences) => {
    if (!hasApiKey) {
      setErrorMsg("Add your OpenRouter API key before generating.");
      setShowApiKeyForm(true);
      return;
    }

    setStatus(GenerationStatus.GENERATING);
    setLastPrefs(prefs);
    resetAttempts(prefs.attemptCount);
    const idempotencyKey = createIdempotencyKey();

    const attemptIds = Array.from({ length: prefs.attemptCount }, (_, i) => i + 1);
    const results: Array<{ id: number; success: boolean }> = [];
    let nextAttemptIndex = 0;

    const runAttempt = async (id: number) => {
      try {
        // Add small delay to avoid exact same microsecond timestamp seeds if logic relies on it
        await new Promise((r) => setTimeout(r, id * 100));

        const composition = await generateAttempt(id, prefs, idempotencyKey);
        const snapOptions = getSnapOptions(prefs, composition.key);
        const blob = generateMidiBlob(composition, snapOptions);

        setAttempts((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "success", data: composition, midiBlob: blob }
              : a,
          ),
        );
        return { id, success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate JSON";
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: "failed", error: message } : a,
          ),
        );
        return { id, success: false };
      }
    };

    const workerCount = Math.min(MAX_PARALLEL_ATTEMPTS, attemptIds.length);
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextAttemptIndex < attemptIds.length) {
          const id = attemptIds[nextAttemptIndex];
          nextAttemptIndex += 1;
          const result = await runAttempt(id);
          results.push(result);
        }
      }),
    );

    const successfulAttempts = results.filter((r) => r.success);

    if (successfulAttempts.length === 0) {
      setStatus(GenerationStatus.ERROR);
      setErrorMsg(
        "All generation attempts failed. Please try a simpler prompt.",
      );
    } else {
      setStatus(GenerationStatus.COMPLETED);
    }
  };

  // Handle playback with proper error handling - only set playingId after success
  const handlePlay = useCallback(
    async (id: number, attempt: AttemptResult) => {
      if (!attempt.data) return;

      // Clear any previous playback error
      setPlaybackError(null);

      const snapOptions = getSnapOptions(lastPrefs, attempt.data.key);

      try {
        await playComposition(attempt.data, snapOptions);
        // Only set playingId after playback successfully starts
        setPlayingId(id);
        setCurrentBeat(0);
      } catch (err) {
        // Playback failed - ensure cleanup
        stopPlayback();
        setPlayingId(null);
        setCurrentBeat(0);

        const message =
          err instanceof PlaybackError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Playback failed";

        setPlaybackError(message);
      }
    },
    [lastPrefs],
  );

  const handleStop = useCallback(() => {
    stopPlayback();
    setPlayingId(null);
    setCurrentBeat(0);
    setPlaybackError(null);
  }, []);

  React.useEffect(() => {
    if (playingId === null) return;
    const activeAttempt = attempts.find((a) => a.id === playingId);
    if (!activeAttempt?.data) return;

    let animationFrame: number;
    const tempo = activeAttempt.data.tempo;
    const maxBeat = activeAttempt.data.tracks.reduce((trackMax, track) => {
      const noteMax = track.notes.reduce(
        (noteEndMax, note) =>
          Math.max(noteEndMax, note.time + Math.max(note.duration, 0.001)),
        0,
      );
      return Math.max(trackMax, noteMax);
    }, 0);

    const updateBeat = () => {
      const beat = getTransportBeatPosition(tempo);
      setCurrentBeat(beat);

      if (beat >= maxBeat + 0.05) {
        handleStop();
        return;
      }

      animationFrame = requestAnimationFrame(updateBeat);
    };

    animationFrame = requestAnimationFrame(updateBeat);
    return () => cancelAnimationFrame(animationFrame);
  }, [playingId, attempts, handleStop]);

  React.useEffect(() => {
    if (expandedAttemptId === null) return;
    const hasExpandedAttempt = attempts.some(
      (attempt) =>
        attempt.id === expandedAttemptId && attempt.status === "success",
    );
    if (!hasExpandedAttempt) {
      setExpandedAttemptId(null);
    }
  }, [attempts, expandedAttemptId]);

  const expandedAttempt =
    attempts.find(
      (attempt) =>
        attempt.id === expandedAttemptId && attempt.status === "success",
    ) ?? null;

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary md:flex">
      <AppHeader userEmail={userEmail} />

      <main className="flex-1 px-4 py-8 md:px-10 md:py-12">
        <div className="max-w-5xl mx-auto">
          {showApiKeyForm && (
            <section className="max-w-xl mx-auto mb-12">
              <div className="bg-surface-800 border border-surface-600 rounded-lg p-6">
                <h2 className="text-lg font-medium mb-2">
                  {hasApiKey
                    ? "Update OpenRouter API Key"
                    : "Add OpenRouter API Key"}
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  {hasApiKey
                    ? "Replace the API key used for generation on your account."
                    : "Generation is disabled until you add your OpenRouter API key."}
                </p>

                <form onSubmit={handleSaveApiKey} className="space-y-3">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(event) => setApiKeyInput(event.target.value)}
                    placeholder="sk-or-..."
                    className="w-full bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSavingApiKey}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        isSavingApiKey
                          ? "bg-surface-700 text-text-muted cursor-not-allowed"
                          : "bg-accent text-surface-900 hover:bg-accent-hover"
                      }`}
                    >
                      {isSavingApiKey ? "Saving..." : "Save key"}
                    </button>
                    {hasApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowApiKeyForm(false);
                          setApiKeyError(null);
                          setApiKeyInput("");
                        }}
                        className="px-3 py-2 rounded text-sm bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {apiKeyError && (
                  <p className="mt-3 text-sm text-red-400">{apiKeyError}</p>
                )}
              </div>
            </section>
          )}

          {hasApiKey && (
            <section className="max-w-xl mx-auto mb-16">
              <InputForm
                onSubmit={handleGenerate}
                isGenerating={status === GenerationStatus.GENERATING}
              />
              {errorMsg && (
                <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm font-light">
                  {errorMsg}
                </div>
              )}
            </section>
          )}

          {!hasApiKey && !showApiKeyForm && (
            <section className="max-w-xl mx-auto">
              <p className="text-sm text-text-secondary">
                Add your OpenRouter API key to start generating.
              </p>
            </section>
          )}

          {/* Results Grid */}
          {hasApiKey && attempts.length > 0 && (
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-600/50" />
                <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  Results
                </span>
                <div className="h-px flex-1 bg-surface-600/50" />
              </div>

              {/* Playback error display */}
              {playbackError && (
                <div className="mb-4 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-sm font-light flex items-center gap-2">
                  <span>Playback error: {playbackError}</span>
                  <button
                    onClick={() => setPlaybackError(null)}
                    className="ml-auto text-orange-400 hover:text-orange-300 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex justify-center gap-4">
                {attempts.map((attempt) => (
                  <AttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    isPlaying={playingId === attempt.id}
                    onPlay={() => handlePlay(attempt.id, attempt)}
                    onStop={handleStop}
                    onExpand={() => setExpandedAttemptId(attempt.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <ExpandedAttemptModal
        attempt={expandedAttempt}
        isOpen={expandedAttempt !== null}
        isPlaying={expandedAttempt !== null && playingId === expandedAttempt.id}
        currentBeat={
          expandedAttempt !== null && playingId === expandedAttempt.id
            ? currentBeat
            : 0
        }
        onClose={() => setExpandedAttemptId(null)}
        onPlay={() => {
          if (expandedAttempt) {
            handlePlay(expandedAttempt.id, expandedAttempt);
          }
        }}
        onStop={handleStop}
      />
    </div>
  );
};

export default GeneratorApp;
