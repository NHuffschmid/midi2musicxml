import { describe, it, expect } from 'vitest';
import { quantizeMidiNotes } from '../../utils/quantizeMidiNotes';
import { makeNote } from '../helpers/notes';

/**
 * Unit tests for quantizeMidiNotes.
 *
 * The function snaps note onset ticks and durationTicks to the nearest
 * multiple of (ppq / gridDivisor).  A minimum of one grid unit is enforced
 * for durationTicks to avoid zero-length notes.
 */
describe('quantizeMidiNotes', () => {
  const PPQ = 480;

  // ── Already-aligned notes ─────────────────────────────────────────────────

  it('passes through notes already on a 16th-note grid (default divisor=24)', () => {
    // Grid = 480/24 = 20 ticks.  These notes sit exactly on 20-tick boundaries.
    const notes = [
      makeNote(60, 0, 480),    // C4 quarter – onset and duration are multiples of 20
      makeNote(62, 480, 240),  // D4 eighth
    ];
    const result = quantizeMidiNotes(notes, PPQ);
    expect(result[0].ticks).toBe(0);
    expect(result[0].durationTicks).toBe(480);
    expect(result[1].ticks).toBe(480);
    expect(result[1].durationTicks).toBe(240);
  });

  // ── Onset quantization ────────────────────────────────────────────────────

  it('snaps an onset that is 3 ticks off-grid to the nearest grid point', () => {
    // Grid = 480/24 = 20 ticks.  Input tick = 483 → nearest multiple of 20 = 480.
    const note = makeNote(60, 483, 480);
    const [result] = quantizeMidiNotes([note], PPQ);
    expect(result.ticks).toBe(480);
  });

  it('snaps an onset that rounds up correctly', () => {
    // Grid = 20 ticks.  Input tick = 491 → nearest multiple of 20 = 500.
    const note = makeNote(60, 491, 480);
    const [result] = quantizeMidiNotes([note], PPQ);
    expect(result.ticks).toBe(500);
  });

  // ── Duration quantization ─────────────────────────────────────────────────

  it('quantizes durationTicks to the nearest grid multiple', () => {
    // Grid = 20 ticks.  Duration = 237 → nearest multiple of 20 = 240.
    const note = makeNote(60, 0, 237);
    const [result] = quantizeMidiNotes([note], PPQ);
    expect(result.durationTicks).toBe(240);
  });

  // ── Minimum duration ──────────────────────────────────────────────────────

  it('enforces a minimum durationTicks of one grid unit', () => {
    // Grid = 20 ticks.  Duration = 3 → rounds to 0, but minimum is 20.
    const note = makeNote(60, 0, 3);
    const [result] = quantizeMidiNotes([note], PPQ);
    expect(result.durationTicks).toBeGreaterThanOrEqual(20);
  });

  // ── Custom gridDivisor ────────────────────────────────────────────────────

  it('uses a custom gridDivisor to determine grid size', () => {
    // gridDivisor=4 → grid = 480/4 = 120 ticks (16th-note grid).
    // Input tick = 125 → nearest 120-multiple = 120.
    const note = makeNote(60, 125, 480);
    const [result] = quantizeMidiNotes([note], PPQ, 4);
    expect(result.ticks).toBe(120);
  });

  // ── Immutability: original array is not modified ──────────────────────────

  it('returns a new array without mutating the input notes', () => {
    const note = makeNote(60, 5, 237);
    const original = { ...note };
    quantizeMidiNotes([note], PPQ);
    expect(note.ticks).toBe(original.ticks);
    expect(note.durationTicks).toBe(original.durationTicks);
  });

  // ── Fields other than ticks/durationTicks are preserved ───────────────────

  it('preserves all non-tick fields on each note', () => {
    const note = makeNote(69, 480, 480);
    note.velocity = 0.65;
    const [result] = quantizeMidiNotes([note], PPQ);
    expect(result.midi).toBe(69);
    expect(result.velocity).toBe(0.65);
  });
});
