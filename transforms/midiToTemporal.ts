/**
 * Transform: MIDI → TemporalModel
 * 
 * Analyzes the time-based structure of MIDI data:
 * - Groups notes into measures based on time signatures
 * - Detects sections based on pauses between measures
 * - Extracts time signature, key signature, tempo for each section
 * 
 * This is the first stage of the pipeline that works with the raw MIDI data.
 */

import { Midi } from '@tonejs/midi';
import { MidiNote } from '../types';
import { TemporalScore, TemporalSection, TemporalMeasure } from '../models/TemporalModel';
import { analyzeBeats } from '../analysis/analyzeBeats';
import { analyseKey } from '../analysis/analyseKey';
import { analyzeTempo } from '../analysis/analyzeTempo';

const SECTION_BREAK_THRESHOLD = 2.0; // Pause duration in seconds to trigger section break

/** Maximum overshoot (in ticks) past a measure boundary that is silently clipped. */
const MEASURE_BOUNDARY_CLIP_THRESHOLD = 10;

export interface MidiToTemporalOptions {
  title?: string;
  composer?: string;
  copyright?: string;
  sectionBreakThreshold?: number; // Override default pause threshold
  /**
   * Estimated global tempo in BPM, e.g. from IOI analysis in Stage 1.5.
   * When provided, this value overrides the tempo read from the MIDI header.
   */
  estimatedTempo?: number;
}

/**
 * Main transform function: MIDI → TemporalModel
 * 
 * @param midiNotes Sorted array of MIDI notes from all tracks
 * @param midi The tonejs/midi object for metadata
 * @param options Optional configuration
 * @returns TemporalScore representing time-based structure
 */
export function midiToTemporal(
  midiNotes: MidiNote[],
  midi: Midi,
  options: MidiToTemporalOptions = {}
): TemporalScore {
  
  const ppq = midi.header.ppq || 480;
  const pauseThreshold = options.sectionBreakThreshold ?? SECTION_BREAK_THRESHOLD;
  
  // Step 1: Group notes into measures
  const measures = groupNotesIntoMeasures(midiNotes, midi);
  
  // Step 2: Split measures into sections based on pauses
  const measureGroups = splitMeasuresByPauses(measures, pauseThreshold);
  
  // Step 3: Create sections with metadata
  const sections = measureGroups.map((measureGroup, index) => 
    createSection(measureGroup, index + 1, midi, options.estimatedTempo)
  );
  
  return {
    sections,
    ppq,
    title: options.title,
    composer: options.composer,
    copyright: options.copyright
  };
}

/**
 * Group MIDI notes into measures based on time signature
 */
function groupNotesIntoMeasures(midiNotes: MidiNote[], midi: Midi): TemporalMeasure[] {
  if (midiNotes.length === 0) {
    return [];
  }
  
  // Get time signature from MIDI (default to 4/4)
  const timeSignatures = midi.header.timeSignatures;
  const defaultTimeSignature = timeSignatures.length > 0 
    ? timeSignatures[0] 
    : { timeSignature: [4, 4], ticks: 0 };
  const [beatsPerMeasure, beatType] = defaultTimeSignature.timeSignature;
  
  // Get PPQ (pulses per quarter note)
  const ppq = midi.header.ppq || 480;
  
  // Calculate ticks per measure
  const ticksPerMeasure = (beatsPerMeasure * ppq * 4) / beatType;
  
  // Group notes by measure number based on ticks
  const notesByMeasure = new Map<number, MidiNote[]>();
  
  for (const note of midiNotes) {
    const measureNumber = Math.floor(note.ticks / ticksPerMeasure);
    
    if (!notesByMeasure.has(measureNumber)) {
      notesByMeasure.set(measureNumber, []);
    }
    notesByMeasure.get(measureNumber)!.push(note);
  }
  
  // Create TemporalMeasure objects sorted by measure number
  const measures: TemporalMeasure[] = [];
  const sortedMeasureNumbers = Array.from(notesByMeasure.keys()).sort((a, b) => a - b);
  
  for (let i = 0; i < sortedMeasureNumbers.length; i++) {
    const measureNumber = sortedMeasureNumbers[i];
    const notesInMeasure = notesByMeasure.get(measureNumber)!;
    
    const startTick = measureNumber * ticksPerMeasure;
    const endTick = startTick + ticksPerMeasure;

    // Clip notes that overshoot the measure boundary by less than the threshold
    const clippedNotes = notesInMeasure.map(note => {
      const noteEnd = note.ticks + note.durationTicks;
      const overshoot = noteEnd - endTick;
      if (overshoot > 0 && overshoot < MEASURE_BOUNDARY_CLIP_THRESHOLD) {
        return { ...note, durationTicks: endTick - note.ticks };
      }
      return note;
    });

    measures.push({
      number: i + 1, // 1-based global measure number
      startTick,
      endTick,
      durationTicks: ticksPerMeasure,
      notes: clippedNotes
    });
  }
  
  return measures;
}

