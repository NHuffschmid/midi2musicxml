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
import { TimeSignature, KeySignature, PedalEvent } from './MusicalModel';

export interface LayoutScore {
  title?: string;
  composer?: string;
  copyright?: string;
  parts: LayoutPart[];
}

export interface LayoutPart {
  id: string;
  name: string;
  measures: LayoutMeasure[];     // All measures with notes containing staffNumber
  clefs: ClefInfo[];              // Clef information for each staff
  staffCount: number;             // Number of staves (1 for single staff, 2+ for piano/etc)
}

export interface LayoutMeasure {
  number: number;
  timeSignature?: TimeSignature;
  keySignature?: KeySignature;
  tempo?: number;
  notes: LayoutNote[];           // Flat list of all notes with voice and staff numbers
  pedalEvents?: PedalEvent[];
  sectionStart?: boolean;
}

export interface LayoutNote extends NotationNote {
  staffNumber: number; // Explicit staff assignment
}

export type ClefType = 'G' | 'F' | 'C' | 'percussion' | 'TAB';

export interface ClefInfo {
  sign: ClefType;
  line?: number; // Line number (1-5)
  octaveChange?: number; // -2 to +2
}
