import { describe, it, expect } from 'vitest';
import {
  resolveChords,
  resolveBeams,
  assignVoices,
  resolveStaccato,
  buildMeasureEvents,
  preprocessMeasure,
} from '../../transforms/measurePreprocessor';
import type { NoteElement } from '../../models/MusicXMLModel';

/**
 * Unit tests for the five preprocessing steps in measurePreprocessor.ts.
 *
 * Each step is a pure function and can be tested in complete isolation.
 * Integration of all steps is covered by the `preprocessMeasure` tests at
 * the bottom of this file.
 */

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeNoteEl(
  startTick: number,
  duration: number,
  staff = 1,
  overrides: Partial<NoteElement> = {},
): NoteElement {
  return {
    pitch: { step: 'C', octave: 4 },
    duration,
    type: 'quarter',
    startTick,
    staff,
    ...overrides,
  };
}

// ─── Step 1: resolveChords ────────────────────────────────────────────────────

describe('resolveChords', () => {
  it('marks a single note as non-chord (chord = false)', () => {
    const [result] = resolveChords([makeNoteEl(0, 480)]);
    expect(result.chord).toBe(false);
  });

  it('marks the second note at the same tick+staff as chord=true', () => {
    const notes = [makeNoteEl(0, 480), makeNoteEl(0, 480)];
    const [first, second] = resolveChords(notes);
    expect(first.chord).toBe(false);
    expect(second.chord).toBe(true);
  });

  it('does NOT mark a note chord=true when it is on a different staff', () => {
    const notes = [makeNoteEl(0, 480, 1), makeNoteEl(0, 480, 2)];
    const result = resolveChords(notes);
    expect(result[0].chord).toBe(false);
    expect(result[1].chord).toBe(false);
  });

  it('allows notes at different ticks on the same staff to be primary', () => {
    const notes = [makeNoteEl(0, 480), makeNoteEl(480, 480)];
    const result = resolveChords(notes);
    expect(result[0].chord).toBe(false);
    expect(result[1].chord).toBe(false);
  });

  it('chord note inherits the voice of its primary note', () => {
    const notes = [
      makeNoteEl(0, 480, 1, { voice: 2 }),
      makeNoteEl(0, 480, 1),
    ];
    const result = resolveChords(notes);
    expect(result[0].voice).toBe(2);
    expect(result[1].voice).toBe(2); // inherits voice 2 from primary
  });
});

// ─── Step 2: resolveBeams ─────────────────────────────────────────────────────

describe('resolveBeams', () => {
  it('assigns voice of the begin note to all notes in the beam group', () => {
    const notes: NoteElement[] = [
      makeNoteEl(0,   240, 1, { voice: 1, beam: [{ number: 1, type: 'begin' }] }),
      makeNoteEl(240, 240, 1, { voice: 9, beam: [{ number: 1, type: 'end' }] }),
    ];
    const result = resolveBeams(notes);
    expect(result[0].voice).toBe(1);
    expect(result[1].voice).toBe(1); // overwritten from 9 → 1
  });

  it('does not change voice of notes outside a beam group', () => {
    const notes: NoteElement[] = [
      makeNoteEl(0,   480, 1, { voice: 3 }),
      makeNoteEl(480, 480, 1, { voice: 4 }),
    ];
    const result = resolveBeams(notes);
    expect(result[0].voice).toBe(3);
    expect(result[1].voice).toBe(4);
  });
});

// ─── Step 3: assignVoices ─────────────────────────────────────────────────────

describe('assignVoices', () => {
  it('maps staff 1 → voice 1', () => {
    const notes = [makeNoteEl(0, 480, 1)];
    const [result] = assignVoices(notes);
    expect(result.voice).toBe(1);
  });

  it('maps staff 2 → voice 2', () => {
    const notes = [makeNoteEl(0, 480, 1), makeNoteEl(0, 480, 2)];
    const result = assignVoices(notes);
    expect(result[0].voice).toBe(1);
    expect(result[1].voice).toBe(2);
  });

  it('chord notes (chord=true) also get the voice of their staff', () => {
    const notes = [
      makeNoteEl(0, 480, 1, { chord: false }),
      makeNoteEl(0, 480, 1, { chord: true }),
    ];
    const result = assignVoices(notes);
    expect(result[0].voice).toBe(1);
    expect(result[1].voice).toBe(1);
  });

  it('only builds the staff→voice map from non-chord notes', () => {
    // If chord notes drove the mapping they could create spurious extra voices.
    const notes = [
      makeNoteEl(0, 480, 1, { chord: false }),
      makeNoteEl(0, 480, 1, { chord: true }),
      makeNoteEl(480, 480, 2, { chord: false }),
    ];
    const voices = assignVoices(notes).map(n => n.voice);
    // Should be [1, 1, 2], not [1, 1, 3]
    expect(voices).toEqual([1, 1, 2]);
  });
});

