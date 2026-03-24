import { MidiNote } from '../types';

/**
 * A single entry in a tempo map: the local BPM that applies from `startTick`
 * onwards (until the next entry or the end of the piece).
 */
export interface TempoMapEntry {
  /** Start tick in the *original* (pre-rescaling) tick space. */
  startTick: number;
  /** Local BPM for this segment. */
  bpm: number;
}

/**
 * QuantizedModel — optional pipeline stage between raw MIDI data (Stage 1)
 * and the TemporalModel (Stage 2).
 *
 * Purpose:
 *   MIDI files have two typical origins:
 *   1. Score-derived: notes already sit on an exact tick grid (PPQ-aligned).
 *      No quantization is needed; the existing timestamps are authoritative.
 *   2. Live-recorded: timestamps and durations are arbitrary.
 *      Quantization aligns them to a fixed grid so that downstream stages can
 *      produce meaningful notation.
 *
 * This model carries the (possibly quantized) note array together with
 * metadata that documents what was done and which grid was used.
 * Future extensions (tempo optimisation, beat-grid fitting, …) will add
 * fields here without changing downstream model types.
 */
export interface QuantizedScore {
  /** MIDI notes after the quantization step (may be identical to input). */
  notes: MidiNote[];

  /** Pulses per quarter note of the source MIDI file. */
  ppq: number;

  /**
   * `true`  → quantization was applied (live-recording origin detected).
   * `false` → notes were already on the grid (score-derived origin detected).
   */
  wasQuantized: boolean;

  /** The grid divisor that was used, e.g. 24 → grid = ppq / 24 ticks. */
  gridDivisor: number;

  /** Absolute grid size in ticks (= ppq / gridDivisor). */
  gridTicks: number;

  /**
   * Fraction of notes whose ticks and durationTicks are exact multiples of
   * the grid, measured on the *input* notes.  Range [0, 1].
   * Used to decide whether quantization is necessary and exposed here
   * for debugging / transparency.
   */
  gridAlignmentRatio: number;

  /**
   * Estimated global tempo in BPM, derived from IOI histogram analysis.
   * Only present for live-recorded input (`wasQuantized === true`).
   * For score-derived input, the MIDI header tempo is authoritative and
   * this field is `undefined`.
   */
  estimatedBpm?: number;

  /**
   * Window-based local tempo map built from the estimated global BPM.
   * Each entry covers one analysis window (default 4 measures) and holds
   * the local BPM that minimises mean-square quantization error for notes
   * in that window.  Adjacent windows are linearly interpolated when the
   * map is applied via applyTempoMap().
   * Only present for live-recorded input (`wasQuantized === true`).
   */
  tempoMap?: TempoMapEntry[];
}
