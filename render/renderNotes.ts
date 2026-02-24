import { ClefType } from '../types';
import { NoteProperties } from './measureToXml';

/**
 * Renders a single note to MusicXML.
 */
export function renderNoteXml(
    noteProps: NoteProperties,
    clef: ClefType
): string {
    const { step, alter, octave, duration, type, dots, staff, isChordNote, tempo } = noteProps;
    
    const chordXml = isChordNote ? '\n    <chord/>' : '';
    const tempoXml = tempo !== undefined ? `\n    <x-tempo bpm="${tempo}"/>` : '';
    const alterXml = alter !== undefined && alter !== 0
        ? `    <alter>${alter}</alter>\n`
        : '';
    const dotXml = dots > 0 ? '\n  ' + '<dot/>'.repeat(dots) : '';
    
    let staffXml = '';
    if (clef === 'piano') {
        staffXml = `\n    <staff>${staff}</staff>`;
    }
    
    return `  <note>${chordXml}${tempoXml}
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
 * Renders a direction element with tempo text for debugging.
 */
export function renderTempoDirection(tempo: number): string {
    return `  <direction placement="above">
    <direction-type>
      <words font-size="8pt" color="#888888">${tempo.toFixed(1)}</words>
    </direction-type>
    <sound tempo="${tempo}"/>
  </direction>`;
}

/**
 * Renders all notes in a time group to MusicXML with proper backup elements.
 */
export function renderTimeGroup(
    notes: NoteProperties[],
    clef: ClefType
): string[] {
    const xmlElements: string[] = [];
    
    notes.forEach((noteProps, index) => {
        // Add tempo direction for debugging (only on non-chord notes)
        /*
        if (noteProps.tempo !== undefined && !noteProps.isChordNote) {
            xmlElements.push(renderTempoDirection(noteProps.tempo));
        }
        */
       
        // Write the note
        xmlElements.push(renderNoteXml(noteProps, clef));
        
        // Add backup after this note to return to the start of the group
        // But NOT if the next note is a chord (chord doesn't advance time)
        // And NOT if this is the last note in the group
        const nextNoteIsChord = index < notes.length - 1 
            && notes[index + 1].isChordNote;
        
        if (index < notes.length - 1 && !nextNoteIsChord) {
            xmlElements.push(renderBackupXml(noteProps.duration));
        }
    });
    
    return xmlElements;
}
