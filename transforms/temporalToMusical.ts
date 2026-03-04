/**
 * Transform: TemporalModel → MusicalModel
 * 
 * Converts time-based structure to musical semantics:
 * - Voice separation (highest notes → Voice 1)
 * - Propagate time signature, key signature, tempo metadata
 * 
 * This is the second stage that adds musical interpretation.
 */

import { TemporalScore, TemporalSection, TemporalMeasure } from '../models/TemporalModel';
import { 
  MusicalScore, 
  MusicalPart, 
  MusicalMeasure, 
  MusicalVoice, 
  MusicalNote, 
  TimeSignature,
  KeySignature
} from '../models/MusicalModel';
import { MidiNote } from '../types';

export interface TemporalToMusicalOptions {
  // Future options can be added here
}

/**
 * Main transform function: TemporalModel → MusicalModel
 */
export function temporalToMusical(
  temporalScore: TemporalScore,
  options: TemporalToMusicalOptions = {}
): MusicalScore {
  
  const parts: MusicalPart[] = [
    {
      id: 'P1',
      name: ' ',
      measures: sectionsToMeasures(temporalScore.sections, temporalScore.ppq)
    }
  ];

  return {
    title: temporalScore.title,
    composer: temporalScore.composer,
    copyright: temporalScore.copyright,
    parts
  };
}

/**
 * Convert temporal sections to musical measures with voice separation
 */
function sectionsToMeasures(
  sections: TemporalSection[],
  ppq: number
): MusicalMeasure[] {
  const musicalMeasures: MusicalMeasure[] = [];
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
      
      const musicalMeasure = convertMeasure(
        temporalMeasure, 
        section, 
        isFirstMeasureInSection && !isFirstSection, // Mark section start (except for the very first section)
        isFirstMeasureInSection && keySignatureChanged, // Show key signature if changed
        isFirstMeasureInSection, // Show time signature and tempo on first measure
        ppq
      );
      
      musicalMeasures.push(musicalMeasure);
    }
    
    previousKeySignature = section.keySignature;
  }

  return musicalMeasures;
}

/**
 * Convert a single temporal measure to a musical measure
 */
function convertMeasure(
  temporalMeasure: TemporalMeasure,
  section: TemporalSection,
  isSectionStart: boolean,
  showKeySignature: boolean,
  isFirstMeasure: boolean,
  ppq: number
): MusicalMeasure {

  // Separate notes into voices
  const voices = separateVoices(temporalMeasure.notes, ppq, section.timeSignature);

  return {
    number: temporalMeasure.number,
    timeSignature: isFirstMeasure ? section.timeSignature : undefined,
    keySignature: showKeySignature ? section.keySignature : undefined,
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
    // Return empty voice for empty measure
    return [{
      voiceNumber: 1,
      notes: []
    }];
  }

  // Sort notes by: 1. start time, 2. pitch (descending - highest first)
  const sortedNotes = [...midiNotes].sort((a, b) => {
    if (a.ticks !== b.ticks) return a.ticks - b.ticks;
    return b.midi - a.midi; // Higher pitches first
  });

  // Track voices (each voice tracks its last occupied tick)
  const voices: Array<{voiceNumber: number; notes: MusicalNote[]; lastTick: number}> = [];

  // Get measure boundaries
  const measureDurationTicks = (timeSignature.beats * ppq * 4) / timeSignature.beatType;
  const measureStartTick = midiNotes.length > 0 ? Math.floor(midiNotes[0].ticks / measureDurationTicks) * measureDurationTicks : 0;

  for (const midiNote of sortedNotes) {
    const noteStart = midiNote.ticks;
    const noteEnd = midiNote.ticks + midiNote.durationTicks;

    // Find a voice that is free at this note's start time
    let targetVoice = voices.find(v => v.lastTick <= noteStart);

    if (!targetVoice) {
      // Create new voice
      targetVoice = {
        voiceNumber: voices.length + 1,
        notes: [],
        lastTick: measureStartTick
      };
      voices.push(targetVoice);
    }

    // Add the note
    const musicalNote: MusicalNote = {
      midi: midiNote.midi,
      startTick: noteStart,
      durationTicks: midiNote.durationTicks,
      velocity: midiNote.velocity
    };
    targetVoice.notes.push(musicalNote);

    // Update last tick
    targetVoice.lastTick = Math.max(targetVoice.lastTick, noteEnd);
  }

  // Convert to MusicalVoice format
  return voices.map(v => ({
    voiceNumber: v.voiceNumber,
    notes: v.notes
  }));
}
