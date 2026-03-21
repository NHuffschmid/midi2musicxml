/**
 * Transform: TemporalModel → NotationModel
 * 
 * Converts time-based structure directly to notation:
 * - Propagate metadata (time signature, key signature, tempo)
 * - Convert MIDI ticks to note durations (quarter, eighth, etc.)
 * - Convert MIDI numbers to pitches (step, alter, octave)
 */

import {
  TemporalScore,
  TemporalSection,
  TemporalMeasure,
  TimeSignature,
  KeySignature
} from '../models/TemporalModel';

import {
  NotationScore,
  NotationMeasure,
  NotationNote,
  Pitch,
  TieInfo
} from '../models/NotationModel';

import { MidiNote } from '../types';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

export interface TemporalToNotationOptions {
  pulsesPerQuarterNote: number;
}

/**
 * Main transform function: TemporalModel → NotationModel
 */
export function temporalToNotation(
  temporalScore: TemporalScore,
  options: TemporalToNotationOptions
): NotationScore {
  
  const measures = sectionsToMeasures(
    temporalScore.sections,
    temporalScore.ppq,
    options.pulsesPerQuarterNote
  );

  return {
    title: temporalScore.title,
    composer: temporalScore.composer,
    copyright: temporalScore.copyright,
    parts: [
      {
        id: 'P1',
        name: ' ',
        measures
      }
    ]
  };
}

// ─── Cross-measure tie support ────────────────────────────────────────────────

/** A note that started in a previous measure and continues into the current one. */
interface CarryOverNote {
  pitch: Pitch;
  remainingTicks: number;
}

/**
 * Convert temporal sections to notation measures, splitting notes that cross
 * measure boundaries and linking the segments with ties.
 */
function sectionsToMeasures(
  sections: TemporalSection[],
  ppq: number,
  pulsesPerQuarterNote: number
): NotationMeasure[] {
  const notationMeasures: NotationMeasure[] = [];
  let previousKeySignature: KeySignature | undefined;
  let carryOver: CarryOverNote[] = [];

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const isFirstSection = sectionIndex === 0;
    const keySignatureChanged = !previousKeySignature ||
      previousKeySignature.fifths !== section.keySignature.fifths ||
      previousKeySignature.mode !== section.keySignature.mode;

    for (let measureIndex = 0; measureIndex < section.measures.length; measureIndex++) {
      const temporalMeasure = section.measures[measureIndex];
      const isFirstMeasureInSection = measureIndex === 0;

      const { notes, newCarryOver } = convertNotesWithCarryOver(
        temporalMeasure.notes,
        temporalMeasure.startTick,
        temporalMeasure.endTick,
        carryOver,
        pulsesPerQuarterNote,
        section.keySignature.fifths
      );

      carryOver = newCarryOver;

      notationMeasures.push({
        number: temporalMeasure.number,
        timeSignature: isFirstMeasureInSection ? section.timeSignature : undefined,
        keySignature: isFirstMeasureInSection && keySignatureChanged ? section.keySignature : undefined,
        tempo: isFirstMeasureInSection && section.tempo ? section.tempo : undefined,
        sectionStart: (isFirstMeasureInSection && !isFirstSection) || undefined,
        notes,
        pedalEvents: temporalMeasure.pedalEvents
      });
    }

    previousKeySignature = section.keySignature;
  }

  return notationMeasures;
}

/**
 * Convert MIDI notes for one measure, injecting carry-over tied notes from
 * the previous measure and producing new carry-overs for the next measure.
 *
 * Notes whose end tick exceeds measureEndTick are split:
 *   - the portion within this measure gets tie=start
 *   - the remainder is kept in newCarryOver with tie=stop (or tie=continue
 *     if it still overflows the next measure)
 */
