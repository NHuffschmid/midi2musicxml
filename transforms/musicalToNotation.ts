/**
 * Transform: MusicalModel → NotationModel
 * 
 * Adds notation-specific decisions:
 * - Convert MIDI ticks to note durations (quarter, eighth, etc.)
 * - Convert MIDI numbers to pitches (step, alter, octave)
 * - Determine stem directions
 * - Group simultaneous notes into chords
 * - Beaming (simplified for now)
 */

import {
  MusicalScore,
  MusicalMeasure,
  MusicalVoice,
  MusicalNote,
  MusicalRest,
  MusicalEvent
} from '../models/MusicalModel';

import {
  NotationScore,
  NotationMeasure,
  NotationVoice,
  NotationNote,
  NotationRest,
  NotationEvent,
  Pitch,
  NoteDuration,
  StemDirection
} from '../models/NotationModel';

import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

export interface MusicalToNotationOptions {
  pulsesPerQuarterNote: number;
}

const CHORD_TICK_TOLERANCE = 20;

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
    voices: musicalMeasure.voices.map(voice => 
      convertVoice(voice, ppq, musicalMeasure.voices.length)
    ),
    pedalEvents: musicalMeasure.pedalEvents
  };
}

/**
 * Convert a musical voice to a notation voice
 */
function convertVoice(
  musicalVoice: MusicalVoice,
  ppq: number,
  totalVoices: number
): NotationVoice {
  
  const events = musicalVoice.events.map(event => 
    convertEvent(event, ppq, musicalVoice.voiceNumber, totalVoices)
  );

  return {
    voiceNumber: musicalVoice.voiceNumber,
    events
  };
}

/**
 * Convert a musical event (note or rest) to a notation event
 */
function convertEvent(
  event: MusicalEvent,
  ppq: number,
  voiceNumber: number,
  totalVoices: number
): NotationEvent {
  
  if (event.type === 'rest') {
    return convertRest(event, ppq);
  } else {
    return convertNote(event, ppq, voiceNumber, totalVoices);
  }
}

/**
 * Convert a musical note to a notation note
 */
function convertNote(
  musicalNote: MusicalNote,
  ppq: number,
  voiceNumber: number,
  totalVoices: number
): NotationNote {
  
  const pitch = midiToPitch(musicalNote.midi);
  const duration = ticksToDuration(musicalNote.durationTicks, ppq);
  const stem = determineStemDirection(voiceNumber, totalVoices);

  return {
    type: 'note',
    pitch,
    duration,
    stem,
    chord: musicalNote.isChordNote ? {} : undefined
  };
}

/**
 * Convert a musical rest to a notation rest
 */
function convertRest(
  musicalRest: MusicalRest,
  ppq: number
): NotationRest {
  
  const duration = ticksToDuration(musicalRest.durationTicks, ppq);

  return {
    type: 'rest',
    duration
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
function ticksToDuration(ticks: number, ppq: number): NoteDuration {
  const { type, dots } = midiTicksToXmlDurationType(ticks, ppq);
  
  return {
    type: type as NoteDuration['type'],
    dots
  };
}

/**
 * Determine stem direction based on voice number
 * Voice 1 (highest) → stems up
 * Voice 2+ → stems down
 */
function determineStemDirection(
  voiceNumber: number,
  totalVoices: number
): StemDirection | undefined {
  
  if (totalVoices === 1) {
    return undefined; // Let renderer decide
  }
  
  return voiceNumber === 1 ? 'up' : 'down';
}
