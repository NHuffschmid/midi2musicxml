import { MidiNote, MidiMeasure, Note, Measure, Section, Score, ClefType } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { scoreToXml } from './render/scoreToXml';
import { collectMidiNotes } from './utils/collectMidiNotes';
import { collectMidiMeasures } from './utils/collectMidiMeasures';
import { setBeams } from './utils/beamUtils';
import { analyzeSections } from './analysis/analyzeSections';

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
  const pulsesPerQuarterNote = midi.header.ppq || 12;
  //const notes: Note[] = collectAndSortNotes(midi, pulsesPerQuarterNote);
  //if (notes.length === 0) return '';
  const midiNotes: MidiNote[] = collectMidiNotes(midi);
  if (midiNotes.length === 0) return '';

  const midiMeasures: MidiMeasure[] = collectMidiMeasures(midiNotes);

  const sections: Section[] = analyzeSections(midi, midiMeasures);
  
  /*
  // Create section with notes (measures will be created during rendering)
  const section: Section = {
    notes,
    attributes: {
      time,
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };

  // Key detection
  const sectionKey = analyseKey(section);
  if (!section.attributes) section.attributes = {};
  section.attributes.key = sectionKey;
  console.log('Analyzed section key (fifths):', sectionKey);
  */

  const score: Score = {
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    pulsesPerQuarterNote,
    sections: [sections[0]],
  };

  // Render as MusicXML
  let musicXml = scoreToXml(score, options.clef ?? 'piano');

  // optimize and beautify MusicXML document
  musicXml = setBeams(musicXml);

  return musicXml;
}
