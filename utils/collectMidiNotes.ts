import { Midi } from '@tonejs/midi';
import { MidiNote } from '../types';

/**
 * Reads all notes from all MIDI tracks, sorts them by time, and builds an array of MidiNote objects.
 * @param midi MIDI object
 * @returns Array of MidiNote objects
 */
export function collectMidiNotes(midi: Midi): MidiNote[] {
  // Gather all notes from all tracks
  const ppq = midi.header.ppq || 480;
  const tempos = midi.header.tempos.slice().sort((a, b) => a.ticks - b.ticks);
  const tracks = midi.tracks.map(track => track.notes);

  const allMidiNotes: MidiNote[] = tracks.flat().map(note => ({
      midi: note.midi,
      name: note.name,
      ticks: note.ticks,
      time: note.time,
      duration: note.duration,
      durationTicks: note.durationTicks,
      velocity: note.velocity,
      bars: note.bars
  }));
  allMidiNotes.sort((a, b) => (a.ticks ?? 0) - (b.ticks ?? 0));

  return allMidiNotes;
}
