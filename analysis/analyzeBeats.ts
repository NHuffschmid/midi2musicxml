import { Midi } from '@tonejs/midi';
import { MidiMeasure, MidiNote } from '../types';

/**
 * Analyzes the beats of a MIDI file and returns the time signature as an object.
 * @param midi The MIDI file to analyze
 * @param midiNotes Array of MIDI notes
 * @param midiMeasures Array of MIDI measures
 * @returns The time signature as an object with beats and beatType properties
 */
export function analyzeBeats(midi: Midi, midiNotes: MidiNote[], midiMeasures: MidiMeasure[]): { beats: number; beatType: number } {
  
  // Default to 4/4 if no time signature is found
  let time = { beats: 4, beatType: 4 };
 
  if (midi.header.timeSignatures && midi.header.timeSignatures.length > 0) {
    const ts = midi.header.timeSignatures[0].timeSignature;
    if (Array.isArray(ts) && ts.length === 2) {
      time = { beats: ts[0], beatType: ts[1] };
    }
  }
  else {
    console.warn('No time signature found in MIDI header, defaulting to 4/4');
  
    // TODO: implement beat detection from note data if no time signature is present in MIDI header
    // This is a complex problem and may require analyzing note onsets, durations, and patterns to infer the most likely time signature.
    // For now, we will just default to 4/4 if no time signature is found in the MIDI header.
  }
  
  return time;
}
