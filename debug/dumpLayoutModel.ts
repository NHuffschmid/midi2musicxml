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
          notes: measure.notes.map(n => ({
            pitch: `${n.pitch.step}${n.pitch.alter ? (n.pitch.alter > 0 ? '#' : 'b') : ''}${n.pitch.octave}`,
            type: n.type,
            dots: n.dots,
            startTick: n.startTick,
            durationTicks: n.durationTicks,
            voice: n.voice,
            staffNumber: n.staffNumber,
            backupBefore: n.backupBefore
          }))
        };
      })
    })),
    statistics: {
      totalParts: score.parts.length,
      totalStaves: score.parts.reduce((sum, p) => sum + p.staffCount, 0),
      totalMeasures: score.parts.reduce((sum, p) => sum + p.measures.length, 0),
      totalNotes: score.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => s + m.notes.length, 0), 0)
    }
  };
}

/**
 * Pretty-print LayoutModel
 */
export function prettyPrintLayoutModel(score: LayoutScore): string {
  return `LayoutModel:\n${JSON.stringify(dumpLayoutModel(score), null, 2)}`;
}
