/**
 * Transform: LayoutModel → MusicXMLModel
 * 
 * Converts layout model to MusicXML DOM structure.
 * This is almost a 1:1 mapping.
 */

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
  Clef,
  Beam
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

  // Process each staff independently, then merge and sort
  interface NoteWithStaff {
    noteElement: NoteElement;
    layoutNote: LayoutNote;
    staffNumber: number;
  }
  const allNotes: NoteWithStaff[] = [];

  for (const staff of layoutMeasure.staves) {
    // Convert notes for this staff
    const staffNotes: NoteElement[] = staff.notes.map(note =>
      convertNote(note, divisions, staffCount)
    );

    // Compute beam groups for this staff
    computeBeamsForNotes(staffNotes, divisions, layoutMeasure.timeSignature);

    // Add staff number and collect
    for (let i = 0; i < staffNotes.length; i++) {
      allNotes.push({
        noteElement: staffNotes[i],
        layoutNote: staff.notes[i],
        staffNumber: staff.number
      });
    }
  }

  // Sort notes by startTick to restore temporal order
  allNotes.sort((a, b) => {
    return a.layoutNote.startTick - b.layoutNote.startTick;
  });

  // Render notes with backup elements
  const notes: NoteElement[] = [];
  for (const { noteElement, layoutNote, staffNumber } of allNotes) {
    notes.push({
      ...noteElement,
      staff: staffCount > 1 ? staffNumber : undefined,
      startTick: layoutNote.startTick
    });
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
 * Compute and assign beam groups for a sequence of notes.
 * Beams connect consecutive beamable notes (eighth or shorter) within the same beat.
 * @param notes     - NoteElement array (primary + chord notes, in order)
 * @param divisions - Ticks per quarter note
 * @param timeSig   - Time signature for beat grouping
 */
function computeBeamsForNotes(
  notes: NoteElement[],
  divisions: number,
  timeSig?: { beats: number; beatType: number }
): void {
  const beamableTypes = new Set(['eighth', '16th', '32nd', '64th']);
  const beats    = timeSig?.beats    ?? 4;
  const beatType = timeSig?.beatType ?? 4;
  const ticksPerBeat = (divisions * 4) / beatType;

  // Compound time (6/8, 9/8, 12/8): beam over dotted-quarter (3 eighths)
  const isCompound = beatType === 8 && beats % 3 === 0;
  const beamGroupTicks = isCompound ? ticksPerBeat * 3 : ticksPerBeat;

  // Collect indices of primary (non-chord) notes
  const primaryIdx: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    if (!notes[i].chord) primaryIdx.push(i);
  }

  let pi = 0;
  while (pi < primaryIdx.length) {
    const idx  = primaryIdx[pi];
    const note = notes[idx];

    if (!beamableTypes.has(note.type)) {
      pi++;
      continue;
    }

    // Beat boundary this note belongs to
    const beatStart = Math.floor(note.startTick / beamGroupTicks) * beamGroupTicks;
    const beatEnd   = beatStart + beamGroupTicks;

    // Collect consecutive beamable primaries within the same beat
    const group: number[] = [idx];
    let pj = pi + 1;
    while (pj < primaryIdx.length) {
      const nidx = primaryIdx[pj];
      const next = notes[nidx];
      if (!beamableTypes.has(next.type)) break;
      if (next.startTick >= beatEnd)      break;
      group.push(nidx);
      pj++;
    }

    if (group.length >= 2) {
      for (let k = 0; k < group.length; k++) {
        const beamType: Beam['type'] = k === 0 ? 'begin'
          : k === group.length - 1   ? 'end'
          : 'continue';
        const beamEl: Beam = { number: 1, type: beamType };

        // Assign to primary note
        notes[group[k]].beam = [beamEl];

        // Propagate to chord notes immediately following this primary
        let ci = group[k] + 1;
        while (ci < notes.length && notes[ci].chord) {
          notes[ci].beam = [beamEl];
          ci++;
        }
      }
    }

    pi = pj;
  }
}

/**
 * Convert a layout note to MusicXML note element
 * Note: staff number is assigned later in convertMeasure
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
    type: note.type,
    dot: note.dots > 0 ? note.dots : undefined,
    chord: note.isChord || undefined, // Set chord flag if this is a chord note
    notations,
    startTick: note.startTick
    // Note: staff property is added later in convertMeasure after sorting
  };
}
