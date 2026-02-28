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
  NotationNote,
  NotationRest,
  NotationEvent
} from '../models/NotationModel';

import {
  LayoutScore,
  LayoutPart,
  LayoutStaff,
  LayoutMeasure,
  LayoutVoice,
  LayoutNote,
  LayoutRest,
  LayoutEvent,
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
    const { staff1Events, staff2Events } = splitVoiceByPitch(voice);

    if (staff1Events.length > 0) {
      staff1Voices.push({
        voiceNumber: voice.voiceNumber,
        staffNumber: 1,
        events: staff1Events
      });
    }

    if (staff2Events.length > 0) {
      staff2Voices.push({
        voiceNumber: voice.voiceNumber,
        staffNumber: 2,
        events: staff2Events
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
 * Split voice events by pitch (C4 = MIDI 60 is the split point)
 */
function splitVoiceByPitch(voice: NotationVoice): {
  staff1Events: LayoutEvent[];
  staff2Events: LayoutEvent[];
} {
  
  const staff1Events: LayoutEvent[] = [];
  const staff2Events: LayoutEvent[] = [];

  // Determine dominant staff for this voice based on first/last notes
  let dominantStaff = 1;
  const notes = voice.events.filter(e => e.type === 'note') as NotationNote[];
  if (notes.length > 0) {
    const avgMidi = notes.reduce((sum, n) => sum + pitchToMidi(n.pitch), 0) / notes.length;
    dominantStaff = avgMidi >= 60 ? 1 : 2;
  }

  for (const event of voice.events) {
    if (event.type === 'rest') {
      // Assign rest to the same staff as the notes in this voice
      const targetStaff = dominantStaff;
      const layoutRest: LayoutRest = {
        ...event,
        staffNumber: targetStaff
      };
      
      if (targetStaff === 1) {
        staff1Events.push(layoutRest);
      } else {
        staff2Events.push(layoutRest);
      }
    } else {
      // Note: assign based on pitch
      const midi = pitchToMidi(event.pitch);
      const staffNumber = midi >= 60 ? 1 : 2; // C4 and above → staff 1

      const layoutNote: LayoutNote = {
        ...event,
        staffNumber
      };

      if (staffNumber === 1) {
        staff1Events.push(layoutNote);
      } else {
        staff2Events.push(layoutNote);
      }
    }
  }

  return { staff1Events, staff2Events };
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
      events: voice.events.map(event => 
        event.type === 'note' 
          ? { ...event, staffNumber } as LayoutNote
          : { ...event, staffNumber } as LayoutRest
      )
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
