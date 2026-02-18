import { MidiMeasure } from '../types';

/**
 * Analyzes all measures and determines the most likely key signature.
 * 
 * Algorithm:
 * 1. All MidiNotes in the MidiMeasure Array are analysed.
 * 2. For each possible key signature (-7 to +7 fifths, covering all major and parallel minor keys):
 *    a. Sum the duration of notes that do NOT fit the diatonic scale of the key (deviation weight).
 *    b. Sum the duration of tonic (root) notes for both major and minor (tonic weight).
 *    c. For minor keys, sum the duration of raised 7th degree (Leitton) notes (leitton weight).
 *    d. Calculate the score for each key using:
 *         score = -deviationWeight * DEVIATION_FACTOR + tonicWeight * TONIC_FACTOR + leittonWeight * LEITTON_FACTOR
 * 3. The key with the highest score is selected as the detected key. If there is a tie, major keys are preferred.
 * 4. The result is returned as a string (e.g. '2M' for D major, '2m' for B minor).
 * 
 * @param measures The array of measures to analyze
 * @returns The detected key (e.g. '2M' for D major, '2m' for B minor)
 */
export function analyseKey(measures: MidiMeasure[]): string {
  // Scoring factors
  const DEVIATION_FACTOR = 1;     // Weight for notes outside the scale
  const TONIC_FACTOR = 0.01;      // Weight for tonic notes (small but decisive for ties)
  const LEITTON_FACTOR = 0.005;   // Weight for leading tone in minor keys

  // Major scale pattern (intervals from tonic)
  const majorScalePattern = [0, 2, 4, 5, 7, 9, 11];
  
  // Natural minor scale pattern (intervals from tonic)
  const naturalMinorPattern = [0, 2, 3, 5, 7, 8, 10];

  // Map fifths (-7 to +7) to tonic pitch class (0-11)
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

  /**
   * Get the set of pitch classes in a major scale for a given number of fifths
   */
  function getScaleNotesForKey(fifths: number): Set<number> {
    const tonic = fifthsToTonic[fifths + 7];
    const scaleNotes = new Set<number>();
    for (const interval of majorScalePattern) {
      scaleNotes.add((tonic + interval) % 12);
    }
    return scaleNotes;
  }

  /**
   * Get the set of pitch classes in a natural minor scale for a given tonic
   */
  function getMinorScaleNotes(tonic: number): Set<number> {
    const scaleNotes = new Set<number>();
    for (const interval of naturalMinorPattern) {
      scaleNotes.add((tonic + interval) % 12);
    }
    return scaleNotes;
  }

  // Collect all MIDI notes from all measures
  const allMidiNotes = measures.flatMap(m => m.notes);
  
  if (allMidiNotes.length === 0) {
    console.log('[analyseKey] No notes found, defaulting to key 0M (C major)');
    return '0M';
  }

  // Extract pitch classes and durations
  const notesWithDuration = allMidiNotes.map(note => ({
    pitchClass: note.midi % 12,
    duration: note.durationTicks
  }));

  // For each key: calculate score
  const keyScores: Record<string, number> = {};

  for (let fifths = -7; fifths <= 7; fifths++) {
    // === MAJOR KEY ===
    const scaleNotesMajor = getScaleNotesForKey(fifths);
    const tonicMajor = fifthsToTonic[fifths + 7];
    
    let deviationWeightMajor = 0;
    let tonicWeightMajor = 0;
    
    for (const note of notesWithDuration) {
      // Sum duration of notes not in scale (weighted deviations)
      if (!scaleNotesMajor.has(note.pitchClass)) {
        deviationWeightMajor += note.duration;
      }
      // Count tonic occurrences weighted by duration
      if (note.pitchClass === tonicMajor) {
        tonicWeightMajor += note.duration;
      }
    }
    
    const keyMajor = `${fifths}M`;
    keyScores[keyMajor] = 
      -deviationWeightMajor * DEVIATION_FACTOR + 
      tonicWeightMajor * TONIC_FACTOR;

    // === PARALLEL MINOR KEY ===
    // Parallel minor: tonic is 9 semitones below major tonic (relative minor)
    const tonicMinor = (tonicMajor + 9) % 12;
    const scaleNotesMinor = getMinorScaleNotes(tonicMinor);
    
    // Leitton for minor: raised 7th degree (tonic + 11) % 12
    const leittonMinor = (tonicMinor + 11) % 12;
    
    let deviationWeightMinor = 0;
    let tonicWeightMinor = 0;
    let leittonWeightMinor = 0;
    
    for (const note of notesWithDuration) {
      // Sum duration of notes not in natural minor scale (weighted deviations)
      if (!scaleNotesMinor.has(note.pitchClass)) {
        deviationWeightMinor += note.duration;
      }
      // Count tonic occurrences weighted by duration
      if (note.pitchClass === tonicMinor) {
        tonicWeightMinor += note.duration;
      }
      // Count Leitton occurrences weighted by duration
      if (note.pitchClass === leittonMinor) {
        leittonWeightMinor += note.duration;
      }
    }
    
    const keyMinor = `${fifths}m`;
    keyScores[keyMinor] = 
      -deviationWeightMinor * DEVIATION_FACTOR + 
      tonicWeightMinor * TONIC_FACTOR + 
      leittonWeightMinor * LEITTON_FACTOR;
  }

  // Find the key(s) with the highest score
  const maxScore = Math.max(...Object.values(keyScores));
  const bestKeys = Object.entries(keyScores)
    .filter(([_, score]) => score === maxScore)
    .map(([key]) => key);

  // If there's a tie, prefer keys with fewer accidentals, then major keys
  let selectedKey = bestKeys[0];
  let minAccidentals = 7;
  
  for (const key of bestKeys) {
    const fifths = Math.abs(parseInt(key.replace(/[Mm]/, '')));
    
    // Prefer fewer accidentals
    if (fifths < minAccidentals) {
      selectedKey = key;
      minAccidentals = fifths;
    } else if (fifths === minAccidentals && key.endsWith('M')) {
      // If same number of accidentals, prefer major
      selectedKey = key;
    }
  }

  /*
  console.log(`[analyseKey] Detected key: ${selectedKey} (score: ${maxScore.toFixed(2)})`);
  console.log('[analyseKey] Top 10 candidates:', 
    Object.entries(keyScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, score]) => `${key}: ${score.toFixed(2)}`)
      .join(', ')
  );
  */

  return selectedKey;
}
