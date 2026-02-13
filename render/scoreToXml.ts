import { Score, Section } from '../types';
import { sectionToXml } from './sectionToXml';
import { assignNotesToMeasures, detectChords, fillMeasuresWithRests } from '../utils/renderingUtils';

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
        // Piano: one part with two staves (treble and bass)
        const trebleNotes = section.notes.filter(note => note.octave >= 4);
        const bassNotes = section.notes.filter(note => note.octave < 4);
        
        // Create measures for each staff (tick-based)
        const trebleMeasures = assignNotesToMeasures(trebleNotes, timeSignature, score.pulsesPerQuarterNote);
        const bassMeasures = assignNotesToMeasures(bassNotes, timeSignature, score.pulsesPerQuarterNote);
        
        // Ensure both staves have the same number of measures
        const maxMeasures = Math.max(trebleMeasures.length, bassMeasures.length);
        while (trebleMeasures.length < maxMeasures) {
            trebleMeasures.push({ notes: [] });
        }
        while (bassMeasures.length < maxMeasures) {
            bassMeasures.push({ notes: [] });
        }
        
        // Detect chords in each staff
        for (const measure of trebleMeasures) {
            measure.notes = detectChords(measure.notes);
        }
        for (const measure of bassMeasures) {
            measure.notes = detectChords(measure.notes);
        }
        
        // Fill with rests
        const trebleMeasuresFilled = fillMeasuresWithRests(trebleMeasures, timeSignature, 4);
        const bassMeasuresFilled = fillMeasuresWithRests(bassMeasures, timeSignature, 2);
        
        // Assign staff numbers to notes
        for (const measure of trebleMeasuresFilled) {
            for (const note of measure.notes) {
                note.staff = 1;
            }
        }
        for (const measure of bassMeasuresFilled) {
            for (const note of measure.notes) {
                note.staff = 2;
            }
        }
        
        // Merge measures from both staves
        const mergedMeasures = trebleMeasuresFilled.map((trebleMeasure, index) => ({
            notes: [...trebleMeasure.notes, ...bassMeasuresFilled[index].notes]
        }));
        
        const pianoSection: Section = {
            ...section,
            notes: [], // Will use measures instead
            attributes: {
                ...section.attributes,
                // Clefs will be handled in measureToXml for both staves
            },
        };
        (pianoSection as any).measures = mergedMeasures;
        (pianoSection as any).score = score;
        (pianoSection as any).isPiano = true; // Flag for measureToXml
        
        const partList = `<score-part id=\"P1\">\n      <part-name> </part-name>\n    </score-part>`;
        const partsXml = `<part id=\"P1\">\n${sectionToXml(pianoSection)}\n</part>`;
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
    const measures = assignNotesToMeasures(section.notes, timeSignature, score.pulsesPerQuarterNote);
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
    (singleSection as any).score = score;
    
    const partList = `<score-part id=\"P1\">\n      <part-name>${partName}</part-name>\n    </score-part>`;
    const partsXml = `<part id=\"P1\">\n${sectionToXml(singleSection)}\n</part>`;
    return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<score-partwise version=\"3.1\">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${partList}\n  </part-list>\n${partsXml}\n</score-partwise>`;
}
