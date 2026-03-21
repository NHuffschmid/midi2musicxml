/**
 * Measure Preprocessor
 *
 * Converts a flat NoteElement[] into a sequence of MeasureEvents
 * (notes interspersed with backup/forward elements) ready for XML
 * serialization.
 *
 * The processing is split into five independent, testable steps:
 *
 *   Step 1 – resolveChords   : mark chord notes, unify voice per tick+staff
 *   Step 2 – resolveBeams    : unify voice within each beam group
 *   Step 3 – assignVoices      : map staff numbers → final voice numbers 1, 2, …
 *   Step 4 – resolveStaccato   : absorb short rest gaps as staccato articulations
 *   Step 5 – buildMeasureEvents : sort voices, insert backup / forward
 */

import { NoteElement } from '../models/MusicXMLModel';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

// ─── Public event type ────────────────────────────────────────────────────────

export type MeasureEvent =
  | { kind: 'note';    note: NoteElement }
  | { kind: 'backup';  duration: number  }
  | { kind: 'forward'; duration: number; voice: number; staff?: number };

// ─── Step 1: Chord Resolution ─────────────────────────────────────────────────
//
// Notes at the same startTick on the same staff form a chord.
// Rule: the first note is the primary (chord = false), all subsequent notes
// at that tick on that staff get chord = true.
// All notes of the same chord share the voice of their primary note.

export function resolveChords(notes: NoteElement[]): NoteElement[] {
  // key: `${startTick}:${staff}`
  const seen = new Map<string, number>(); // key → voice of primary

  return notes.map(note => {
    const staff = note.staff ?? 1;
    const key   = `${note.startTick}:${staff}`;

    if (!seen.has(key)) {
      // Primary note of this tick/staff group
      seen.set(key, note.voice ?? staff);
      return { ...note, chord: false, voice: note.voice ?? staff };
    } else {
      // Chord note – inherits voice of primary
      return { ...note, chord: true, voice: seen.get(key)! };
    }
  });
}

// ─── Step 2: Beam Resolution ──────────────────────────────────────────────────
//
// All notes in a beam group (begin → continue → end) must share one voice.
// The voice of the first note (beam.type === 'begin') wins.
// Works correctly even when chord notes are interleaved.

export function resolveBeams(notes: NoteElement[]): NoteElement[] {
  const result  = notes.map(n => ({ ...n }));
  let groupStart = -1;
  let groupVoice = 1;

  for (let i = 0; i < result.length; i++) {
    const beam = result[i].beam?.[0];
    if (!beam) continue;

    if (beam.type === 'begin') {
      groupStart = i;
      groupVoice = result[i].voice ?? 1;
    }

    if (beam.type === 'continue' || beam.type === 'end') {
      if (groupStart >= 0) {
        result[i] = { ...result[i], voice: groupVoice };
      }
    }

    if (beam.type === 'end') {
      groupStart = -1;
    }
  }

  return result;
}

// ─── Step 3: Voice Assignment ─────────────────────────────────────────────────
//
// Translates arbitrary voice values coming from the model into compact,
// consecutive integers starting at 1.
//
// Strategy: derive voice from staff (staff 1 → voice 1, staff 2 → voice 2, …).
// Chord notes keep the voice already assigned by resolveChords.
// Only non-chord notes drive the staff→voice mapping so that chord notes
// do not create spurious extra voices.

export function assignVoices(notes: NoteElement[]): NoteElement[] {
  const staffToVoice = new Map<number, number>();
  let nextVoice = 1;

  // Build the mapping from non-chord notes only
  for (const note of notes) {
    if (note.chord) continue;
    const staff = note.staff ?? 1;
    if (!staffToVoice.has(staff)) {
      staffToVoice.set(staff, nextVoice++);
    }
  }

  // Apply mapping to every note (chord notes follow their primary via staff)
  return notes.map(note => {
    const staff = note.staff ?? 1;
    const voice = staffToVoice.get(staff) ?? note.voice ?? 1;
    return { ...note, voice };
  });
}

// ─── Step 4: Staccato Resolution ────────────────────────────────────────────────
//
// Within each (staff, voice) group, if a primary note is immediately followed
// by a short gap (gap > 0 and gap ≤ note.duration) before the next note in the
// same voice, the gap is absorbed into the note's duration and a staccato
// articulation is added.  The note type is recalculated accordingly.
// Chord siblings sharing the same startTick/staff/voice have their duration
// extended in parallel so that the MusicXML stays consistent.
//
// Additional guard: the combined duration (note + gap) must not exceed
// STACCATO_MAX_DURATION_MS milliseconds, so that slow or long notes are
// never misidentified as staccato.
//
// This step must run after assignVoices (Step 3) because only then are
// staff and voice determined, and before buildMeasureEvents (Step 5) so that
// no forward/rest element is emitted for the absorbed gap.

/** Maximum combined duration (ms) that qualifies as staccato. */
const STACCATO_MAX_DURATION_MS = 250;

