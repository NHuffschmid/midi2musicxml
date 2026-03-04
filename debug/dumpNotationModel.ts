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
      measures: part.measures.map(measure => ({
        number: measure.number,
        timeSignature: measure.timeSignature 
          ? `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
          : undefined,
        keySignature: measure.keySignature
          ? `${measure.keySignature.fifths > 0 ? '+' : ''}${measure.keySignature.fifths} (${measure.keySignature.mode})`
          : undefined,
        tempo: measure.tempo,
        voices: measure.voices.map(voice => ({
          voiceNumber: voice.voiceNumber,
          notes: voice.notes.map(note => ({
            pitch: `${note.pitch.step}${note.pitch.alter ? (note.pitch.alter > 0 ? '#' : 'b') : ''}${note.pitch.octave}`,
            duration: note.duration
          }))
        }))
      }))
    })),
    statistics: {
      totalMeasures: score.parts.reduce((sum, p) => sum + p.measures.length, 0),
      totalVoices: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => s + m.voices.length, 0), 0),
      totalNotes: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => 
          s + m.voices.reduce((ss, v) => ss + v.notes.length, 0), 0), 0)
    }
  };
}

/**
 * Pretty-print NotationModel
 */
export function prettyPrintNotationModel(score: NotationScore): string {
  return `NotationModel:\n${JSON.stringify(dumpNotationModel(score), null, 2)}`;
}
