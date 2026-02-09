const TITLE_MIN_LENGTH = 4;
const TITLE_MAX_LENGTH = 48;
const PROMPT_SUMMARY_MAX_LENGTH = 32;
const PROMPT_SUMMARY_WORD_LIMIT = 5;

const ATTEMPT_MARKER_PATTERN = /\b(?:var(?:iation)?|attempt)\b[\s#:.,-]*#?\d+\b/gi;
const ID_MARKER_PATTERN = /\bid\b[\s#:=-]*[a-z0-9-]{2,}\b/gi;
const BANNED_TOKEN_PATTERN = /\b(?:var(?:iation)?|attempt|id)\b/i;
const HASH_SUFFIX_PATTERN = /(?:[-_])[a-z0-9]{5,}$/i;
const GENERIC_PLACEHOLDER_PATTERN = /^(?:untitled|track|midi|composition|song)$/i;

const truncateAtWordBoundary = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace >= Math.floor(maxLength * 0.6)) {
    return truncated.slice(0, lastSpace).trimEnd();
  }

  return truncated;
};

const toTitleCaseWord = (word: string): string =>
  word.length === 0 ? word : `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;

const unwrapQuotes = (value: string): string => {
  const trimmed = value.trim();
  const wrapped = trimmed.match(/^["'`“”‘’](.*)["'`“”‘’]$/);
  return wrapped ? wrapped[1].trim() : trimmed;
};

export const sanitizeGenerationTitle = (rawTitle: string): string => {
  let title = unwrapQuotes(rawTitle);
  if (!title) {
    return '';
  }

  title = title
    .replace(ATTEMPT_MARKER_PATTERN, ' ')
    .replace(ID_MARKER_PATTERN, ' ')
    .replace(HASH_SUFFIX_PATTERN, '')
    .replace(/[|:;,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  title = title.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').trim();
  title = truncateAtWordBoundary(title, TITLE_MAX_LENGTH);

  return title;
};

export const isHighQualityGenerationTitle = (title: string): boolean => {
  const trimmed = title.trim();
  if (trimmed.length < TITLE_MIN_LENGTH || trimmed.length > TITLE_MAX_LENGTH) {
    return false;
  }

  if (BANNED_TOKEN_PATTERN.test(trimmed)) {
    return false;
  }

  if (HASH_SUFFIX_PATTERN.test(trimmed)) {
    return false;
  }

  if (GENERIC_PLACEHOLDER_PATTERN.test(trimmed)) {
    return false;
  }

  const letterCount = (trimmed.match(/[a-z]/gi) ?? []).length;
  return letterCount >= 2;
};

export const buildFallbackGenerationTitle = (
  prompt: string,
  attemptIndex: number
): string => {
  const cleanedPrompt = prompt
    .trim()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ');

  const summary = cleanedPrompt
    ? truncateAtWordBoundary(
        cleanedPrompt
          .split(' ')
          .filter(Boolean)
          .slice(0, PROMPT_SUMMARY_WORD_LIMIT)
          .map(toTitleCaseWord)
          .join(' '),
        PROMPT_SUMMARY_MAX_LENGTH
      )
    : 'Generated Composition';

  const safeAttempt = Number.isInteger(attemptIndex) && attemptIndex > 0 ? attemptIndex : 1;
  return `${summary || 'Generated Composition'} - Take ${safeAttempt}`;
};

export const finalizeGenerationTitle = (input: {
  modelTitle: string;
  prompt: string;
  attemptIndex: number;
}): string => {
  const sanitized = sanitizeGenerationTitle(input.modelTitle);
  if (isHighQualityGenerationTitle(sanitized)) {
    return sanitized;
  }

  return buildFallbackGenerationTitle(input.prompt, input.attemptIndex);
};
