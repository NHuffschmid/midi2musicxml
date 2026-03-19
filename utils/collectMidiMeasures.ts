import { MidiNote, MidiMeasure } from '../types';
import { Midi } from '@tonejs/midi';

/**
 * Groups MidiNote objects into MidiMeasure objects based on time.
 * Each measure contains all notes that start within that measure's time boundaries.
 * @param midiNotes Array of MidiNote objects sorted by time
 * @param midi The MIDI object for time signature information
 * @returns Array of MidiMeasure objects, one per measure
 */
export function collectMidiMeasures(midiNotes: MidiNote[], midi: Midi): MidiMeasure[] {
  if (midiNotes.length === 0) {
    return [];
  }

  // Get time signature from MIDI (default to 4/4)
  const timeSignatures = midi.header.timeSignatures;
  const defaultTimeSignature = timeSignatures.length > 0 ? timeSignatures[0] : { timeSignature: [4, 4], ticks: 0 };
  const [beatsPerMeasure, beatType] = defaultTimeSignature.timeSignature;
  
  // Get PPQ (pulses per quarter note)
  const ppq = midi.header.ppq || 480;
  
  // Calculate ticks per measure
  // For 4/4: 4 beats * ppq * (4/4) = 4 * ppq
  // For 3/4: 3 beats * ppq * (4/4) = 3 * ppq
  const ticksPerMeasure = (beatsPerMeasure * ppq * 4) / beatType;

  // Group notes by measure number based on ticks
  const notesByMeasure = new Map<number, MidiNote[]>();
  
  for (const note of midiNotes) {
    const measureNumber = Math.floor(note.ticks / ticksPerMeasure);
    
    if (!notesByMeasure.has(measureNumber)) {
      notesByMeasure.set(measureNumber, []);
    }
    notesByMeasure.get(measureNumber)!.push(note);
  }

  // Create MidiMeasure objects sorted by measure number
  const measures: MidiMeasure[] = [];
  const sortedMeasureNumbers = Array.from(notesByMeasure.keys()).sort((a, b) => a - b);
  
  for (const measureNumber of sortedMeasureNumbers) {
    const notesInMeasure = notesByMeasure.get(measureNumber)!;
    // Notes should already be sorted by ticks from collectMidiNotes
    
    measures.push({
      notes: notesInMeasure
    });
  }

  return measures;
}
