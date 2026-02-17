import { Section, RenderMeasure } from '../types';
import { measureToXml } from './measureToXml';

export function sectionToXml(section: Section, pulsesPerQuarterNote: number): string {
    /*
    // section now has a temporary measures property added by scoreToXml
    const measures = (section as any).measures as RenderMeasure[];
    if (!measures) {
        throw new Error('Section must have measures property for rendering');
    }
    */
    return section.measures.map(measure => measureToXml(measure, section, pulsesPerQuarterNote)).join('\n');
}
