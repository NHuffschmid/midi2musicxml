import { Midi } from '@tonejs/midi';
import { MidiMeasure, Section } from '../types';
import { analyzeBeats } from './analyzeBeats';
import { analyseKey } from './analyseKey';
import { analyzeTempo } from './analyzeTempo';

const SECTION_BREAK_THRESHOLD = 2.0; // seconds

/**
 * Analyzes the sections of a MIDI file.
 * Splits into multiple sections when pause between measures exceeds threshold.
 * @param midi The tonejs/midi object to analyze.
 * @param midiMeasures The collected measures of the MIDI object.
 * @returns An array of sections.
 */
export function analyzeSections(midi: Midi, midiMeasures: MidiMeasure[]): Section[] {
  
  // Split measures into groups based on pauses
  const measureGroups = splitByPauses(midiMeasures, SECTION_BREAK_THRESHOLD);

  // Analyze each group as separate section
  return measureGroups.map(group => {
    const key = analyseKey(group);
    const time = analyzeBeats(midi);
    const tempo = analyzeTempo(midi);

    return {
      measures: group,
      key,
      time,
      tempo
    };
  });
}

/**
 * Split measures into groups based on pauses between measures.
 * A new section starts when the pause between last note of measure N
 * and first note of measure N+1 exceeds the threshold.
 * 
 * @param measures All measures to analyze
 * @param pauseThreshold Pause duration in seconds to trigger section break
 * @returns Array of measure groups (sections)
 */
function splitByPauses(measures: MidiMeasure[], pauseThreshold: number): MidiMeasure[][] {
  if (measures.length === 0) {
    return [];
  }

  if (measures.length === 1) {
    return [measures];
  }

  const sections: MidiMeasure[][] = [];
  let currentSection: MidiMeasure[] = [measures[0]];

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
 * Get the end time of the last note in a measure
 * @param measure The measure to analyze
 * @returns The end time (time + duration) or null if no notes
 */
function getLastNoteEndTime(measure: MidiMeasure): number | null {
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
 * @param measure The measure to analyze
 * @returns The start time or null if no notes
 */
function getFirstNoteStartTime(measure: MidiMeasure): number | null {
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