import { describe, it, expect } from 'vitest';
import { temporalToNotation } from '../../transforms/temporalToNotation';
import type { TemporalScore, TemporalMeasure } from '../../models/TemporalModel';
import { makeNote } from '../helpers/notes';

/**
 * Unit tests for temporalToNotation (Stage 2 → 3).
 *
 * The function converts TemporalScore (time-based groups) into NotationScore
 * (notation decisions: pitch spelling, note types, dots, ties).
 */
describe('temporalToNotation', () => {
  const PPQ = 480;

  /** Builds a minimal one-section, one-measure TemporalScore. */
  function makeScore(
    notes: ReturnType<typeof makeNote>[],
    measureTicks = PPQ * 4,
  ): TemporalScore {
    const measure: TemporalMeasure = {
      number: 1,
      startTick: 0,
      endTick: measureTicks,
      durationTicks: measureTicks,
      notes,
      isFirstInSection: true,
    };
    return {
      sections: [
        {
          sectionNumber: 1,
          measures: [measure],
          timeSignature: { beats: 4, beatType: 4 },
          keySignature: { fifths: 0, mode: 'major' },
          tempo: 120,
        },
      ],
      ppq: PPQ,
    };
  }

  // ── Metadata pass-through ─────────────────────────────────────────────────

  it('passes title and composer through to NotationScore', () => {
    const score: TemporalScore = { ...makeScore([]), title: 'Testpiece', composer: 'A. Composer' };
    const result = temporalToNotation(score, { pulsesPerQuarterNote: PPQ });
    expect(result.title).toBe('Testpiece');
    expect(result.composer).toBe('A. Composer');
  });

  // ── Note type conversion ──────────────────────────────────────────────────

  it('converts a quarter note (480 ticks) to type=quarter, dots=0', () => {
    const score = makeScore([makeNote(60, 0, PPQ)]);
    const notes = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes;
    expect(notes[0].type).toBe('quarter');
    expect(notes[0].dots).toBe(0);
  });

  it('converts a half note (960 ticks) to type=half, dots=0', () => {
    const score = makeScore([makeNote(60, 0, PPQ * 2)]);
    const notes = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes;
    expect(notes[0].type).toBe('half');
    expect(notes[0].dots).toBe(0);
  });

  it('converts an eighth note (240 ticks) to type=eighth, dots=0', () => {
    const score = makeScore([makeNote(60, 0, PPQ / 2)]);
    const notes = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes;
    expect(notes[0].type).toBe('eighth');
    expect(notes[0].dots).toBe(0);
  });

  it('converts a dotted quarter (720 ticks) to type=quarter, dots=1', () => {
    const score = makeScore([makeNote(60, 0, 720)]);
    const notes = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes;
    expect(notes[0].type).toBe('quarter');
    expect(notes[0].dots).toBe(1);
  });

  // ── Pitch conversion ──────────────────────────────────────────────────────

  it('converts MIDI 60 (C4) to pitch { step:C, alter:0, octave:4 } in C major', () => {
    const score = makeScore([makeNote(60, 0, PPQ)]);
    const { pitch } = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes[0];
    expect(pitch).toEqual({ step: 'C', alter: 0, octave: 4 });
  });

  it('spells MIDI 61 as C# in C major (fifths=0, sharp spelling)', () => {
    const score = makeScore([makeNote(61, 0, PPQ)]);
    const { pitch } = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes[0];
    expect(pitch.step).toBe('C');
    expect(pitch.alter).toBe(1);
  });

  it('spells MIDI 61 as Db in F major (fifths=-1, flat spelling)', () => {
    const score = makeScore([makeNote(61, 0, PPQ)]);
    score.sections[0].keySignature = { fifths: -1, mode: 'major' };
    const { pitch } = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes[0];
    expect(pitch.step).toBe('D');
    expect(pitch.alter).toBe(-1);
  });

  it('converts MIDI 69 (A4) to pitch { step:A, alter:0, octave:4 }', () => {
    const score = makeScore([makeNote(69, 0, PPQ)]);
    const { pitch } = temporalToNotation(score, { pulsesPerQuarterNote: PPQ })
      .parts[0].measures[0].notes[0];
    expect(pitch).toEqual({ step: 'A', alter: 0, octave: 4 });
  });

  // ── Cross-measure tie splitting ───────────────────────────────────────────

  it('splits a note that crosses the measure boundary into tied segments', () => {
    // Measure 1: 1920 ticks (4/4 at PPQ=480).  Note starts at tick 960 and
    // has duration 1440, so it ends at tick 2400 – 480 ticks into measure 2.
    const score: TemporalScore = {
      sections: [
        {
          sectionNumber: 1,
          measures: [
            {
              number: 1,
              startTick: 0,
              endTick: 1920,
              durationTicks: 1920,
              notes: [makeNote(60, 960, 1440)], // spans measure boundary
              isFirstInSection: true,
            },
            {
              number: 2,
              startTick: 1920,
              endTick: 3840,
              durationTicks: 1920,
              notes: [],
            },
          ],
          timeSignature: { beats: 4, beatType: 4 },
          keySignature: { fifths: 0, mode: 'major' },
          tempo: 120,
        },
      ],
      ppq: PPQ,
    };

    const parts = temporalToNotation(score, { pulsesPerQuarterNote: PPQ }).parts[0];
    const m1Notes = parts.measures[0].notes;
    const m2Notes = parts.measures[1].notes;

    // The original note should be split: measure 1 gets the "start" half,
    // measure 2 gets the "stop" continuation.
    expect(m1Notes.length).toBeGreaterThan(0);
    expect(m2Notes.length).toBeGreaterThan(0);

    // The first segment must have tie.type = 'start'
    expect(m1Notes[m1Notes.length - 1].tie?.type).toBe('start');
    // The second segment must have tie.type = 'stop'
    expect(m2Notes[0].tie?.type).toBe('stop');
  });

  // ── Time and key signature propagation ───────────────────────────────────

  it('adds timeSignature and keySignature only on the first measure of a section', () => {
    const m1: TemporalMeasure = { number: 1, startTick: 0, endTick: 1920, durationTicks: 1920, notes: [], isFirstInSection: true };
    const m2: TemporalMeasure = { number: 2, startTick: 1920, endTick: 3840, durationTicks: 1920, notes: [] };
    const score: TemporalScore = {
      sections: [
        {
          sectionNumber: 1,
          measures: [m1, m2],
          timeSignature: { beats: 4, beatType: 4 },
          keySignature: { fifths: 0, mode: 'major' },
          tempo: 120,
        },
      ],
      ppq: PPQ,
    };

    const measures = temporalToNotation(score, { pulsesPerQuarterNote: PPQ }).parts[0].measures;
    expect(measures[0].timeSignature).toBeDefined();
    expect(measures[0].keySignature).toBeDefined();
    expect(measures[1].timeSignature).toBeUndefined();
    expect(measures[1].keySignature).toBeUndefined();
  });
});
