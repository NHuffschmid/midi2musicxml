import { ClefType } from '../types';
import { NoteWithChordInfo } from './measureToXml';

/**
 * Renders a single note to MusicXML.
 */
export function renderNoteXml(
    noteProps: NoteWithChordInfo,
    clef: ClefType
): string {
    const { step, alter, octave, duration, type, dots, staff, isChordNote } = noteProps;
    
    const chordXml = isChordNote ? '\n    <chord/>' : '';
    const alterXml = alter !== undefined && alter !== 0
        ? `    <alter>${alter}</alter>\n`
        : '';
    const dotXml = dots > 0 ? '\n  ' + '<dot/>'.repeat(dots) : '';
    
    let staffXml = '';
    if (clef === 'piano') {
        staffXml = `\n    <staff>${staff}</staff>`;
    }
    
    return `  <note>${chordXml}
    <pitch>
      <step>${step}</step>
${alterXml}      <octave>${octave}</octave>
    </pitch>
    <duration>${duration}</duration>
    <type>${type}</type>${dotXml}${staffXml}
  </note>`;
}

/**
 * Renders a backup element to MusicXML.
 */
export function renderBackupXml(duration: number): string {
    return `  <backup>\n    <duration>${duration}</duration>\n  </backup>`;
}

/**
 * Renders all notes in a time group to MusicXML with proper backup elements.
 */
export function renderTimeGroup(
    notesWithChordInfo: NoteWithChordInfo[],
    clef: ClefType
): string[] {
    const xmlElements: string[] = [];
    
    notesWithChordInfo.forEach((noteProps, index) => {
        // Write the note
        xmlElements.push(renderNoteXml(noteProps, clef));
        
        // Add backup after this note to return to the start of the group
        // But NOT if the next note is a chord (chord doesn't advance time)
        // And NOT if this is the last note in the group
        const nextNoteIsChord = index < notesWithChordInfo.length - 1 
            && notesWithChordInfo[index + 1].isChordNote;
        
        if (index < notesWithChordInfo.length - 1 && !nextNoteIsChord) {
            xmlElements.push(renderBackupXml(noteProps.duration));
        }
    });
    
    return xmlElements;
}
