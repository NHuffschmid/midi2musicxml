import { describe, it, expect } from 'vitest';
import { midiToQuantized } from '../../transforms/midiToQuantized';
import { makeNote } from '../helpers/notes';

/**
 * Unit tests for midiToQuantized (Stage 1.5 of the pipeline).
 *
 * The key decision: is the input score-derived (already on the grid) or
 * live-recorded (needs quantization)?  The function reports this via
 * `wasQuantized` and optionally transforms the tick values.
 */
describe('midiToQuantized', () => {
  const PPQ = 480;

  // ── Score-derived input ───────────────────────────────────────────────────

  it('classifies score-derived input (all ticks on grid) as wasQuantized=false', () => {
    // All notes at exact 16th-note grid positions (120 ticks apart).
    const notes = [
      makeNote(60, 0,   480),
      makeNote(62, 480, 480),
      makeNote(64, 960, 480),
    ];
    const result = midiToQuantized(notes, PPQ);
    expect(result.wasQuantized).toBe(false);
  });

  it('returns the original notes unchanged for score-derived input', () => {
    const notes = [
      makeNote(60, 0,   480),
      makeNote(62, 480, 240),
    ];
    const result = midiToQuantized(notes, PPQ);
    expect(result.notes[0].ticks).toBe(0);
    expect(result.notes[0].durationTicks).toBe(480);
    expect(result.notes[1].ticks).toBe(480);
    expect(result.notes[1].durationTicks).toBe(240);
  });

  it('reports the correct ppq and gridDivisor for score-derived input', () => {
    const notes = [makeNote(60, 0, 480)];
    const result = midiToQuantized(notes, PPQ);
    expect(result.ppq).toBe(PPQ);
    expect(result.gridDivisor).toBe(4); // default
    expect(result.gridTicks).toBe(PPQ / 4); // 120
  });

  // ── Live-recorded input ───────────────────────────────────────────────────

  it('classifies live-recorded input (no ticks on grid) as wasQuantized=true', () => {
    // All ticks are off the 16th-note grid (each tick is not a multiple of 120).
    const offGridNotes = [
      makeNote(60, 7,   467,  { time: 0.01,  duration: 0.48 }),
      makeNote(62, 489, 233,  { time: 0.51,  duration: 0.24 }),
      makeNote(64, 972, 471,  { time: 1.01,  duration: 0.49 }),
      makeNote(65, 1455, 468, { time: 1.51,  duration: 0.49 }),
      makeNote(67, 1939, 479, { time: 2.01,  duration: 0.50 }),
    ];
    const result = midiToQuantized(offGridNotes, PPQ, { detectionThreshold: 0.95 });
    expect(result.wasQuantized).toBe(true);
  });

  it('provides estimatedBpm for live-recorded input', () => {
    // Notes spaced ~0.5 s apart in time → BPM ≈ 120
    const offGridNotes = Array.from({ length: 8 }, (_, i) =>
      makeNote(60 + i, i * 489 + 3, 467, {
        time: i * 0.5 + 0.01,
        duration: 0.47,
      })
    );
    const result = midiToQuantized(offGridNotes, PPQ, { detectionThreshold: 0.95 });
    expect(result.wasQuantized).toBe(true);
    expect(result.estimatedBpm).toBeDefined();
    expect(result.estimatedBpm).toBeGreaterThan(60);
    expect(result.estimatedBpm).toBeLessThan(240);
  });

  // ── gridAlignmentRatio ────────────────────────────────────────────────────

  it('reports a gridAlignmentRatio of 1.0 for fully-aligned notes', () => {
    const notes = [makeNote(60, 0, 480), makeNote(62, 480, 240)];
    const result = midiToQuantized(notes, PPQ);
    expect(result.gridAlignmentRatio).toBe(1);
  });

  it('reports a gridAlignmentRatio of 0 for fully off-grid notes', () => {
    // Ticks 1, 3, 5 are not multiples of 120 (default grid).
    const notes = [
      makeNote(60, 1, 1),
      makeNote(62, 3, 1),
      makeNote(64, 5, 1),
    ];
    const result = midiToQuantized(notes, PPQ, { detectionThreshold: 0.95 });
    expect(result.gridAlignmentRatio).toBe(0);
  });
});
