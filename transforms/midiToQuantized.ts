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
 * meets or exceeds `detectionThreshold` (default 50 %).
 *
 * For a grid of ppq/24:
 *   - All standard note values down to 32nd notes are exact multiples.
 *   - Triplet subdivisions (eighth-triplet = ppq*2/3, etc.) are also exact.
 *
 * Live-recording processing pipeline
 * ------------------------------------
 * When live-recording is detected, the following sub-steps are applied:
 *
 *   Step A — Global tempo estimation (IOI histogram)
 *     Analyses inter-onset intervals to find the dominant beat period and
 *     derives a global BPM estimate.
 *
 *   Step B — Tempo-map construction
 *     Divides the piece into windows of N measures (default 4) and finds the
 *     local BPM per window that minimises mean-square distance of rescaled note
 *     ticks to the nearest beat-grid position.  Deviation is capped at ±10 %
 *     of the global BPM.  Adjacent windows are linearly interpolated.
 *
 *   Step C — Tempo-map application
 *     Rescales each note's ticks and durationTicks by (localBpm / referenceBpm),
 *     where referenceBpm is the tempo the recording software used (MIDI header).
 *     After this step, note positions closely approximate the beat grid.
 *
 *   Step D — Grid quantization
 *     Snaps residual offsets: rounds ticks and durationTicks to the nearest
 *     multiple of the grid (ppq / gridDivisor).
 */

import { MidiNote } from '../types';
import { QuantizedScore } from '../models/QuantizedModel';
import { quantizeMidiNotes } from '../utils/quantizeMidiNotes';
import { estimateGlobalTempo } from '../utils/estimateGlobalTempo';
import { buildTempoMap } from '../utils/buildTempoMap';
import { applyTempoMap } from '../utils/applyTempoMap';

/** Default quantization grid: ppq / 24 covers all values down to 32nds + triplets. */
const DEFAULT_GRID_DIVISOR = 24;

/**
 * Minimum fraction of notes that must already sit on the grid for the input
 * to be classified as "score-derived / already quantized".
 */
const DEFAULT_DETECTION_THRESHOLD = 0.50;

export interface MidiToQuantizedOptions {
  /**
   * Divisor applied to PPQ to obtain the grid size in ticks.
   * Default: 24  (grid = ppq / 24).
   */
  gridDivisor?: number;

  /**
   * Fraction [0, 1] of notes that must be grid-aligned for the data to be
   * treated as already quantized.
   */
  detectionThreshold?: number;

  /**
   * Number of beats per measure, used for tempo-map window sizing.
   * Default: 4 (4/4 time).
   */
  beatsPerMeasure?: number;
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

  // Live-recording: 4-step processing pipeline.

  // Step A: Estimate global tempo via IOI histogram.
  const estimatedBpm = estimateGlobalTempo(notes);
  console.log(`midiToQuantized: estimated global tempo = ${estimatedBpm} BPM`);

  // Step B: Build window-based tempo map (±10 % around globalBpm).
  const referenceBpm = notes[0].tempo ?? 120;
  const beatsPerMeasure = options.beatsPerMeasure ?? 4;
  const tempoMap = buildTempoMap(notes, estimatedBpm, ppq, beatsPerMeasure, referenceBpm);
  console.log(
    `midiToQuantized: tempoMap has ${tempoMap.length} window(s), ` +
    `BPM range [${Math.min(...tempoMap.map(e => e.bpm)).toFixed(1)}, ` +
    `${Math.max(...tempoMap.map(e => e.bpm)).toFixed(1)}]`
  );

  // Step C: Apply tempo map — rescale ticks to approximate the beat grid.
  const remappedNotes = applyTempoMap(notes, tempoMap, referenceBpm);

  // Step D: Snap residual offsets to the quantization grid.
  const quantizedNotes = quantizeMidiNotes(remappedNotes, ppq, gridDivisor);

  return {
    notes: quantizedNotes,
    ppq,
    wasQuantized: true,
    gridDivisor,
    gridTicks,
    gridAlignmentRatio,
    estimatedBpm,
    tempoMap
  };
}
