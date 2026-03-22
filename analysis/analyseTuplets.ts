import { MidiNote } from '../types';

/**
 * Maximum tick gap between simultaneous notes (chords) in a live recording.
 * Notes within this range of the last grouped tick are merged into one beat position.
 */
const CHORD_TICK_TOLERANCE = 15;

/**
 * Interval-equality tolerance: the two intra-group intervals may differ by at
 * most this fraction of their average before the window is rejected.
 */
const EQUAL_TOLERANCE = 0.25;

/**
 * Pattern-match tolerance: the average intra-group interval must lie within
 * this fraction of the theoretical triplet spacing.
 * 20 % is tight enough to separate eighth triplets (spacing = PPQ/3) from
 * regular sixteenth notes (spacing = PPQ/4) which are 25 % below.
 */
const PATTERN_TOLERANCE = 0.20;

interface TripletPattern {
  noteType: string;
  /** Theoretical tick distance between consecutive notes in the group. */
  spacing: number;
}

/**
 * Detects triplet (and other standard-tuplet) groups in a sorted stream of
 * MIDI notes and annotates each note's `tuplet` field.
 *
 * Algorithm
 * ---------
 * 1. Group notes into *beat positions*: consecutive notes whose ticks are
 *    within CHORD_TICK_TOLERANCE are merged (they are treated as a chord, i.e.
 *    a single rhythmic event).  The representative tick of a position is the
 *    tick of its first note; the group extends as long as each new note falls
 *    within CHORD_TICK_TOLERANCE of the *last* note already in the group.
 *
 * 2. Slide a window of 3 consecutive beat positions.  For each window compute
 *    the two intervals (pos2−pos1, pos3−pos2).  A window is accepted as a
 *    triplet group when:
 *      a) |interval1 − interval2| / avgInterval ≤ EQUAL_TOLERANCE
 *      b) |avgInterval − pattern.spacing| / pattern.spacing ≤ PATTERN_TOLERANCE
 *    for at least one entry in `patterns`.
 *
 * 3. All notes at the three positions are annotated with a `tuplet` descriptor.
 *    The window pointer advances by 3 (non-overlapping groups).
 *
 * Scope
 * -----
 * The function is designed to be called *per measure* so that triplet groups
 * cannot accidentally span a measure boundary.
 *
 * @param notes  MIDI notes sorted by ticks (ascending).
 * @param ppq    Pulses per quarter note from the MIDI header.
 * @returns      A new array with the same notes, `tuplet` fields added where detected.
 */
export function detectTuplets(notes: MidiNote[], ppq: number): MidiNote[] {
  if (notes.length < 3) return notes;

  // Patterns sorted from largest to smallest spacing so that the "coarsest"
  // match always wins when intervals could theoretically match multiple entries.
  const patterns: TripletPattern[] = [
    { noteType: 'half',    spacing: ppq * 4 / 3 },  // half-note triplets
    { noteType: 'quarter', spacing: ppq * 2 / 3 },  // quarter-note triplets
    { noteType: 'eighth',  spacing: ppq / 3 },      // eighth-note triplets
    { noteType: '16th',    spacing: ppq / 6 },      // 16th-note triplets
  ];

  // ── Step 1: Build beat positions ─────────────────────────────────────────
  // Each position holds the indices into `notes` that belong to it plus the
  // canonical tick (first note) and the last-seen tick (for tolerance checks).
  const positions: { tick: number; lastTick: number; noteIndices: number[] }[] = [];

  for (let i = 0; i < notes.length; i++) {
    const tick = notes[i].ticks;
    const last = positions[positions.length - 1];

    if (positions.length === 0 || tick - last.lastTick > CHORD_TICK_TOLERANCE) {
      positions.push({ tick, lastTick: tick, noteIndices: [i] });
    } else {
      last.lastTick = tick;
      last.noteIndices.push(i);
    }
  }

  if (positions.length < 3) return notes;

  // ── Step 2: Sliding window detection ─────────────────────────────────────
  const result = notes.map(n => ({ ...n }));
  let pi = 0;

  while (pi <= positions.length - 3) {
    const p1 = positions[pi];
    const p2 = positions[pi + 1];
    const p3 = positions[pi + 2];

    const interval1 = p2.tick - p1.tick;
    const interval2 = p3.tick - p2.tick;
    const avgInterval = (interval1 + interval2) / 2;

    if (avgInterval <= 0) { pi++; continue; }

    // (a) Interval equality
    if (Math.abs(interval1 - interval2) / avgInterval > EQUAL_TOLERANCE) { pi++; continue; }

    // (b) Pattern match
    let matched = false;
    for (const pattern of patterns) {
      if (Math.abs(avgInterval - pattern.spacing) / pattern.spacing <= PATTERN_TOLERANCE) {
        const groupId = `tuplet-${p1.tick}-${p1.noteIndices[0]}`;
        const group   = [p1, p2, p3];

        for (let posIdx = 0; posIdx < 3; posIdx++) {
          for (const noteIdx of group[posIdx].noteIndices) {
            result[noteIdx] = {
              ...result[noteIdx],
              tuplet: {
                actualNotes: 3,
                normalNotes: 2,
                noteType:    pattern.noteType,
                groupId,
                position:    posIdx + 1,
              },
            };
          }
        }

        matched = true;
        pi += 3; // Skip past the detected group (non-overlapping)
        break;
      }
    }

    if (!matched) pi++;
  }

  return result;
}
