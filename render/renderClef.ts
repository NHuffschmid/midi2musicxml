import { ClefType } from '../types';

/**
 * Generates MusicXML clef element(s) based on clef type.
 */
export function renderClef(clef: ClefType): string {
    if (clef === 'piano') {
        // Piano: two staves with treble and bass clef
        return `    <staves>2</staves>
    <clef number="1">
      <sign>G</sign>
      <line>2</line>
    </clef>
    <clef number="2">
      <sign>F</sign>
      <line>4</line>
    </clef>`;
    } else {
        // Single staff with appropriate clef
        let sign = 'G';
        let line = 2;
        if (clef === 'viola') {
            sign = 'C';
            line = 3;
        } else if (clef === 'cello') {
            sign = 'F';
            line = 4;
        }
        return `    <clef>
      <sign>${sign}</sign>
      <line>${line}</line>
    </clef>`;
    }
}
