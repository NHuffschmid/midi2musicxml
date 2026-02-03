/**
 * Key detection algorithm for MusicXML conversion
 *
 * This module provides a function to automatically determine the most likely key signature (major or minor)
 * for a given section of music, based on the note content. The current algorithm works as follows:
 *
 * 1. All notes in the section are collected and converted to pitch classes (0-11).
 * 2. For each possible key signature (-7 to +7 fifths, covering all major and parallel minor keys):
 *    a. Count the number of notes that do NOT fit the diatonic scale of the key (deviations).
 *    b. Count the number of tonic (root) notes for both major and minor.
 *    c. For minor keys, count the number of raised 7th degree (Leitton) notes.
 *    d. Calculate the score for each key using:
 *         score = -deviations * DEVIATION_FACTOR + tonicCount + leittonCount * BONUS_FACTOR
 *       (DEVIATION_FACTOR is much larger than BONUS_FACTOR, so mismatches are strongly penalized.)
 * 3. The key with the highest score is selected as the detected key. If there is a tie, major keys are preferred.
 * 4. The result is returned as a string (e.g. '2M' for D major, '2m' for B minor) and stored in section.attributes.key.
 *
 * This approach ensures that keys with many mismatches are not selected, even if tonic or Leitton notes are frequent.
 * The algorithm balances musical plausibility (few mismatches) with bonus weighting for tonic and Leitton.
 */

import { Section, Note } from '../types';

/**
 * Analyzes all measures in a section and determines the most common key candidate.
 * Sets this key as the section's attributes.key property and returns it.
 *
 * @param section The section to analyze and modify
 * @returns The most common key (e.g. '2M' for D major, '2m' for B minor)
 */
export function analyseKey(section: Section): string {
  const majorScalePattern = [0, 2, 4, 5, 7, 9, 11];
  const fifthsToTonic = [
  11, // -7: Cb
  6,  // -6: Gb
  1,  // -5: Db
  8,  // -4: Ab
  3,  // -3: Eb
  10, // -2: Bb
  5,  // -1: F
  0,  //  0: C
  7,  // +1: G
  2,  // +2: D
  9,  // +3: A
  4,  // +4: E
  11, // +5: B
  6,  // +6: F#
  1,  // +7: C#
];
  function getScaleNotesForKey(fifths: number): Set<number> {
    const tonic = fifthsToTonic[fifths + 7];
    const scaleNotes = new Set<number>();
    for (const interval of majorScalePattern) {
      scaleNotes.add((tonic + interval) % 12);
    }
    return scaleNotes;
  }
  function noteToPitchClass(step: string, alter?: number): number {
    const stepToPitch: Record<string, number> = {
      'C': 0,
      'D': 2,
      'E': 4,
      'F': 5,
      'G': 7,
      'A': 9,
      'B': 11,
    };
    const basePitch = stepToPitch[step.toUpperCase()] ?? 0;
    const alteration = alter ?? 0;
    return (basePitch + alteration + 12) % 12;
  }

  // Collect all notes of the section
  const allNotes: Note[] = section.measures?.flatMap(m => m.notes) ?? [];
  const notePitchClasses = allNotes.filter(n => !n.isRest).map(n => noteToPitchClass(n.step, n.alter));

  if (notePitchClasses.length === 0) {
    if (!section.attributes) section.attributes = {};
    section.attributes.key = '0M';
    console.log('[analyseKey] No notes found, defaulting to key 0M (C major)');
    return '0M';
  }


  // For each key: calculate score = -deviations + tonic bonus + leitton bonus
  const keyScores: Record<string, number> = {};
  const tonicCounts: Record<string, number> = {};
  const leittonCounts: Record<string, number> = {};
  const deviationCounts: Record<string, number> = {};
  const BONUS_FACTOR = 3;
  const DEVIATION_FACTOR = 5;
  for (let fifths = -7; fifths <= 7; fifths++) {
    // Major
    const scaleNotesMajor = getScaleNotesForKey(fifths);
    let deviationsMajor = 0;
    for (const pc of notePitchClasses) {
      if (!scaleNotesMajor.has(pc)) deviationsMajor++;
    }
    const tonicMajor = fifthsToTonic[fifths + 7];
    const tonicCountMajor = notePitchClasses.filter(pc => pc === tonicMajor).length;
    const keyMajor = `${fifths}M`;
    deviationCounts[keyMajor] = deviationsMajor;
    tonicCounts[keyMajor] = tonicCountMajor;
    keyScores[keyMajor] = -deviationsMajor * DEVIATION_FACTOR + tonicCountMajor;

    // Parallel minor: tonic is 9 steps below major tonic (relative minor)
    const tonicMinor = (tonicMajor + 9) % 12;
    const naturalMinorPattern = [0, 2, 3, 5, 7, 8, 10];
    const scaleNotesMinor = new Set<number>();
    for (const interval of naturalMinorPattern) {
      scaleNotesMinor.add((tonicMinor + interval) % 12);
    }
    let deviationsMinor = 0;
    for (const pc of notePitchClasses) {
      if (!scaleNotesMinor.has(pc)) deviationsMinor++;
    }
    const tonicCountMinor = notePitchClasses.filter(pc => pc === tonicMinor).length;
    // Leitton for minor: raised 7th degree (tonic + 11) % 12
    const leittonMinor = (tonicMinor + 11) % 12;
    const leittonCountMinor = notePitchClasses.filter(pc => pc === leittonMinor).length;
    const keyMinor = `${fifths}m`;
    deviationCounts[keyMinor] = deviationsMinor;
    tonicCounts[keyMinor] = tonicCountMinor;
    leittonCounts[keyMinor] = leittonCountMinor;
    keyScores[keyMinor] = -deviationsMinor * DEVIATION_FACTOR + tonicCountMinor + leittonCountMinor * BONUS_FACTOR;
  }

  // Log deviations, tonic and leitton counts for both major and minor
  const deviationLog = Object.entries(deviationCounts)
    .sort((a, b) => a[1] - b[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
  const tonicLog = Object.entries(tonicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
  const leittonLog = Object.entries(leittonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');

  // Determine the key(s) with the highest score
  const maxScore = Math.max(...Object.values(keyScores));
  const bestKeys = Object.entries(keyScores)
    .filter(([_, score]) => score === maxScore)
    .map(([key]) => key);

  // Log the analysis sorted
  const sortedScores = Object.entries(keyScores)
    .sort((a, b) => b[1] - a[1])
    .map(([key, score]) => `${key}: ${score}`)
    .join(', ');
  console.log(`[analyseKey] key scores (desc): { ${sortedScores} }`);

  // Choose the first best key (prefer major if tie, then minor)
  let bestKey = bestKeys.find(k => k.endsWith('M')) ?? bestKeys[0] ?? '0M';

  if (!section.attributes) section.attributes = {};
  (section.attributes as any).key = bestKey;
  return bestKey;
}
