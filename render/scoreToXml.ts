
import { Score } from '../types';
import { systemToXml } from './systemToXml';

export function scoreToXml(score: Score): string {
    const identification = (score.composer || score.copyright)
        ? `<identification>\n${score.composer ? `    <creator type=\"composer\">${score.composer}</creator>\n` : ''}${score.copyright ? `<rights>${score.copyright}</rights>\n` : ''}  </identification>\n`
        : '';
    // part list for all voices
        const partList = score.system.voices.map((_, idx) => `<score-part id=\"P${idx+1}\">\n      <part-name> </part-name>\n    </score-part>`).join('\n    ');
    return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<score-partwise version=\"3.1\">\n  <work>\n    <work-title>${score.title || ''}</work-title>\n  </work>\n  ${identification}  <part-list>\n    ${partList}\n  </part-list>\n${systemToXml(score.system)}\n</score-partwise>`;
}
