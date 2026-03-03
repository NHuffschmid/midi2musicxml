import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { collectMidiNotes } from './utils/collectMidiNotes';
import { midiToTemporal } from './transforms/midiToTemporal';
import { temporalToMusical } from './transforms/temporalToMusical';
import { musicalToNotation } from './transforms/musicalToNotation';
import { notationToLayout, InstrumentType } from './transforms/notationToLayout';
import { layoutToMusicXML } from './transforms/layoutToMusicXML';
import { musicXMLToString } from './transforms/musicXMLToString';
import {
  dumpTemporalModel, prettyPrintTemporalModel,
  dumpMusicalModel, prettyPrintMusicalModel,
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

/**
 * Convert MIDI to MusicXML using 7-stage pipeline architecture:
 * 
 * Stage 1: MIDI (tonejs) - Raw MIDI data
 * Stage 2: TemporalModel - Time-based structure (sections, measures)
 * Stage 3: MusicalModel - Musical semantics (voices, notes, rests)
 * Stage 4: NotationModel - Notation decisions (beaming, stems)
 * Stage 5: LayoutModel - Layout decisions (staves, systems)
 * Stage 6: MusicXMLModel - MusicXML DOM structure
 * Stage 7: XML String - Serialized output
 */
export function midi2MusicXML(
  midi: Midi,
  options: Midi2MusicXMLOptions = {}
): string {

  // Extract metadata
  const scoreTitle = options.title ?? analyzeTitle(midi);
  const scoreComposer = options.composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);
  const pulsesPerQuarterNote = midi.header.ppq || 480;

  // Stage 1: Collect MIDI notes
  const midiNotes: MidiNote[] = collectMidiNotes(midi);
  if (midiNotes.length === 0) return '';

  // Stage 2: MIDI → TemporalModel
  const temporalScore = midiToTemporal(midiNotes, midi, {
    title: scoreTitle,
    composer: scoreComposer,
    copyright
  });
  const temporalDump = dumpTemporalModel(temporalScore);
  const temporalPrettyPrint = prettyPrintTemporalModel(temporalScore);

  // Stage 3: TemporalModel → MusicalModel
  const musicalScore = temporalToMusical(temporalScore);
  const musicalDump = dumpMusicalModel(musicalScore);
  const musicalPrettyPrint = prettyPrintMusicalModel(musicalScore);

  // Stage 4: MusicalModel → NotationModel
  const notationScore = musicalToNotation(musicalScore, {
    pulsesPerQuarterNote
  });
  const notationDump = dumpNotationModel(notationScore);
  const notationPrettyPrint = prettyPrintNotationModel(notationScore);

  // Stage 5: NotationModel → LayoutModel
  const instrument: InstrumentType = options.clef ?? 'piano';
  const layoutScore = notationToLayout(notationScore, {
    instrument
  });
  const layoutDump = dumpLayoutModel(layoutScore);
  const layoutPrettyPrint = prettyPrintLayoutModel(layoutScore);

  // Stage 6: LayoutModel → MusicXMLModel
  const musicXMLDoc = layoutToMusicXML(layoutScore, {
    divisions: pulsesPerQuarterNote
  });
  const musicXMLDump = dumpMusicXMLModel(musicXMLDoc);
  const musicXMLPrettyPrint = prettyPrintMusicXMLModel(musicXMLDoc);

  // Stage 7: MusicXMLModel → XML String
  let musicXml = musicXMLToString(musicXMLDoc);

  // Format and beautify XML
  musicXml = xmlFormatter(musicXml, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n'
  });

  return musicXml;
}
