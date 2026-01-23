import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_GENERATOR } from '@/constants';
import type { UserPreferences } from '@/types';
import { extractJson, validatePrefs, validateComposition } from '@/utils/validation';

export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1'
});

const buildPrompt = (id: number, prefs: UserPreferences) => {
  const variationSeed = `Variation ID: ${id}-${Math.random().toString(36).substring(7)}`;
  return `
User Prompt: "${prefs.prompt}"
Tempo: ${prefs.tempo} BPM
Key: ${prefs.key}
Time Signature: ${prefs.timeSignature}
Length: ${prefs.durationBars} bars
Constraints: ${prefs.constraints}

${variationSeed}

Make this version unique compared to others.
  `.trim();
};

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not set on the server.' },
      { status: 500 }
    );
  }

  let body: { id?: number; prefs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { id, prefs } = body;

  // Validate id
  if (typeof id !== 'number' || !Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'id must be a positive number.' }, { status: 400 });
  }

  // Validate and normalize prefs
  const prefsResult = validatePrefs(prefs);
  if (prefsResult.valid === false) {
    return NextResponse.json({ error: prefsResult.error }, { status: 400 });
  }
  const normalizedPrefs = prefsResult.normalized;

  try {
    const response = await client.chat.completions.create({
      model: normalizedPrefs.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_GENERATOR },
        { role: 'user', content: buildPrompt(id, normalizedPrefs) }
      ],
      temperature: 0.9
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const jsonText = extractJson(content);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Model returned invalid JSON.' },
        { status: 502 }
      );
    }

    // Validate model output against schema
    const compositionResult = validateComposition(parsed);
    if (compositionResult.valid === false) {
      console.error('Schema validation failed:', compositionResult.error);
      return NextResponse.json(
        { error: `Invalid model output: ${compositionResult.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ composition: compositionResult.composition });
  } catch (error) {
    console.error('Generation failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate MIDI composition: ${message}` },
      { status: 502 }
    );
  }
}
