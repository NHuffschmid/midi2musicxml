/**
 * Utility: Apply a tempo map to MIDI notes by rescaling tick positions.
 *
 * For each note, the local BPM is linearly interpolated from the tempo map
 * at the note's *original* tick position.  Ticks and durationTicks are then
 * multiplied by (localBpm / referenceBpm).
 *
 * After this step the tick positions approximate the canonical beat grid
 * (multiples of ppq), and the subsequent quantizeMidiNotes() call snaps any
 * residual offset to the exact grid.
 *
 * Notes that share the same original tick (chord members) receive the same
 * scale factor and therefore remain co-located after rescaling.
 *
 * The real-time fields `time` and `duration` (in seconds) are intentionally
 * left unchanged — they are used only for pause-based section detection in
 * Stage 2 and reflect the true physical performance time.
 */

import { MidiNote } from '../types';
import { TempoMapEntry } from '../models/QuantizedModel';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Linearly interpolate BPM from the tempo map at the given original tick.
 * Before the first entry: use the first BPM.
 * After the last entry: use the last BPM.
 * Between entries: linear interpolation.
 */
function interpolateBpm(tempoMap: TempoMapEntry[], tick: number): number {
  if (tempoMap.length === 0) return 120;
  if (tempoMap.length === 1 || tick <= tempoMap[0].startTick) {
    return tempoMap[0].bpm;
  }

  for (let i = 0; i < tempoMap.length - 1; i++) {
    const lo = tempoMap[i];
    const hi = tempoMap[i + 1];
    if (tick >= lo.startTick && tick < hi.startTick) {
      const t = (tick - lo.startTick) / (hi.startTick - lo.startTick);
      return lo.bpm + t * (hi.bpm - lo.bpm);
    }
  }

  // Past the last entry
  return tempoMap[tempoMap.length - 1].bpm;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Rescale all note tick positions and durations using the tempo map.
 *
 * @param notes        Raw MidiNote[] in original tick space.
 * @param tempoMap     Sorted array of TempoMapEntry values (from buildTempoMap).
 * @param referenceBpm The BPM the recording software used to encode ticks
 *                     (from the MIDI header; default 120).
 * @returns New MidiNote[] with adjusted ticks and durationTicks.
 */
export function applyTempoMap(
  notes: MidiNote[],
  tempoMap: TempoMapEntry[],
  referenceBpm: number = 120
): MidiNote[] {
  return notes.map(note => {
    const localBpm = interpolateBpm(tempoMap, note.ticks);
    const scale = localBpm / referenceBpm;
    return {
      ...note,
      ticks: Math.round(note.ticks * scale),
      durationTicks: Math.max(1, Math.round(note.durationTicks * scale))
    };
  });
}
