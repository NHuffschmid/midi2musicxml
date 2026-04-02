/**
 * Utility: Build a local tempo map from raw (live-recorded) MIDI notes.
 *
 * Algorithm
 * ---------
 * 1. Divide the note timeline into windows of WINDOW_MEASURES measures
 *    (default 4), based on the original tick space.
 * 2. For each window, perform a grid search over BPM candidates in the range
 *    [globalBpm × (1 − MAX_BPM_DEVIATION), globalBpm × (1 + MAX_BPM_DEVIATION)].
 * 3. For each candidate BPM, compute the scale factor (candidateBpm / referenceBpm)
 *    and apply it to every note onset tick in the window.  Measure quality as
 *    the mean-square distance of the rescaled ticks to their nearest beat-grid
 *    position (multiples of ppq).
 * 4. The candidate that produces the lowest MSE becomes the local BPM for the
 *    window.
 * 5. Windows with fewer than MIN_NOTES_PER_WINDOW notes fall back to globalBpm.
 *
 * Why this works
 * --------------
 * A live-recorded MIDI file stores ticks using a fixed reference BPM from the
 * recording session (typically 120 BPM from the MIDI header).  If the player
 * performed at a different actual tempo, all ticks are systematically offset.
 * After multiplying by (actualBpm / referenceBpm) the ticks align with the
 * standard beat grid (multiples of ppq).  Doing this per window allows for
 * gradual tempo drifts across the piece.
 *
 * The resulting TempoMapEntry[] is applied to the notes via applyTempoMap()
 * before the final grid-quantization step.
 */

import { MidiNote } from '../types';
import { TempoMapEntry } from '../models/QuantizedModel';

/** Number of measures per analysis window. */
const WINDOW_MEASURES = 4;

/** Maximum allowed BPM deviation from global BPM (±10 %). */
const MAX_BPM_DEVIATION = 0.10;

/** Number of candidate BPM values tested per window. */
const BPM_SEARCH_STEPS = 80;

/** Minimum number of notes in a window for local estimation to be meaningful. */
const MIN_NOTES_PER_WINDOW = 4;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the mean-square distance of rescaled ticks to the nearest beat-grid
 * position (multiple of ticksPerBeat).
 *
 * For each tick t, the rescaled value is t * scale.  The distance to the
 * nearest grid point is min(mod, ticksPerBeat - mod) where mod = rescaled % ticksPerBeat.
 */
function windowMse(
  ticks: number[],
  scale: number,
  ticksPerBeat: number
): number {
  let sum = 0;
  for (const t of ticks) {
    const rescaled = t * scale;
    const mod = rescaled % ticksPerBeat;
    const dist = Math.min(mod, ticksPerBeat - mod);
    sum += dist * dist;
  }
  return sum / ticks.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a tempo map for a live-recorded MIDI note array.
 *
 * @param notes            Raw MidiNote[] (before tempo-map application).
 * @param globalBpm        Overall BPM estimate (from estimateGlobalTempo).
 * @param ppq              Pulses per quarter note.
 * @param beatsPerMeasure  Beats per measure for window sizing (default 4).
 * @param referenceBpm     The BPM the recording software used to encode ticks
 *                         (from the MIDI header; default 120).
 * @returns Sorted array of TempoMapEntry values covering [0, maxTick].
 */
export function buildTempoMap(
  notes: MidiNote[],
  globalBpm: number,
  ppq: number,
  beatsPerMeasure: number = 4,
  referenceBpm: number = 120
): TempoMapEntry[] {
  if (notes.length === 0) {
    return [{ startTick: 0, bpm: globalBpm }];
  }

  const ticksPerBeat = ppq; // beat grid in canonical tick space
  const windowTicks = WINDOW_MEASURES * beatsPerMeasure * ppq;
  const maxTick = Math.max(...notes.map(n => n.ticks));

  const bpmMin = globalBpm * (1 - MAX_BPM_DEVIATION);
  const bpmMax = globalBpm * (1 + MAX_BPM_DEVIATION);
  const bpmStep = (bpmMax - bpmMin) / BPM_SEARCH_STEPS;

  const entries: TempoMapEntry[] = [];

  for (let windowStart = 0; windowStart <= maxTick; windowStart += windowTicks) {
    const windowEnd = windowStart + windowTicks;
    const windowTicks_ = notes
      .filter(n => n.ticks >= windowStart && n.ticks < windowEnd)
      .map(n => n.ticks);

    if (windowTicks_.length < MIN_NOTES_PER_WINDOW) {
      entries.push({ startTick: windowStart, bpm: globalBpm });
      continue;
    }

    let bestBpm = globalBpm;
    let bestMse = Infinity;

    for (let bpm = bpmMin; bpm <= bpmMax + bpmStep * 0.5; bpm += bpmStep) {
      const mse = windowMse(windowTicks_, bpm / referenceBpm, ticksPerBeat);
      if (mse < bestMse) {
        bestMse = mse;
        bestBpm = bpm;
      }
    }

    // Round to 0.1 BPM precision
    entries.push({ startTick: windowStart, bpm: Math.round(bestBpm * 10) / 10 });
  }

  return entries;
}
