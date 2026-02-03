import { Note, Measure, Section, System, Voice, Score } from './types';
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

  // Split notes into treble and bass voice
  const trebleNotes: Note[] = [];
  const bassNotes: Note[] = [];
  for (const note of notes) {
    if (note.octave < 4) {
      bassNotes.push(note);
    } else {
      trebleNotes.push(note);
    }
  }

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

  let trebleMeasures = createMeasures(trebleNotes);
  let bassMeasures = createMeasures(bassNotes.map(n => ({ ...n, octave: n.octave })));

  // Synchronize measure count for both voices
  const maxMeasures = Math.max(trebleMeasures.length, bassMeasures.length);
  const fillRest = (octave: number) => ({
    step: 'C',
    octave,
    duration: 1,
    type: 'quarter',
    isRest: true,
  });
  while (trebleMeasures.length < maxMeasures) {
    trebleMeasures.push({ notes: Array(4).fill(null).map(() => fillRest(4)) });
  }
  while (bassMeasures.length < maxMeasures) {
    bassMeasures.push({ notes: Array(4).fill(null).map(() => fillRest(2)) });
  }

  // section for both voices
  const trebleSection: Section = {
    measures: trebleMeasures,
    attributes: {
      divisions: 1,
      time: { beats: 4, beatType: 4 },
      key: undefined,
      clef: { sign: 'G', line: 2 },
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };
  const bassSection: Section = {
    measures: bassMeasures,
    attributes: {
      divisions: 1,
      time: { beats: 4, beatType: 4 },
      key: undefined,
      clef: { sign: 'F', line: 4 },
    },
    direction: tempo ? { tempo, beatUnit: 'quarter' } : undefined,
    sound: tempo ? { tempo } : undefined,
  };

  // Key detection (updates trebleSection.attributes.key)
  const sectionKey = analyseKey(trebleSection);
  if (!trebleSection.attributes) trebleSection.attributes = {};
  trebleSection.attributes.key = sectionKey;
  if (!bassSection.attributes) bassSection.attributes = {};
  bassSection.attributes.key = sectionKey;
  console.log('Analyzed section key (fifths):', sectionKey);

  const trebleVoice: Voice = {
    clef: 'treble',
    sections: [trebleSection],
  };
  const bassVoice: Voice = {
    clef: 'bass',
    sections: [bassSection],
  };
  const system: System = {
    voices: [trebleVoice, bassVoice],
  };

  const score: Score = {
    title: scoreTitle,
    composer: scoreComposer,
    copyright,
    system,
  };

  // Render as MusicXML
  return scoreToXml(score);
}
