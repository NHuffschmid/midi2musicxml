import { Midi } from '@tonejs/midi';
import { Note } from '../types';
import { midiNoteToPitch } from './midiNoteToPitch';

/**
 * Collects all notes from all tracks in a Midi object, adds tick info, and sorts them by tick (temporal order).
 */
export function collectAndSortNotes(midi: Midi): Note[] {
  const notes: Note[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      const { step, alter, octave } = midiNoteToPitch(note.midi);
      notes.push({
        step,
        alter,
        octave,
        duration: 1,
        type: 'quarter',
        tick: note.ticks ?? note.time ?? 0,
      });
    }
  }
  // Sort notes by tick (temporal order)
  notes.sort((a, b) => (a.tick ?? 0) - (b.tick ?? 0));
  return notes;
}
