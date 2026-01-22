import OpenAI from "openai";
import { MidiComposition, UserPreferences } from '../types';
import { SYSTEM_PROMPT_GENERATOR } from '../constants';

const client = new OpenAI({
  apiKey: process.env.API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true
});

const extractJson = (content: string) => {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Empty response from OpenRouter');
  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return withoutFences.slice(start, end + 1);
};

export const generateAttempt = async (
  id: number,
  prefs: UserPreferences
): Promise<MidiComposition> => {
  const variationSeed = `Variation ID: ${id}-${Math.random().toString(36).substring(7)}`;

  const prompt = `
User Prompt: "${prefs.prompt}"
Tempo: ${prefs.tempo} BPM
Key: ${prefs.key}
Time Signature: ${prefs.timeSignature}
Length: ${prefs.durationBars} bars
Constraints: ${prefs.constraints}

${variationSeed}

Make this version unique compared to others.
  `.trim();

  try {
    const response = await client.chat.completions.create({
      model: prefs.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT_GENERATOR },
        { role: "user", content: prompt }
      ],
      temperature: 0.9
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const jsonText = extractJson(content);
    const composition = JSON.parse(jsonText) as MidiComposition;
    return composition;
  } catch (error) {
    console.error(`Attempt ${id} failed:`, error);
    throw error;
  }
};
