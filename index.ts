import { MidiNote, MidiMeasure, Section, Score, ClefType } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { scoreToXml } from './render/scoreToXml';
import { collectMidiNotes } from './utils/collectMidiNotes';
import { collectMidiMeasures } from './utils/collectMidiMeasures';
import { setBeams } from './utils/beamUtils';
import { handleTempo } from './utils/handleTempo';
import { analyzeSections } from './analysis/analyzeSections';
import xmlFormatter from 'xml-formatter';

export interface Midi2MusicXMLOptions {
  title?: string;
  composer?: string;
  clef?: ClefType;
}

export function midi2MusicXML(
  midi: Midi,
  options: Midi2MusicXMLOptions = {}
): string {

  const scoreTitle = options.title ?? analyzeTitle(midi);
  const scoreComposer = options.composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);

  // Collect and sort all notes from all tracks
  const pulsesPerQuarterNote = midi.header.ppq || 480;
  const midiNotes: MidiNote[] = collectMidiNotes(midi);
  if (midiNotes.length === 0) return '';

  const midiMeasures: MidiMeasure[] = collectMidiMeasures(midiNotes);

  const sections: Section[] = analyzeSections(midi, midiMeasures);

  const score: Score = {
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    pulsesPerQuarterNote,
    sections: [sections[0]],
  };

  // Render as MusicXML
  let musicXml = scoreToXml(score, options.clef ?? 'piano');

  // optimize, beautify and finalize MusicXML document
  musicXml = setBeams(musicXml);
  musicXml = handleTempo(musicXml);

  musicXml = xmlFormatter(musicXml, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n'
  });

  return musicXml;
}
