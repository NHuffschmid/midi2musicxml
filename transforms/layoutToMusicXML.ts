/**
 * Transform: LayoutModel → MusicXMLModel
 * 
 * Converts layout model to MusicXML DOM structure.
 * This is almost a 1:1 mapping.
 * 
 * Chord detection: If notes have nearly identical startTick AND durationTicks values 
 * (within tolerance) and belong to the same staff, they form a chord.
 */

// Tolerance for chord detection (in ticks)
// If |startTick1 - startTick2| <= this value AND |durationTicks1 - durationTicks2| <= this value,
// notes are considered a chord
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

  // Convert all notes with chord detection and beaming
  const notes: NoteElement[] = [];
  let previousStartTick: number | undefined = undefined;
  let previousDurationTicks: number | undefined = undefined;
  let previousStaff: number | undefined = undefined;

  for (let i = 0; i < layoutMeasure.notes.length; i++) {
    const note = layoutMeasure.notes[i];
    const noteElement = convertNote(note, divisions, staffCount);
    
    // Chord detection: notes with nearly identical startTick AND durationTicks on the same staff form a chord
    const isChord = previousStartTick !== undefined &&
                    previousDurationTicks !== undefined &&
                    previousStaff !== undefined &&
                    note.staffNumber === previousStaff &&
                    Math.abs(note.startTick - previousStartTick) <= CHORD_TOLERANCE_TICKS &&
                    Math.abs(note.durationTicks - previousDurationTicks) <= CHORD_TOLERANCE_TICKS;
    
    // Check if next note will be a chord relative to this note
    const nextNote = i + 1 < layoutMeasure.notes.length ? layoutMeasure.notes[i + 1] : undefined;
    const nextLayoutNote = i + 1 < layoutMeasure.notes.length ? layoutMeasure.notes[i + 1] : undefined;
    const isFirstOfChord = nextNote !== undefined &&
                           nextLayoutNote !== undefined &&
                           nextLayoutNote.staffNumber === note.staffNumber &&
                           Math.abs(nextLayoutNote.startTick - note.startTick) <= CHORD_TOLERANCE_TICKS &&
                           Math.abs(nextLayoutNote.durationTicks - note.durationTicks) <= CHORD_TOLERANCE_TICKS;
    
    if (isChord) {
      // This is a chord note - mark as chord and remove voice and backupBefore
      noteElement.chord = true;
      noteElement.voice = undefined;
      noteElement.backupBefore = undefined;
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
    
    // Remember this note's startTick, durationTicks and staff for next iteration
    previousStartTick = note.startTick;
    previousDurationTicks = note.durationTicks;
    previousStaff = note.staffNumber;
  }

  // Apply beaming to notes
  applyBeaming(notes, layoutMeasure.notes);

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
    type: note.type,
    dot: note.dots > 0 ? note.dots : undefined,
    notations,
    staff: totalStaves > 1 ? note.staffNumber : undefined
  };
}

/**
 * Apply beaming to notes in a measure
 * Groups notes that should be beamed together based on:
 * - Same staff
 * - Same voice
 * - Beamable note types (eighth, 16th, 32nd, 64th)
 */
function applyBeaming(noteElements: NoteElement[], layoutNotes: LayoutNote[]): void {
  // Track beam groups by staff+voice combination
  interface BeamGroup {
    notes: Array<{ noteElement: NoteElement; index: number }>;
    beamLevels: number; // How many beam levels (1 for eighth, 2 for 16th, etc.)
  }

  const beamableTypes = new Set(['eighth', '16th', '32nd', '64th', '128th']);
  const typeLevels: Record<string, number> = {
    'eighth': 1,
    '16th': 2,
    '32nd': 3,
    '64th': 4,
    '128th': 5
  };

  let currentGroup: BeamGroup | null = null;
  let lastStaff: number | undefined = undefined;
  let lastVoice: number | undefined = undefined;

  for (let i = 0; i < noteElements.length; i++) {
    const noteElement = noteElements[i];
    const layoutNote = layoutNotes[i];
    const staff = noteElement.staff || 1;
    const voice = noteElement.voice || 1;
    const isBeamable = beamableTypes.has(noteElement.type);
    const isChord = noteElement.chord === true;

    // Check if we should continue the current beam group
    const canContinueGroup = currentGroup !== null &&
                             lastStaff === staff &&
                             lastVoice === voice &&
                             isBeamable &&
                             !isChord; // Don't beam across chord boundaries (only first chord note can beam)

    if (canContinueGroup && currentGroup) {
      // Add to current group
      currentGroup.notes.push({ noteElement, index: i });
      currentGroup.beamLevels = Math.max(currentGroup.beamLevels, typeLevels[noteElement.type] || 1);
    } else {
      // Finalize previous group
      if (currentGroup && currentGroup.notes.length > 1) {
        applyBeamToGroup(currentGroup);
      }

      // Start new group if this note is beamable and not a chord member
      if (isBeamable && !isChord) {
        currentGroup = {
          notes: [{ noteElement, index: i }],
          beamLevels: typeLevels[noteElement.type] || 1
        };
      } else {
        currentGroup = null;
      }
    }

    lastStaff = staff;
    lastVoice = voice;
  }

  // Finalize last group
  if (currentGroup && currentGroup.notes.length > 1) {
    applyBeamToGroup(currentGroup);
  }
}

/**
 * Apply beam elements to a group of notes
 */
function applyBeamToGroup(group: { notes: Array<{ noteElement: NoteElement; index: number }>; beamLevels: number }): void {
  const { notes, beamLevels } = group;
  
  for (let level = 1; level <= beamLevels; level++) {
    for (let i = 0; i < notes.length; i++) {
      const { noteElement } = notes[i];
      
      if (!noteElement.beam) {
        noteElement.beam = [];
      }

      let beamValue: 'begin' | 'continue' | 'end';
      
      if (i === 0) {
        beamValue = 'begin';
      } else if (i === notes.length - 1) {
        beamValue = 'end';
      } else {
        beamValue = 'continue';
      }

      noteElement.beam.push({
        number: level,
        value: beamValue
      });
    }
  }
}