/**
 * Split measures into groups based on pauses between measures.
 * A new section starts when the pause between last note of measure N
 * and first note of measure N+1 exceeds the threshold.
 */
function splitMeasuresByPauses(
  measures: TemporalMeasure[],
  pauseThreshold: number
): TemporalMeasure[][] {
  if (measures.length === 0) {
    return [];
  }
  
  if (measures.length === 1) {
    return [measures];
  }
  
  const sections: TemporalMeasure[][] = [];
  let currentSection: TemporalMeasure[] = [measures[0]];
  
  for (let i = 1; i < measures.length; i++) {
    const prevMeasure = measures[i - 1];
    const currentMeasure = measures[i];
    
    // Find last note end time in previous measure
    const lastNoteEndTime = getLastNoteEndTime(prevMeasure);
    
    // Find first note start time in current measure
    const firstNoteStartTime = getFirstNoteStartTime(currentMeasure);
    
    // Check if there's a significant pause
    if (lastNoteEndTime !== null && firstNoteStartTime !== null) {
      const pause = firstNoteStartTime - lastNoteEndTime;
      
      if (pause > pauseThreshold) {
        // Start new section
        sections.push(currentSection);
        currentSection = [currentMeasure];
      } else {
        // Continue current section
        currentSection.push(currentMeasure);
      }
    } else {
      // Empty measure or other edge case - continue current section
      currentSection.push(currentMeasure);
    }
  }
  
  // Don't forget the last section
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Create a TemporalSection from a group of measures
 */
function createSection(
  measures: TemporalMeasure[],
  sectionNumber: number,
  midi: Midi,
  estimatedTempo?: number
): TemporalSection {
  
  // Mark first measure in section
  if (measures.length > 0) {
    measures[0].isFirstInSection = true;
  }
  
  // Calculate pause before this section (if not first section)
  let pauseBefore: number | undefined = undefined;
  if (sectionNumber > 1 && measures.length > 0) {
    // We would need to look at the previous section's last measure
    // For now, we'll leave this undefined and can calculate it later if needed
    // (requires access to previous section)
  }
  
  // Extract key signature from notes in this section
  const midiMeasuresForAnalysis = measures.map(m => ({ notes: m.notes }));
  const keySignature = analyseKey(midiMeasuresForAnalysis);
  
  // Get time signature and tempo from MIDI header;
  // prefer estimatedTempo (from IOI analysis) when provided.
  const timeSignature = analyzeBeats(midi);
  const tempo = estimatedTempo ?? analyzeTempo(midi);
  
  return {
    sectionNumber,
    measures,
    timeSignature,
    keySignature,
    tempo,
    pauseBefore
  };
}

/**
 * Get the end time of the last note in a measure
 */
function getLastNoteEndTime(measure: TemporalMeasure): number | null {
  if (measure.notes.length === 0) {
    return null;
  }
  
  let maxEndTime = 0;
  for (const note of measure.notes) {
    const endTime = note.time + note.duration;
    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }
  }
  
  return maxEndTime;
}

/**
 * Get the start time of the first note in a measure
 */
function getFirstNoteStartTime(measure: TemporalMeasure): number | null {
  if (measure.notes.length === 0) {
    return null;
  }
  
  let minStartTime = Infinity;
  for (const note of measure.notes) {
    if (note.time < minStartTime) {
      minStartTime = note.time;
    }
  }
  
  return minStartTime === Infinity ? null : minStartTime;
}
