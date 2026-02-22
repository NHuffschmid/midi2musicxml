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

  // Extract tempo changes from MIDI header and sort by ticks
  const tempos = midi.header.tempos.slice().sort((a, b) => a.ticks - b.ticks);

  // Assign tempo to each note based on its tick position
  allMidiNotes.forEach(note => {
    let currentTempo: number | undefined;
    for (const tempo of tempos) {
      if (tempo.ticks <= note.ticks) {
        currentTempo = tempo.bpm;
      } else {
        break;
      }
    }
    note.tempo = currentTempo;
  });

  return allMidiNotes;
}
