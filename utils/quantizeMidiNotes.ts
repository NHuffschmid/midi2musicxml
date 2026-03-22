import { MidiNote } from '../types';

// Quantization grid: e.g. 1/24 of a quarter note (good compromise for triplets and sixteenths)
const QUANTIZE_GRID_DIVISOR = 24; // 1/24 quantization

/**
 * Quantizes the ticks and duration of MIDI notes to a fixed grid.
 * Chord detection is not affected (only ticks and durations are changed).
 *
 * @param notes Array of MidiNote
 * @param ppq Pulses per Quarter Note (from MIDI header)
 * @returns New notes with quantized ticks and durations
 */
export function quantizeMidiNotes(notes: MidiNote[], ppq: number): MidiNote[] {
  const grid = ppq / QUANTIZE_GRID_DIVISOR;
  return notes.map(note => {
    // Quantize start tick
    const quantTick = Math.round(note.ticks / grid) * grid;
    // Quantize duration (at least 1 tick to avoid zero duration)
    const quantDur = Math.max(1, Math.round(note.durationTicks / grid) * grid);
    return {
      ...note,
      ticks: quantTick,
      durationTicks: quantDur
    };
  });
}
