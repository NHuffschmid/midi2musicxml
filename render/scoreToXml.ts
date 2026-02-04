
import { Score } from '../types';
import { sectionToXml } from './sectionToXml';

export function scoreToXml(score: Score): string {
    const identification = (score.composer || score.copyright)
        ? `<identification>\n${score.composer ? `    <creator type=\"composer\">${score.composer}</creator>\n` : ''}${score.copyright ? `<rights>${score.copyright}</rights>\n` : ''}  </identification>\n`
        : '';
    // Piano-specific: split the notes of the single section into treble and bass
    const section = score.sections[0];
    const trebleMeasures = section.measures.map(measure => ({
        notes: measure.notes.filter(note => note.octave >= 4 || note.isRest)
    }));
    const bassMeasures = section.measures.map(measure => ({
        notes: measure.notes.filter(note => note.octave < 4 || note.isRest)
    }));

    // Synchronize the number of notes per measure (add rests if necessary)
    function fillMeasure(measure: { notes: any[] }, targetLength: number, octave: number) {
        const filled = [...measure.notes];
        while (filled.length < targetLength) {
            filled.push({
                step: 'C',
                octave,
                duration: 1,
                type: 'quarter',
                isRest: true,
            });
        }
        return { notes: filled };
    }
    const maxNotesPerMeasure = Math.max(
        ...section.measures.map(m => m.notes.length)
    );
    const trebleMeasuresFilled = trebleMeasures.map(m => fillMeasure(m, maxNotesPerMeasure, 4));
    const bassMeasuresFilled = bassMeasures.map(m => fillMeasure(m, maxNotesPerMeasure, 2));

    // Create sections for both parts
    const trebleSection = {
        ...section,
        measures: trebleMeasuresFilled,
        attributes: {
            ...section.attributes,
            clef: { sign: 'G', line: 2 },
        },
    };
    const bassSection = {
        ...section,
        measures: bassMeasuresFilled,
        attributes: {
            ...section.attributes,
            clef: { sign: 'F', line: 4 },
        },
    };

    // Part list for both parts
    const partList = [
        `<score-part id=\"P1\">\n      <part-name> </part-name>\n    </score-part>`,
        `<score-part id=\"P2\">\n      <part-name> </part-name>\n    </score-part>`
    ].join('\n    ');
    const partsXml = [
        `<part id=\"P1\">\n${sectionToXml(trebleSection)}\n</part>`,
        `<part id=\"P2\">\n${sectionToXml(bassSection)}\n</part>`
    ].join('\n');
    return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<score-partwise version=\"3.1\">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${partList}\n  </part-list>\n${partsXml}\n</score-partwise>`;
}
