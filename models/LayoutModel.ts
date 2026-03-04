/**
 * LayoutModel - Stage 4 of the pipeline
 * 
 * Adds layout decisions:
 * - Assignment to staves (for piano: treble and bass clef)
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
  staves: LayoutStaff[];
}

export interface LayoutStaff {
  staffNumber: number;
  clef: ClefType;
  measures: LayoutMeasure[];
}

export interface LayoutMeasure {
  number: number;
  timeSignature?: TimeSignature;
  keySignature?: KeySignature;
  tempo?: number;
  voices: LayoutVoice[];
  pedalEvents?: PedalEvent[];
  sectionStart?: boolean;
}

export interface LayoutVoice {
  voiceNumber: number;
  staffNumber: number; // Which staff this voice belongs to
  notes: LayoutNote[];
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
