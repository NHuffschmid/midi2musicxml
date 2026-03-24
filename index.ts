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

// Re-export types for backwards compatibility
export type { ClefType } from './types';

export interface Midi2MusicXMLOptions {
  title?: string;
  composer?: string;
  clef?: 'piano' | 'violin' | 'viola' | 'cello';
}

export interface Midi2MusicResult {
  musicxml: string;
  noteCursorTicks: number[];
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
  if (midiNotes.length === 0) return { musicxml: '', noteCursorTicks: [] };

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
    estimatedTempo: quantizedScore.estimatedBpm
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

  // Build sorted unique list of note startTicks for note-by-note cursor animation.
  // Non-chord primary notes only; deduplication handles multi-voice same-beat positions.
  const noteCursorTicks: number[] = [
    ...new Set(
      musicXMLDoc.scorePartwise.parts
        .flatMap(p => p.measures)
        .flatMap(m => m.notes)
        .filter(n => !n.chord)
        .map(n => n.startTick)
    )
  ].sort((a, b) => a - b);

  return { musicxml: musicXml, noteCursorTicks };
}
