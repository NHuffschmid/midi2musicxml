import { Midi } from '@tonejs/midi';
import { MidiMeasure, Section } from '../types';
import { analyzeBeats } from './analyzeBeats';
import { analyseKey } from './analyseKey';
import { analyzeTempo } from './analyzeTempo';

/**
 * Analyzes the sections of a MIDI file.
 * @param midi The tonejs/midi object to analyze.
 * @param midiMeasures The collected measures of the MIDI object.
 * @returns An array of sections.
 */
export function analyzeSections(midi: Midi, midiMeasures: MidiMeasure[]): Section[] {
  
  const time = analyzeBeats(midi);
  const key = analyseKey(midiMeasures);
  const tempo = analyzeTempo(midi);

  return [{
    measures: midiMeasures,
    key,
    time,
    tempo
  }];
}