/**
 * NotationModel - Stage 3 of the pipeline
 * 
 * Adds notation-specific decisions:
 * - Concrete note values (quarter, eighth, etc.)
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
  notes: NotationNote[];         // Flat list of all notes with voice numbers
  pedalEvents?: PedalEvent[];
  sectionStart?: boolean;
}

export interface NotationNote {
  pitch: Pitch;
  type: 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th' | '128th';
  dots: number;           // 0, 1, 2, 3
  startTick: number;      // Start position in MIDI ticks (preserved from MusicalModel)
  durationTicks: number;  // Exact duration in ticks (preserved from MusicalModel)
  voice: number;          // Voice number (1-based)
  tie?: TieInfo;
  tuplet?: TupletInfo;
  articulation?: ArticulationType;
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

export interface TieInfo {
  type: 'start' | 'stop' | 'continue';
}

export interface TupletInfo {
  type: 'start' | 'stop';
  actualNotes: number;   // e.g., 3 for triplet
  normalNotes: number;   // e.g., 2 for triplet
  bracket?: boolean;     // Show bracket or not
}

export type ArticulationType = 'staccato' | 'tenuto' | 'accent' | 'staccatissimo';
