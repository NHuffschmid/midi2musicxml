import { RenderNote } from './renderingUtils';

export function noteToXml(note: RenderNote): string {
    const dotXml = note.dots && note.dots > 0 ? '\n  ' + '<dot/>'.repeat(note.dots) : '';
    const chordXml = note.isChord ? '\n  <chord/>' : '';
    if (note.isRest) {
        return `<note>\n  <rest/>\n  <duration>${note.duration}</duration>\n  <type>${note.type}</type>${dotXml}\n</note>`;
    }
    return `<note>${chordXml}\n  <pitch>\n    <step>${note.step}</step>\n    ${note.alter !== undefined ? `<alter>${note.alter}</alter>` : ''}\n    <octave>${note.octave}</octave>\n  </pitch>\n  <duration>${note.duration}</duration>\n  <type>${note.type}</type>${dotXml}\n</note>`;
}