/** Convert MIDI ticks to milliseconds given divisions (PPQ) and tempo (BPM). */
function ticksToMs(ticks: number, divisions: number, tempoBpm: number): number {
  return (ticks / divisions) * (60_000 / tempoBpm);
}

export function resolveStaccato(notes: NoteElement[], divisions: number, tempoBpm: number): NoteElement[] {
  // Group primary (non-chord) notes by (staff, voice) to detect gaps
  const groups = new Map<string, NoteElement[]>();

  for (const note of notes) {
    if (note.chord) continue;
    const key = `${note.staff ?? 1}:${note.voice ?? 1}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(note);
  }

  // Sort each group by startTick
  for (const group of groups.values()) {
    group.sort((a, b) => a.startTick - b.startTick);
  }

  // Collect override data keyed by `startTick:staff:voice`
  const overrides = new Map<string, { duration: number; type: string; dot: number }>();

  for (const group of groups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      const note     = group[i];
      const nextNote = group[i + 1];

      // Tuplet notes must not be altered: the gap between consecutive triplet
      // notes is an artefact of the tuplet ratio, not a staccato indication.
      if (note.timeModification || nextNote.timeModification) continue;

      const gap = nextNote.startTick - (note.startTick + note.duration);

      if (gap > 0 && gap <= note.duration) {
        const newDuration    = note.duration + gap;
        const newDurationMs  = ticksToMs(newDuration, divisions, tempoBpm);
        if (newDurationMs > STACCATO_MAX_DURATION_MS) continue;
        const { type, dots } = midiTicksToXmlDurationType(newDuration, divisions);
        const key = `${note.startTick}:${note.staff ?? 1}:${note.voice ?? 1}`;
        overrides.set(key, { duration: newDuration, type, dot: dots });
      }
    }
  }

  if (overrides.size === 0) return notes;

  return notes.map(note => {
    const key      = `${note.startTick}:${note.staff ?? 1}:${note.voice ?? 1}`;
    const override = overrides.get(key);
    if (!override) return note;

    const updated: NoteElement = {
      ...note,
      duration: override.duration,
      type:     override.type,
      dot:      override.dot > 0 ? override.dot : undefined,
    };

    // Staccato articulation only on the primary (non-chord) note
    if (!note.chord) {
      updated.notations = {
        ...note.notations,
        articulations: [
          ...(note.notations?.articulations ?? []),
          { type: 'staccato' as const },
        ],
      };
    }

    return updated;
  });
}

// ─── Step 5: Build Measure Events ─────────────────────────────────────────────
//
// 1. Groups notes by voice.
// 2. Within each voice, orders notes by startTick.
// 3. Emits backup / forward elements whenever the time cursor needs to jump.
//    Chord notes do not advance the cursor.

export function buildMeasureEvents(notes: NoteElement[]): MeasureEvent[] {
  // Group by voice (preserving voice order)
  const voiceOrder: number[] = [];
  const byVoice   = new Map<number, NoteElement[]>();

  for (const note of notes) {
    const v = note.voice ?? 1;
    if (!byVoice.has(v)) {
      byVoice.set(v, []);
      voiceOrder.push(v);
    }
    byVoice.get(v)!.push(note);
  }

  // Sort voices ascending
  voiceOrder.sort((a, b) => a - b);

  // Sort notes within each voice by startTick
  for (const [, voiceNotes] of byVoice) {
    voiceNotes.sort((a, b) => a.startTick - b.startTick);
  }

  const events: MeasureEvent[] = [];
  let timeCursor = 0;
  let cursorInitialized = false;
  let currentVoice = 1;

  for (const v of voiceOrder) {
    const voiceNotes = byVoice.get(v)!;

    for (const note of voiceNotes) {
      if (!cursorInitialized) {
        timeCursor = note.startTick;
        cursorInitialized = true;
      }

      if (!note.chord) {
        const diff = timeCursor - note.startTick;

        if (diff > 0) {
          events.push({ kind: 'backup', duration: diff });
          timeCursor = note.startTick;
          // Every backward jump starts a new voice to keep the MusicXML valid.
          currentVoice++;
        } else if (diff < 0) {
          events.push({ kind: 'forward', duration: -diff, voice: currentVoice, staff: note.staff });
          timeCursor = note.startTick;
        }
      }

      // Emit note with the current voice (overrides model voice to reflect
      // actual voice assignment after backup splits).
      events.push({ kind: 'note', note: { ...note, voice: currentVoice } });

      if (!note.chord) {
        timeCursor += note.duration ?? 0;
      }
    }
  }

  return events;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs all five preprocessing steps in order and returns the final
 * sequence of MeasureEvents ready for XML serialization.
 */
export function preprocessMeasure(notes: NoteElement[], divisions: number, tempoBpm: number = 120): MeasureEvent[] {
  const step1 = resolveChords(notes);
  const step2 = resolveBeams(step1);
  const step3 = assignVoices(step2);
  const step4 = resolveStaccato(step3, divisions, tempoBpm);
  return buildMeasureEvents(step4);
}
