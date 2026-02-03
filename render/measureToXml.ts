import { Measure, Section } from '../types';
import { noteToXml } from './noteToXml';

export function measureToXml(measure: Measure, section: Section): string {
    const isFirstMeasure = section.measures[0] === measure;
    let attrXml = '';
    let directionXml = '';
    let soundXml = '';
    if (isFirstMeasure) {
        const attr = section.attributes;
        if (attr) {
            attrXml = `<attributes>\n`;
            if (attr.divisions) attrXml += `  <divisions>${attr.divisions}</divisions>\n`;
            if (attr.key !== undefined) attrXml += `  <key>\n    <fifths>${attr.key}</fifths>\n  </key>\n`;
            if (attr.time) attrXml += `  <time>\n    <beats>${attr.time.beats}</beats>\n    <beat-type>${attr.time.beatType}</beat-type>\n  </time>\n`;
            if (attr.clef) attrXml += `  <clef>\n    <sign>${attr.clef.sign}</sign>\n    <line>${attr.clef.line}</line>\n  </clef>\n`;
            attrXml += `</attributes>\n`;
        }
        if (section.direction) {
            directionXml = `<direction placement=\"above\">\n  <direction-type>\n    <metronome>\n      <beat-unit>${section.direction.beatUnit || 'quarter'}</beat-unit>\n      <per-minute>${section.direction.tempo}</per-minute>\n    </metronome>\n  </direction-type>\n  <sound tempo=\"${section.direction.tempo}\"/>\n</direction>\n`;
        }
        soundXml = section.sound && !section.direction ? `<sound tempo=\"${section.sound.tempo}\"/>\n` : '';
    }
    return `<measure>\n${attrXml}${directionXml}${soundXml}${measure.notes.map(noteToXml).join('\n')}\n</measure>`;
}
