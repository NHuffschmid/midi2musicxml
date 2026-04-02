/**
 * Utility: Global tempo estimation via Inter-Onset Interval (IOI) histogram
 *
 * Algorithm
 * ---------
 * 1. Extract unique note onset times (seconds), deduplicating chord notes
 *    whose onsets lie within CHORD_TOLERANCE_S of each other.
 * 2. Compute consecutive Inter-Onset Intervals (IOIs).
 * 3. Filter IOIs to the musically plausible beat range [IOI_MIN_S, IOI_MAX_S].
 * 4. Build a histogram (bin size BIN_SIZE_S) and find the dominant peak —
 *    the most common IOI value, which approximates the beat period.
 * 5. Test candidate beat periods: peak × {0.5, 1, 2}.
 *    These represent "double time", "normal", and "half time" interpretations.
 * 6. Convert each candidate to BPM and select the one in [60, 180] BPM.
 *    If none qualifies, pick the candidate closest to that range.
 * 7. Round to the nearest musically useful BPM value.
 *
 * Returns 120 BPM as a fallback when there is insufficient data.
 */

import { MidiNote } from '../types';

/** Two onsets within this window are considered simultaneous (chord members). */
const CHORD_TOLERANCE_S = 0.020; // 20 ms

/** Lower bound for a plausible beat IOI (= 240 BPM). */
const IOI_MIN_S = 0.25;

/** Upper bound for a plausible beat IOI (= 40 BPM). */
const IOI_MAX_S = 1.5;

/** Histogram bin width in seconds. */
const BIN_SIZE_S = 0.020; // 20 ms

/** BPM range preferred when selecting among octave-equivalent candidates. */
const PREFERRED_BPM_MIN = 60;
const PREFERRED_BPM_MAX = 180;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return a sorted list of unique onset times (seconds), merging any two onsets
 * that are within CHORD_TOLERANCE_S of each other into a single representative.
 */
function getUniqueOnsets(notes: MidiNote[]): number[] {
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const onsets: number[] = [];
  let prev = -Infinity;
  for (const note of sorted) {
    if (note.time - prev > CHORD_TOLERANCE_S) {
      onsets.push(note.time);
      prev = note.time;
    }
  }
  return onsets;
}

/**
 * Compute consecutive inter-onset intervals from a sorted onset array.
 */
function computeIOIs(onsets: number[]): number[] {
  const iois: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    iois.push(onsets[i] - onsets[i - 1]);
  }
  return iois;
}

/**
 * Build a histogram of IOI values and return the centre of the most-populated
 * bin — the dominant beat period estimate.
 */
function findHistogramPeak(iois: number[], binSize: number): number {
  const counts = new Map<number, number>();
  for (const t of iois) {
    const bin = Math.round(t / binSize) * binSize;
    counts.set(bin, (counts.get(bin) ?? 0) + 1);
  }
  let bestBin = 0;
  let bestCount = 0;
  for (const [bin, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestBin = bin;
    }
  }
  return bestBin;
}

/**
 * Round a raw BPM value to the nearest musically natural step:
 * - BPM < 80 → nearest 0.5 BPM
 * - BPM ≥ 80 → nearest integer BPM
 */
function roundBpm(bpm: number): number {
  if (bpm < 80) return Math.round(bpm * 2) / 2;
  return Math.round(bpm);
}

/**
 * From a list of candidate beat-period values (seconds), select the one whose
 * BPM lies in [PREFERRED_BPM_MIN, PREFERRED_BPM_MAX].  If multiple qualify,
 * return the most central one.  If none qualifies, return the candidate
 * closest to the preferred range.
 */
function pickBestBpm(candidates: number[]): number {
  const bpms = candidates.map(t => roundBpm(60 / t));
  const inRange = bpms.filter(b => b >= PREFERRED_BPM_MIN && b <= PREFERRED_BPM_MAX);
  if (inRange.length > 0) {
    return inRange[Math.floor(inRange.length / 2)];
  }
  const center = (PREFERRED_BPM_MIN + PREFERRED_BPM_MAX) / 2;
  return bpms.reduce(
    (best, b) => (Math.abs(b - center) < Math.abs(best - center) ? b : best),
    bpms[0]
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimate the global tempo of a live-recorded MIDI note array.
 *
 * The result is an integer (or half-integer) BPM value that best represents
 * the dominant beat period found in the onset data.
 *
 * @param notes  Array of MidiNote from `collectMidiNotes()`.
 * @returns      Estimated tempo in BPM.  Falls back to 120 when there is
 *               insufficient data (< 4 unique onsets or < 3 usable IOIs).
 */
export function estimateGlobalTempo(notes: MidiNote[]): number {
  const onsets = getUniqueOnsets(notes);
  if (onsets.length < 4) {
    return 120;
  }

  const allIOIs = computeIOIs(onsets);
  const filteredIOIs = allIOIs.filter(t => t >= IOI_MIN_S && t <= IOI_MAX_S);
  if (filteredIOIs.length < 3) {
    return 120;
  }

  const dominantPeriod = findHistogramPeak(filteredIOIs, BIN_SIZE_S);
  if (dominantPeriod <= 0) {
    return 120;
  }

  // Test "half-beat", "beat", and "two-beat" interpretations.
  const candidates = [dominantPeriod / 2, dominantPeriod, dominantPeriod * 2].filter(
    t => t > 0 && 60 / t >= 40 && 60 / t <= 300
  );

  return pickBestBpm(candidates);
}
