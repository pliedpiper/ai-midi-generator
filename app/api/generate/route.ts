import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_GENERATOR } from '@/constants';
import type { MidiComposition, UserPreferences } from '@/types';

export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1'
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

  let body: { id?: number; prefs?: UserPreferences };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { id, prefs } = body;
  if (typeof id !== 'number' || !prefs) {
    return NextResponse.json({ error: 'Missing id or prefs.' }, { status: 400 });
  }

  try {
    const response = await client.chat.completions.create({
      model: prefs.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_GENERATOR },
        { role: 'user', content: buildPrompt(id, prefs) }
      ],
      temperature: 0.9
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const jsonText = extractJson(content);
    const composition = JSON.parse(jsonText) as MidiComposition;

    return NextResponse.json({ composition });
  } catch (error) {
    console.error('Generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate MIDI composition.' },
      { status: 502 }
    );
  }
}