// ─── Step 4: resolveStaccato ──────────────────────────────────────────────────

describe('resolveStaccato', () => {
  const PPQ = 480;
  const BPM = 120; // 1 tick = 60 000 / (120 * 480) ms = 1/960 s

  it('detects staccato: short gap followed by next note in the same voice', () => {
    // Note duration 240 (eighth), gap 240, next note starts at 480.
    // The combined duration is 480 (quarter), which is within STACCATO_MAX_DURATION_MS (250 ms).
    // At 120 BPM, PPQ=480: 480 ticks = 0.5 s = 500 ms → EXCEEDS 250 ms.
    // So let's use a shorter note: 120 ticks (16th) with gap 60 → combined 180 ticks = 187.5 ms < 250 ms.
    const notes = [
      makeNoteEl(0,   120, 1, { staff: 1, voice: 1 }),
      makeNoteEl(180, 120, 1, { staff: 1, voice: 1 }),
    ];
    const result = resolveStaccato(notes, PPQ, BPM);
    expect(result[0].notations?.articulations).toBeDefined();
    expect(result[0].notations?.articulations?.[0]?.type).toBe('staccato');
  });

  it('does not detect staccato when the gap is larger than the note duration', () => {
    // Note duration 120, gap 200, next note at 320: gap > duration → no staccato.
    const notes = [
      makeNoteEl(0,   120, 1, { voice: 1 }),
      makeNoteEl(320, 120, 1, { voice: 1 }),
    ];
    const result = resolveStaccato(notes, PPQ, BPM);
    expect(result[0].notations?.articulations).toBeUndefined();
  });

  it('does not detect staccato on tuplet notes', () => {
    const tm = { actualNotes: 3, normalNotes: 2 };
    const notes = [
      makeNoteEl(0,   100, 1, { voice: 1, timeModification: tm }),
      makeNoteEl(160, 100, 1, { voice: 1, timeModification: tm }),
    ];
    const result = resolveStaccato(notes, PPQ, BPM);
    expect(result[0].notations?.articulations).toBeUndefined();
  });
});

// ─── Step 5: buildMeasureEvents ───────────────────────────────────────────────

describe('buildMeasureEvents', () => {
  it('emits a single note event for a single input note', () => {
    const events = buildMeasureEvents([makeNoteEl(0, 480)]);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('note');
  });

  it('emits notes in startTick order within a voice', () => {
    const notes = [makeNoteEl(480, 480), makeNoteEl(0, 480)];
    const events = buildMeasureEvents(notes);
    const noteTicks = events
      .filter(e => e.kind === 'note')
      .map(e => (e as { kind: 'note'; note: NoteElement }).note.startTick);
    expect(noteTicks).toEqual([0, 480]);
  });

  it('inserts a <backup> element when going from voice 2 (higher tick) back to voice 1', () => {
    // Voice 1: note at tick 0, dur 480
    // Voice 2: note at tick 0, dur 480  → requires backup from 480 → 0
    const notes = [
      makeNoteEl(0, 480, 1, { voice: 1 }),
      makeNoteEl(0, 480, 2, { voice: 2 }),
    ];
    const events = buildMeasureEvents(notes);
    const kinds = events.map(e => e.kind);
    expect(kinds).toContain('backup');
  });

  it('chord notes do not advance the time cursor', () => {
    // A primary note and a chord note share the same startTick.
    // Only one note event advances the cursor, so no backup is needed.
    const [primary, chord] = resolveChords([
      makeNoteEl(0, 480),
      makeNoteEl(0, 480),
    ]);
    const events = buildMeasureEvents([primary, chord]);
    expect(events.every(e => e.kind === 'note')).toBe(true);
  });
});

// ─── Full pipeline: preprocessMeasure ────────────────────────────────────────

describe('preprocessMeasure', () => {
  it('runs all five steps and returns MeasureEvents', () => {
    const notes = [makeNoteEl(0, 480), makeNoteEl(0, 480)];
    const events = preprocessMeasure(notes, 480);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(e => ['note', 'backup', 'forward'].includes(e.kind))).toBe(true);
  });

  it('correctly marks chord notes in the output', () => {
    // Two notes at the same tick: one primary, one chord.
    const notes = [makeNoteEl(0, 480), makeNoteEl(0, 480)];
    const events = preprocessMeasure(notes, 480);
    const noteEvents = events.filter(e => e.kind === 'note');
    const chordFlags = noteEvents.map(e => (e as { kind: 'note'; note: NoteElement }).note.chord);
    expect(chordFlags).toContain(false);
    expect(chordFlags).toContain(true);
  });
});
