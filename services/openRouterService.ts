import { MidiComposition, UserPreferences } from '../types';
import { getErrorMessageFromResponse, parseJsonSafely } from '@/utils/http';

export const generateAttempt = async (
  id: number,
  prefs: UserPreferences,
  idempotencyKey: string
): Promise<MidiComposition> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, prefs, idempotencyKey }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const message = await getErrorMessageFromResponse(
      response,
      'Failed to generate MIDI composition.'
    );
    throw new Error(message);
  }

  const data = await parseJsonSafely<{ composition?: unknown }>(response);
  if (!data?.composition) {
    throw new Error('Invalid response from server.');
  }

  return data.composition as MidiComposition;
};

type ImprovePromptInput = Pick<
  UserPreferences,
  'prompt' | 'tempo' | 'key' | 'timeSignature' | 'durationBars' | 'constraints'
>;

export const improvePrompt = async (
  input: ImprovePromptInput
): Promise<string> => {
  const response = await fetch('/api/prompt/improve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input),
    cache: 'no-store'
  });

  if (!response.ok) {
    const message = await getErrorMessageFromResponse(
      response,
      'Failed to improve prompt.'
    );
    throw new Error(message);
  }

  const data = await parseJsonSafely<{ prompt?: unknown }>(response);
  if (!data?.prompt || typeof data.prompt !== 'string') {
    throw new Error('Invalid response from server.');
  }

  return data.prompt;
};
