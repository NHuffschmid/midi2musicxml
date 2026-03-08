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

  // Process each staff independently, then merge and sort
  interface NoteWithStaff {
    noteElement: NoteElement;
    layoutNote: LayoutNote;
    staffNumber: number;
  }
  const allNotes: NoteWithStaff[] = [];

  // Track next available beam number (measure-wide unique)
  let nextBeamNumber = 1;

  for (const staff of layoutMeasure.staves) {
    // Convert notes for this staff
    const staffNotes: NoteElement[] = staff.notes.map(note => 
      convertNote(note, divisions, staffCount)
    );

    // Apply beaming first (before chord detection, so voices are stable)
    nextBeamNumber = applyBeaming(staffNotes, staff.notes, nextBeamNumber);

    // Apply chord detection after beaming (so chord members get correct voice)
    applyChordDetection(staffNotes, staff.notes);

    // Add staff number and collect
    for (let i = 0; i < staffNotes.length; i++) {
      allNotes.push({
        noteElement: staffNotes[i],
        layoutNote: staff.notes[i],
        staffNumber: staff.number
      });
    }
  }

  // Sort notes by startTick (primary) and voice (secondary) to restore temporal order
  allNotes.sort((a, b) => {
    if (a.layoutNote.startTick !== b.layoutNote.startTick) {
      return a.layoutNote.startTick - b.layoutNote.startTick;
    }
    // Secondary sort by voice (if present)
    const voiceA = a.noteElement.voice || 0;
    const voiceB = b.noteElement.voice || 0;
    return voiceA - voiceB;
  });

  // Extract final note elements with staff assignment
  const notes: NoteElement[] = allNotes.map(({ noteElement, staffNumber }) => ({
    ...noteElement,
    staff: staffCount > 1 ? staffNumber : undefined
  }));

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
    voice: note.voice,
    type: note.type,
    dot: note.dots > 0 ? note.dots : undefined,
    notations
    // Note: staff property is added later in convertMeasure after sorting
  };
}

/**
 * Apply chord detection to a staff's notes
 * Notes with same startTick and durationTicks are marked as chord
 */
function applyChordDetection(noteElements: NoteElement[], layoutNotes: LayoutNote[]): void {
  let previousStartTick: number | undefined = undefined;
  let previousDurationTicks: number | undefined = undefined;
  let chordVoice: number | undefined = undefined;

  for (let i = 0; i < noteElements.length; i++) {
    const noteElement = noteElements[i];
    const layoutNote = layoutNotes[i];
    
    // Chord detection: notes with nearly identical startTick AND durationTicks form a chord
    const isChord = previousStartTick !== undefined &&
                    previousDurationTicks !== undefined &&
                    Math.abs(layoutNote.startTick - previousStartTick) <= CHORD_TOLERANCE_TICKS &&
                    Math.abs(layoutNote.durationTicks - previousDurationTicks) <= CHORD_TOLERANCE_TICKS;
    
    // Check if next note will be a chord relative to this note
    const nextLayoutNote = i + 1 < layoutNotes.length ? layoutNotes[i + 1] : undefined;
    const isFirstOfChord = nextLayoutNote !== undefined &&
                           Math.abs(nextLayoutNote.startTick - layoutNote.startTick) <= CHORD_TOLERANCE_TICKS &&
                           Math.abs(nextLayoutNote.durationTicks - layoutNote.durationTicks) <= CHORD_TOLERANCE_TICKS;
    
    if (isChord) {
      // This is a chord note - mark as chord, assign same voice as first chord note, remove backupBefore
      noteElement.chord = true;
      noteElement.voice = chordVoice;
      noteElement.backupBefore = undefined;
    } else {
      // Not a chord - add backupBefore if present
      if (layoutNote.backupBefore !== undefined && layoutNote.backupBefore > 0) {
        noteElement.backupBefore = Math.round(layoutNote.backupBefore);
      }
      // Reset chord voice for new chord
      chordVoice = undefined;
    }
    
    // Remember voice for chord members that follow
    if (isFirstOfChord) {
      chordVoice = noteElement.voice;
    }
    
    // Remember this note's startTick and durationTicks for next iteration
    previousStartTick = layoutNote.startTick;
    previousDurationTicks = layoutNote.durationTicks;
  }
}

/**
 * Apply automatic beaming to consecutive beamable notes (eighth, 16th, 32nd, 64th, 128th)
 * Groups are formed based on:
 * - Consecutive notes (not separated by chord members or non-beamable notes)
 * Note: This function is called per staff, so no staff checking needed
 * @param startBeamNumber First beam number to use (for measure-wide uniqueness)
 * @returns Next available beam number
 */
function applyBeaming(noteElements: NoteElement[], layoutNotes: LayoutNote[], startBeamNumber: number): number {
  // Track beam groups
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
  let nextBeamNumber = startBeamNumber;

  for (let i = 0; i < noteElements.length; i++) {
    const noteElement = noteElements[i];
    const layoutNote = layoutNotes[i];
    const isBeamable = beamableTypes.has(noteElement.type);
    const isChord = noteElement.chord === true;

    // Check if we should continue the current beam group
    const canContinueGroup = currentGroup !== null &&
                             isBeamable &&
                             !isChord; // Don't beam across chord boundaries (only first chord note can beam)

    if (canContinueGroup && currentGroup) {
      // Add to current group
      currentGroup.notes.push({ noteElement, index: i });
      currentGroup.beamLevels = Math.max(currentGroup.beamLevels, typeLevels[noteElement.type] || 1);
    } else {
      // Finalize previous group
      if (currentGroup && currentGroup.notes.length > 1) {
        applyBeamToGroup(currentGroup, nextBeamNumber);
        nextBeamNumber += currentGroup.beamLevels;
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
  }

  // Finalize last group
  if (currentGroup && currentGroup.notes.length > 1) {
    applyBeamToGroup(currentGroup, nextBeamNumber);
    nextBeamNumber += currentGroup.beamLevels;
  }
  
  return nextBeamNumber;
}

/**
 * Apply beam elements to a group of notes
 * @param startBeamNumber First beam number for this group (levels will use consecutive numbers)
 */
function applyBeamToGroup(group: { notes: Array<{ noteElement: NoteElement; index: number }>; beamLevels: number }, startBeamNumber: number): void {
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
        number: startBeamNumber + level - 1,
        value: beamValue
      });
    }
  }
  
  // Ensure all beamed notes have the same voice (use voice from first note)
  const groupVoice = notes[0].noteElement.voice;
  for (let i = 0; i < notes.length; i++) {
    const { noteElement } = notes[i];
    noteElement.voice = groupVoice;
  }
}

