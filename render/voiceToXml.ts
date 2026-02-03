import { Voice } from '../types';
import { sectionToXml } from './sectionToXml';

export function voiceToXml(voice: Voice, idx: number): string {
    const partId = `P${idx + 1}`;
    return `<part id="${partId}">
${voice.sections.map(section => sectionToXml(section)).join('\n')}
</part>`;
}
