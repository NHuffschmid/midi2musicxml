/**
 * Test helper: factory functions for MidiNote and common note sequences.
 *
 * All tick / time values assume PPQ = 480 and BPM = 120 unless overridden.
 *   quarter note = 480 ticks = 0.5 s
 *   half note    = 960 ticks = 1.0 s
 *   whole note   = 1920 ticks = 2.0 s
 */
import type { MidiNote } from '../../types';

/** Default reference values used by the helpers below. */
const DEFAULT_PPQ = 480;
const DEFAULT_BPM = 120;

/**
 * Creates a single MidiNote.
 *
 * @param midiNumber   MIDI pitch number (e.g. 60 = C4)
 * @param ticks        Note onset in ticks
 * @param durationTicks  Note duration in ticks
 * @param overrides    Optional field overrides
 */
export function makeNote(
  midiNumber: number,
  ticks: number,
  durationTicks: number,
  overrides: Partial<MidiNote> = {},
): MidiNote {
  const secondsPerTick = 60 / (DEFAULT_BPM * DEFAULT_PPQ);
  return {
    midi: midiNumber,
    name: '',
    ticks,
    time: ticks * secondsPerTick,
    duration: durationTicks * secondsPerTick,
    durationTicks,
    velocity: 0.8,
    bars: 0,
    ...overrides,
  };
}

/**
 * Creates a sequence of notes with evenly-spaced onsets *in seconds*.
 * Useful for `estimateGlobalTempo` tests where physical time matters.
 *
 * @param count          Number of notes to generate
 * @param onsetIntervalS Gap between consecutive onsets in seconds
 * @param durationRatio  Note duration as a fraction of the onset interval
 */
export function makeOnsetSequence(
  count: number,
  onsetIntervalS: number,
  durationRatio = 0.9,
): MidiNote[] {
  return Array.from({ length: count }, (_, i) => {
    const time = i * onsetIntervalS;
    const duration = onsetIntervalS * durationRatio;
    // ticks are not meaningful here – estimateGlobalTempo only uses `time`
    return {
      midi: 60,
      name: '',
      ticks: Math.round(time * DEFAULT_PPQ * (DEFAULT_BPM / 60)),
      time,
      duration,
      durationTicks: Math.round(duration * DEFAULT_PPQ * (DEFAULT_BPM / 60)),
      velocity: 0.8,
      bars: 0,
    } satisfies MidiNote;
  });
}

/** MIDI numbers for a single-octave C major scale starting at C4. */
export const C_MAJOR_MIDI = [60, 62, 64, 65, 67, 69, 71, 72] as const;

/** MIDI numbers for a single-octave G major scale starting at G3. */
export const G_MAJOR_MIDI = [55, 57, 59, 60, 62, 64, 66, 67] as const;

/** MIDI numbers for a single-octave D major scale starting at D4. */
export const D_MAJOR_MIDI = [62, 64, 66, 67, 69, 71, 73, 74] as const;

/**
 * Builds a MidiMeasure-compatible object (`{ notes: MidiNote[] }`) for the
 * `analyseKey` function.
 */
export function makeMeasureNotes(midiNumbers: readonly number[], ppq = DEFAULT_PPQ): { notes: MidiNote[] } {
  return {
    notes: midiNumbers.map((midi, i) => makeNote(midi, i * ppq, ppq)),
  };
}
