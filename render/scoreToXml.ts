import { ClefType, ClefTypes, Score } from '../types';
import { sectionToXml } from './sectionToXml';

export function scoreToXml(score: Score, clef: ClefType): string {

    if (!ClefTypes.includes(clef)) {
        console.error(`Invalid clef type: ${clef}`);
    }

    const identification = (score.composer || score.copyright)
        ? `<identification>\n${score.composer ? `    <creator type=\"composer\">${score.composer}</creator>\n` : ''}${score.copyright ? `<rights>${score.copyright}</rights>\n` : ''}  </identification>\n`
        : '';

    const partList = `<score-part id=\"P1\">\n      <part-name> </part-name>\n    </score-part>`;
    const partsXml = `<part id="P1">\n${sectionToXml(score.sections[0], score.pulsesPerQuarterNote, clef)}\n</part>`;
    return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<score-partwise version=\"3.1\">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${partList}\n  </part-list>\n${partsXml}\n</score-partwise>`;
}
