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
          events: voice.events.map(event => {
            if (event.type === 'note') {
              return {
                type: 'note' as const,
                pitch: `${event.pitch.step}${event.pitch.alter ? (event.pitch.alter > 0 ? '#' : 'b') : ''}${event.pitch.octave}`,
                duration: event.duration,
                stem: event.stem
              };
            } else {
              return {
                type: 'rest' as const,
                duration: event.duration
              };
            }
          })
        }))
      }))
    })),
    statistics: {
      totalMeasures: score.parts.reduce((sum, p) => sum + p.measures.length, 0),
      totalVoices: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => s + m.voices.length, 0), 0),
      totalNotes: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => 
          s + m.voices.reduce((ss, v) => ss + v.events.filter(e => e.type === 'note').length, 0), 0), 0),
      totalRests: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => 
          s + m.voices.reduce((ss, v) => ss + v.events.filter(e => e.type === 'rest').length, 0), 0), 0)
    }
  };
}

/**
 * Pretty-print NotationModel
 */
export function prettyPrintNotationModel(score: NotationScore): string {
  return JSON.stringify(dumpNotationModel(score), null, 2);
}
