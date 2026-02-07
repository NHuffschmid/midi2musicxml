
import { Score, Section } from '../types';
import { sectionToXml } from './sectionToXml';
import { assignNotesToMeasures, detectChords, fillMeasuresWithRests, RenderNote } from './renderingUtils';

export function scoreToXml(score: Score, mode: 'piano' | 'violin' | 'viola' | 'cello' = 'piano'): string {
    if (!['piano', 'violin', 'viola', 'cello'].includes(mode)) {
        throw new Error(`Invalid mode: ${mode}`);
    }
    const identification = (score.composer || score.copyright)
        ? `<identification>\n${score.composer ? `    <creator type=\"composer\">${score.composer}</creator>\n` : ''}${score.copyright ? `<rights>${score.copyright}</rights>\n` : ''}  </identification>\n`
        : '';
    const section = score.sections[0];
    const timeSignature = section.attributes?.time ?? { beats: 4, beatType: 4 };

    if (mode === 'piano') {
        // Piano: split into treble and bass
        const trebleNotes = section.notes.filter(note => note.octave >= 4);
        const bassNotes = section.notes.filter(note => note.octave < 4);
        
        // Create measures for each part
        const trebleMeasures = assignNotesToMeasures(trebleNotes, timeSignature);
        const bassMeasures = assignNotesToMeasures(bassNotes, timeSignature);
        
        // Detect chords in each part
        for (const measure of trebleMeasures) {
            measure.notes = detectChords(measure.notes);
        }
        for (const measure of bassMeasures) {
            measure.notes = detectChords(measure.notes);
        }
        
        // Fill with rests
        const trebleMeasuresFilled = fillMeasuresWithRests(trebleMeasures, timeSignature, 4);
        const bassMeasuresFilled = fillMeasuresWithRests(bassMeasures, timeSignature, 2);
        
        const trebleSection: Section = {
            ...section,
            notes: [], // Will use measures instead
            attributes: {
                ...section.attributes,
                clef: { sign: 'G', line: 2 },
            },
        };
        (trebleSection as any).measures = trebleMeasuresFilled;
        
        const bassSection: Section = {
            ...section,
            notes: [], // Will use measures instead
            attributes: {
                ...section.attributes,
                clef: { sign: 'F', line: 4 },
            },
        };
        (bassSection as any).measures = bassMeasuresFilled;
        
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

    // Single part for violin, viola, cello
    let clef;
    const partName = ' ';
    if (mode === 'violin') {
        clef = { sign: 'G', line: 2 };
    } else if (mode === 'viola') {
        clef = { sign: 'C', line: 3 };
    } else if (mode === 'cello') {
        clef = { sign: 'F', line: 4 };
    }
    
    // Create measures and detect chords
    const measures = assignNotesToMeasures(section.notes, timeSignature);
    for (const measure of measures) {
        measure.notes = detectChords(measure.notes);
    }
    const measuresFilled = fillMeasuresWithRests(measures, timeSignature, 4);
    
    const singleSection: Section = {
        ...section,
        notes: [], // Will use measures instead
        attributes: {
            ...section.attributes,
            clef,
        },
    };
    (singleSection as any).measures = measuresFilled;
    
    const partList = `<score-part id=\"P1\">\n      <part-name>${partName}</part-name>\n    </score-part>`;
    const partsXml = `<part id=\"P1\">\n${sectionToXml(singleSection)}\n</part>`;
    return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<score-partwise version=\"3.1\">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${partList}\n  </part-list>\n${partsXml}\n</score-partwise>`;
}
