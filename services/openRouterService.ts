import { MidiComposition, UserPreferences } from '../types';

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
    let message = 'Failed to generate MIDI composition.';
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === 'string') {
        message = errorBody.error;
      }
    } catch {
      // Ignore JSON parse failures and use fallback message.
    }
    throw new Error(message);
  }

  const data = await response.json();
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
    let message = 'Failed to improve prompt.';
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === 'string') {
        message = errorBody.error;
      }
    } catch {
      // Ignore JSON parse failures and use fallback message.
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.prompt || typeof data.prompt !== 'string') {
    throw new Error('Invalid response from server.');
  }

  return data.prompt;
};
