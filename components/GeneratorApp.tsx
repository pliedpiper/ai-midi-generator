"use client";

import React from "react";
import { GenerationStatus, AttemptResult, UserPreferences } from "@/types";
import { saveOpenRouterKey } from "@/services/openRouterKeyService";
import { useAttemptGeneration } from "@/hooks/generator/useAttemptGeneration";
import { useAttemptPlayback } from "@/hooks/generator/useAttemptPlayback";
import { stopPlayback } from "@/utils/midiUtils";
import InputForm from "@/components/InputForm";
import AttemptCard from "@/components/AttemptCard";
import ExpandedAttemptModal from "@/components/ExpandedAttemptModal";
import AppHeader from "@/components/AppHeader";

interface GeneratorAppProps {
  userEmail: string;
  initialHasApiKey: boolean;
}

const GeneratorApp: React.FC<GeneratorAppProps> = ({
  userEmail,
  initialHasApiKey,
}) => {
  const [hasApiKey, setHasApiKey] = React.useState(initialHasApiKey);
  const [showApiKeyForm, setShowApiKeyForm] = React.useState(!initialHasApiKey);
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = React.useState<number | null>(null);

  const generation = useAttemptGeneration({
    hasApiKey,
    onRequireApiKey: () => setShowApiKeyForm(true),
  });

  const playback = useAttemptPlayback({
    attempts: generation.attempts,
    lastPrefs: generation.lastPrefs,
  });

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
      await saveOpenRouterKey(normalized);
      setHasApiKey(true);
      setShowApiKeyForm(false);
      setApiKeyInput("");
    } catch (error) {
      if (error instanceof Error) {
        setApiKeyError(error.message);
      } else {
        setApiKeyError("Failed to save API key.");
      }
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleGenerate = async (prefs: UserPreferences) => {
    playback.handleStop();
    setExpandedAttemptId(null);
    await generation.handleGenerate(prefs);
  };

  React.useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  React.useEffect(() => {
    if (expandedAttemptId === null) return;

    const hasExpandedAttempt = generation.attempts.some(
      (attempt) =>
        attempt.id === expandedAttemptId && attempt.status === "success"
    );
    if (!hasExpandedAttempt) {
      setExpandedAttemptId(null);
    }
  }, [generation.attempts, expandedAttemptId]);

  const expandedAttempt =
    generation.attempts.find(
      (attempt) =>
        attempt.id === expandedAttemptId && attempt.status === "success"
    ) ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-900 text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(var(--surface-700)_/_0.55),transparent_35%),radial-gradient(circle_at_85%_12%,rgb(var(--accent)_/_0.14),transparent_30%),linear-gradient(135deg,rgb(var(--surface-900))_0%,rgb(var(--surface-800))_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-500/50 to-transparent" />
      </div>

      <AppHeader userEmail={userEmail} variant="compact" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-28 sm:px-6 md:px-8 md:pt-32">
        <div className="mx-auto w-full max-w-5xl">
          {showApiKeyForm && (
            <section className="mx-auto mb-10 max-w-xl">
              <div className="rounded-3xl border border-surface-600/70 bg-surface-800/80 p-6 backdrop-blur-xl">
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
                    className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSavingApiKey}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        isSavingApiKey
                          ? "bg-surface-700 text-text-muted cursor-not-allowed"
                          : "bg-accent text-accent-foreground hover:bg-accent-hover"
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
                        className="rounded-xl bg-surface-700 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
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
            <section className="mx-auto w-full max-w-4xl">
              <div className="mt-2">
                <InputForm
                  variant="hero"
                  onSubmit={(prefs) => {
                    void handleGenerate(prefs);
                  }}
                  isGenerating={generation.status === GenerationStatus.GENERATING}
                />
              </div>
              {generation.errorMsg && (
                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-light text-red-400">
                  {generation.errorMsg}
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

          {hasApiKey && generation.attempts.length > 0 && (
            <section className="mt-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-600/50" />
                <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  Results
                </span>
                <div className="h-px flex-1 bg-surface-600/50" />
              </div>

              {playback.playbackError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-light text-orange-400">
                  <span>Playback error: {playback.playbackError}</span>
                  <button
                    onClick={() => playback.setPlaybackError(null)}
                    className="ml-auto text-orange-400 hover:text-orange-300 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {generation.attempts.map((attempt: AttemptResult) => (
                  <AttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    isPlaying={playback.playingId === attempt.id}
                    onPlay={() => {
                      void playback.handlePlay(attempt.id, attempt);
                    }}
                    onStop={playback.handleStop}
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
        isPlaying={expandedAttempt !== null && playback.playingId === expandedAttempt.id}
        currentBeat={
          expandedAttempt !== null && playback.playingId === expandedAttempt.id
            ? playback.currentBeat
            : 0
        }
        onClose={() => setExpandedAttemptId(null)}
        onPlay={() => {
          if (expandedAttempt) {
            void playback.handlePlay(expandedAttempt.id, expandedAttempt);
          }
        }}
        onStop={playback.handleStop}
      />
    </div>
  );
};

export default GeneratorApp;
