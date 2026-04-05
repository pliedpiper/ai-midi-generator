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
import { downloadMidiComposition } from "@/utils/midiDownload";

interface GeneratorAppProps {
  userEmail: string;
  initialHasApiKey: boolean;
}

const STICKY_SCROLL_THRESHOLD_PX = 120;
const RESULTS_DOCK_GAP_PX = 24;

const GeneratorApp: React.FC<GeneratorAppProps> = ({
  userEmail,
  initialHasApiKey,
}) => {
  const [hasApiKey, setHasApiKey] = React.useState(initialHasApiKey);
  const [showApiKeyForm, setShowApiKeyForm] = React.useState(!initialHasApiKey);
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = React.useState<number | null>(
    null
  );
  const [composerDockHeight, setComposerDockHeight] = React.useState(0);
  const resultsPaneRef = React.useRef<HTMLElement | null>(null);
  const composerDockRef = React.useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = React.useRef(true);

  const generation = useAttemptGeneration({
    hasApiKey,
    onRequireApiKey: () => setShowApiKeyForm(true),
  });

  const playback = useAttemptPlayback({
    attempts: generation.attempts,
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

  const handleDownloadAttempt = React.useCallback(async (attempt: AttemptResult) => {
    if (!attempt.data) {
      return;
    }

    try {
      await downloadMidiComposition({
        composition: attempt.data,
        fallbackTitle: `attempt-${attempt.id}`,
      });
    } catch (error) {
      playback.setPlaybackError(
        error instanceof Error ? error.message : "Failed to download MIDI."
      );
    }
  }, [playback]);

  const scrollResultsToBottom = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const container = resultsPaneRef.current;
    if (!container) {
      return;
    }

    if (typeof container.scrollTo === "function") {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, []);

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

  React.useEffect(() => {
    if (!hasApiKey) {
      setComposerDockHeight(0);
      return;
    }

    const dockElement = composerDockRef.current;
    if (!dockElement) {
      return;
    }

    const updateDockHeight = () => {
      setComposerDockHeight(Math.ceil(dockElement.getBoundingClientRect().height));
    };

    updateDockHeight();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateDockHeight())
        : null;
    observer?.observe(dockElement);
    window.addEventListener("resize", updateDockHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateDockHeight);
    };
  }, [hasApiKey]);

  React.useEffect(() => {
    if (!hasApiKey) {
      return;
    }

    const container = resultsPaneRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldStickToBottomRef.current =
        distanceFromBottom <= STICKY_SCROLL_THRESHOLD_PX;
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [hasApiKey]);

  React.useEffect(() => {
    if (!hasApiKey || generation.status !== GenerationStatus.GENERATING) {
      return;
    }

    shouldStickToBottomRef.current = true;
    requestAnimationFrame(() => scrollResultsToBottom());
  }, [generation.status, hasApiKey, scrollResultsToBottom]);

  React.useEffect(() => {
    if (!hasApiKey || !shouldStickToBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => scrollResultsToBottom());
  }, [
    composerDockHeight,
    generation.attempts,
    generation.errorMsg,
    hasApiKey,
    scrollResultsToBottom,
  ]);

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

      <main className="relative mx-auto flex h-[100dvh] w-full max-w-6xl flex-col px-4 pt-28 sm:px-6 md:px-8 md:pt-32">
        <div className="relative flex-1 overflow-hidden">
          <div className="mx-auto h-full w-full max-w-5xl">
            {showApiKeyForm && (
              <section className="mx-auto mb-10 mt-2 max-w-xl">
                <div className="rounded-3xl border border-surface-600/70 bg-surface-800/80 p-6 backdrop-blur-xl">
                  <h2 className="mb-2 text-lg font-medium">
                    {hasApiKey
                      ? "Update OpenRouter API Key"
                      : "Add OpenRouter API Key"}
                  </h2>
                  <p className="mb-4 text-sm text-text-secondary">
                    {hasApiKey
                      ? "Replace the API key used for generation on your account."
                      : "Generation is disabled until you add your OpenRouter API key."}
                  </p>
                  {!hasApiKey && (
                    <div className="mb-4 rounded-xl border border-surface-600/70 bg-surface-900/50 p-3 text-sm text-text-secondary">
                      <p className="font-medium text-text-primary">How to get an OpenRouter key</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                        <li>Open the OpenRouter keys page.</li>
                        <li>Sign in or create an account.</li>
                        <li>Create a new key, then paste it here.</li>
                      </ol>
                      <a
                        href="https://openrouter.ai/settings/keys"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-3 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                      >
                        Open OpenRouter Keys
                      </a>
                    </div>
                  )}

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

            {!hasApiKey && !showApiKeyForm && (
              <section className="mx-auto mt-6 max-w-xl">
                <p className="text-sm text-text-secondary">
                  Add your OpenRouter API key to start generating.
                </p>
              </section>
            )}

            {hasApiKey && (
              <section
                ref={resultsPaneRef}
                data-testid="results-pane"
                className="h-full overflow-y-auto"
                style={{
                  paddingBottom: Math.max(
                    composerDockHeight + RESULTS_DOCK_GAP_PX,
                    72
                  ),
                }}
              >
                {generation.attempts.length === 0 ? (
                  <div className="min-h-full pb-20 pt-8" aria-hidden="true" />
                ) : (
                  <section className="pt-2">
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

                    <div className="flex flex-wrap justify-center gap-4">
                      {generation.attempts.map((attempt: AttemptResult) => (
                        <div
                          key={attempt.id}
                          className="w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-4rem)/5)]"
                        >
                          <AttemptCard
                            attempt={attempt}
                            isPlaying={playback.playingId === attempt.id}
                            onPlay={() => {
                              void playback.handlePlay(attempt.id, attempt);
                            }}
                            onStop={playback.handleStop}
                            onDownload={() => {
                              void handleDownloadAttempt(attempt);
                            }}
                            onExpand={() => setExpandedAttemptId(attempt.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {generation.errorMsg && (
                  <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-light text-red-400">
                    {generation.errorMsg}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {hasApiKey && (
        <div
          ref={composerDockRef}
          data-testid="composer-dock"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[70]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-900 via-surface-900/85 to-transparent" />
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
            <div className="pointer-events-auto mx-auto w-full max-w-4xl">
              <InputForm
                variant="composer"
                onSubmit={(prefs) => {
                  void handleGenerate(prefs);
                }}
                isGenerating={generation.status === GenerationStatus.GENERATING}
              />
            </div>
          </div>
        </div>
      )}

      <ExpandedAttemptModal
        attempt={expandedAttempt}
        isOpen={expandedAttempt !== null}
        isPlaying={
          expandedAttempt !== null && playback.playingId === expandedAttempt.id
        }
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
        onDownload={() => {
          if (expandedAttempt) {
            void handleDownloadAttempt(expandedAttempt);
          }
        }}
      />
    </div>
  );
};

export default GeneratorApp;
