/**
 * Transform: LayoutModel → MusicXMLModel
 * 
 * Converts layout model to MusicXML DOM structure.
 * This is almost a 1:1 mapping.
 * 
 * Chord detection: If a note's backupBefore value matches the previous note's duration
 * (within tolerance), the note is marked as a chord and backupBefore is removed.
 */

// Tolerance for chord detection (in ticks)
// If |backupBefore - previousDuration| <= this value, notes are considered a chord
const CHORD_TOLERANCE_TICKS = 10;

import {
  LayoutScore,
  LayoutPart,
  LayoutMeasure,
  LayoutNote
} from '../models/LayoutModel';

import {
  MusicXMLDocument,
  ScorePartwise,
  Part,
  Measure,
  Attributes,
  NoteElement,
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
  
  const measures = layoutPart.measures.map((measure, index) => 
    convertMeasure(measure, layoutPart.clefs, layoutPart.staffCount, divisions, index === 0)
  );

  return {
    id: layoutPart.id,
    measures
  };
}

/**
 * Convert a layout measure to MusicXML measure
 */
function convertMeasure(
  layoutMeasure: LayoutMeasure,
  clefs: Array<{ sign: string; line?: number }>,
  staffCount: number,
  divisions: number,
  isFirstMeasure: boolean
): Measure {
  
  // Attributes (in first measure or when key/time signature changes)
  const hasKeySignature = layoutMeasure.keySignature !== undefined;
  const hasTimeSignature = layoutMeasure.timeSignature !== undefined;
  const needsAttributes = isFirstMeasure || hasKeySignature || hasTimeSignature;
  
  let attributes: Attributes | undefined;
  if (needsAttributes) {
    attributes = {
      divisions: isFirstMeasure ? divisions : undefined,
      key: hasKeySignature ? {
        fifths: layoutMeasure.keySignature!.fifths,
        mode: layoutMeasure.keySignature!.mode
      } : undefined,
      time: hasTimeSignature ? {
        beats: layoutMeasure.timeSignature!.beats,
        beatType: layoutMeasure.timeSignature!.beatType
      } : undefined,
      staves: isFirstMeasure && staffCount > 1 ? staffCount : undefined,
      clef: isFirstMeasure ? clefs.map((c, index) => ({
        sign: c.sign,
        line: c.line,
        number: staffCount > 1 ? index + 1 : undefined
      })) : undefined
    };
  }

  // Direction (tempo)
  const direction: Direction[] = [];
  if (layoutMeasure.tempo) {
    direction.push({
      placement: 'above',
      directionType: [{
        words: {
          text: `♩ = ${layoutMeasure.tempo}`,
          fontSize: '10pt'
        }
      }],
      sound: { tempo: layoutMeasure.tempo }
    });
  }

  // Convert all notes with chord detection
  const notes: NoteElement[] = [];
  let previousNoteDuration: number | undefined = undefined;
  let previousStaff: number | undefined = undefined;

  for (let i = 0; i < layoutMeasure.notes.length; i++) {
    const note = layoutMeasure.notes[i];
    const noteElement = convertNote(note, divisions, staffCount);
    
    // Chord detection: only within the same staff
    // If this note's backupBefore matches the previous note's duration AND they're on the same staff
    const isChord = previousNoteDuration !== undefined &&
                    previousStaff !== undefined &&
                    note.staffNumber === previousStaff &&
                    note.backupBefore !== undefined &&
                    Math.abs(note.backupBefore - previousNoteDuration) <= CHORD_TOLERANCE_TICKS;
    
    // Check if next note will be a chord relative to this note
    const nextNote = i + 1 < layoutMeasure.notes.length ? layoutMeasure.notes[i + 1] : undefined;
    const isFirstOfChord = nextNote !== undefined &&
                           nextNote.staffNumber === note.staffNumber &&
                           nextNote.backupBefore !== undefined &&
                           Math.abs(nextNote.backupBefore - note.durationTicks) <= CHORD_TOLERANCE_TICKS;
    
    if (isChord) {
      // This is a chord note - mark as chord, remove voice, and don't add backupBefore
      noteElement.chord = true;
      noteElement.voice = undefined;
    } else {
      // Not a chord - add backupBefore if present
      if (note.backupBefore !== undefined && note.backupBefore > 0) {
        noteElement.backupBefore = Math.round(note.backupBefore);
      }
    }
    
    // Remove voice from first note of a chord
    if (isFirstOfChord) {
      noteElement.voice = undefined;
    }
    
    notes.push(noteElement);
    
    // Remember this note's duration and staff for next iteration
    previousNoteDuration = note.durationTicks;
    previousStaff = note.staffNumber;
  }

  // Add print element for section start
  const print = layoutMeasure.sectionStart ? { newSystem: true } : undefined;

  // Add barline for section separation (double barline at left side)
  const barline = layoutMeasure.sectionStart ? [{ location: 'left' as const, barStyle: 'light-light' as const }] : undefined;

  return {
    number: layoutMeasure.number,
    print,
    attributes,
    direction: direction.length > 0 ? direction : undefined,
    notes,
    barline
  };
}

/**
 * Convert a layout note to MusicXML note element
 */
function convertNote(
  note: LayoutNote,
  divisions: number,
  totalStaves: number
): NoteElement {
  
  // Use exact durationTicks instead of re-calculating from type/dots to avoid quantization errors
  const duration = Math.round(note.durationTicks);

  // Build notations if needed (articulations, etc.)
  const notations = note.articulation ? {
    articulations: [{ type: note.articulation }]
  } : undefined;

  return {
    pitch: {
      step: note.pitch.step,
      alter: note.pitch.alter !== 0 ? note.pitch.alter : undefined,
      octave: note.pitch.octave
    } as import('../models/MusicXMLModel').MusicXMLPitch,
    duration,
    voice: note.voice,
    type: note.duration.type,
    dot: note.duration.dots > 0 ? note.duration.dots : undefined,
    notations,
    staff: totalStaves > 1 ? note.staffNumber : undefined
  };
}
