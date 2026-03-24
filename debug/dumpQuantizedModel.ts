/**
 * Debug utilities for QuantizedModel
 *
 * Used for testing and debugging the pipeline.
 */

import { QuantizedScore } from '../models/QuantizedModel';

export interface QuantizedModelDump {
  ppq: number;
  gridDivisor: number;
  gridTicks: number;
  wasQuantized: boolean;
  gridAlignmentRatio: number;
  noteCount: number;
  estimatedBpm?: number;
  tempoMapEntries?: number;
  tempoMapBpmRange?: { min: number; max: number };
}

/**
 * Dump QuantizedScore to a JSON-serializable object (for logging / unit tests).
 */
export function dumpQuantizedModel(score: QuantizedScore): QuantizedModelDump {
  const dump: QuantizedModelDump = {
    ppq: score.ppq,
    gridDivisor: score.gridDivisor,
    gridTicks: score.gridTicks,
    wasQuantized: score.wasQuantized,
    gridAlignmentRatio: score.gridAlignmentRatio,
    noteCount: score.notes.length
  };
  if (score.estimatedBpm !== undefined) dump.estimatedBpm = score.estimatedBpm;
  if (score.tempoMap !== undefined && score.tempoMap.length > 0) {
    dump.tempoMapEntries = score.tempoMap.length;
    dump.tempoMapBpmRange = {
      min: Math.min(...score.tempoMap.map(e => e.bpm)),
      max: Math.max(...score.tempoMap.map(e => e.bpm))
    };
  }
  return dump;
}

/**
 * Human-readable one-liner summary of the QuantizedScore.
 */
export function prettyPrintQuantizedModel(score: QuantizedScore): string {
  const pct = (score.gridAlignmentRatio * 100).toFixed(1);
  const action = score.wasQuantized
    ? 'quantization applied (live-recording detected)'
    : 'no quantization needed (score-derived detected)';
  const tempoInfo = score.wasQuantized && score.tempoMap
    ? ` | tempo=${score.estimatedBpm} BPM (${score.tempoMap.length} windows, ` +
      `range [${Math.min(...score.tempoMap.map(e => e.bpm)).toFixed(1)}, ` +
      `${Math.max(...score.tempoMap.map(e => e.bpm)).toFixed(1)}])`
    : '';
  return (
    `QuantizedModel: ${score.notes.length} notes | ` +
    `grid=ppq/${score.gridDivisor} (${score.gridTicks} ticks) | ` +
    `alignment=${pct}% | ${action}${tempoInfo}`
  );
}
