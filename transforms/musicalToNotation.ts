/**
 * Transform: MusicalModel → NotationModel
 * 
 * Adds notation-specific decisions:
 * - Convert MIDI ticks to note durations (quarter, eighth, etc.)
 * - Convert MIDI numbers to pitches (step, alter, octave)
 */

import {
  MusicalScore,
  MusicalMeasure,
  MusicalNote
} from '../models/MusicalModel';

import {
  NotationScore,
  NotationMeasure,
  NotationNote,
  Pitch
} from '../models/NotationModel';

import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

export interface MusicalToNotationOptions {
  pulsesPerQuarterNote: number;
}

/**
 * Main transform function: MusicalModel → NotationModel
 */
export function musicalToNotation(
  musicalScore: MusicalScore,
  options: MusicalToNotationOptions
): NotationScore {
  
  return {
    title: musicalScore.title,
    composer: musicalScore.composer,
    copyright: musicalScore.copyright,
    parts: musicalScore.parts.map(part => ({
      id: part.id,
      name: part.name,
      measures: part.measures.map(measure => 
        convertMeasure(measure, options.pulsesPerQuarterNote)
      )
    }))
  };
}

/**
 * Convert a musical measure to a notation measure
 */
function convertMeasure(
  musicalMeasure: MusicalMeasure,
  ppq: number
): NotationMeasure {
  
  return {
    number: musicalMeasure.number,
    timeSignature: musicalMeasure.timeSignature,
    keySignature: musicalMeasure.keySignature,
    tempo: musicalMeasure.tempo,
    sectionStart: musicalMeasure.sectionStart,
    notes: musicalMeasure.notes.map(note => convertNote(note, ppq)),
    pedalEvents: musicalMeasure.pedalEvents
  };
}

/**
 * Convert a musical note to a notation note
 */
function convertNote(
  musicalNote: MusicalNote,
  ppq: number
): NotationNote {
  
  const pitch = midiToPitch(musicalNote.midi);
  const { type, dots } = ticksToDuration(musicalNote.durationTicks, ppq);
  
  return {
    pitch,
    type: type as NotationNote['type'],
    dots,
    startTick: musicalNote.startTick,      // Preserve from MusicalModel
    durationTicks: musicalNote.durationTicks,  // Preserve exact tick duration
    voice: musicalNote.voice
  };
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
