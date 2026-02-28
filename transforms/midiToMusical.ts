/**
 * Transform: MIDI → MusicalModel
 * 
 * Converts MIDI data (MidiNote[], MidiMeasure[]) to MusicalModel.
 * 
 * Key responsibilities:
 * - Voice separation (highest notes → Voice 1)
 * - Rest insertion (fill gaps in each voice)
 * - Chord grouping (simultaneous notes)
 * - Extract time signature, key signature, tempo
 */

import { Midi } from '@tonejs/midi';
import { MidiNote, MidiMeasure, Section } from '../types';
import { 
  MusicalScore, 
  MusicalPart, 
  MusicalMeasure, 
  MusicalVoice, 
  MusicalNote, 
  MusicalRest,
  MusicalEvent,
  TimeSignature,
  KeySignature,
  MusicalMetadata
} from '../models/MusicalModel';

const CHORD_TICK_TOLERANCE = 20; // Notes within this tick range are considered simultaneous

export interface MidiToMusicalOptions {
  title?: string;
  composer?: string;
  copyright?: string;
  pulsesPerQuarterNote: number;
}

/**
 * Main transform function: MIDI → MusicalModel
 */
export function midiToMusical(
  sections: Section[],
  options: MidiToMusicalOptions
): MusicalScore {
  
  const parts: MusicalPart[] = [
    {
      id: 'P1',
      name: '',
      measures: sectionsToMeasures(sections, options.pulsesPerQuarterNote)
    }
  ];

  return {
    title: options.title,
    composer: options.composer,
    copyright: options.copyright,
    parts
  };
}

/**
 * Convert sections to musical measures with voice separation
 */
function sectionsToMeasures(
  sections: Section[],
  ppq: number
): MusicalMeasure[] {
  const musicalMeasures: MusicalMeasure[] = [];
  let globalMeasureNumber = 1;
  let previousKeySignature: KeySignature | undefined;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const isFirstSection = sectionIndex === 0;
    const keySignatureChanged = !previousKeySignature || 
      previousKeySignature.fifths !== section.key.fifths || 
      previousKeySignature.mode !== section.key.mode;
    
    for (let measureIndex = 0; measureIndex < section.measures.length; measureIndex++) {
      const midiMeasure = section.measures[measureIndex];
      const isFirstMeasureInSection = measureIndex === 0;
      
      const musicalMeasure = convertMeasure(
        midiMeasure, 
        section, 
        measureIndex, 
        globalMeasureNumber,
        isFirstMeasureInSection && !isFirstSection, // Mark section start (except for the very first section)
        isFirstMeasureInSection && keySignatureChanged, // Show key signature if changed
        ppq
      );
      
      musicalMeasures.push(musicalMeasure);
      globalMeasureNumber++;
    }
    
    previousKeySignature = section.key;
  }

  return musicalMeasures;
}

/**
 * Convert a single MIDI measure to a Musical measure
 */
function convertMeasure(
  midiMeasure: MidiMeasure,
  section: Section,
  measureIndex: number,
  globalMeasureNumber: number,
  isSectionStart: boolean,
  showKeySignature: boolean,
  ppq: number
): MusicalMeasure {
  
  const isFirstMeasure = measureIndex === 0;

  // Separate notes into voices
  const voices = separateVoices(midiMeasure.notes, ppq, section.time);

  return {
    number: globalMeasureNumber,
    timeSignature: isFirstMeasure ? section.time : undefined,
    keySignature: showKeySignature ? section.key : undefined,
    tempo: isFirstMeasure && section.tempo ? section.tempo : undefined,
    sectionStart: isSectionStart || undefined,
    voices
  };
}

/**
 * Separate notes into voices based on overlapping
 * Highest notes go to Voice 1
 */
function separateVoices(
  midiNotes: MidiNote[],
  ppq: number,
  timeSignature: TimeSignature
): MusicalVoice[] {
  
  if (midiNotes.length === 0) {
    // Return a single voice with a full measure rest
    const measureDurationTicks = (timeSignature.beats * ppq * 4) / timeSignature.beatType;
    return [{
      voiceNumber: 1,
      events: [{
        type: 'rest',
        startTick: 0,
        durationTicks: measureDurationTicks
      }]
    }];
  }

  // Sort notes by: 1. start time, 2. pitch (descending - highest first)
  const sortedNotes = [...midiNotes].sort((a, b) => {
    if (a.ticks !== b.ticks) return a.ticks - b.ticks;
    return b.midi - a.midi; // Higher pitches first
  });

  // Track voices (each voice tracks its last occupied tick)
  const voices: Array<{voiceNumber: number; events: MusicalEvent[]; lastTick: number; startTick: number}> = [];

  // Get measure boundaries
  const measureDurationTicks = (timeSignature.beats * ppq * 4) / timeSignature.beatType;
  const measureStartTick = midiNotes.length > 0 ? Math.floor(midiNotes[0].ticks / measureDurationTicks) * measureDurationTicks : 0;
  const measureEndTick = measureStartTick + measureDurationTicks;

  for (const midiNote of sortedNotes) {
    const noteStart = midiNote.ticks;
    const noteEnd = midiNote.ticks + midiNote.durationTicks;

    // Find a voice that is free at this note's start time (with tolerance for chords)
    let targetVoice = voices.find(v => v.lastTick <= noteStart + CHORD_TICK_TOLERANCE);

    if (!targetVoice) {
      // Create new voice
      targetVoice = {
        voiceNumber: voices.length + 1,
        events: [],
        lastTick: measureStartTick,
        startTick: measureStartTick
      };
      voices.push(targetVoice);
    }

    // Determine if this is a chord note (starts within tolerance of last note in voice)
    const lastEvent = targetVoice.events[targetVoice.events.length - 1];
    const isChordNote = lastEvent !== undefined && 
                        lastEvent.type === 'note' && 
                        Math.abs(noteStart - lastEvent.startTick) <= CHORD_TICK_TOLERANCE;

    // Add rest if there's a gap (and not within chord tolerance)
    if (!isChordNote && targetVoice.lastTick < noteStart - CHORD_TICK_TOLERANCE) {
      targetVoice.events.push({
        type: 'rest',
        startTick: targetVoice.lastTick,
        durationTicks: noteStart - targetVoice.lastTick
      });
    }

    // Add the note
    const musicalNote: MusicalNote = {
      type: 'note',
      midi: midiNote.midi,
      startTick: noteStart,
      durationTicks: midiNote.durationTicks,
      velocity: midiNote.velocity,
      isChordNote
    };
    targetVoice.events.push(musicalNote);

    // Update last tick (only if this note extends further than chord base)
    if (!isChordNote || noteEnd > targetVoice.lastTick) {
      targetVoice.lastTick = Math.max(targetVoice.lastTick, noteEnd);
    }
  }

  // Fill remaining time in each voice with rests (to end of measure)
  for (const voice of voices) {
    if (voice.lastTick < measureEndTick) {
      voice.events.push({
        type: 'rest',
        startTick: voice.lastTick,
        durationTicks: measureEndTick - voice.lastTick
      });
    }
  }

  // Convert to MusicalVoice format
  return voices.map(v => ({
    voiceNumber: v.voiceNumber,
    events: v.events
  }));
}
