import { ClefType, Section, RenderMeasure } from '../types';
import { measureToXml } from './measureToXml';

export function sectionToXml(section: Section, pulsesPerQuarterNote: number, clef: ClefType): string {
    return section.measures.map(measure => measureToXml(measure, section, pulsesPerQuarterNote, clef)).join('\n');
}
