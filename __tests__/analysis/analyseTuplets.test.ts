import { describe, it, expect } from 'vitest';
import { detectTuplets } from '../../analysis/analyseTuplets';
import { makeNote } from '../helpers/notes';

/**
 * Unit tests for detectTuplets.
 *
 * The function slides a window of 3 consecutive beat-positions over the sorted
 * note array and annotates groups whose spacing matches a known tuplet pattern
 * (half, quarter, eighth, or 16th triplets).
 */
describe('detectTuplets', () => {
  const PPQ = 480;

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('returns the input unchanged when there are fewer than 3 notes', () => {
    const notes = [makeNote(60, 0, 480), makeNote(62, 480, 480)];
    const result = detectTuplets(notes, PPQ);
    expect(result).toHaveLength(2);
    result.forEach(n => expect(n.tuplet).toBeUndefined());
  });

  it('returns the input unchanged for an empty array', () => {
    expect(detectTuplets([], PPQ)).toEqual([]);
  });

  // ── Eighth-note triplets ──────────────────────────────────────────────────

  it('annotates three notes at eighth-triplet spacing (PPQ/3 = 160 ticks)', () => {
    // Eighth triplet spacing = PPQ * 2 / 3 / 1 = 480/3 = 160 ticks
    const spacing = PPQ / 3; // 160
    const notes = [
      makeNote(60, 0,         spacing),
      makeNote(62, spacing,   spacing),
      makeNote(64, spacing * 2, spacing),
    ];
    const result = detectTuplets(notes, PPQ);

    result.forEach((n, idx) => {
      expect(n.tuplet).toBeDefined();
      expect(n.tuplet?.actualNotes).toBe(3);
      expect(n.tuplet?.normalNotes).toBe(2);
      expect(n.tuplet?.noteType).toBe('eighth');
      expect(n.tuplet?.position).toBe(idx + 1);
    });
  });

  it('all three triplet notes share the same groupId', () => {
    const spacing = PPQ / 3;
    const notes = [
      makeNote(60, 0,         spacing),
      makeNote(62, spacing,   spacing),
      makeNote(64, spacing * 2, spacing),
    ];
    const result = detectTuplets(notes, PPQ);
    const ids = result.map(n => n.tuplet?.groupId).filter(Boolean);
    expect(new Set(ids).size).toBe(1);
  });

  // ── Quarter-note triplets ─────────────────────────────────────────────────

  it('annotates three notes at quarter-triplet spacing (PPQ*2/3 ≈ 320 ticks)', () => {
    // Quarter triplet: 3 notes in the space of 2 quarter notes → spacing = 2*PPQ/3
    const spacing = Math.round((PPQ * 2) / 3); // 320
    const notes = [
      makeNote(60, 0,         spacing),
      makeNote(62, spacing,   spacing),
      makeNote(64, spacing * 2, spacing),
    ];
    const result = detectTuplets(notes, PPQ);
    expect(result[0].tuplet?.noteType).toBe('quarter');
  });

  // ── Regular notes are NOT annotated ──────────────────────────────────────

  it('does not annotate three notes at regular eighth-note spacing (PPQ/2 = 240 ticks)', () => {
    const spacing = PPQ / 2; // exact eighth note, not a triplet
    const notes = [
      makeNote(60, 0,         spacing),
      makeNote(62, spacing,   spacing),
      makeNote(64, spacing * 2, spacing),
    ];
    const result = detectTuplets(notes, PPQ);
    result.forEach(n => expect(n.tuplet).toBeUndefined());
  });

  it('does not annotate three notes at regular quarter-note spacing (PPQ = 480 ticks)', () => {
    const notes = [
      makeNote(60, 0,       PPQ),
      makeNote(62, PPQ,     PPQ),
      makeNote(64, PPQ * 2, PPQ),
    ];
    const result = detectTuplets(notes, PPQ);
    result.forEach(n => expect(n.tuplet).toBeUndefined());
  });

  // ── Non-overlapping group advancement ────────────────────────────────────

  it('detects two adjacent non-overlapping triplet groups', () => {
    const spacing = PPQ / 3; // eighth triplet
    // Group 1: ticks 0, 160, 320  |  Group 2: ticks 480, 640, 800
    const notes = [
      makeNote(60, 0,           spacing),
      makeNote(62, spacing,     spacing),
      makeNote(64, spacing * 2, spacing),
      makeNote(65, spacing * 3, spacing),
      makeNote(67, spacing * 4, spacing),
      makeNote(69, spacing * 5, spacing),
    ];
    const result = detectTuplets(notes, PPQ);
    const group1Ids = result.slice(0, 3).map(n => n.tuplet?.groupId);
    const group2Ids = result.slice(3, 6).map(n => n.tuplet?.groupId);

    // All notes annotated
    result.forEach((n, i) => expect(n.tuplet).toBeDefined());

    // The two groups have distinct IDs
    expect(group1Ids[0]).toBeDefined();
    expect(group2Ids[0]).toBeDefined();
    expect(group1Ids[0]).not.toBe(group2Ids[0]);
  });

  // ── Notes with incompatible durations are skipped ─────────────────────────

  it('skips a note whose duration exceeds DURATION_MAX_FACTOR × spacing', () => {
    const spacing = PPQ / 3; // 160
    // Third note has a very long duration (> 2× spacing) → should not be annotated
    const notes = [
      makeNote(60, 0,           spacing),
      makeNote(62, spacing,     spacing),
      makeNote(64, spacing * 2, spacing * 5), // too long
    ];
    const result = detectTuplets(notes, PPQ);
    // The third note should NOT be annotated as a tuplet member
    expect(result[2].tuplet).toBeUndefined();
  });
});
