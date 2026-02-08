"use client";

import React from 'react';
import { Download, Expand, Loader2, Play, Square, Trash2 } from 'lucide-react';
import type { SavedGeneration, SnapOptions } from '@/types';
import { generateMidiBlob, getTransportBeatPosition, playComposition, stopPlayback } from '@/utils/midiUtils';
import AppHeader from './AppHeader';
import ExpandedGenerationModal from './ExpandedGenerationModal';

interface GenerationsPageProps {
  userEmail: string;
}

const getSnapOptions = (generation: SavedGeneration): SnapOptions | undefined => {
  const prefs = generation.prefs;
  if (!prefs) return undefined;

  const scaleRoot = typeof prefs.scaleRoot === 'number' ? prefs.scaleRoot : 0;
  const scaleType = typeof prefs.scaleType === 'string' ? prefs.scaleType : 'major';

  return {
    scaleRoot,
    scaleType
  };
};

const GenerationsPage: React.FC<GenerationsPageProps> = ({ userEmail }) => {
  const [generations, setGenerations] = React.useState<SavedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [expandedGenerationId, setExpandedGenerationId] = React.useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = React.useState(0);

  const loadGenerations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generations', { cache: 'no-store' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'Failed to load generations.';
        throw new Error(message);
      }

      const data = await response.json();
      const items = Array.isArray(data?.generations) ? data.generations : [];
      setGenerations(items as SavedGeneration[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load generations.');
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
    const activeGeneration = generations.find(item => item.id === playingId);
    if (!activeGeneration) return;

    let animationFrame: number;
    const tempo = activeGeneration.composition.tempo;
    const maxBeat = activeGeneration.composition.tracks.reduce((trackMax, track) => {
      const noteMax = track.notes.reduce(
        (noteEndMax, note) => Math.max(noteEndMax, note.time + Math.max(note.duration, 0.001)),
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
    const hasExpandedGeneration = generations.some(item => item.id === expandedGenerationId);
    if (!hasExpandedGeneration) {
      setExpandedGenerationId(null);
    }
  }, [generations, expandedGenerationId]);

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
      setError(playError instanceof Error ? playError.message : 'Playback failed.');
      setPlayingId(null);
      setCurrentBeat(0);
    }
  };

  const handleDelete = async (generationId: string) => {
    setDeletingId(generationId);
    setError(null);
    try {
      const response = await fetch(`/api/generations/${generationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'Failed to delete generation.';
        throw new Error(message);
      }

      if (playingId === generationId) {
        stopPlayback();
        setPlayingId(null);
        setCurrentBeat(0);
      }

      setGenerations(prev => prev.filter(item => item.id !== generationId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete generation.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (generation: SavedGeneration) => {
    const blob = generateMidiBlob(generation.composition, getSnapOptions(generation));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generation.title || 'generation'}.mid`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const expandedGeneration = generations.find(item => item.id === expandedGenerationId) ?? null;

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary">
      <AppHeader userEmail={userEmail} />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-medium">My Generations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Saved outputs are attached to your account and available across sessions.
          </p>
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
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((generation) => (
              <article
                key={generation.id}
                className="bg-surface-800 border border-surface-600 rounded p-4 flex flex-col"
              >
                <h2 className="text-sm font-medium line-clamp-2">
                  {generation.title || 'Untitled'}
                </h2>
                <div className="mt-3 space-y-1 text-[11px] font-mono text-text-muted">
                  <p>Model: {generation.model}</p>
                  <p>Attempt: #{generation.attempt_index}</p>
                  <p>{new Date(generation.created_at).toLocaleString()}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlayToggle(generation)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                  >
                    {playingId === generation.id ? <Square size={13} /> : <Play size={13} />}
                    {playingId === generation.id ? 'Stop' : 'Play'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(generation)}
                    className="w-9 flex items-center justify-center rounded bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                    aria-label={`Download ${generation.title || 'generation'}`}
                  >
                    <Download size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedGenerationId(generation.id)}
                    className="w-9 flex items-center justify-center rounded bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary transition-colors"
                    aria-label={`Expand ${generation.title || 'generation'}`}
                  >
                    <Expand size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(generation.id)}
                    disabled={deletingId === generation.id}
                    className={`w-9 flex items-center justify-center rounded transition-colors ${
                      deletingId === generation.id
                        ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                        : 'bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300'
                    }`}
                    aria-label={`Delete ${generation.title || 'generation'}`}
                  >
                    {deletingId === generation.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
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
