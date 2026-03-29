import { describe, it, expect } from 'vitest';
import { analyseKey } from '../../analysis/analyseKey';
import { makeMeasureNotes, C_MAJOR_MIDI, G_MAJOR_MIDI, D_MAJOR_MIDI } from '../helpers/notes';

/**
 * Unit tests for analyseKey.
 *
 * The algorithm scores each candidate key by summing the duration of notes
 * that deviate from its diatonic scale, then picks the best match.
 */
describe('analyseKey', () => {

  // ── Fallback ──────────────────────────────────────────────────────────────

  it('defaults to C major when there are no notes', () => {
    const result = analyseKey([{ notes: [] }]);
    expect(result).toEqual({ fifths: 0, mode: 'major' });
  });

  // ── Major keys ────────────────────────────────────────────────────────────

  it('detects C major from a C major scale (no accidentals)', () => {
    const measure = makeMeasureNotes(C_MAJOR_MIDI);
    const result = analyseKey([measure]);
    expect(result).toEqual({ fifths: 0, mode: 'major' });
  });

  it('detects G major from a G major scale (one sharp: F#)', () => {
    // G major: G A B C D E F#
    // F# (MIDI 66) is the accidental that distinguishes G major from C major.
    const measure = makeMeasureNotes(G_MAJOR_MIDI);
    const result = analyseKey([measure]);
    expect(result).toEqual({ fifths: 1, mode: 'major' });
  });

  it('detects D major from a D major scale (two sharps: F#, C#)', () => {
    // D major: D E F# G A B C#
    const measure = makeMeasureNotes(D_MAJOR_MIDI);
    const result = analyseKey([measure]);
    expect(result).toEqual({ fifths: 2, mode: 'major' });
  });

  it('detects F major from a scale with Bb (one flat)', () => {
    // F major: F G A Bb C D E  (pitch classes 5 7 9 10 0 2 4)
    const fMajorMidi = [65, 67, 69, 70, 72, 74, 76, 77]; // F3 G3 A3 Bb3 C4 D4 E4 F4
    const measure = makeMeasureNotes(fMajorMidi);
    const result = analyseKey([measure]);
    expect(result).toEqual({ fifths: -1, mode: 'major' });
  });

  // ── Multiple measures ─────────────────────────────────────────────────────

  it('analyses multiple measures together', () => {
    // Each measure has only a subset of G major notes;
    // combined they form the full G major scale.
    const m1 = makeMeasureNotes([55, 57, 59]); // G A B (G major diatonic)
    const m2 = makeMeasureNotes([60, 62, 64, 66]); // C D E F# (F# is the G-major accidental)
    const result = analyseKey([m1, m2]);
    expect(result).toEqual({ fifths: 1, mode: 'major' });
  });

  // ── Preference for fewer accidentals on tie ───────────────────────────────

  it('prefers the key with fewer accidentals when scores are equal', () => {
    // Notes that fit both C and G major (common tones: C D E G A B).
    // C major should win because it has 0 accidentals vs. 1 for G major.
    const sharedNotes = [60, 62, 64, 67, 69, 71]; // C D E G A B
    const measure = makeMeasureNotes(sharedNotes);
    const result = analyseKey([measure]);
    expect(result.fifths).toBe(0); // C major
  });
});
