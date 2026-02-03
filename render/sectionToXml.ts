import { Section } from '../types';
import { measureToXml } from './measureToXml';

export function sectionToXml(section: Section): string {
    return `${section.measures.map(measure => measureToXml(measure, section))}`;
}
