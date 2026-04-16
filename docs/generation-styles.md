# Generation Styles

The main app now exposes ten selectable generation styles through the `Style` dropdown in the composer.

## Default Comparison Rules

- Keep the model fixed when comparing styles.
- Keep tempo, key, time signature, bars, and constraints fixed when comparing styles.
- Use the same user prompt across runs when you want a fair comparison.
- The default style is `sp01`, which preserves the app's original production system prompt.

## Style Reference

| ID | Name | Method | Hypothesis |
| --- | --- | --- | --- |
| `sp01` | Default | Control | Preserves the original production system prompt and serves as the baseline. |
| `sp02` | Schema Lock | Parser-first strictness | Stronger formatting language should reduce malformed JSON and improve consistency. |
| `sp03` | Hook First | Motif-led composition | Starting from a memorable hook should improve replay value and identity. |
| `sp04` | Groove Architect | Rhythm-first writing | Rhythm-focused language should produce stronger grooves and less generic contour. |
| `sp05` | Arrangement Contrast | Section and texture planning | Explicit contrast guidance should reduce loop-like stagnation. |
| `sp06` | Intentional Space | Restraint and negative space | Restraint-focused guidance should reduce clutter and improve clarity. |
| `sp07` | Harmonic Color | Chord and voicing emphasis | Harmonic-color language should improve emotional depth and reduce plain writing. |
| `sp08` | Performer Realism | Idiomatic playability | Instrument-aware phrasing should feel more performable and less mechanical. |
| `sp09` | Interlocking Lines | Countermotion and interplay | Explicit line independence should improve texture and reduce shadowing between tracks. |
| `sp10` | Silent Critic | Internal self-review | A silent critique pass should improve distinctiveness before output. |
