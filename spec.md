# AI MIDI Generator Specification

## Overview
AI MIDI Generator is a web application that leverages OpenRouter via the OpenAI SDK to generate musical compositions in MIDI format based on user text prompts. Users can select from multiple LLMs.

## Architecture

### Frontend
- **Framework**: Next.js App Router (React 19)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Audio Engine**: Tone.js & @tonejs/midi

### AI Integration
- **SDK**: `openai` (OpenAI SDK configured for OpenRouter)
- **Models**: User-selectable (e.g. `anthropic/claude-sonnet-4.5`, `google/gemini-3-flash-preview`, `google/gemini-2.5-pro`, `deepseek/deepseek-v3.2`, `x-ai/grok-4.1-fast`)
- **Pattern**:
  1. **Generation Phase**: User selects 1-5 attempts. The system executes parallel requests with unique variation seeds to ensure diversity.

## Data Flow

1.  **User Input**: User provides genre, tempo, key, time signature, style constraints, and number of variations (1-5) via the `InputForm`.
2.  **Generation Phase**:
    - The App triggers `N` parallel calls to `generateAttempt` in `openRouterService`, where `N` is the selected variation count.
    - Each call sends a prompt to the selected model requesting a strict JSON representation of a MIDI file.
    - **System Prompt**: Enforces valid note ranges (21-108), strict key adherence, and General MIDI program numbers, and embeds a full JSON schema in the prompt.
    - JSON responses are parsed and converted to binary MIDI Blobs and Tone.js compatible objects for playback.
3.  **Presentation**:
    - Results are displayed in `AttemptCard` components.
    - Users can listen to previews (synthesized in-browser via Tone.js) or download the raw `.mid` files.

## Data Models

### MidiComposition (LLM Output)
The LLM is instructed to return this JSON structure:
```json
{
  "title": "String",
  "tempo": "Integer (BPM)",
  "timeSignature": [4, 4],
  "key": "String (e.g. 'C Minor')",
  "tracks": [
    {
      "name": "String",
      "programNumber": "Integer (0-127)",
      "notes": [
        { 
          "midi": "Integer (Note Pitch)", 
          "time": "Float (Start beat)", 
          "duration": "Float (Length in beats)", 
          "velocity": "Float (0.0-1.0 or 0-127)" 
        }
      ]
    }
  ]
}
```

## Component Structure

- **App**: 
  - Manages global state: `attempts`, `status` (IDLE, GENERATING, COMPLETED), `playingId`.
  - Orchestrates the Promise.all flow for parallel generation.
- **InputForm**: 
  - Captures user preferences including `attemptCount`.
  - Manages "Advanced Controls" visibility.
- **AttemptCard**: 
  - Displays individual attempt status.
  - Displays track metadata (tempo, key, instruments).
  - Handles audio playback toggling and file download.

## Services

- **openRouterService.ts**:
  - `generateAttempt(id, prefs)`: Calls the Next.js API route (`/api/generate`) with a unique variation seed to prevent deterministic repetition.
- **app/api/generate/route.ts**:
  - Server-side OpenAI SDK call to OpenRouter. Uses a system prompt that embeds a strict JSON schema and parses the model response.
- **midiUtils.ts**:
  - `createMidiObject`: Converts the custom JSON format to a `@tonejs/midi` object. Handles the critical conversion between musical "beats" (LLM output) and "seconds" (Audio engine input).
  - `playComposition`: Uses `Tone.PolySynth` to play back the notes in the browser. Handles cleanup and polyphony.

## Error Handling & Validation

### Server-Side Validation (`/api/generate`)
The API route implements comprehensive validation:

1. **Request Validation**
   - `id`: Must be a positive finite number
   - `prefs`: Must be an object with required fields

2. **Preferences Validation**
   - `prompt`: Required, must be a non-empty string (returns 400 if empty)
   - `model`: Required, must be in the server-side allowlist (see below)
   - `tempo`: Normalized to range 20-300 BPM (default: 120)
   - `key`: Defaults to "C Major" if missing
   - `timeSignature`: Must match pattern "N/N" (default: "4/4")
   - `durationBars`: Normalized to range 1-64 bars (default: 8)
   - `attemptCount`: Normalized to range 1-5 (default: 1)

3. **Model Allowlist**
   Only models defined in `AVAILABLE_MODELS` (from `constants.ts`) are accepted:
   - `openai/gpt-5.2-chat`
   - `anthropic/claude-sonnet-4.5`
   - `xiaomi/mimo-v2-flash:free`
   - `x-ai/grok-code-fast-1`
   - `google/gemini-3-flash-preview`
   - `google/gemini-3-pro-preview`
   - `anthropic/claude-opus-4.5`
   - `google/gemini-2.5-pro`
   - `google/gemini-2.5-flash`
   - `deepseek/deepseek-v3.2`
   - `x-ai/grok-4.1-fast`
   - `google/gemini-2.5-flash-lite`

4. **Model Output Validation**
   - JSON extraction from potential markdown fences
   - Schema validation ensuring: title, tempo (finite positive), timeSignature ([int, int]), key, and non-empty tracks array
   - Track validation: name (string) and notes array with midi/time/duration fields
   - Returns 502 on invalid model output

### MIDI Conversion Guards (`midiUtils.ts`)
- **Tempo**: Non-finite values default to 120, clamped to 20-300
- **Time Signature**: Invalid arrays default to [4, 4]
- **MIDI Notes**: Clamped to 0-127, rounds fractional values
- **Note Time**: Negative values normalized to 0
- **Note Duration**: Zero/negative values normalized to minimum 0.001
- **Velocity**: Values > 1 treated as MIDI velocity (0-127) and scaled
- **Notes sorted**: All notes sorted by time for proper playback

### Playback Error Handling
- `playComposition` returns a Promise that rejects with `PlaybackError` on failure
- All `Tone.Part` instances tracked and disposed on `stopPlayback()`
- UI only sets `playingId` after successful playback start
- Playback errors displayed in dismissible banner above results grid

## Deployment & Security
The OpenAI/OpenRouter call runs server-side in the Next.js API route. Set `OPENAI_API_KEY` in `.env.local` and avoid exposing it to the client.
