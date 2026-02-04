import { Note, Measure, Section, Score } from './types';
import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeTempo } from './analysis/analyzeTempo';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { analyseKey } from './analysis/analyseKey';
import { scoreToXml } from './render/scoreToXml';
import { collectAndSortNotes } from './utils/collectAndSortNotes';

export function midi2MusicXML(
  midi: Midi,
  title?: string,
  composer?: string
): string {

  const scoreTitle = title ?? analyzeTitle(midi);
  const scoreComposer = composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);
  const tempo = analyzeTempo(midi);

  // Collect and sort all notes from all tracks
  const notes: Note[] = collectAndSortNotes(midi);
  if (notes.length === 0) return '';

  // Helper function to create measures and fill with rests
  function createMeasures(noteList: Note[]): Measure[] {
    const measures: Measure[] = [];
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
      divisions: 1,
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
    sections: [section],
  };

  // Render as MusicXML
  return scoreToXml(score);
}
