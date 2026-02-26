/**
 * MusicalModel - Stage 2 of the pipeline
 * 
 * Represents musical semantics after MIDI processing:
 * - Measures with time signatures and key signatures
 * - Voices separated (highest notes = Voice 1)
 * - Notes and Rests as musical events
 * - Tempo information
 * 
 * No notation decisions yet (beaming, stem direction, etc.)
 */

export interface MusicalScore {
  title?: string;
  composer?: string;
  copyright?: string;
  parts: MusicalPart[];
}

export interface MusicalPart {
  id: string;
  name: string;
  measures: MusicalMeasure[];
}

export interface MusicalMeasure {
  number: number;
  timeSignature?: TimeSignature; // Only set if it changes
  keySignature?: KeySignature;   // Only set if it changes
  tempo?: number;                 // Only set if it changes (BPM)
  voices: MusicalVoice[];
  pedalEvents?: PedalEvent[];     // Sustain pedal events
}

export interface MusicalVoice {
  voiceNumber: number; // 1 = highest voice
  events: MusicalEvent[];
}

export type MusicalEvent = MusicalNote | MusicalRest;

export interface MusicalNote {
  type: 'note';
  midi: number;           // MIDI note number (0-127)
  startTick: number;      // Start position in MIDI ticks
  durationTicks: number;  // Duration in MIDI ticks
  velocity: number;       // MIDI velocity (0-127)
  isChordNote?: boolean;  // True if this is part of a chord (not the first note)
}

export interface MusicalRest {
  type: 'rest';
  startTick: number;      // Start position in MIDI ticks
  durationTicks: number;  // Duration in MIDI ticks
}

export interface TimeSignature {
  beats: number;          // Numerator (e.g., 4 in 4/4)
  beatType: number;       // Denominator (e.g., 4 in 4/4)
}

export interface KeySignature {
  fifths: number;         // -7 to +7 (flats to sharps)
  mode: 'major' | 'minor';
}

export interface PedalEvent {
  tick: number;
  type: 'down' | 'up';
}

export interface MusicalMetadata {
  pulsesPerQuarterNote: number; // MIDI PPQ (typically 480)
}
