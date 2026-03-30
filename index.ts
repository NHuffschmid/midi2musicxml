import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { collectMidiNotes } from './utils/collectMidiNotes';
import { midiToQuantized } from './transforms/midiToQuantized';
import { midiToTemporal } from './transforms/midiToTemporal';
import { temporalToNotation } from './transforms/temporalToNotation';
import { notationToLayout, InstrumentType } from './transforms/notationToLayout';
import { layoutToMusicXML } from './transforms/layoutToMusicXML';
import { musicXMLToString } from './transforms/musicXMLToString';
import {
  dumpQuantizedModel, prettyPrintQuantizedModel,
  dumpTemporalModel, prettyPrintTemporalModel,
  dumpNotationModel, prettyPrintNotationModel,
  dumpLayoutModel, prettyPrintLayoutModel,
  dumpMusicXMLModel, prettyPrintMusicXMLModel
} from './debug';
import xmlFormatter from 'xml-formatter';
import { MidiNote } from './types';

/**
 * The result of converting a MIDI file to MusicXML.
 */
export interface Midi2MusicResult {
  /** The serialized MusicXML string, formatted and ready to render. */
  musicxml: string;
  /** Sorted onset times in seconds for the note-by-note cursor animation. */
  noteCursorTimes: number[];
}

/**
 * Options for the {@link midi2MusicXML} conversion.
 */
export interface Midi2MusicXMLOptions {
  /** Score title. Defaults to the title stored in the MIDI file's metadata. */
  title?: string;
  /** Composer name. Defaults to the composer stored in the MIDI file's metadata. */
  composer?: string;
  /** Instrument / clef layout to use for staff assignment. Defaults to `'piano'` (grand staff). */
  clef?: 'piano' | 'violin' | 'viola' | 'cello';
}

/**
 * Convert MIDI to MusicXML using a 7-stage pipeline architecture:
 *
 * Stage 1:   MIDI (tonejs) - Raw MIDI data
 * Stage 1.5: QuantizedModel - Optional quantization for live-recorded MIDI.
 *            Score-derived files (already on a tick grid) pass through unchanged.
 *            Live recordings are quantized so downstream stages produce
 *            meaningful notation.
 * Stage 2:   TemporalModel - Time-based structure (sections, measures)
 * Stage 3:   NotationModel - Notation decisions (duration types, pitches)
 * Stage 4:   LayoutModel - Layout decisions (staff assignment)
 * Stage 5:   MusicXMLModel - MusicXML DOM structure
 * Stage 6:   XML String - Serialized output
 *
 * @returns The MusicXML string and sorted cursor onset times.
 *   Returns `{ musicxml: '', noteCursorTimes: [] }` if the MIDI contains no notes.
 */
export function midi2MusicXML(
  midi: Midi,
  options: Midi2MusicXMLOptions = {}
): Midi2MusicResult {

  // Extract metadata
  const scoreTitle = options.title ?? analyzeTitle(midi);
  const scoreComposer = options.composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);
  const pulsesPerQuarterNote = midi.header.ppq || 480;

  // Stage 1: Collect MIDI notes
  const midiNotes: MidiNote[] = collectMidiNotes(midi);
  if (midiNotes.length === 0) return { musicxml: '', noteCursorTimes: [] };

  // Stage 1.5: MidiNote[] → QuantizedScore
  // Detects whether the input is score-derived (already on the tick grid) or
  // live-recorded (needs quantization).  Only live-recorded data is modified.
  const quantizedScore = midiToQuantized(midiNotes, pulsesPerQuarterNote);
  const quantizedDump = dumpQuantizedModel(quantizedScore);
  const quantizedPrettyPrint = prettyPrintQuantizedModel(quantizedScore);

  // Stage 2: QuantizedScore → TemporalModel
  const temporalScore = midiToTemporal(quantizedScore.notes, midi, {
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    estimatedTempo: quantizedScore.estimatedBpm,
    clipAtMeasureBoundary: quantizedScore.wasQuantized
  });
  const temporalDump = dumpTemporalModel(temporalScore);
  const temporalPrettyPrint = prettyPrintTemporalModel(temporalScore);

  // Stage 3: TemporalModel → NotationModel
  const notationScore = temporalToNotation(temporalScore, {
    pulsesPerQuarterNote
  });
  const notationDump = dumpNotationModel(notationScore);
  const notationPrettyPrint = prettyPrintNotationModel(notationScore);

  // Stage 4: NotationModel → LayoutModel
  const instrument: InstrumentType = options.clef ?? 'piano';
  const layoutScore = notationToLayout(notationScore, {
    instrument
  });
  const layoutDump = dumpLayoutModel(layoutScore);
  const layoutPrettyPrint = prettyPrintLayoutModel(layoutScore);

  // Stage 5: LayoutModel → MusicXMLModel
  const musicXMLDoc = layoutToMusicXML(layoutScore, {
    divisions: pulsesPerQuarterNote
  });
  const musicXMLDump = dumpMusicXMLModel(musicXMLDoc);
  const musicXMLPrettyPrint = prettyPrintMusicXMLModel(musicXMLDoc);

  // Stage 6: MusicXMLModel → XML String
  let musicXml = musicXMLToString(musicXMLDoc);

  // Format and beautify XML
  musicXml = xmlFormatter(musicXml, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n'
  });

  // Build a tick→time mapping from the quantized notes.
  // `note.ticks` (rescaled+quantized) matches `startTick` in MusicXMLModel.
  // `note.time` (physical seconds, never modified by applyTempoMap) is the
  // real playback time at which the note onset occurs — valid for both
  // score-derived and live-recorded files.
  const tickToTimeMap = new Map<number, number>();
  for (const note of quantizedScore.notes) {
    const existing = tickToTimeMap.get(note.ticks);
    if (existing === undefined || note.time < existing) {
      tickToTimeMap.set(note.ticks, note.time);
    }
  }

  // Build sorted unique list of cursor trigger times (seconds) for the
  // note-by-note cursor animation.  Non-chord primary notes only;
  // deduplication handles multi-voice same-beat positions.
  // Using physical time in seconds avoids any tick-space mismatch between
  // this pipeline (which may rescale ticks) and the playback clock.
  //
  // Tie-stop notes (= note continuations that cross measure boundaries) use
  // a synthetic startTick equal to the measure-boundary tick, which may not
  // be present in tickToTimeMap (no real note onset there — e.g. a whole note
  // spanning an otherwise empty measure).  For those missing ticks we fall
  // back to midi.header.ticksToSeconds(), which evaluates the MIDI file's
  // full tempo map and produces the correct physical time for any tick
  // position.  For live-recorded files this fallback is almost never reached
  // because quantization aligns notes to the beat grid (= measure boundaries).
  const noteCursorTimes: number[] = [
    ...new Set(
      musicXMLDoc.scorePartwise.parts
        .flatMap(p => p.measures)
        .flatMap(m => m.notes)
        .filter(n => !n.chord)
        .map(n => n.startTick)
    )
  ]
    .map(tick => tickToTimeMap.get(tick) ?? midi.header.ticksToSeconds(tick))
    .sort((a, b) => a - b);

  return { musicxml: musicXml, noteCursorTimes };
}
