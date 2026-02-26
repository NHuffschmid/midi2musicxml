/**
 * Test setup and helper functions
 */

import type { Section, MidiNote } from '../types';

/**
 * Create a simple test section with one measure
 */
export function createSimpleSection(notes: Partial<MidiNote>[] = []): Section {
  const defaultNote: MidiNote = {
    midi: 60,
    name: 'C4',
    ticks: 0,
    time: 0,
    duration: 1,
    durationTicks: 480,
    velocity: 64,
    bars: 0
  };

  const fullNotes = notes.map(n => ({ ...defaultNote, ...n }));

  return {
    measures: [{ notes: fullNotes }],
    key: 'C',
    time: { beats: 4, beatType: 4 },
    tempo: 120
  };
}

/**
 * Create a chord (multiple simultaneous notes)
 */
export function createChord(midiNumbers: number[], tick = 0, durationTicks = 480): Partial<MidiNote>[] {
  return midiNumbers.map((midi, index) => ({
    midi,
    name: `Note${index}`,
    ticks: tick,
    time: tick / 480,
    duration: durationTicks / 480,
    durationTicks,
    velocity: 64,
    bars: 0
  }));
}

/**
 * Create a melody (sequential notes)
 */
export function createMelody(midiNumbers: number[], noteDuration = 480): Partial<MidiNote>[] {
  return midiNumbers.map((midi, index) => ({
    midi,
    name: `Note${index}`,
    ticks: index * noteDuration,
    time: (index * noteDuration) / 480,
    duration: noteDuration / 480,
    durationTicks: noteDuration,
    velocity: 64,
    bars: 0
  }));
}

/**
 * Standard test MIDI numbers
 */
export const MIDI = {
  C4: 60,
  D4: 62,
  E4: 64,
  F4: 65,
  G4: 67,
  A4: 69,
  B4: 71,
  C5: 72,
  
  // C major chord
  C_MAJOR_CHORD: [60, 64, 67], // C, E, G
  
  // C major scale
  C_MAJOR_SCALE: [60, 62, 64, 65, 67, 69, 71, 72] // C, D, E, F, G, A, B, C
};

/**
 * Standard durations (at PPQ = 480)
 */
export const DURATION = {
  WHOLE: 1920,
  HALF: 960,
  QUARTER: 480,
  EIGHTH: 240,
  SIXTEENTH: 120
};
