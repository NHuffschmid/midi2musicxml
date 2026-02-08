
import { Note, RenderNote, RenderMeasure } from '../types';

const CHORD_TICK_TOLERANCE = 20;

/**
 * Assigns notes to measures based on their tick values and time signature.
 * Each note is placed in the measure corresponding to its tick position.
 * Empty measures are created before the first note if needed.
 */
export function assignNotesToMeasures(
  notes: Note[], 
  timeSignature: { beats: number; beatType: number },
  pulsesPerQuarterNote: number = 480
): RenderMeasure[] {
  const measureLength = timeSignature.beats * pulsesPerQuarterNote;
  const measures: RenderMeasure[] = [];
  
  if (notes.length === 0) {
    measures.push({ notes: [] });
    return measures;
  }
  
  // Find the measure index for each note based on its tick value
  for (const note of notes) {
    const tick = note.tick ?? 0;
    const measureIndex = Math.floor(tick / measureLength);
    
    // Ensure we have enough measures (create empty ones if needed)
    while (measures.length <= measureIndex) {
      measures.push({ notes: [] });
    }
    
    // Add note to the appropriate measure
    measures[measureIndex].notes.push(note);
  }
  
  return measures;
}

/**
 * Detects chords in notes array and marks them with isChord property.
 * Notes with nearly identical tick values (within tolerance) are grouped as chords.
 * First note in each group gets isChord=false, subsequent notes get isChord=true.
 */
export function detectChords(notes: Note[]): RenderNote[] {
  const renderNotes: RenderNote[] = notes.map(n => ({ ...n }));
  
  // Group notes by tick (with tolerance)
  const groups: RenderNote[][] = [];
  let currentGroup: RenderNote[] = [];
  
  for (let i = 0; i < renderNotes.length; i++) {
    const note = renderNotes[i];
    if (currentGroup.length === 0) {
      currentGroup.push(note);
    } else {
      const lastTick = currentGroup[0].tick ?? 0;
      if (note.tick !== undefined && Math.abs(note.tick - lastTick) <= CHORD_TICK_TOLERANCE) {
        currentGroup.push(note);
      } else {
        groups.push(currentGroup);
        currentGroup = [note];
      }
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  
  // Mark chords: first note of each group = no chord, rest = chord
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      group[i].isChord = i > 0;
    }
  }
  
  return renderNotes;
}

/**
 * Fills measures with rests to ensure each measure has the correct duration.
 * This ensures valid MusicXML output with no gaps.
 */
export function fillMeasuresWithRests(
  measures: RenderMeasure[], 
  timeSignature: { beats: number; beatType: number },
  octave: number = 4
): RenderMeasure[] {
  const targetNotesPerMeasure = timeSignature.beats;
  
  return measures.map(measure => {
    const filled = [...measure.notes];
    while (filled.length < targetNotesPerMeasure) {
      filled.push({
        step: 'C',
        octave,
        duration: 1,
        type: 'quarter',
        tick: filled.length > 0 ? (filled[filled.length - 1].tick ?? 0) : 0,
        isRest: true,
      });
    }
    return { notes: filled };
  });
}
