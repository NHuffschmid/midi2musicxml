/**
 * NotationModel - Stage 3 of the pipeline
 * 
 * Adds notation-specific decisions:
 * - Concrete note values (quarter, eighth, etc.)
 * - Accidentals (natural, sharp, flat)
 * - Beaming information
 * - Stem directions
 * - Tuplets (triplets, etc.)
 * - Ties across measures
 * 
 * Still abstract - not yet concerned with MusicXML specifics
 */

// Import shared types from MusicalModel
import type { TimeSignature, KeySignature, PedalEvent } from './MusicalModel';

// Re-export for convenience
export type { TimeSignature, KeySignature, PedalEvent } from './MusicalModel';

export interface NotationScore {
  title?: string;
  composer?: string;
  copyright?: string;
  parts: NotationPart[];
}

export interface NotationPart {
  id: string;
  name: string;
  measures: NotationMeasure[];
}

export interface NotationMeasure {
  number: number;
  timeSignature?: TimeSignature;
  keySignature?: KeySignature;
  tempo?: number;
  voices: NotationVoice[];
  pedalEvents?: PedalEvent[];
}

export interface NotationVoice {
  voiceNumber: number;
  events: NotationEvent[];
}

export type NotationEvent = NotationNote | NotationRest;

export interface NotationNote {
  type: 'note';
  pitch: Pitch;
  duration: NoteDuration;
  stem?: StemDirection;
  beam?: BeamInfo;
  chord?: {}; // Empty object if this is a chord note (not the first)
  tie?: TieInfo;
  tuplet?: TupletInfo;
  accidental?: AccidentalDisplay; // Whether to show accidental
}

export interface NotationRest {
  type: 'rest';
  duration: NoteDuration;
}

export interface Pitch {
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  alter: number;  // -2, -1, 0, 1, 2 (double flat to double sharp)
  octave: number; // 0-9
}

export interface NoteDuration {
  type: 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th' | '128th';
  dots: number; // 0, 1, 2, 3
}

export type StemDirection = 'up' | 'down' | 'none';

export interface BeamInfo {
  type: 'begin' | 'continue' | 'end' | 'forward-hook' | 'backward-hook';
  level: number; // 1 for 8th notes, 2 for 16th, etc.
}

export interface TieInfo {
  type: 'start' | 'stop' | 'continue';
}

export interface TupletInfo {
  type: 'start' | 'stop';
  actualNotes: number;   // e.g., 3 for triplet
  normalNotes: number;   // e.g., 2 for triplet
  bracket?: boolean;     // Show bracket or not
}

export interface AccidentalDisplay {
  show: boolean;
  type: 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';
}
