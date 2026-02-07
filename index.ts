import { Note, Measure, Section, Score, ClefType } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeTempo } from './analysis/analyzeTempo';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { analyseKey } from './analysis/analyseKey';
import { scoreToXml } from './render/scoreToXml';
import { collectAndSortNotes } from './utils/collectAndSortNotes';
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

  // Helper function to create measures and fill with rests
  function createMeasures(noteList: Note[]): Measure[] {
    const measures: Measure[] = [];
    const CHORD_TICK_TOLERANCE = 20;
    // Mark chord notes in noteList
    let lastTick: number | null = null;
    for (let i = 0; i < noteList.length; i++) {
      const note = noteList[i];
      let isChord = false;
      if (
        lastTick !== null &&
        note.tick !== undefined &&
        Math.abs(note.tick - lastTick) <= CHORD_TICK_TOLERANCE
      ) {
        isChord = true;
      }
      lastTick = note.tick ?? lastTick;
      note.isChord = isChord;
    }
    // Split notes into measures
    for (let i = 0; i < noteList.length; i += 4) {
      const measureNotes = noteList.slice(i, i + 4);
      while (measureNotes.length < 4) {
        measureNotes.push({
          step: 'C',
          octave: 4,
          duration: 1,
          type: 'quarter',
          isRest: true,
        });
      }
      measures.push({ notes: measureNotes });
    }
    // If no notes are present, create at least one measure with rests
    if (measures.length === 0) {
      measures.push({
        notes: Array(4).fill(null).map(() => ({
          step: 'C',
          octave: 4,
          duration: 1,
          type: 'quarter',
          isRest: true,
        }))
      });
    }
    return measures;
  }

  // Create only one section with all notes
  const measures = createMeasures(notes);
  const section: Section = {
    measures,
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
