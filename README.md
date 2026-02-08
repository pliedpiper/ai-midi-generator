# AI MIDI Generator

Generate MIDI compositions from text prompts using LLMs. Describe the music you want, and the app creates playable MIDI files in your browser.

## Features

- **Text-to-MIDI**: Describe music in natural language, get a MIDI file
- **Multiple models**: Choose from GPT-5.2, Claude Sonnet/Opus, Gemini, DeepSeek, Grok, and more via OpenRouter
- **In-browser playback**: Listen instantly with Tone.js synthesis
- **Variations**: Generate up to 5 variations per prompt
- **Advanced controls**: Tempo, key, time signature, duration, and constraints
- **MIDI export**: Download generated compositions as .mid files

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Audio**: Tone.js + @tonejs/midi
- **API**: OpenRouter (OpenAI SDK compatible)
- **Testing**: Vitest

## Quick Start

**Prerequisites**: Node.js 18+

```bash
# Install dependencies
npm install

# Create environment file
echo "OPENAI_API_KEY=sk-or-your-openrouter-key" > .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Serve production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

## Testing

This project uses Vitest for fast unit/integration-style testing of the API route, validation logic, MIDI generation utilities, scale logic, and client service behavior.

- Run once: `npm run test:run`
- Watch mode: `npm test`
- Detailed strategy and suite map: [`docs/testing.md`](docs/testing.md)

## Project Structure

```
├── app/
│   ├── api/generate/    # MIDI generation endpoint
│   ├── page.tsx         # Main UI
│   └── layout.tsx       # App layout
├── components/
│   ├── InputForm.tsx    # User input form
│   └── AttemptCard.tsx  # Playback/download UI
├── utils/
│   ├── midiUtils.ts     # MIDI conversion & playback
│   └── validation.ts    # Input/output validation
├── services/
│   └── openRouterService.ts  # API client
├── tests/               # Vitest suites
├── docs/
│   └── testing.md       # Testing strategy and coverage map
├── constants.ts         # Models, prompts, defaults
└── types.ts             # TypeScript types
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenRouter API key (starts with `sk-or-`) |

## How It Works

1. User describes desired music (e.g., "An upbeat 8-bit video game loop")
2. App sends prompt to selected LLM via OpenRouter
3. LLM returns structured JSON with tracks, notes, timing
4. App validates response and converts to MIDI
5. Tone.js plays the composition; user can download as .mid file

## Security

- Rate limited: 10 requests/minute per IP
- Input validation with size limits
- CSP headers configured for safe audio playback
- Server-side API key (never exposed to client)
