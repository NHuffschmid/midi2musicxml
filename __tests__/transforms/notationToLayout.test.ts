import { describe, it, expect } from 'vitest';
import { notationToLayout } from '../../transforms/notationToLayout';
import type { NotationScore, NotationNote } from '../../models/NotationModel';

/**
 * Unit tests for notationToLayout (Stage 3 → 4).
 *
 * Responsibilities tested:
 *  - Piano mode creates 2 staves (treble + bass).
 *  - Single-staff instruments (violin, viola, cello) create 1 staff.
 *  - Notes are assigned to staves based on pitch relative to measure average.
 *  - Simultaneous notes on the same staff and with the same type/dots are
 *    detected as chords.
 */
describe('notationToLayout', () => {

  /** Builds a minimal NotationScore with the given notes in one measure. */
  function makeScore(notes: NotationNote[]): NotationScore {
    return {
      parts: [
        {
          id: 'P1',
          name: '',
          measures: [
            {
              number: 1,
              timeSignature: { beats: 4, beatType: 4 },
              keySignature: { fifths: 0, mode: 'major' },
              tempo: 120,
              notes,
            },
          ],
        },
      ],
    };
  }

  function makeNote(midiStep: string, octave: number, startTick: number): NotationNote {
    return {
      pitch: { step: midiStep as NotationNote['pitch']['step'], alter: 0, octave },
      type: 'quarter',
      dots: 0,
      startTick,
      durationTicks: 480,
    };
  }

  // ── Staff count per instrument ────────────────────────────────────────────

  it('creates 2 staves for piano', () => {
    const result = notationToLayout(makeScore([]), { instrument: 'piano' });
    expect(result.parts[0].staffCount).toBe(2);
    expect(result.parts[0].clefs).toHaveLength(2);
  });

  it('creates 1 staff for violin', () => {
    const result = notationToLayout(makeScore([]), { instrument: 'violin' });
    expect(result.parts[0].staffCount).toBe(1);
    expect(result.parts[0].clefs).toHaveLength(1);
  });

  it('creates 1 staff for viola', () => {
    const result = notationToLayout(makeScore([]), { instrument: 'viola' });
    expect(result.parts[0].staffCount).toBe(1);
    expect(result.parts[0].clefs[0].sign).toBe('C'); // alto clef
  });

  it('creates 1 staff for cello', () => {
    const result = notationToLayout(makeScore([]), { instrument: 'cello' });
    expect(result.parts[0].staffCount).toBe(1);
    expect(result.parts[0].clefs[0].sign).toBe('F'); // bass clef
  });

  // ── Clef assignment for piano ─────────────────────────────────────────────

  it('assigns G-clef to treble and F-clef to bass for piano', () => {
    const result = notationToLayout(makeScore([]), { instrument: 'piano' });
    expect(result.parts[0].clefs[0].sign).toBe('G');
    expect(result.parts[0].clefs[1].sign).toBe('F');
  });

  // ── Staff assignment by pitch ─────────────────────────────────────────────

  it('places a high note (C5, MIDI 72) in staff 1 (treble) for piano', () => {
    // Average MIDI 72, clamped to [52,66] → 66.  72 >= 66 → staff 1.
    // With only one note, average IS the note's MIDI → clamped to 66.
    const score = makeScore([makeNote('C', 5, 0)]);
    const measure = notationToLayout(score, { instrument: 'piano' }).parts[0].measures[0];
    const staff1 = measure.staves.find(s => s.number === 1)!;
    const staff2 = measure.staves.find(s => s.number === 2)!;
    expect(staff1.notes.length).toBe(1);
    expect(staff2.notes.length).toBe(0);
  });

  it('places a low note (C3, MIDI 48) in staff 2 (bass) for piano', () => {
    // With only C3, average is 48, clamped to 52.  48 < 52 → staff 2.
    const score = makeScore([makeNote('C', 3, 0)]);
    const measure = notationToLayout(score, { instrument: 'piano' }).parts[0].measures[0];
    const staff1 = measure.staves.find(s => s.number === 1)!;
    const staff2 = measure.staves.find(s => s.number === 2)!;
    expect(staff1.notes.length).toBe(0);
    expect(staff2.notes.length).toBe(1);
  });

  // ── Chord detection ───────────────────────────────────────────────────────

  it('marks the second of two simultaneous notes with isChord=true', () => {
    // Use C5 (MIDI 72) and G5 (MIDI 79): average = 75.5, clamped to 66.
    // Both notes (72, 79) ≥ 66 → both assigned to staff 1 (treble).
    // Same tick, same type, same dots → second note is detected as chord.
    const notes: NotationNote[] = [
      { pitch: { step: 'C', alter: 0, octave: 5 }, type: 'quarter', dots: 0, startTick: 0, durationTicks: 480 },
      { pitch: { step: 'G', alter: 0, octave: 5 }, type: 'quarter', dots: 0, startTick: 0, durationTicks: 480 },
    ];
    const score = makeScore(notes);
    const measure = notationToLayout(score, { instrument: 'piano' }).parts[0].measures[0];
    const staff1Notes = measure.staves.find(s => s.number === 1)!.notes;

    // The primary note has isChord=undefined; the second note has isChord=true.
    const primaryNotes = staff1Notes.filter(n => !n.isChord);
    const chordNotes   = staff1Notes.filter(n => n.isChord === true);
    expect(primaryNotes).toHaveLength(1);
    expect(chordNotes).toHaveLength(1);
  });

  it('does NOT mark notes at different ticks as a chord', () => {
    const notes: NotationNote[] = [
      { pitch: { step: 'C', alter: 0, octave: 5 }, type: 'quarter', dots: 0, startTick: 0,   durationTicks: 480 },
      { pitch: { step: 'E', alter: 0, octave: 5 }, type: 'quarter', dots: 0, startTick: 480, durationTicks: 480 },
    ];
    const score = makeScore(notes);
    const measure = notationToLayout(score, { instrument: 'piano' }).parts[0].measures[0];
    const staff1Notes = measure.staves.find(s => s.number === 1)!.notes;
    expect(staff1Notes.every(n => !n.isChord)).toBe(true);
  });

  // ── Metadata pass-through ─────────────────────────────────────────────────

  it('passes title and composer through to LayoutScore', () => {
    const score: NotationScore = {
      ...makeScore([]),
      title: 'Sonata',
      composer: 'Haydn',
    };
    const result = notationToLayout(score, { instrument: 'piano' });
    expect(result.title).toBe('Sonata');
    expect(result.composer).toBe('Haydn');
  });
});
