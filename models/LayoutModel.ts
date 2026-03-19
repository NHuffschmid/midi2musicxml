/**
 * LayoutModel - Stage 4 of the pipeline
 * 
 * Adds layout decisions:
 * - Assignment to staves
 * - System breaks (not yet implemented)
 * - Page breaks (not yet implemented)
 * 
 * Ready for MusicXML rendering
 */

import { NotationNote } from './NotationModel';
import { TimeSignature, KeySignature, PedalEvent } from './TemporalModel';

export interface LayoutScore {
  title?: string;
  composer?: string;
  copyright?: string;
  parts: LayoutPart[];
}

export interface LayoutPart {
  id: string;
  name: string;
  measures: LayoutMeasure[];     // All measures with staves containing notes
  clefs: ClefInfo[];              // Clef information for each staff
  staffCount: number;             // Number of staves (1 for single staff, 2+ for piano/etc)
}

export interface LayoutMeasure {
  number: number;
  timeSignature?: TimeSignature;
  keySignature?: KeySignature;
  tempo?: number;
  staves: LayoutStaff[];         // Notes grouped by staff
  pedalEvents?: PedalEvent[];
  sectionStart?: boolean;
}

export interface LayoutStaff {
  number: number;                // Staff number (1-based)
  notes: LayoutNote[];           // Notes belonging to this staff
}

export interface LayoutNote extends NotationNote {
  // Note: staffNumber removed - staff is determined by parent LayoutStaff
  isChord?: boolean;             // True if this note is part of a chord (not the first note)
}

export type ClefType = 'G' | 'F' | 'C' | 'percussion' | 'TAB';

export interface ClefInfo {
  sign: ClefType;
  line?: number; // Line number (1-5)
  octaveChange?: number; // -2 to +2
}
