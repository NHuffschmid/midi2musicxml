/**
 * Debug utilities for LayoutModel
 */

import { LayoutScore } from '../models/LayoutModel';

/**
 * Dump LayoutScore to JSON-serializable object
 */
export function dumpLayoutModel(score: LayoutScore) {
  return {
    metadata: {
      title: score.title,
      composer: score.composer,
      copyright: score.copyright
    },
    parts: score.parts.map(part => ({
      id: part.id,
      name: part.name,
      staves: part.staves.map(staff => ({
        staffNumber: staff.staffNumber,
        clef: staff.clef,
        measures: staff.measures.map(measure => ({
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
            staffNumber: voice.staffNumber,
            noteCount: voice.notes.length,
            notes: voice.notes.map(n => ({
              pitch: `${n.pitch.step}${n.pitch.alter ? (n.pitch.alter > 0 ? '#' : 'b') : ''}${n.pitch.octave}`,
              duration: n.duration
            }))
          }))
        }))
      }))
    })),
    statistics: {
      totalParts: score.parts.length,
      totalStaves: score.parts.reduce((sum, p) => sum + p.staves.length, 0),
      totalMeasures: score.parts.reduce((sum, p) => 
        sum + p.staves.reduce((s, st) => s + st.measures.length, 0), 0),
      totalNotes: score.parts.reduce((sum, p) => 
        sum + p.staves.reduce((s, st) => 
          s + st.measures.reduce((ss, m) => 
            ss + m.voices.reduce((sss, v) => sss + v.notes.length, 0), 0), 0), 0)
    }
  };
}

/**
 * Pretty-print LayoutModel
 */
export function prettyPrintLayoutModel(score: LayoutScore): string {
  return `LayoutModel:\n${JSON.stringify(dumpLayoutModel(score), null, 2)}`;
}
