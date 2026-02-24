import { Section, ClefType } from '../types';
import { renderClef } from './renderClef';

/**
 * Generates MusicXML attributes element for the first measure.
 */
export function renderAttributes(
    section: Section,
    pulsesPerQuarterNote: number,
    clef: ClefType
): string {
    const key = section.key;
    const time = section.time;

    // Parse key format "2M" or "2m" → fifths and mode
    const keyMatch = key.match(/^([+-]?\d+)([Mm])$/);
    const fifths = keyMatch ? parseInt(keyMatch[1]) : 0;
    const mode = keyMatch && keyMatch[2] === 'm' ? 'minor' : 'major';

    // divisions = pulsesPerQuarterNote (duration units per quarter note)
    const divisions = pulsesPerQuarterNote;

    const clefXml = renderClef(clef);

    return `  <attributes>
    <divisions>${divisions}</divisions>
    <key>
      <fifths>${fifths}</fifths>
      <mode>${mode}</mode>
    </key>
    <time>
      <beats>${time.beats}</beats>
      <beat-type>${time.beatType}</beat-type>
    </time>
${clefXml}
  </attributes>`;
}
