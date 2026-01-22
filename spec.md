# AI MIDI Generator Specification

## Overview
AI MIDI Generator is a web application that leverages OpenRouter via the OpenAI SDK to generate musical compositions in MIDI format based on user text prompts. Users can select from multiple LLMs.

## Architecture

### Frontend
- **Framework**: React 19 (via ESM imports)
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
  - `generateAttempt(id, prefs)`: Constructs a prompt with a unique variation seed (`Variation ID: {id}-{random}`) to prevent deterministic repetition. Uses a system prompt that embeds a strict JSON schema and parses the model response.
- **midiUtils.ts**:
  - `createMidiObject`: Converts the custom JSON format to a `@tonejs/midi` object. Handles the critical conversion between musical "beats" (LLM output) and "seconds" (Audio engine input).
  - `playComposition`: Uses `Tone.PolySynth` to play back the notes in the browser. Handles cleanup and polyphony.

## Deployment & Security
This implementation runs the API calls client-side for demonstration purposes. In a production environment, the `openRouterService` logic must be moved to a Node.js/Express backend to securely manage the `API_KEY` and enforce rate limiting.
