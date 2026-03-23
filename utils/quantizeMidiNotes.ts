import { MidiNote } from '../types';

/** Default grid divisor (ppq / 24 covers all values down to 32nds + triplets). */
const DEFAULT_GRID_DIVISOR = 24;

/**
 * Quantizes the ticks and duration of MIDI notes to a fixed grid.
 * Chord detection is not affected (only ticks and durations are changed).
 *
 * @param notes       Array of MidiNote
 * @param ppq         Pulses per Quarter Note (from MIDI header)
 * @param gridDivisor Divisor applied to ppq to obtain the grid size in ticks.
 *                    Default: 24 (grid = ppq / 24).
 * @returns New notes with quantized ticks and durations
 */
export function quantizeMidiNotes(notes: MidiNote[], ppq: number, gridDivisor = DEFAULT_GRID_DIVISOR): MidiNote[] {
  const grid = ppq / gridDivisor;
  return notes.map(note => {
    // Quantize start tick
    const quantTick = Math.round(note.ticks / grid) * grid;
    // Quantize duration (at least 1 tick to avoid zero duration)
    const quantDur = Math.max(1, Math.round(note.durationTicks / grid) * grid);
    console.log(`quantizeMidiNotes: midi=${note.midi} oldTicks=${note.ticks} newTicks=${quantTick} oldDur=${note.durationTicks} newDur=${quantDur}`);
    return {
      ...note,
      ticks: quantTick,
      durationTicks: quantDur
    };
  });
}
