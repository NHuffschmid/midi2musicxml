/**
 * Legacy types for backward compatibility and MIDI processing
 * 
 * These types are used in the early stages of the pipeline
 * before conversion to the new model architecture.
 */

// Instrument types (for backward compatibility)
export const ClefTypes = ['piano', 'violin', 'viola', 'cello'] as const;
export type ClefType = typeof ClefTypes[number];

// MIDI data types (from tonejs/midi)
export type MidiNote = {
  midi: number;
  name: string;
  ticks: number;
  time: number;
  duration: number;
  durationTicks: number;
  velocity: number;
  bars: number;
  tempo?: number;
}

export type MidiMeasure = {
  notes: MidiNote[];
}

export type Section = {
  measures: MidiMeasure[];
  key: string;
  time: { beats: number; beatType: number };
  tempo?: number;
};
