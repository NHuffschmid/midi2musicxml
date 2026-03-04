/**
 * Transform: NotationModel → LayoutModel
 * 
 * Adds layout decisions:
 * - Assign notes to staves (for piano: treble/bass clef based on pitch)
 * - Set clef types
 * - Prepare for MusicXML rendering
 */

import {
  NotationScore,
  NotationMeasure,
  NotationVoice,
  NotationNote
} from '../models/NotationModel';

import {
  LayoutScore,
  LayoutPart,
  LayoutStaff,
  LayoutMeasure,
  LayoutVoice,
  LayoutNote,
  ClefType
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
    return convertSingleStaffPartToLayout(notationPart, clefs[0]);
  }
}

/**
 * Convert piano part (2 staves)
 */
function convertPianoPartToLayout(
  notationPart: any,
  clefs: ClefType[]
): LayoutPart {
  
  const staff1Measures: LayoutMeasure[] = [];
  const staff2Measures: LayoutMeasure[] = [];

  for (const notationMeasure of notationPart.measures) {
    const { staff1, staff2 } = splitMeasureForPiano(notationMeasure);
    staff1Measures.push(staff1);
    staff2Measures.push(staff2);
  }

  return {
    id: notationPart.id,
    name: notationPart.name,
    staves: [
      {
        staffNumber: 1,
        clef: clefs[0], // Treble
        measures: staff1Measures
      },
      {
        staffNumber: 2,
        clef: clefs[1], // Bass
        measures: staff2Measures
      }
    ]
  };
}

/**
 * Convert single-staff part
 */
function convertSingleStaffPartToLayout(
  notationPart: any,
  clef: ClefType
): LayoutPart {
  
  const measures = notationPart.measures.map((measure: NotationMeasure) => 
    convertMeasureForSingleStaff(measure, 1)
  );

  return {
    id: notationPart.id,
    name: notationPart.name,
    staves: [
      {
        staffNumber: 1,
        clef,
        measures
      }
    ]
  };
}

/**
 * Split a measure into two staves for piano
 */
function splitMeasureForPiano(notationMeasure: NotationMeasure): {
  staff1: LayoutMeasure;
  staff2: LayoutMeasure;
} {
  
  const staff1Voices: LayoutVoice[] = [];
  const staff2Voices: LayoutVoice[] = [];

  for (const voice of notationMeasure.voices) {
    const { staff1Notes, staff2Notes } = splitVoiceByPitch(voice);

    if (staff1Notes.length > 0) {
      staff1Voices.push({
        voiceNumber: voice.voiceNumber,
        staffNumber: 1,
        notes: staff1Notes
      });
    }

    if (staff2Notes.length > 0) {
      staff2Voices.push({
        voiceNumber: voice.voiceNumber,
        staffNumber: 2,
        notes: staff2Notes
      });
    }
  }

  return {
    staff1: {
      number: notationMeasure.number,
      timeSignature: notationMeasure.timeSignature,
      keySignature: notationMeasure.keySignature,
      tempo: notationMeasure.tempo,
      sectionStart: notationMeasure.sectionStart,
      voices: staff1Voices,
      pedalEvents: notationMeasure.pedalEvents
    },
    staff2: {
      number: notationMeasure.number,
      timeSignature: notationMeasure.timeSignature,
      keySignature: notationMeasure.keySignature,
      tempo: notationMeasure.tempo,
      sectionStart: notationMeasure.sectionStart,
      voices: staff2Voices,
      pedalEvents: notationMeasure.pedalEvents
    }
  };
}

/**
 * Split voice notes by pitch (C4 = MIDI 60 is the split point)
 */
function splitVoiceByPitch(voice: NotationVoice): {
  staff1Notes: LayoutNote[];
  staff2Notes: LayoutNote[];
} {
  
  const staff1Notes: LayoutNote[] = [];
  const staff2Notes: LayoutNote[] = [];

  for (const note of voice.notes) {
    // Assign based on pitch
    const midi = pitchToMidi(note.pitch);
    const staffNumber = midi >= 60 ? 1 : 2; // C4 and above → staff 1

    const layoutNote: LayoutNote = {
      ...note,
      staffNumber
    };

    if (staffNumber === 1) {
      staff1Notes.push(layoutNote);
    } else {
      staff2Notes.push(layoutNote);
    }
  }

  return { staff1Notes, staff2Notes };
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
    voices: notationMeasure.voices.map(voice => ({
      voiceNumber: voice.voiceNumber,
      staffNumber,
      notes: voice.notes.map(note => ({ ...note, staffNumber } as LayoutNote))
    })),
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
