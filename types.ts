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
  tuplet?: {
    actualNotes: number;  // e.g. 3 for a triplet
    normalNotes: number;  // e.g. 2 for a triplet
    noteType: string;     // base note type, e.g. 'eighth', 'quarter'
    groupId: string;      // unique ID shared by all notes in the group
    position: number;     // 1-based position within the group
  };
}

export type MidiMeasure = {
  notes: MidiNote[];
}

export type KeySignature = {
  fifths: number;  // -7 to +7 (flat to sharp)
  mode: 'major' | 'minor';
};

export type Section = {
  measures: MidiMeasure[];
  key: KeySignature;
  time: { beats: number; beatType: number };
  tempo?: number;
};
