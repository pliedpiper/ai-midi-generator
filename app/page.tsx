"use client";

import React, { useState, useCallback } from 'react';
import { AttemptResult, GenerationStatus, UserPreferences, SnapOptions } from '../types';
import { generateAttempt } from '../services/openRouterService';
import { generateMidiBlob, stopPlayback, playComposition, PlaybackError } from '../utils/midiUtils';
import InputForm from '../components/InputForm';
import AttemptCard from '../components/AttemptCard';

// Helper to extract snap options from preferences
const getSnapOptions = (prefs: UserPreferences | null): SnapOptions | undefined => {
  if (!prefs) return undefined;
  return { scaleRoot: prefs.scaleRoot, scaleType: prefs.scaleType };
};

const Page: React.FC = () => {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [lastPrefs, setLastPrefs] = useState<UserPreferences | null>(null);

  // Initialize empty slots based on requested count
  const resetAttempts = (count: number) => {
    // Stop any playing audio before resetting
    stopPlayback();
    setAttempts(Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      status: 'pending'
    })));
    setPlayingId(null);
    setErrorMsg(null);
    setPlaybackError(null);
  };

  const handleGenerate = async (prefs: UserPreferences) => {
    setStatus(GenerationStatus.GENERATING);
    setLastPrefs(prefs);
    resetAttempts(prefs.attemptCount);

    const snapOptions = getSnapOptions(prefs);

    // Launch parallel attempts based on attemptCount
    const attemptPromises = Array.from({ length: prefs.attemptCount }, (_, i) => i + 1).map(async (id) => {
      try {
        // Add small delay to avoid exact same microsecond timestamp seeds if logic relies on it
        await new Promise(r => setTimeout(r, id * 100));

        const composition = await generateAttempt(id, prefs);
        const blob = generateMidiBlob(composition, snapOptions);

        setAttempts(prev => prev.map(a =>
          a.id === id ? { ...a, status: 'success', data: composition, midiBlob: blob } : a
        ));
        return { id, data: composition, success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate JSON';
        setAttempts(prev => prev.map(a =>
          a.id === id ? { ...a, status: 'failed', error: message } : a
        ));
        return { id, success: false };
      }
    });

    const results = await Promise.all(attemptPromises);
    const successfulAttempts = results.filter(r => r.success);

    if (successfulAttempts.length === 0) {
      setStatus(GenerationStatus.ERROR);
      setErrorMsg("All generation attempts failed. Please try a simpler prompt.");
    } else {
      setStatus(GenerationStatus.COMPLETED);
    }
  };

  // Handle playback with proper error handling - only set playingId after success
  const handlePlay = useCallback(async (id: number, attempt: AttemptResult) => {
    if (!attempt.data) return;

    // Clear any previous playback error
    setPlaybackError(null);

    const snapOptions = getSnapOptions(lastPrefs);

    try {
      await playComposition(attempt.data, snapOptions);
      // Only set playingId after playback successfully starts
      setPlayingId(id);
    } catch (err) {
      // Playback failed - ensure cleanup
      stopPlayback();
      setPlayingId(null);

      const message = err instanceof PlaybackError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Playback failed';

      setPlaybackError(message);
    }
  }, [lastPrefs]);

  const handleStop = useCallback(() => {
    stopPlayback();
    setPlayingId(null);
    setPlaybackError(null);
  }, []);

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary">
      {/* Minimal Header */}
      <header className="border-b border-surface-600/50 backdrop-blur-sm bg-surface-900/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <span className="font-mono text-sm font-medium tracking-wide text-text-primary">
            MIDI GENERATOR
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Input Section */}
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

        {/* Results Grid */}
        {attempts.length > 0 && (
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
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Page;
