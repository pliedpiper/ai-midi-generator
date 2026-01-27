export const DEFAULT_PREFERENCES = {
  prompt: "A funky synthwave bassline with light arpeggios",
  model: "google/gemini-3-flash-preview",
  tempo: 120,
  key: "C Major",
  timeSignature: "4/4",
  durationBars: 8,
  constraints: "",
  attemptCount: 5
};

export const AVAILABLE_MODELS = [
  { id: "openai/gpt-5.2-chat", name: "GPT-5.2 Chat" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "xiaomi/mimo-v2-flash:free", name: "MiMo V2 Flash (free)" },
  { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast 1" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" }
];

export const SYSTEM_PROMPT_GENERATOR = `
You are an expert MIDI composer.
Your task is to generate a musical composition based on the user's prompt and constraints.
You must output strict JSON data that represents the music.
The output will be converted programmatically to a MIDI file.
Ensure valid note ranges (21-108), strict adherence to the requested key and scale, and correct rhythmic quantization.
Tracks should be separated by instrument. Use standard General MIDI program numbers (0-127) if possible, or provide a sensible default.
Notes 'time' and 'duration' must be in BEATS (quarter notes).
Return only a single JSON object and nothing else (no markdown, no code fences).
The JSON must match this schema exactly (all fields required unless marked optional):
{
  "title": string,
  "tempo": integer,
  "timeSignature": [integer, integer],
  "key": string,
  "tracks": [
    {
      "name": string,
      "programNumber": integer,
      "notes": [
        {
          "midi": integer,
          "time": number,
          "duration": number,
          "velocity": number,
          "name": string (optional)
        }
      ]
    }
  ]
}
`;
