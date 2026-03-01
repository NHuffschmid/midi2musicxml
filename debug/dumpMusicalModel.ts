/**
 * Debug utilities for MusicalModel
 * 
 * Used for testing and debugging the pipeline.
 */

import { MusicalScore, MusicalMeasure, MusicalVoice, MusicalEvent } from '../models/MusicalModel';

export interface MusicalModelDump {
  metadata: {
    title?: string;
    composer?: string;
    copyright?: string;
  };
  parts: PartDump[];
  statistics: {
    totalMeasures: number;
    totalVoices: number;
    totalNotes: number;
    totalRests: number;
    averageVoicesPerMeasure: number;
  };
}

interface PartDump {
  id: string;
  name: string;
  measures: MeasureDump[];
}

interface MeasureDump {
  number: number;
  timeSignature?: string;
  keySignature?: string;
  tempo?: number;
  voices: VoiceDump[];
  duration: number; // Total duration in ticks
}

interface VoiceDump {
  voiceNumber: number;
  events: EventDump[];
  noteCount: number;
  restCount: number;
  chordCount: number;
}

interface EventDump {
  type: 'note' | 'rest';
  startTick: number;
  durationTicks: number;
  midi?: number;
  noteName?: string;
  isChordNote?: boolean;
}

/**
 * Dump MusicalScore to JSON-serializable object
 */
export function dumpMusicalModel(score: MusicalScore): MusicalModelDump {
  let totalNotes = 0;
  let totalRests = 0;
  let totalVoices = 0;
  let totalMeasures = 0;

  const parts: PartDump[] = score.parts.map(part => {
    const measures = part.measures.map(measure => {
      totalMeasures++;
      const measureDump = dumpMeasure(measure);
      totalVoices += measureDump.voices.length;
      
      measureDump.voices.forEach(voice => {
        totalNotes += voice.noteCount;
        totalRests += voice.restCount;
      });
      
      return measureDump;
    });

    return {
      id: part.id,
      name: part.name,
      measures
    };
  });

  return {
    metadata: {
      title: score.title,
      composer: score.composer,
      copyright: score.copyright
    },
    parts,
    statistics: {
      totalMeasures,
      totalVoices,
      totalNotes,
      totalRests,
      averageVoicesPerMeasure: totalMeasures > 0 ? totalVoices / totalMeasures : 0
    }
  };
}

function dumpMeasure(measure: MusicalMeasure): MeasureDump {
  const voices = measure.voices.map(dumpVoice);
  const duration = voices.length > 0 
    ? Math.max(...voices.map(v => v.events.reduce((sum, e) => sum + e.durationTicks, 0)))
    : 0;

  return {
    number: measure.number,
    timeSignature: measure.timeSignature 
      ? `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
      : undefined,
    keySignature: measure.keySignature
      ? `${measure.keySignature.fifths > 0 ? '+' : ''}${measure.keySignature.fifths} (${measure.keySignature.mode})`
      : undefined,
    tempo: measure.tempo,
    voices,
    duration
  };
}

function dumpVoice(voice: MusicalVoice): VoiceDump {
  let noteCount = 0;
  let restCount = 0;
  let chordCount = 0;

  const events: EventDump[] = voice.events.map(event => {
    if (event.type === 'note') {
      noteCount++;
      if (event.isChordNote) chordCount++;
      
      return {
        type: 'note',
        startTick: event.startTick,
        durationTicks: event.durationTicks,
        midi: event.midi,
        noteName: midiToNoteName(event.midi),
        isChordNote: event.isChordNote
      };
    } else {
      restCount++;
      return {
        type: 'rest',
        startTick: event.startTick,
        durationTicks: event.durationTicks
      };
    }
  });

  return {
    voiceNumber: voice.voiceNumber,
    events,
    noteCount,
    restCount,
    chordCount
  };
}

function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

/**
 * Pretty-print MusicalModel dump
 */
export function prettyPrintMusicalModel(score: MusicalScore): string {
  const dump = dumpMusicalModel(score);
  return `MusicalModel:\n${JSON.stringify(dump, null, 2)}`;
}

/**
 * Save MusicalModel dump to file (for Node.js environments)
 */
export function saveMusicalModelDump(score: MusicalScore, filename: string): string {
  const dump = dumpMusicalModel(score);
  return JSON.stringify(dump, null, 2);
}
