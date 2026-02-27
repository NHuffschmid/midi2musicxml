/**
 * Transform: MusicalModel → NotationModel
 * 
 * Adds notation-specific decisions:
 * - Convert MIDI ticks to note durations (quarter, eighth, etc.)
 * - Convert MIDI numbers to pitches (step, alter, octave)
 * - Determine accidental display
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
  MusicalEvent,
  KeySignature
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
  StemDirection,
  AccidentalDisplay
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
    voices: musicalMeasure.voices.map(voice => 
      convertVoice(voice, ppq, musicalMeasure.voices.length, musicalMeasure.keySignature)
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
  totalVoices: number,
  keySignature?: KeySignature
): NotationVoice {
  
  const events = musicalVoice.events.map(event => 
    convertEvent(event, ppq, musicalVoice.voiceNumber, totalVoices, keySignature)
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
  totalVoices: number,
  keySignature?: KeySignature
): NotationEvent {
  
  if (event.type === 'rest') {
    return convertRest(event, ppq);
  } else {
    return convertNote(event, ppq, voiceNumber, totalVoices, keySignature);
  }
}

/**
 * Convert a musical note to a notation note
 */
function convertNote(
  musicalNote: MusicalNote,
  ppq: number,
  voiceNumber: number,
  totalVoices: number,
  keySignature?: KeySignature
): NotationNote {
  
  const pitch = midiToPitch(musicalNote.midi);
  const duration = ticksToDuration(musicalNote.durationTicks, ppq);
  const stem = determineStemDirection(voiceNumber, totalVoices);
  const accidental = determineAccidental(pitch, keySignature);

  return {
    type: 'note',
    pitch,
    duration,
    stem,
    accidental,
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

/**
 * Determine if accidental should be displayed
 * Only show accidentals that deviate from the key signature
 */
function determineAccidental(pitch: Pitch, keySignature?: KeySignature): AccidentalDisplay | undefined {
  // Get the expected alteration for this pitch in the current key signature
  const keyAlter = getKeySignatureAlter(pitch.step, keySignature);
  
  // If the pitch matches the key signature, no accidental needed
  if (pitch.alter === keyAlter) {
    return undefined;
  }
  
  // Accidental deviates from key signature, must be shown
  const typeMap: Record<number, AccidentalDisplay['type']> = {
    '-2': 'double-flat',
    '-1': 'flat',
    '0': 'natural',
    '1': 'sharp',
    '2': 'double-sharp'
  };
  
  return {
    show: true,
    type: typeMap[pitch.alter] || 'natural'
  };
}

/**
 * Get the expected alteration for a pitch step in a given key signature
 * @param step The pitch step (C, D, E, F, G, A, B)
 * @param keySignature The key signature (fifths and mode)
 * @returns The alteration (-1 for flat, 0 for natural, 1 for sharp)
 */
function getKeySignatureAlter(step: string, keySignature?: KeySignature): number {
  if (!keySignature) {
    return 0; // No key signature = C major/A minor, all natural
  }
  
  const fifths = keySignature.fifths;
  
  // Order of sharps: F, C, G, D, A, E, B
  const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  // Order of flats: B, E, A, D, G, C, F
  const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  
  if (fifths > 0) {
    // Sharp key: check if this step is in the first 'fifths' sharps
    const sharpIndex = sharpOrder.indexOf(step);
    return sharpIndex >= 0 && sharpIndex < fifths ? 1 : 0;
  } else if (fifths < 0) {
    // Flat key: check if this step is in the first abs(fifths) flats
    const flatIndex = flatOrder.indexOf(step);
    return flatIndex >= 0 && flatIndex < Math.abs(fifths) ? -1 : 0;
  }
  
  return 0; // fifths === 0 (C major/A minor)
}
