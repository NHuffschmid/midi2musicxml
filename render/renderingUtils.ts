
import { Note, RenderNote, RenderMeasure } from '../types';

const CHORD_TICK_TOLERANCE = 20;

/**
 * Assigns notes to measures based on time signature.
 * For now, uses a simple approach: 4 notes per measure.
 * Can be enhanced later with more sophisticated logic.
 */
export function assignNotesToMeasures(notes: Note[], timeSignature: { beats: number; beatType: number }): RenderMeasure[] {
  const measures: RenderMeasure[] = [];
  const notesPerMeasure = timeSignature.beats; // Simple approach: one note per beat
  
  for (let i = 0; i < notes.length; i += notesPerMeasure) {
    const measureNotes = notes.slice(i, i + notesPerMeasure);
    measures.push({ notes: measureNotes });
  }
  
  // If no notes present, create at least one empty measure
  if (measures.length === 0) {
    measures.push({ notes: [] });
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
