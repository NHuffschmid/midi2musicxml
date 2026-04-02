import { describe, it, expect } from 'vitest';
import { estimateGlobalTempo } from '../../utils/estimateGlobalTempo';
import { makeOnsetSequence } from '../helpers/notes';

/**
 * Unit tests for estimateGlobalTempo.
 *
 * The algorithm:
 *  1. Extracts unique onsets (dedup chord notes within 20 ms).
 *  2. Computes Inter-Onset Intervals (IOIs).
 *  3. Finds the dominant IOI via a histogram.
 *  4. Maps it to a BPM in the [60, 180] range.
 *  5. Returns 120 BPM as fallback when there is insufficient data.
 */
describe('estimateGlobalTempo', () => {

  // ── Fallback cases ────────────────────────────────────────────────────────

  it('returns 120 BPM for an empty note array', () => {
    expect(estimateGlobalTempo([])).toBe(120);
  });

  it('returns 120 BPM when there are fewer than 4 unique onsets', () => {
    const notes = makeOnsetSequence(3, 0.5);
    expect(estimateGlobalTempo(notes)).toBe(120);
  });

  it('returns 120 BPM when all IOIs are outside the [0.25 s, 1.5 s] range', () => {
    // Very fast notes (5 ms apart) – IOIs are less than 0.25 s, filtered out.
    const notes = makeOnsetSequence(20, 0.005);
    expect(estimateGlobalTempo(notes)).toBe(120);
  });

  // ── Correct estimation ────────────────────────────────────────────────────

  it('estimates 100 BPM from notes spaced 0.6 s apart (quarter note at 100 BPM)', () => {
    // Onset interval 0.6 s → bins cleanly to 0.60 s.
    // Candidate BPMs: 200, 100, 50.  Only 100 falls in [60, 180] → unambiguous.
    const notes = makeOnsetSequence(20, 0.6);
    const bpm = estimateGlobalTempo(notes);
    expect(bpm).toBeCloseTo(100, 0);
  });

  it('estimates ~60 BPM from notes spaced 1.0 s apart', () => {
    // Onset interval 1.0 s → dominant period = 1.0 s.
    // Candidate BPMs: 120, 60, 30.  Both 120 and 60 are in [60, 180].
    // The algorithm picks the second (lower) of the two → 60.
    const notes = makeOnsetSequence(12, 1.0);
    const bpm = estimateGlobalTempo(notes);
    expect(bpm).toBeCloseTo(60, 0);
  });

  it('returns a plausible BPM for ambiguous quarter-note spacing (0.5 s)', () => {
    // 0.5 s interval is consistent with both 120 BPM (quarter) and 60 BPM (half).
    // The algorithm may return either; both are valid musical interpretations.
    const notes = makeOnsetSequence(16, 0.5);
    const bpm = estimateGlobalTempo(notes);
    expect(bpm === 60 || bpm === 120).toBe(true);
  });

  it('returns a BPM within the expected musical range [60, 180] for typical patterns', () => {
    // Notes roughly at 0.4 s intervals (150 BPM quarter, 75 BPM half).
    // Regardless of interpretation, the result should be within [60, 180].
    const notes = makeOnsetSequence(20, 0.4);
    const bpm = estimateGlobalTempo(notes);
    expect(bpm).toBeGreaterThanOrEqual(60);
    expect(bpm).toBeLessThanOrEqual(180);
  });
});
