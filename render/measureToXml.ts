import { Section, RenderMeasure } from '../types';
import { noteToXml } from './noteToXml';

export function measureToXml(measure: RenderMeasure, section: Section): string {
    // Check if this is the first measure by looking at the temporary measures array
    const measures = (section as any).measures as RenderMeasure[];
    const isFirstMeasure = measures && measures[0] === measure;
    
    let attrXml = '';
    let directionXml = '';
    let soundXml = '';
    if (isFirstMeasure) {
        const attr = section.attributes;
        const isPiano = (section as any).isPiano;
        attrXml = `<attributes>\n`;
        const score = (section as any).score;
        const pulsesPerQuarterNote = score?.pulsesPerQuarterNote || 12;
        attrXml += `  <divisions>${pulsesPerQuarterNote}</divisions>\n`;
        if (attr) {
            if (attr.key !== undefined) attrXml += `  <key>\n    <fifths>${attr.key}</fifths>\n  </key>\n`;
            if (attr.time) attrXml += `  <time>\n    <beats>${attr.time.beats}</beats>\n    <beat-type>${attr.time.beatType}</beat-type>\n  </time>\n`;
            // For piano mode, define both clefs
            if (isPiano) {
                attrXml += `  <staves>2</staves>\n`;
                attrXml += `  <clef number="1">\n    <sign>G</sign>\n    <line>2</line>\n  </clef>\n`;
                attrXml += `  <clef number="2">\n    <sign>F</sign>\n    <line>4</line>\n  </clef>\n`;
            } else if (attr.clef) {
                attrXml += `  <clef>\n    <sign>${attr.clef.sign}</sign>\n    <line>${attr.clef.line}</line>\n  </clef>\n`;
            }
        }
        attrXml += `</attributes>\n`;
        if (section.direction) {
            directionXml = `<direction placement=\"above\">\n  <direction-type>\n    <metronome>\n      <beat-unit>${section.direction.beatUnit || 'quarter'}</beat-unit>\n      <per-minute>${section.direction.tempo}</per-minute>\n    </metronome>\n  </direction-type>\n  <sound tempo=\"${section.direction.tempo}\"/>\n</direction>\n`;
        }
        soundXml = section.sound && !section.direction ? `<sound tempo=\"${section.sound.tempo}\"/>\n` : '';
    }
    return `<measure>\n${attrXml}${directionXml}${soundXml}` +
        measure.notes
            .map(noteToXml)
            .join('\n') +
        '\n</measure>';
}
