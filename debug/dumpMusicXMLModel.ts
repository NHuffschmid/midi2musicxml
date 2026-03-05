/**
 * Debug utilities for MusicXMLModel
 */

import { MusicXMLDocument } from '../models/MusicXMLModel';

/**
 * Dump MusicXMLDocument to JSON-serializable object
 */
export function dumpMusicXMLModel(doc: MusicXMLDocument) {
  return {
    version: doc.version,
    work: doc.scorePartwise.work,
    identification: doc.scorePartwise.identification,
    parts: doc.scorePartwise.partList.scoreParts.map(partInfo => ({
      id: partInfo.id,
      name: partInfo.partName,
      measures: doc.scorePartwise.parts
        .filter(p => p.id === partInfo.id)
        .flatMap(p => p.measures.map(m => ({
          number: m.number,
          attributes: m.attributes ? {
            divisions: m.attributes.divisions,
            key: m.attributes.key,
            time: m.attributes.time,
            clef: m.attributes.clef,
            staves: m.attributes.staves
          } : undefined,
          directions: m.direction?.map(d => ({
            placement: d.placement,
            types: d.directionType
          })),
          notes: m.notes.map(note => ({
            pitch: {
              step: note.pitch.step,
              alter: note.pitch.alter,
              octave: note.pitch.octave
            },
            duration: note.duration,
            voice: note.voice,
            type: note.type,
            dot: note.dot,
            staff: note.staff,
            backupBefore: note.backupBefore,
            notations: note.notations ? {
              tied: note.notations.tied?.map(t => t.type),
              tuplet: note.notations.tuplet?.map(t => ({ type: t.type, number: t.number }))
            } : undefined
          }))
        })))
    })),
    statistics: {
      totalParts: doc.scorePartwise.partList.scoreParts.length,
      totalMeasures: doc.scorePartwise.parts.reduce((sum, p) => sum + p.measures.length, 0),
      totalNotes: doc.scorePartwise.parts.reduce((sum, p) => 
        sum + p.measures.reduce((s, m) => s + m.notes.length, 0), 0)
    }
  };
}

/**
 * Pretty-print MusicXMLModel
 */
export function prettyPrintMusicXMLModel(doc: MusicXMLDocument): string {
  return `MusicXMLModel:\n${JSON.stringify(dumpMusicXMLModel(doc), null, 2)}`;
}
