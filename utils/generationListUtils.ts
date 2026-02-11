import type { SavedGeneration } from '@/types';

export type GenerationSortOption =
  | 'newest'
  | 'oldest'
  | 'longest'
  | 'shortest'
  | 'mostTracks'
  | 'fewestTracks'
  | 'keyAsc'
  | 'keyDesc';

export interface HighlightPart {
  text: string;
  matched: boolean;
}

const textCollator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true
});

const parseCreatedAt = (createdAt: string): number => {
  const timestamp = Date.parse(createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getPromptText = (generation: SavedGeneration): string => {
  const promptValue = generation.prefs?.prompt;
  return typeof promptValue === 'string' ? promptValue : '';
};

export const getCompositionKey = (generation: SavedGeneration): string => {
  if (typeof generation.composition_key === 'string' && generation.composition_key.trim().length > 0) {
    return generation.composition_key.trim();
  }

  const compositionKey = generation.composition?.key;
  if (typeof compositionKey === 'string' && compositionKey.trim().length > 0) {
    return compositionKey.trim();
  }

  const prefsKey = generation.prefs?.key;
  if (typeof prefsKey === 'string' && prefsKey.trim().length > 0) {
    return prefsKey.trim();
  }

  return 'Unknown';
};

export const getTrackCount = (generation: SavedGeneration): number => {
  if (typeof generation.track_count === 'number' && Number.isFinite(generation.track_count)) {
    return Math.max(0, Math.round(generation.track_count));
  }

  const tracks = generation.composition?.tracks;
  return Array.isArray(tracks) ? tracks.length : 0;
};

const parseSearchQuery = (query: string): { normalizedQuery: string; terms: string[] } => {
  const normalizedQuery = query.trim().toLowerCase();
  const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 0);
  return { normalizedQuery, terms };
};

const normalizeForSearch = (value: string): string => value.toLowerCase();

const getSearchFields = (generation: SavedGeneration): string[] => {
  const title = typeof generation.title === 'string' ? generation.title : '';
  const prompt = getPromptText(generation);
  const model = typeof generation.model === 'string' ? generation.model : '';
  const key = getCompositionKey(generation);

  const createdRaw = typeof generation.created_at === 'string' ? generation.created_at : '';
  const createdDate = new Date(createdRaw);
  const isoDate = Number.isNaN(createdDate.getTime()) ? '' : createdDate.toISOString();
  const isoDay = isoDate ? isoDate.slice(0, 10) : '';
  const isoMonth = isoDate ? isoDate.slice(0, 7) : '';
  const isoYear = isoDate ? isoDate.slice(0, 4) : '';

  return [title, prompt, model, key, createdRaw, isoDate, isoDay, isoMonth, isoYear];
};

const getSearchWords = (searchableText: string): string[] =>
  searchableText.split(/[^a-z0-9#]+/i).filter((word) => word.length > 0);

const matchesTerm = (term: string, searchableText: string, words: string[]): boolean => {
  if (term.length === 1) {
    return words.some((word) => word.startsWith(term));
  }

  return searchableText.includes(term);
};

export const getDurationBeats = (generation: SavedGeneration): number => {
  if (typeof generation.duration_beats === 'number' && Number.isFinite(generation.duration_beats)) {
    return Math.max(0, generation.duration_beats);
  }

  const tracks = generation.composition?.tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    const prefsDuration = generation.prefs?.durationBars;
    if (typeof prefsDuration === 'number' && Number.isFinite(prefsDuration) && prefsDuration > 0) {
      return prefsDuration * 4;
    }
    return 0;
  }

  return tracks.reduce((trackMax, track) => {
    const notes = Array.isArray(track.notes) ? track.notes : [];
    const noteMax = notes.reduce((noteEndMax, note) => {
      const start = Number.isFinite(note.time) ? Math.max(note.time, 0) : 0;
      const duration = Number.isFinite(note.duration) ? Math.max(note.duration, 0.001) : 0.001;
      return Math.max(noteEndMax, start + duration);
    }, 0);

    return Math.max(trackMax, noteMax);
  }, 0);
};

export const searchGenerations = (
  generations: SavedGeneration[],
  searchQuery: string
): SavedGeneration[] => {
  const { normalizedQuery, terms } = parseSearchQuery(searchQuery);
  if (!normalizedQuery || terms.length === 0) {
    return generations;
  }

  const ranked = generations
    .map((generation) => {
      const fields = getSearchFields(generation);
      const searchableText = normalizeForSearch(fields.join('\n'));
      const words = getSearchWords(searchableText);

      const matchesAllTerms = terms.every((term) => matchesTerm(term, searchableText, words));
      if (!matchesAllTerms) {
        return null;
      }

      const exactPhraseMatch = searchableText.includes(normalizedQuery);
      const allTermsStartWord = terms.every((term) =>
        words.some((word) => word.startsWith(term))
      );

      const relevanceTier = exactPhraseMatch ? 3 : allTermsStartWord ? 2 : 1;
      return { generation, relevanceTier };
    })
    .filter((item): item is { generation: SavedGeneration; relevanceTier: number } => item !== null);

  ranked.sort((a, b) => {
    const tierDiff = b.relevanceTier - a.relevanceTier;
    if (tierDiff !== 0) {
      return tierDiff;
    }

    const recencyDiff = parseCreatedAt(b.generation.created_at) - parseCreatedAt(a.generation.created_at);
    if (recencyDiff !== 0) {
      return recencyDiff;
    }

    return textCollator.compare(a.generation.id, b.generation.id);
  });

  return ranked.map((item) => item.generation);
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getHighlightParts = (text: string, searchQuery: string): HighlightPart[] => {
  if (!text) {
    return [{ text: '', matched: false }];
  }

  const { normalizedQuery, terms } = parseSearchQuery(searchQuery);
  if (!normalizedQuery || terms.length === 0) {
    return [{ text, matched: false }];
  }

  const uniqueTerms = Array.from(new Set(terms)).sort((a, b) => b.length - a.length);
  if (uniqueTerms.length === 0) {
    return [{ text, matched: false }];
  }

  const escapedTerms = uniqueTerms.map(escapeRegExp);
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const splitParts = text.split(pattern).filter((part) => part.length > 0);

  return splitParts.map((part) => ({
    text: part,
    matched: uniqueTerms.includes(part.toLowerCase())
  }));
};

const compareNewestFirst = (a: SavedGeneration, b: SavedGeneration): number =>
  parseCreatedAt(b.created_at) - parseCreatedAt(a.created_at);

export const sortGenerations = (
  generations: SavedGeneration[],
  sortOption: GenerationSortOption
): SavedGeneration[] => {
  const sorted = [...generations];

  sorted.sort((a, b) => {
    switch (sortOption) {
      case 'oldest':
        return parseCreatedAt(a.created_at) - parseCreatedAt(b.created_at);
      case 'longest': {
        const durationDiff = getDurationBeats(b) - getDurationBeats(a);
        return durationDiff !== 0 ? durationDiff : compareNewestFirst(a, b);
      }
      case 'shortest': {
        const durationDiff = getDurationBeats(a) - getDurationBeats(b);
        return durationDiff !== 0 ? durationDiff : compareNewestFirst(a, b);
      }
      case 'mostTracks': {
        const trackDiff = getTrackCount(b) - getTrackCount(a);
        return trackDiff !== 0 ? trackDiff : compareNewestFirst(a, b);
      }
      case 'fewestTracks': {
        const trackDiff = getTrackCount(a) - getTrackCount(b);
        return trackDiff !== 0 ? trackDiff : compareNewestFirst(a, b);
      }
      case 'keyAsc': {
        const keyDiff = textCollator.compare(getCompositionKey(a), getCompositionKey(b));
        return keyDiff !== 0 ? keyDiff : compareNewestFirst(a, b);
      }
      case 'keyDesc': {
        const keyDiff = textCollator.compare(getCompositionKey(b), getCompositionKey(a));
        return keyDiff !== 0 ? keyDiff : compareNewestFirst(a, b);
      }
      case 'newest':
      default:
        return compareNewestFirst(a, b);
    }
  });

  return sorted;
};
