/**
 * Transform: LayoutModel → MusicXMLModel
 * 
 * Converts layout model to MusicXML DOM structure.
 * This is almost a 1:1 mapping.
 */

import {
  LayoutScore,
  LayoutPart,
  LayoutStaff,
  LayoutMeasure,
  LayoutVoice,
  LayoutNote,
  LayoutRest,
  LayoutEvent
} from '../models/LayoutModel';

import {
  MusicXMLDocument,
  ScorePartwise,
  Part,
  Measure,
  Attributes,
  NoteElement,
  Backup,
  Direction,
  Clef
} from '../models/MusicXMLModel';

export interface LayoutToMusicXMLOptions {
  divisions: number; // Divisions per quarter note (typically same as PPQ)
}

/**
 * Main transform function: LayoutModel → MusicXMLModel
 */
export function layoutToMusicXML(
  layoutScore: LayoutScore,
  options: LayoutToMusicXMLOptions
): MusicXMLDocument {
  
  const scorePartwise: ScorePartwise = {
    work: layoutScore.title ? { workTitle: layoutScore.title } : undefined,
    identification: createIdentification(layoutScore),
    partList: {
      scoreParts: layoutScore.parts.map(part => ({
        id: part.id,
        partName: part.name
      }))
    },
    parts: layoutScore.parts.map(part => 
      convertPart(part, options.divisions)
    )
  };

  return {
    version: '3.1',
    scorePartwise
  };
}

/**
 * Create identification section
 */
function createIdentification(layoutScore: LayoutScore): any {
  const hasId = layoutScore.composer || layoutScore.copyright;
  if (!hasId) return undefined;

  return {
    creator: layoutScore.composer ? [{ type: 'composer', name: layoutScore.composer }] : undefined,
    rights: layoutScore.copyright
  };
}

/**
 * Convert a layout part to MusicXML part
 */
function convertPart(
  layoutPart: LayoutPart,
  divisions: number
): Part {
  
  // Merge all staves into single measures
  const measures = mergeMeasuresFromStaves(layoutPart.staves, divisions);

  return {
    id: layoutPart.id,
    measures
  };
}

/**
 * Merge measures from multiple staves
 */
function mergeMeasuresFromStaves(
  staves: LayoutStaff[],
  divisions: number
): Measure[] {
  
  if (staves.length === 0) return [];

  const measureCount = staves[0].measures.length;
  const measures: Measure[] = [];

  for (let i = 0; i < measureCount; i++) {
    const measureNumber = i + 1;
    const staffMeasures = staves.map(staff => staff.measures[i]);
    const clefs = staves.map(staff => ({ sign: staff.clef, staffNumber: staff.staffNumber }));

    const measure = mergeMeasure(staffMeasures, clefs, measureNumber, divisions, i === 0);
    measures.push(measure);
  }

  return measures;
}

/**
 * Merge measures from different staves into one MusicXML measure
 */
function mergeMeasure(
  staffMeasures: LayoutMeasure[],
  clefs: Array<{ sign: string; staffNumber: number }>,
  measureNumber: number,
  divisions: number,
  isFirstMeasure: boolean
): Measure {
  
  const firstMeasure = staffMeasures[0];
  
  // Attributes (only in first measure or when changed)
  let attributes: Attributes | undefined;
  if (isFirstMeasure) {
    attributes = {
      divisions,
      key: firstMeasure.keySignature ? {
        fifths: firstMeasure.keySignature.fifths,
        mode: firstMeasure.keySignature.mode
      } : undefined,
      time: firstMeasure.timeSignature ? {
        beats: firstMeasure.timeSignature.beats,
        beatType: firstMeasure.timeSignature.beatType
      } : undefined,
      staves: staffMeasures.length > 1 ? staffMeasures.length : undefined,
      clef: clefs.map(c => ({
        sign: c.sign,
        line: getClefLine(c.sign),
        number: staffMeasures.length > 1 ? c.staffNumber : undefined
      }))
    };
  }

  // Direction (tempo)
  const direction: Direction[] = [];
  if (firstMeasure.tempo) {
    direction.push({
      placement: 'above',
      directionType: [{
        words: {
          text: `♩ = ${firstMeasure.tempo}`,
          fontSize: '10pt'
        }
      }],
      sound: { tempo: firstMeasure.tempo }
    });
  }

  // Collect all notes from all staves
  const notes: NoteElement[] = [];
  let backup: Backup[] = [];

  for (let staffIndex = 0; staffIndex < staffMeasures.length; staffIndex++) {
    const staffMeasure = staffMeasures[staffIndex];
    const staffNumber = staffIndex + 1;

    for (const voice of staffMeasure.voices) {
      const voiceNotes = convertVoiceToNotes(voice, divisions, staffNumber, staffMeasures.length);
      notes.push(...voiceNotes);

      // Add backup to return to start of measure for next voice
      if (voiceNotes.length > 0) {
        const totalDuration = voiceNotes.reduce((sum, n) => sum + (n.duration || 0), 0);
        if (totalDuration > 0) {
          backup.push({ duration: totalDuration });
        }
      }
    }
  }

  // Remove last backup (not needed after last voice)
  if (backup.length > 0) {
    backup = backup.slice(0, -1);
  }

  return {
    number: measureNumber,
    attributes,
    direction: direction.length > 0 ? direction : undefined,
    notes,
    backup: backup.length > 0 ? backup : undefined
  };
}

