import { MidiNote, Note, Measure, Section, Score, ClefType } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeTempo } from './analysis/analyzeTempo';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { analyseKey } from './analysis/analyseKey';
import { scoreToXml } from './render/scoreToXml';
import { collectAndSortNotes } from './utils/collectAndSortNotes';
import { collectMidiNotes } from './utils/collectMidiNotes';
import { setBeams } from './utils/beamUtils';

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
  const tempo = analyzeTempo(midi);

  // Collect and sort all notes from all tracks
  const pulsesPerQuarterNote = midi.header.ppq || 12;
  const notes: Note[] = collectAndSortNotes(midi, pulsesPerQuarterNote);
  if (notes.length === 0) return '';
  const midiNotes: MidiNote[] = collectMidiNotes(midi);
  if (midiNotes.length === 0) return '';

  // Create section with notes (measures will be created during rendering)
  const section: Section = {
    notes,
    attributes: {
      time: { beats: 4, beatType: 4 },
      key: undefined,
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };

  // Key detection
  const sectionKey = analyseKey(section);
  if (!section.attributes) section.attributes = {};
  section.attributes.key = sectionKey;
  console.log('Analyzed section key (fifths):', sectionKey);

  const score: Score = {
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    pulsesPerQuarterNote,
    sections: [section],
  };

  // Render as MusicXML
  let musicXml = scoreToXml(score, options.clef ?? 'piano');

  // optimize and beautify MusicXML document
  musicXml = setBeams(musicXml);

  return musicXml;
}
