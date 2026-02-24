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

export interface Midi2MusicXMLOptions {
  title?: string;
  composer?: string;
  clef?: ClefType;
  /** Format the output XML. Requires the optional `xml-formatter` package. Defaults to `true` if the package is available, `false` otherwise. */
  format?: boolean;
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

  if (options.format !== false) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const xmlFormatter = require('xml-formatter');
      // Support both CJS (function) and ESM-interop (module.default) formats
      const formatter: (xml: string, opts: object) => string =
        typeof xmlFormatter === 'function' ? xmlFormatter : xmlFormatter.default;
      musicXml = formatter(musicXml, {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n'
      });
    } catch {
      // xml-formatter is optional; skip formatting if not installed
    }
  }

  return musicXml;
}
