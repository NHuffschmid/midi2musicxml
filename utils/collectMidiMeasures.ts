import { MidiNote, MidiMeasure } from '../types';

/**
 * Groups MidiNote objects into MidiMeasure objects based on their bars property.
 * Each measure contains all notes that start within that measure.
 * @param midiNotes Array of MidiNote objects with bars property
 * @returns Array of MidiMeasure objects, one per measure
 */
export function collectMidiMeasures(midiNotes: MidiNote[]): MidiMeasure[] {
  if (midiNotes.length === 0) {
    return [];
  }

  // Group notes by measure number (floor of bars property)
  const notesByMeasure = new Map<number, MidiNote[]>();
  
  for (const note of midiNotes) {
    const measureNumber = Math.floor(note.bars);
    
    if (!notesByMeasure.has(measureNumber)) {
      notesByMeasure.set(measureNumber, []);
    }
    notesByMeasure.get(measureNumber)!.push(note);
  }

  // Create MidiMeasure objects sorted by measure number
  const measures: MidiMeasure[] = [];

  //really needed?
  const sortedMeasureNumbers = Array.from(notesByMeasure.keys()).sort((a, b) => a - b);
  
  for (const measureNumber of sortedMeasureNumbers) {
    const notesInMeasure = notesByMeasure.get(measureNumber)!;
    // Sort notes within measure by ticks (really needed?)
    notesInMeasure.sort((a, b) => a.ticks - b.ticks);
    
    measures.push({
      notes: notesInMeasure
    });
  }

  return measures;
}
