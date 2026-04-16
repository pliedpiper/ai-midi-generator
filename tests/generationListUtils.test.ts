import { describe, expect, it } from 'vitest';
import { DEFAULT_GENERATION_STYLE_ID } from '../lib/generationStyles';
import type { SavedGeneration } from '../types';
import {
  getHighlightParts,
  searchGenerations,
  sortGenerations
} from '../utils/generationListUtils';

const createGeneration = ({
  id,
  createdAt,
  title = `Generation ${id}`,
  model = 'test-model',
  prompt,
  compositionKey = 'C Major',
  prefsKey = 'C Major',
  durationBeats = 4,
  trackCount = 1
}: {
  id: string;
  createdAt: string;
  title?: string;
  model?: string;
  prompt: string;
  compositionKey?: string;
  prefsKey?: string;
  durationBeats?: number;
  trackCount?: number;
}): SavedGeneration => ({
  id,
  title,
  model,
  attempt_index: 1,
  prefs: {
    prompt,
    model,
    styleId: DEFAULT_GENERATION_STYLE_ID,
    tempo: 120,
    key: prefsKey,
    timeSignature: '4/4',
    durationBars: 4,
    constraints: '',
    attemptCount: 1,
    scaleRoot: 0,
    scaleType: 'major'
  },
  composition: {
    title: `Composition ${id}`,
    tempo: 120,
    timeSignature: [4, 4],
    key: compositionKey,
    tracks: Array.from({ length: trackCount }, (_, index) => ({
      name: `Track ${index + 1}`,
      programNumber: index,
      notes: [
        {
          midi: 60 + index,
          time: 0,
          duration: index === 0 ? durationBeats : 1,
          velocity: 0.8
        }
      ]
    }))
  },
  created_at: createdAt
});

describe('searchGenerations', () => {
  const base = [
    createGeneration({
      id: 'a',
      createdAt: '2026-02-01T10:00:00.000Z',
      title: 'Lo-Fi Rain Study',
      model: 'gpt-5.2',
      prompt: 'Lo-fi piano with rain ambience',
      compositionKey: 'D Minor'
    }),
    createGeneration({
      id: 'b',
      createdAt: '2026-02-03T11:00:00.000Z',
      title: 'Trailer Sketch',
      model: 'claude-sonnet',
      prompt: 'Epic cinematic trailer cue',
      compositionKey: 'A Minor'
    }),
    createGeneration({
      id: 'c',
      createdAt: '2026-01-25T09:00:00.000Z',
      title: 'Morning Chords',
      model: 'gemini-2.5-pro',
      prompt: 'Warm major-key progression for studying',
      compositionKey: 'G Major'
    })
  ];

  it('searches across prompt, title, model, key, and date text', () => {
    expect(searchGenerations(base, 'ambience').map((item) => item.id)).toEqual(['a']);
    expect(searchGenerations(base, 'Trailer Sketch').map((item) => item.id)).toEqual(['b']);
    expect(searchGenerations(base, 'gemini-2.5-pro').map((item) => item.id)).toEqual(['c']);
    expect(searchGenerations(base, 'd minor').map((item) => item.id)).toEqual(['a']);
    expect(searchGenerations(base, '2026-02-03').map((item) => item.id)).toEqual(['b']);
  });

  it('uses multi-word AND matching', () => {
    expect(searchGenerations(base, 'lo-fi rain').map((item) => item.id)).toEqual(['a']);
    expect(searchGenerations(base, 'rain trailer')).toHaveLength(0);
  });

  it('ranks by relevance tier then recency', () => {
    const generations = [
      createGeneration({
        id: 'exact',
        createdAt: '2026-02-02T10:00:00.000Z',
        prompt: 'melodic dr pulse'
      }),
      createGeneration({
        id: 'prefixOlder',
        createdAt: '2026-01-01T10:00:00.000Z',
        prompt: 'melodic drive pulse'
      }),
      createGeneration({
        id: 'prefixNewer',
        createdAt: '2026-02-05T10:00:00.000Z',
        prompt: 'melodic drone pulse'
      }),
      createGeneration({
        id: 'contains',
        createdAt: '2026-02-06T10:00:00.000Z',
        prompt: 'camelodic color and midrift qpulse'
      })
    ];

    expect(searchGenerations(generations, 'melodic dr pulse').map((item) => item.id)).toEqual([
      'exact',
      'prefixNewer',
      'prefixOlder',
      'contains'
    ]);
  });

  it('returns all generations unchanged when search query is empty', () => {
    expect(searchGenerations(base, '   ').map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('getHighlightParts', () => {
  it('splits text into matched and unmatched chunks for all query terms', () => {
    const parts = getHighlightParts('Lo-fi piano rain', 'piano rain');
    expect(parts).toEqual([
      { text: 'Lo-fi ', matched: false },
      { text: 'piano', matched: true },
      { text: ' ', matched: false },
      { text: 'rain', matched: true }
    ]);
  });

  it('returns one unmatched part when query is empty', () => {
    expect(getHighlightParts('Anything', '   ')).toEqual([{ text: 'Anything', matched: false }]);
  });
});

describe('sortGenerations', () => {
  const base = [
    createGeneration({
      id: 'a',
      createdAt: '2026-02-01T10:00:00.000Z',
      prompt: 'One',
      durationBeats: 8,
      trackCount: 1,
      compositionKey: 'G Minor'
    }),
    createGeneration({
      id: 'b',
      createdAt: '2026-02-01T12:00:00.000Z',
      prompt: 'Two',
      durationBeats: 4,
      trackCount: 3,
      compositionKey: 'A Minor'
    }),
    createGeneration({
      id: 'c',
      createdAt: '2026-02-01T08:00:00.000Z',
      prompt: 'Three',
      durationBeats: 16,
      trackCount: 2,
      compositionKey: '',
      prefsKey: 'D Major'
    })
  ];

  it('sorts by newest and oldest', () => {
    expect(sortGenerations(base, 'newest').map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(sortGenerations(base, 'oldest').map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by duration and track count', () => {
    expect(sortGenerations(base, 'longest').map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(sortGenerations(base, 'shortest').map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(sortGenerations(base, 'mostTracks').map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(sortGenerations(base, 'fewestTracks').map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by key and falls back to prefs key when composition key is empty', () => {
    expect(sortGenerations(base, 'keyAsc').map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(sortGenerations(base, 'keyDesc').map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });
});
