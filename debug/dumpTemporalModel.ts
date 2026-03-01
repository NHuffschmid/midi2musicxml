/**
 * Debug utilities for TemporalModel
 * 
 * Used for testing and debugging the pipeline.
 */

import { TemporalScore, TemporalSection, TemporalMeasure } from '../models/TemporalModel';

export interface TemporalModelDump {
  metadata: {
    title?: string;
    composer?: string;
    copyright?: string;
    ppq: number;
  };
  sections: SectionDump[];
  statistics: {
    totalSections: number;
    totalMeasures: number;
    totalNotes: number;
  };
}

interface SectionDump {
  sectionNumber: number;
  measureCount: number;
  timeSignature: string;
  keySignature: string;
  tempo?: number;
  pauseBefore?: number;
  measures: MeasureDump[];
}

interface MeasureDump {
  number: number;
  startTick: number;
  endTick: number;
  durationTicks: number;
  noteCount: number;
  isFirstInSection?: boolean;
  notes?: {
    midi: number;
    name: string;
    ticks: number;
    durationTicks: number;
  }[];
}

/**
 * Dump TemporalScore to JSON-serializable object
 */
export function dumpTemporalModel(score: TemporalScore): TemporalModelDump {
  let totalMeasures = 0;
  let totalNotes = 0;

  const sections: SectionDump[] = score.sections.map(section => {
    const measureCount = section.measures.length;
    totalMeasures += measureCount;

    const measures = section.measures.map(measure => {
      const noteCount = measure.notes.length;
      totalNotes += noteCount;

      return {
        number: measure.number,
        startTick: measure.startTick,
        endTick: measure.endTick,
        durationTicks: measure.durationTicks,
        noteCount,
        isFirstInSection: measure.isFirstInSection,
        notes: measure.notes.map(note => ({
          midi: note.midi,
          name: midiToNoteName(note.midi),
          ticks: note.ticks,
          durationTicks: note.durationTicks
        }))
      };
    });

    return {
      sectionNumber: section.sectionNumber,
      measureCount,
      timeSignature: `${section.timeSignature.beats}/${section.timeSignature.beatType}`,
      keySignature: `${section.keySignature.fifths > 0 ? '+' : ''}${section.keySignature.fifths} (${section.keySignature.mode})`,
      tempo: section.tempo,
      pauseBefore: section.pauseBefore,
      measures
    };
  });

  return {
    metadata: {
      title: score.title,
      composer: score.composer,
      copyright: score.copyright,
      ppq: score.ppq
    },
    sections,
    statistics: {
      totalSections: score.sections.length,
      totalMeasures,
      totalNotes
    }
  };
}

/**
 * Convert MIDI number to note name (e.g., 60 → C4)
 */
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

/**
 * Pretty-print TemporalModel dump
 */
export function prettyPrintTemporalModel(score: TemporalScore): string {
  const dump = dumpTemporalModel(score);
  return `Model: TemporalModel\n${JSON.stringify(dump, null, 2)}`;
}