/**
 * Convert a voice to MusicXML notes
 */
function convertVoiceToNotes(
  voice: LayoutVoice,
  divisions: number,
  staffNumber: number,
  totalStaves: number
): NoteElement[] {
  
  const notes: NoteElement[] = [];

  for (const event of voice.events) {
    const noteElement = convertEvent(event, divisions, voice.voiceNumber, staffNumber, totalStaves);
    notes.push(noteElement);
  }

  return notes;
}

/**
 * Convert a layout event to MusicXML note element
 */
function convertEvent(
  event: LayoutEvent,
  divisions: number,
  voiceNumber: number,
  staffNumber: number,
  totalStaves: number
): NoteElement {
  
  if (event.type === 'rest') {
    return convertRest(event, divisions, voiceNumber, staffNumber, totalStaves);
  } else {
    return convertNote(event, divisions, voiceNumber, staffNumber, totalStaves);
  }
}

/**
 * Convert a layout note to MusicXML note element
 */
function convertNote(
  note: LayoutNote,
  divisions: number,
  voiceNumber: number,
  staffNumber: number,
  totalStaves: number
): NoteElement {
  
  const duration = durationInDivisions(note.duration, divisions);

  return {
    chord: note.chord !== undefined,
    pitch: {
      step: note.pitch.step,
      alter: note.pitch.alter !== 0 ? note.pitch.alter : undefined,
      octave: note.pitch.octave
    } as import('../models/MusicXMLModel').MusicXMLPitch,
    duration,
    voice: voiceNumber,
    type: note.duration.type,
    dot: note.duration.dots > 0 ? note.duration.dots : undefined,
    accidental: note.accidental?.show ? { type: note.accidental.type } : undefined,
    stem: note.stem ? { direction: note.stem } : undefined,
    staff: totalStaves > 1 ? staffNumber : undefined
  };
}

/**
 * Convert a layout rest to MusicXML rest element
 */
function convertRest(
  rest: LayoutRest,
  divisions: number,
  voiceNumber: number,
  staffNumber: number,
  totalStaves: number
): NoteElement {
  
  const duration = durationInDivisions(rest.duration, divisions);

  return {
    rest: {},
    duration,
    voice: voiceNumber,
    type: rest.duration.type,
    dot: rest.duration.dots > 0 ? rest.duration.dots : undefined,
    staff: totalStaves > 1 ? staffNumber : undefined
  };
}

/**
 * Convert note duration to divisions
 */
function durationInDivisions(
  noteDuration: { type: string; dots: number },
  divisions: number
): number {
  
  const baseDurations: Record<string, number> = {
    'whole': divisions * 4,
    'half': divisions * 2,
    'quarter': divisions,
    'eighth': divisions / 2,
    '16th': divisions / 4,
    '32nd': divisions / 8,
    '64th': divisions / 16,
    '128th': divisions / 32
  };

  let duration = baseDurations[noteDuration.type] || divisions;

  // Add dotted duration
  for (let i = 0; i < noteDuration.dots; i++) {
    duration += duration / Math.pow(2, i + 1);
  }

  return Math.round(duration);
}

/**
 * Get clef line for clef type
 */
function getClefLine(clefSign: string): number | undefined {
  const lineMap: Record<string, number> = {
    'G': 2,
    'F': 4,
    'C': 3
  };
  return lineMap[clefSign];
}
