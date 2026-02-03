import { Note } from '../types';

export function noteToXml(note: Note): string {
    if (note.isRest) {
        return `<note>\n  <rest/>\n  <duration>${note.duration}</duration>\n  <type>${note.type}</type>\n</note>`;
    }
    return `<note>\n  <pitch>\n    <step>${note.step}</step>\n    ${note.alter !== undefined ? `<alter>${note.alter}</alter>` : ''}\n    <octave>${note.octave}</octave>\n  </pitch>\n  <duration>${note.duration}</duration>\n  <type>${note.type}</type>\n</note>`;
}
