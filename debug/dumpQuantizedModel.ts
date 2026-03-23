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
}

/**
 * Dump QuantizedScore to a JSON-serializable object (for logging / unit tests).
 */
export function dumpQuantizedModel(score: QuantizedScore): QuantizedModelDump {
  return {
    ppq: score.ppq,
    gridDivisor: score.gridDivisor,
    gridTicks: score.gridTicks,
    wasQuantized: score.wasQuantized,
    gridAlignmentRatio: score.gridAlignmentRatio,
    noteCount: score.notes.length
  };
}

/**
 * Human-readable one-liner summary of the QuantizedScore.
 */
export function prettyPrintQuantizedModel(score: QuantizedScore): string {
  const pct = (score.gridAlignmentRatio * 100).toFixed(1);
  const action = score.wasQuantized
    ? 'quantization applied (live-recording detected)'
    : 'no quantization needed (score-derived detected)';
  return (
    `QuantizedModel: ${score.notes.length} notes | ` +
    `grid=ppq/${score.gridDivisor} (${score.gridTicks} ticks) | ` +
    `alignment=${pct}% | ${action}`
  );
}
