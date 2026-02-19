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
                onSubmit={(prefs) => {
                  void handleGenerate(prefs);
                }}
                isGenerating={generation.status === GenerationStatus.GENERATING}
              />
              {generation.errorMsg && (
                <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm font-light">
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
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-600/50" />
                <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  Results
                </span>
                <div className="h-px flex-1 bg-surface-600/50" />
              </div>

              {playback.playbackError && (
                <div className="mb-4 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-sm font-light flex items-center gap-2">
                  <span>Playback error: {playback.playbackError}</span>
                  <button
                    onClick={() => playback.setPlaybackError(null)}
                    className="ml-auto text-orange-400 hover:text-orange-300 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex justify-center gap-4">
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
