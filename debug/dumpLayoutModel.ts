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
      staffCount: part.staffCount,
      clefs: part.clefs,
      measures: part.measures.map(measure => {
        const allNotes = measure.staves.flatMap(staff =>
          staff.notes.map(n => ({ ...n, staffNumber: staff.number }))
        );

        return {
          number: measure.number,
          timeSignature: measure.timeSignature
            ? `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
            : undefined,
          keySignature: measure.keySignature
            ? `${measure.keySignature.fifths > 0 ? '+' : ''}${measure.keySignature.fifths} (${measure.keySignature.mode})`
            : undefined,
          tempo: measure.tempo,
          staves: measure.staves.map(staff => ({
            number: staff.number,
            noteCount: staff.notes.length,
            notes: staff.notes.map(n => ({
              pitch: `${n.pitch.step}${n.pitch.alter ? (n.pitch.alter > 0 ? '#' : 'b') : ''}${n.pitch.octave}`,
              type: n.type,
              dots: n.dots,
              startTick: n.startTick,
              durationTicks: n.durationTicks,
            }))
          })),
          totalNoteCount: allNotes.length
        };
      })
    })),
    statistics: {
      totalParts: score.parts.length,
      totalStaves: score.parts.reduce((sum, p) => sum + p.staffCount, 0),
      totalMeasures: score.parts.reduce((sum, p) => sum + p.measures.length, 0),
      totalNotes: score.parts.reduce((sum, p) =>
        sum + p.measures.reduce((s, m) =>
          s + m.staves.reduce((n, staff) => n + staff.notes.length, 0), 0), 0)
    }
  };
}

/**
 * Pretty-print LayoutModel
 */
export function prettyPrintLayoutModel(score: LayoutScore): string {
  return `LayoutModel:\n${JSON.stringify(dumpLayoutModel(score), null, 2)}`;
}
