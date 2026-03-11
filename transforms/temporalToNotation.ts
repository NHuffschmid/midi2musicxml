/**
 * Transform: TemporalModel → NotationModel
 * 
 * Converts time-based structure directly to notation:
 * - Propagate metadata (time signature, key signature, tempo)
 * - Convert MIDI ticks to note durations (quarter, eighth, etc.)
 * - Convert MIDI numbers to pitches (step, alter, octave)
 */

import {
  TemporalScore,
  TemporalSection,
  TemporalMeasure,
  TimeSignature,
  KeySignature
} from '../models/TemporalModel';

import {
  NotationScore,
  NotationMeasure,
  NotationNote,
  Pitch
} from '../models/NotationModel';

import { MidiNote } from '../types';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

export interface TemporalToNotationOptions {
  pulsesPerQuarterNote: number;
}

/**
 * Main transform function: TemporalModel → NotationModel
 */
export function temporalToNotation(
  temporalScore: TemporalScore,
  options: TemporalToNotationOptions
): NotationScore {
  
  const measures = sectionsToMeasures(
    temporalScore.sections,
    temporalScore.ppq,
    options.pulsesPerQuarterNote
  );

  return {
    title: temporalScore.title,
    composer: temporalScore.composer,
    copyright: temporalScore.copyright,
    parts: [
      {
        id: 'P1',
        name: ' ',
        measures
      }
    ]
  };
}

/**
 * Convert temporal sections to notation measures
 */
function sectionsToMeasures(
  sections: TemporalSection[],
  ppq: number,
  pulsesPerQuarterNote: number
): NotationMeasure[] {
  const notationMeasures: NotationMeasure[] = [];
  let previousKeySignature: KeySignature | undefined;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const isFirstSection = sectionIndex === 0;
    const keySignatureChanged = !previousKeySignature || 
      previousKeySignature.fifths !== section.keySignature.fifths || 
      previousKeySignature.mode !== section.keySignature.mode;
    
    for (let measureIndex = 0; measureIndex < section.measures.length; measureIndex++) {
      const temporalMeasure = section.measures[measureIndex];
      const isFirstMeasureInSection = measureIndex === 0;
      
      const notationMeasure = convertMeasure(
        temporalMeasure, 
        section, 
        isFirstMeasureInSection && !isFirstSection, // Mark section start (except for the very first section)
        isFirstMeasureInSection && keySignatureChanged, // Show key signature if changed
        isFirstMeasureInSection, // Show time signature and tempo on first measure
        ppq,
        pulsesPerQuarterNote
      );
      
      notationMeasures.push(notationMeasure);
    }
    
    previousKeySignature = section.keySignature;
  }

  return notationMeasures;
}

/**
 * Convert a single temporal measure to a notation measure
 */
function convertMeasure(
  temporalMeasure: TemporalMeasure,
  section: TemporalSection,
  isSectionStart: boolean,
  showKeySignature: boolean,
  isFirstMeasure: boolean,
  ppq: number,
  pulsesPerQuarterNote: number
): NotationMeasure {

  // Sort and convert notes
  const notes = convertNotes(temporalMeasure.notes, ppq, pulsesPerQuarterNote);

  return {
    number: temporalMeasure.number,
    timeSignature: isFirstMeasure ? section.timeSignature : undefined,
    keySignature: showKeySignature ? section.keySignature : undefined,
    tempo: isFirstMeasure && section.tempo ? section.tempo : undefined,
    sectionStart: isSectionStart || undefined,
    notes
  };
}

/**
 * Convert and sort MIDI notes to notation notes
 */
function convertNotes(
  midiNotes: MidiNote[],
  ppq: number,
  pulsesPerQuarterNote: number
): NotationNote[] {
  
  if (midiNotes.length === 0) {
    return [];
  }

  // Sort notes by start time
  const sortedNotes = [...midiNotes].sort((a, b) => a.ticks - b.ticks);

  const notes: NotationNote[] = [];

  for (const midiNote of sortedNotes) {
    const noteStart = midiNote.ticks;
    const noteDuration = midiNote.durationTicks;

    // Convert MIDI to notation
    const pitch = midiToPitch(midiNote.midi);
    const { type, dots } = ticksToDuration(noteDuration, pulsesPerQuarterNote);

    const notationNote: NotationNote = {
      pitch,
      type: type as NotationNote['type'],
      dots,
      startTick: noteStart,
      durationTicks: noteDuration,
    };
    
    notes.push(notationNote);
  }

  return notes;
}

/**
 * Convert MIDI number to pitch
 */
function midiToPitch(midi: number): Pitch {
  const stepNames: Array<'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'> = 
    ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alterMap = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  
  const step = stepNames[midi % 12];
  const alter = alterMap[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  
  return { step, alter, octave };
}

/**
 * Convert MIDI ticks to note duration
 */
function ticksToDuration(ticks: number, ppq: number): { type: string; dots: number } {
  return midiTicksToXmlDurationType(ticks, ppq);
}
