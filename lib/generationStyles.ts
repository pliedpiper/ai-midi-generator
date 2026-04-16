export type GenerationStyle = {
  id: string;
  name: string;
  method: string;
  hypothesis: string;
  systemPrompt: string;
};

const JSON_SCHEMA_BLOCK = `
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
`.trim();

const BASE_CREATIVE_PROMPT = `
You are an expert MIDI composer.
Default to interesting choices: unexpected but musical rhythms, phrasing, and texture changes that still fit the prompt.
Do not settle for the first idea; silently compare multiple options and pick the one with the strongest identity.
Keep the piece coherent and playable, but include at least one clearly distinctive idea (hook, groove twist, harmonic color, or arrangement contrast).
Avoid flat dynamics and repetitive patterns that do not evolve.
Avoid overly childish, sing-song melodies.
Avoid predictable up-then-down or down-then-up scalar motion that resembles a smooth sine wave.
Favor stronger melodic contour: use rhythmic motifs, repeated notes, held tones, selective leaps, and asymmetrical phrases instead of constant stepwise oscillation.
`.trim();

const OUTPUT_REQUIREMENTS_PROMPT = `
Your task is to generate a musical composition based on the user's prompt and constraints.
You MUST output strict JSON data that represents the music.
The output will be converted programmatically to a MIDI file.
Ensure valid note ranges (21-108), strict adherence to the requested key and scale, and correct rhythmic quantization.
Tracks should be separated by instrument. Use standard General MIDI program numbers (0-127) if possible, or provide a sensible default.
Notes 'time' and 'duration' must be in BEATS (quarter notes).
Return only a single JSON object and nothing else (no markdown, no code fences).
${JSON_SCHEMA_BLOCK}
`.trim();

const buildGenerationStylePrompt = (creativeFocus: string[]) =>
  `
${BASE_CREATIVE_PROMPT}
${creativeFocus.join("\n")}
${OUTPUT_REQUIREMENTS_PROMPT}
`.trim();

export const DEFAULT_GENERATION_STYLE_ID = "sp01";

export const GENERATION_STYLES: GenerationStyle[] = [
  {
    id: "sp01",
    name: "Default",
    method: "Control",
    hypothesis:
      "This preserves the current production system prompt and serves as the baseline.",
    systemPrompt: buildGenerationStylePrompt([]),
  },
  {
    id: "sp02",
    name: "Schema Lock",
    method: "Parser-first strictness",
    hypothesis:
      "Stronger formatting constraints should reduce invalid JSON and improve consistency across providers.",
    systemPrompt: buildGenerationStylePrompt([
      "Before finalizing, silently verify that every required field exists and that no extra wrapper text is present.",
      "Prefer fewer tracks over malformed structure; structural correctness is higher priority than ambition.",
      "If a musical choice conflicts with the schema, choose the schema-compliant option.",
    ]),
  },
  {
    id: "sp03",
    name: "Hook First",
    method: "Motif-led composition",
    hypothesis:
      "Asking for a memorable hook first should improve the identity and replay value of generated ideas.",
    systemPrompt: buildGenerationStylePrompt([
      "Start from one memorable motif or hook, then build the rest of the arrangement around it.",
      "Let the strongest melodic idea return in transformed form rather than introducing too many unrelated phrases.",
      "Favor singable, rhythmically distinctive motifs over constant note churn.",
    ]),
  },
  {
    id: "sp04",
    name: "Groove Architect",
    method: "Rhythm-first writing",
    hypothesis:
      "Rhythm-focused instructions should produce stronger grooves and less generic scalar motion.",
    systemPrompt: buildGenerationStylePrompt([
      "Prioritize rhythmic identity before pitch detail.",
      "Use syncopation, rests, anticipations, and staggered entrances to create forward motion.",
      "Make the groove feel intentional across tracks rather than having every part attack on the same beats.",
    ]),
  },
  {
    id: "sp05",
    name: "Arrangement Contrast",
    method: "Section and texture planning",
    hypothesis:
      "Explicit contrast guidance should create more dynamic arrangements and less loop-like stagnation.",
    systemPrompt: buildGenerationStylePrompt([
      "Design clear contrast between at least two textural states such as sparse vs dense, low vs high, or tight vs open.",
      "Give each track a specific role so the arrangement feels layered instead of duplicated.",
      "Make the piece evolve over time with at least one meaningful arrangement shift.",
    ]),
  },
  {
    id: "sp06",
    name: "Intentional Space",
    method: "Restraint and negative space",
    hypothesis:
      "A restraint-focused prompt should reduce clutter and produce cleaner, more playable musical ideas.",
    systemPrompt: buildGenerationStylePrompt([
      "Use fewer notes when that creates more impact.",
      "Leave deliberate space for phrases to breathe instead of filling every beat.",
      "Prefer strong note choices, clear register separation, and purposeful silence over density for its own sake.",
    ]),
  },
  {
    id: "sp07",
    name: "Harmonic Color",
    method: "Chord and voicing emphasis",
    hypothesis:
      "Emphasizing harmonic color should improve emotional depth and reduce plain triadic writing.",
    systemPrompt: buildGenerationStylePrompt([
      "Seek tasteful harmonic color through voicing, extensions, suspensions, pedal tones, or modal flavor when it suits the prompt.",
      "Avoid bland block-chord repetition unless the prompt explicitly calls for it.",
      "Make harmonic movement feel expressive, not merely functional.",
    ]),
  },
  {
    id: "sp08",
    name: "Performer Realism",
    method: "Idiomatic playability",
    hypothesis:
      "Instrument-aware phrasing should make outputs feel more performable and less mechanically generated.",
    systemPrompt: buildGenerationStylePrompt([
      "Write lines that feel idiomatic for their instrument and plausible for a performer.",
      "Respect realistic register use, phrase lengths, and breathing or hand-shape logic when relevant.",
      "Avoid impossible jumps, awkward overlaps, or robotic machine-gun repetition unless the prompt explicitly wants that effect.",
    ]),
  },
  {
    id: "sp09",
    name: "Interlocking Lines",
    method: "Countermotion and interplay",
    hypothesis:
      "Explicit line independence should improve texture and reduce tracks that merely shadow each other.",
    systemPrompt: buildGenerationStylePrompt([
      "Favor interlocking lines, call-and-response, and complementary motion between tracks.",
      "Avoid having every track mirror the same contour at the same time.",
      "Let accompaniment patterns support the lead through contrast in rhythm, register, or contour.",
    ]),
  },
  {
    id: "sp10",
    name: "Silent Critic",
    method: "Internal self-review",
    hypothesis:
      "A silent self-critique step should improve musical distinctiveness without changing the external API contract.",
    systemPrompt: buildGenerationStylePrompt([
      "Before producing the final JSON, silently critique the draft for blandness, repetition, and weak identity.",
      "Revise once if needed so the result has a clearer hook, groove, or color while still obeying all constraints.",
      "Only output the final approved composition.",
    ]),
  },
];

export const getGenerationStyleById = (styleId: string): GenerationStyle | null =>
  GENERATION_STYLES.find((style) => style.id === styleId) ?? null;
