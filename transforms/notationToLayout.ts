/**
 * Transform: NotationModel → LayoutModel
 * 
 * Adds layout decisions:
 * - Assign notes to staves
 * - Set clef types
 * - Prepare for MusicXML rendering
 */

import {
  NotationScore,
  NotationMeasure,
  NotationNote
} from '../models/NotationModel';

import {
  LayoutScore,
  LayoutPart,
  LayoutMeasure,
  LayoutStaff,
  LayoutNote,
  ClefType,
  ClefInfo
} from '../models/LayoutModel';

export type InstrumentType = 'piano' | 'violin' | 'viola' | 'cello';

export interface NotationToLayoutOptions {
  instrument: InstrumentType;
}

/**
 * Main transform function: NotationModel → LayoutModel
 */
export function notationToLayout(
  notationScore: NotationScore,
  options: NotationToLayoutOptions
): LayoutScore {
  
  return {
    title: notationScore.title,
    composer: notationScore.composer,
    copyright: notationScore.copyright,
    parts: notationScore.parts.map(part => 
      convertPart(part, options.instrument)
    )
  };
}

/**
 * Convert a notation part to a layout part
 */
function convertPart(
  notationPart: any,
  instrument: InstrumentType
): LayoutPart {
  
  const clefs = getClefs(instrument);
  
  if (instrument === 'piano') {
    // Piano has 2 staves (treble and bass)
    return convertPianoPartToLayout(notationPart, clefs);
  } else {
    // Single staff instruments
    return convertSingleStaffPartToLayout(notationPart, clefs);
  }
}

/**
 * Convert piano part (2 staves)
 */
function convertPianoPartToLayout(
  notationPart: any,
  clefs: ClefType[]
): LayoutPart {
  
  const measures: LayoutMeasure[] = notationPart.measures.map((notationMeasure: NotationMeasure) => {
    // Calculate average pitch for this measure
    const midiValues = notationMeasure.notes.map(note => pitchToMidi(note.pitch));
    const rawAverage = midiValues.length > 0 
      ? midiValues.reduce((sum, midi) => sum + midi, 0) / midiValues.length
      : 60; // Default to C4 if no notes
    
    // Limit the split point to a reasonable range
    // This prevents extreme values in very high or very low passages
    const averageMidi = Math.max(52, Math.min(66, rawAverage));
    
    // Group notes by staff
    const staff1Notes: LayoutNote[] = [];
    const staff2Notes: LayoutNote[] = [];
    
    for (const note of notationMeasure.notes) {
      const midi = pitchToMidi(note.pitch);
      const layoutNote: LayoutNote = { ...note };
      
      if (midi >= averageMidi) {
        staff1Notes.push(layoutNote);
      } else {
        staff2Notes.push(layoutNote);
      }
    }
    
    return {
      number: notationMeasure.number,
      timeSignature: notationMeasure.timeSignature,
      keySignature: notationMeasure.keySignature,
      tempo: notationMeasure.tempo,
      sectionStart: notationMeasure.sectionStart,
      staves: [
        { number: 1, notes: staff1Notes },
        { number: 2, notes: staff2Notes }
      ],
      pedalEvents: notationMeasure.pedalEvents
    };
  });

  return {
    id: notationPart.id,
    name: notationPart.name,
    measures,
    clefs: [
      { sign: clefs[0], line: 2 },  // Treble: G clef on line 2
      { sign: clefs[1], line: 4 }   // Bass: F clef on line 4
    ],
    staffCount: 2
  };
}

/**
 * Convert single-staff part
 */
function convertSingleStaffPartToLayout(
  notationPart: any,
  clefs: ClefType[]
): LayoutPart {
  
  const measures = notationPart.measures.map((measure: NotationMeasure) => 
    convertMeasureForSingleStaff(measure, 1)
  );

  return {
    id: notationPart.id,
    name: notationPart.name,
    measures,
    clefs: [
      { sign: clefs[0], line: getDefaultClefLine(clefs[0]) }
    ],
    staffCount: 1
  };
}

/**
 * Convert measure for single staff
 */
function convertMeasureForSingleStaff(
  notationMeasure: NotationMeasure,
  staffNumber: number
): LayoutMeasure {
  
  return {
    number: notationMeasure.number,
    timeSignature: notationMeasure.timeSignature,
    keySignature: notationMeasure.keySignature,
    tempo: notationMeasure.tempo,
    sectionStart: notationMeasure.sectionStart,
    staves: [
      {
        number: staffNumber,
        notes: notationMeasure.notes.map(note => ({ ...note } as LayoutNote))
      }
    ],
    pedalEvents: notationMeasure.pedalEvents
  };
}

/**
 * Get clef types for instrument
 */
function getClefs(instrument: InstrumentType): ClefType[] {
  switch (instrument) {
    case 'piano':
      return ['G', 'F']; // Treble and Bass
    case 'violin':
      return ['G'];
    case 'viola':
      return ['C'];
    case 'cello':
      return ['F'];
    default:
      return ['G'];
  }
}

/**
 * Get default line number for clef type
 */
function getDefaultClefLine(clef: ClefType): number {
  switch (clef) {
    case 'G':
      return 2;
    case 'F':
      return 4;
    case 'C':
      return 3;
    default:
      return 2;
  }
}

/**
 * Convert pitch back to MIDI number (for staff assignment)
 */
function pitchToMidi(pitch: { step: string; alter: number; octave: number }): number {
  const stepValues: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  
  const baseNote = stepValues[pitch.step] || 0;
  const midi = (pitch.octave + 1) * 12 + baseNote + pitch.alter;
  
  return midi;
}