function convertNotesWithCarryOver(
  midiNotes: MidiNote[],
  measureStartTick: number,
  measureEndTick: number,
  carryOver: CarryOverNote[],
  ppq: number,
  fifths: number
): { notes: NotationNote[]; newCarryOver: CarryOverNote[] } {
  const notes: NotationNote[] = [];
  const newCarryOver: CarryOverNote[] = [];
  const measureDuration = measureEndTick - measureStartTick;

  // ── 1. Inject carry-over notes from the previous measure ──────────────────
  for (const co of carryOver) {
    if (co.remainingTicks <= measureDuration) {
      // Fits entirely in this measure: tie stop
      const { type, dots } = ticksToDuration(co.remainingTicks, ppq);
      notes.push({
        pitch: co.pitch,
        type: type as NotationNote['type'],
        dots,
        startTick: measureStartTick,
        durationTicks: co.remainingTicks,
        tie: { type: 'stop' },
      });
    } else {
      // Still overflows: tie continue (= stop + start in MusicXML)
      const { type, dots } = ticksToDuration(measureDuration, ppq);
      notes.push({
        pitch: co.pitch,
        type: type as NotationNote['type'],
        dots,
        startTick: measureStartTick,
        durationTicks: measureDuration,
        tie: { type: 'continue' },
      });
      newCarryOver.push({
        pitch: co.pitch,
        remainingTicks: co.remainingTicks - measureDuration,
      });
    }
  }

  // ── 2. Process notes that start in this measure ────────────────────────────
  const sortedNotes = [...midiNotes].sort((a, b) => a.ticks - b.ticks);

  for (const midiNote of sortedNotes) {
    const pitch = midiToPitch(midiNote.midi, fifths);
    const noteEndTick = midiNote.ticks + midiNote.durationTicks;

    if (noteEndTick > measureEndTick) {
      // Note crosses the measure boundary: split it
      const segmentTicks = measureEndTick - midiNote.ticks;
      const remainingTicks = noteEndTick - measureEndTick;
      const { type, dots } = ticksToDuration(segmentTicks, ppq);
      notes.push({
        pitch,
        type: type as NotationNote['type'],
        dots,
        startTick: midiNote.ticks,
        durationTicks: segmentTicks,
        tie: { type: 'start' },
      });
      newCarryOver.push({ pitch, remainingTicks });
    } else {
      // Normal note: no tie
      const { type, dots } = ticksToDuration(midiNote.durationTicks, ppq);
      notes.push({
        pitch,
        type: type as NotationNote['type'],
        dots,
        startTick: midiNote.ticks,
        durationTicks: midiNote.durationTicks,
      });
    }
  }

  return { notes, newCarryOver };
}

/**
 * Convert MIDI number to pitch, respecting the key signature.
 *
 * Keys with sharps (fifths > 0) or C major (fifths === 0) spell black keys
 * as sharps (C#, D#, F#, G#, A#).  Keys with flats (fifths < 0) spell them
 * as flats (Db, Eb, Gb, Ab, Bb).
 *
 * Pitch-class index (midi % 12):
 *   0  1  2  3  4  5  6  7  8  9  10 11
 *   C  C# D  D# E  F  F# G  G# A  A# B
 *   C  Db D  Eb E  F  Gb G  Ab A  Bb B
 */
function midiToPitch(midi: number, fifths: number = 0): Pitch {
  // Sharp spellings (used when fifths >= 0)
  const stepNamesSharp: Array<'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'> =
    ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alterMapSharp = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

  // Flat spellings (used when fifths < 0)
  const stepNamesFlat: Array<'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'> =
    ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'];
  const alterMapFlat = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];

  const useFlats = fifths < 0;
  const stepNames = useFlats ? stepNamesFlat : stepNamesSharp;
  const alterMap  = useFlats ? alterMapFlat  : alterMapSharp;

  const pitchClass = midi % 12;
  const step  = stepNames[pitchClass];
  const alter = alterMap[pitchClass];
  const octave = Math.floor(midi / 12) - 1;

  return { step, alter, octave };
}

/**
 * Convert MIDI ticks to note duration
 */
function ticksToDuration(ticks: number, ppq: number): { type: string; dots: number } {
  return midiTicksToXmlDurationType(ticks, ppq);
}
