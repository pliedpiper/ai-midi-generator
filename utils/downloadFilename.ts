interface MidiFilenameInput {
  title?: string | null;
  key?: string | null;
  tempo?: number | null;
  fallbackTitle?: string;
}

const MAX_SEGMENT_LENGTH = 60;

const sanitizeSegment = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/#/g, ' sharp ')
    .replace(/♯/g, ' sharp ')
    .replace(/♭/g, ' flat ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SEGMENT_LENGTH);

  return normalized.length > 0 ? normalized : fallback;
};

const sanitizeTempo = (tempo: number | null | undefined): string => {
  if (typeof tempo !== 'number' || !Number.isFinite(tempo)) {
    return 'unknown-bpm';
  }

  const roundedTempo = Math.max(1, Math.round(tempo));
  return `${roundedTempo}bpm`;
};

export const buildMidiDownloadFilename = ({
  title,
  key,
  tempo,
  fallbackTitle = 'generation'
}: MidiFilenameInput): string => {
  const titleSegment = sanitizeSegment(title ?? '', sanitizeSegment(fallbackTitle, 'generation'));
  const keySegment = sanitizeSegment(key ?? '', 'unknown-key');
  const tempoSegment = sanitizeTempo(tempo);

  return `${titleSegment}_${keySegment}_${tempoSegment}.mid`;
};
