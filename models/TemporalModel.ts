/**
 * TemporalModel - Stage 2 of the pipeline
 * 
 * Represents the time-based structure of musical data:
 * - Sections (detected from pauses or markers)
 * - Measures (time-based grouping)
 * - Raw notes
 * 
 * This stage focuses on:
 * - Section detection and boundaries
 * - Measure grouping by time
 * - Time signature, key signature, tempo extraction
 * - Pause analysis between sections
 * 
 * NOT concerned with:
 * - Notation details (that's NotationModel)
 * - Layout decisions (that's LayoutModel)
 */

import type { MidiNote } from '../types';

/**
 * Time signature (e.g., 4/4, 3/4)
 */
export interface TimeSignature {
  beats: number;          // Numerator (e.g., 4 in 4/4)
  beatType: number;       // Denominator (e.g., 4 in 4/4)
}

/**
 * Key signature
 */
export interface KeySignature {
  fifths: number;         // -7 to +7 (flats to sharps)
  mode: 'major' | 'minor';
}

/**
 * Pedal event (sustain, sostenuto, or soft pedal)
 */
export interface PedalEvent {
  tick: number;
  type: 'down' | 'up';
  pedalType?: 'sustain' | 'sostenuto' | 'soft'; // CC64, CC66, CC67
}

/**
 * Top-level temporal structure
 */
export interface TemporalScore {
  /** All sections in the score */
  sections: TemporalSection[];
  
  /** Pulses per quarter note (MIDI PPQ) */
  ppq: number;
  
  /** Global metadata */
  title?: string;
  composer?: string;
  copyright?: string;
}

/**
 * A section is a group of measures separated by pauses
 */
export interface TemporalSection {
  /** Section number (1-based) */
  sectionNumber: number;
  
  /** Measures in this section */
  measures: TemporalMeasure[];
  
  /** Time signature for this section */
  timeSignature: TimeSignature;
  
  /** Key signature for this section */
  keySignature: KeySignature;
  
  /** Tempo (BPM) for this section */
  tempo?: number;
  
  /** Pause duration (in seconds) before this section starts */
  pauseBefore?: number;
}

/**
 * A measure is a time-based grouping of notes
 */
export interface TemporalMeasure {
  /** Global measure number (1-based) */
  number: number;
  
  /** Start tick (inclusive) */
  startTick: number;
  
  /** End tick (exclusive) */
  endTick: number;
  
  /** Duration in ticks */
  durationTicks: number;
  
  /** All notes in this measure (unsorted) */
  notes: MidiNote[];

  /** Pedal events (CC64/CC66/CC67) within this measure */
  pedalEvents?: PedalEvent[];

  /** First measure in a section? */
  isFirstInSection?: boolean;
}
