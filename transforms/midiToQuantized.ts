/**
 * Transform: raw MidiNote[] → QuantizedScore
 *
 * This is the optional Stage 1.5 of the midi2musicxml pipeline, inserted
 * between raw MIDI data collection (Stage 1) and the TemporalModel (Stage 2).
 *
 * Detection heuristic
 * -------------------
 * A MIDI file is considered *already quantized* when the fraction of notes
 * whose ticks and durationTicks are exact multiples of the quantization grid
 * meets or exceeds `detectionThreshold` (default 0.90 = 90 %).
 *
 * For a grid of ppq/24:
 *   - All standard note values down to 32nd notes are exact multiples.
 *   - Triplet subdivisions (eighth-triplet = ppq*2/3, etc.) are also exact.
 *   - Only exotic values like 64th notes (ppq/16 not divisible by ppq/24 in
 *     general) would fall off the grid — hence the 90 % threshold rather
 *     than 100 %.
 *
 * Future extensions
 * -----------------
 * This transform is the intended place for:
 *   - Tempo-map optimisation (shifting tempos so notes fit bar lines)
 *   - Beat-grid alignment (adjusting timestamps to minimise offset from
 *     the nearest beat/subdivision)
 *   - Swing/humanisation removal
 */

import { MidiNote } from '../types';
import { QuantizedScore } from '../models/QuantizedModel';
import { quantizeMidiNotes } from '../utils/quantizeMidiNotes';

/** Default quantization grid: ppq / 24 covers all values down to 32nds + triplets. */
const DEFAULT_GRID_DIVISOR = 24;

/**
 * Minimum fraction of notes that must already sit on the grid for the input
 * to be classified as "score-derived / already quantized".
 */
const DEFAULT_DETECTION_THRESHOLD = 0.80;

export interface MidiToQuantizedOptions {
  /**
   * Divisor applied to PPQ to obtain the grid size in ticks.
   * Default: 24  (grid = ppq / 24).
   */
  gridDivisor?: number;

  /**
   * Fraction [0, 1] of notes that must be grid-aligned for the data to be
   * treated as already quantized.
   * Default: 0.80 (= 80 %).
   */
  detectionThreshold?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the fraction of notes whose ticks and durationTicks are exact
 * multiples of `gridTicks`.
 */
function computeGridAlignmentRatio(notes: MidiNote[], gridTicks: number): number {
  if (notes.length === 0) return 1;
  const aligned = notes.filter(
    n => n.ticks % gridTicks === 0 && n.durationTicks % gridTicks === 0
  ).length;
  return aligned / notes.length;
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

/**
 * Analyse the MIDI notes and, when necessary, quantize them.
 *
 * @param notes  Array of MidiNote collected by Stage 1.
 * @param ppq    Pulses per quarter note from the MIDI header.
 * @param options Optional configuration for grid and detection threshold.
 * @returns      A QuantizedScore ready to be fed into Stage 2 (midiToTemporal).
 */
export function midiToQuantized(
  notes: MidiNote[],
  ppq: number,
  options: MidiToQuantizedOptions = {}
): QuantizedScore {
  const gridDivisor = options.gridDivisor ?? DEFAULT_GRID_DIVISOR;
  const detectionThreshold = options.detectionThreshold ?? DEFAULT_DETECTION_THRESHOLD;
  const gridTicks = ppq / gridDivisor;

  const gridAlignmentRatio = computeGridAlignmentRatio(notes, gridTicks);
  const alreadyQuantized = gridAlignmentRatio >= detectionThreshold;

  console.log(
    `midiToQuantized: alignment=${(gridAlignmentRatio * 100).toFixed(1)}% ` +
    `(threshold=${(detectionThreshold * 100).toFixed(0)}%) → ` +
    (alreadyQuantized ? 'score-derived, no quantization needed' : 'live-recording detected, quantization required')
  );

  if (alreadyQuantized) {
    // Score-derived file: timestamps are authoritative, nothing to do.
    return {
      notes,
      ppq,
      wasQuantized: false,
      gridDivisor,
      gridTicks,
      gridAlignmentRatio
    };
  }

  // Live-recording: align ticks and durations to the grid.
  const quantizedNotes = quantizeMidiNotes(notes, ppq, gridDivisor);

  return {
    notes: quantizedNotes,
    ppq,
    wasQuantized: true,
    gridDivisor,
    gridTicks,
    gridAlignmentRatio
  };
}
