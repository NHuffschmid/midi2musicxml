/**
 * Debug utilities for NotationModel
 */

import { NotationScore } from '../models/NotationModel';

/**
 * Dump NotationScore to JSON-serializable object
 */
export function dumpNotationModel(score: NotationScore) {
  return {
    metadata: {
      title: score.title,
      composer: score.composer,
      copyright: score.copyright
    },
    parts: score.parts.map(part => ({
      id: part.id,
      name: part.name,
      measures: part.measures.map(measure => {
        return {
          number: measure.number,
          timeSignature: measure.timeSignature 
            ? `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
            : undefined,
          keySignature: measure.keySignature
            ? `${measure.keySignature.fifths > 0 ? '+' : ''}${measure.keySignature.fifths} (${measure.keySignature.mode})`
            : undefined,
          tempo: measure.tempo,
          noteCount: measure.notes.length,
          notes: measure.notes.map(note => ({
            pitch: `${note.pitch.step}${note.pitch.alter ? (note.pitch.alter > 0 ? '#' : 'b') : ''}${note.pitch.octave}`,
            type: note.type,
            dots: note.dots,
            startTick: note.startTick,
            durationTicks: note.durationTicks,
            voice: note.voice,
          }))
        };
      })
    })),
    statistics: {
      totalMeasures: score.parts.reduce((sum, p) => sum + p.measures.length, 0),
      totalNotes: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => s + m.notes.length, 0), 0)
    }
  };
}

/**
 * Pretty-print NotationModel
 */
export function prettyPrintNotationModel(score: NotationScore): string {
  return `NotationModel:\n${JSON.stringify(dumpNotationModel(score), null, 2)}`;
}
