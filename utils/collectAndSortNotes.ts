import { Midi } from '@tonejs/midi';
import { Note } from '../types';
import { midiNoteToPitch } from './midiNoteToPitch';
import { midiTicksToXmlDurationType } from './midiTicksToXmlDurationType';

/**
 * Collects all notes from all tracks in a Midi object, adds tick info, and sorts them by tick (temporal order).
 */
export function collectAndSortNotes(midi: Midi, pulsesPerQuarterNote: number): Note[] {
  const notes: Note[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      const { step, alter, octave } = midiNoteToPitch(note.midi);
      const { duration, type, dots } = midiTicksToXmlDurationType(note.durationTicks, pulsesPerQuarterNote);
      notes.push({
        step,
        alter,
        octave,
        duration,
        type,
        dots,
        tick: note.ticks ?? note.time ?? 0,
      });
    }
  }
  // Sort notes by tick (temporal order)
  notes.sort((a, b) => (a.tick ?? 0) - (b.tick ?? 0));
  return notes;
}
