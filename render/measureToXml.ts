import { ClefType, Section, MidiMeasure } from '../types';
import { midiNoteToPitch } from '../utils/midiNoteToPitch';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

// Tolerance in ticks for detecting chords (notes played at nearly the same time)
const CHORD_TICK_TOLERANCE = 20;

// Helper function to determine staff for a note
function getStaffForNote(midiNote: number, clef: ClefType): number {
    if (clef === 'piano') {
        return midiNote >= 60 ? 1 : 2; // C4 and above → staff 1, below C4 → staff 2
    }
    return 1; // Single staff for other clefs
}

export function measureToXml(
    measure: MidiMeasure,
    section: Section,
    pulsesPerQuarterNote: number,
    clef: ClefType)
    : string {

    // Check if this is the first measure by looking at the temporary measures array
    const measures = section.measures;
    const isFirstMeasure = measures && measures[0] === measure;

    let attrXml = '';
    let directionXml = '';

    if (isFirstMeasure) {

        // Get section properties
        const key = section.key;
        const time = section.time;
        const tempo = section.tempo;

        // Parse key format "2M" or "2m" → fifths and mode
        const keyMatch = key.match(/^([+-]?\d+)([Mm])$/);
        const fifths = keyMatch ? parseInt(keyMatch[1]) : 0;
        const mode = keyMatch && keyMatch[2] === 'm' ? 'minor' : 'major';

        // divisions = pulsesPerQuarterNote (duration units per quarter note)
        const divisions = pulsesPerQuarterNote;

        // Build clef XML based on clef type
        let clefXml = '';
        if (clef === 'piano') {
            // Piano: two staves with treble and bass clef
            clefXml = `    <staves>2</staves>
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
            clefXml = `    <clef>
      <sign>${sign}</sign>
      <line>${line}</line>
    </clef>`;
        }

        attrXml = `  <attributes>
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

        if (tempo !== undefined) {
            directionXml = `  <direction placement="above">
    <direction-type>
      <metronome>
        <beat-unit>quarter</beat-unit>
        <per-minute>${tempo}</per-minute>
      </metronome>
    </direction-type>
  </direction>`;
        }
    }

    // Sort notes by ticks to ensure proper ordering
    const sortedNotes = [...measure.notes].sort((a, b) => a.ticks - b.ticks);

    // Convert all notes to get their MusicXML properties
    const notesWithMusicXmlProps = sortedNotes.map(midiNote => {
        const { step, alter, octave } = midiNoteToPitch(midiNote.midi);
        const { duration, type, dots } = midiTicksToXmlDurationType(
            midiNote.durationTicks,
            pulsesPerQuarterNote
        );
        const staff = getStaffForNote(midiNote.midi, clef);
        
        return {
            midiNote,
            step,
            alter,
            octave,
            duration,
            type,
            dots,
            staff
        };
    });

    type NotePropsType = typeof notesWithMusicXmlProps[number];

    // Group notes by start time (within tolerance)
    const timeGroups: NotePropsType[][] = [];
    let currentGroup: NotePropsType[] = [];
    
    for (let i = 0; i < notesWithMusicXmlProps.length; i++) {
        const noteProps = notesWithMusicXmlProps[i];
        
        if (currentGroup.length === 0) {
            currentGroup.push(noteProps);
        } else {
            const firstInGroup = currentGroup[0];
            const tickDiff = Math.abs(noteProps.midiNote.ticks - firstInGroup.midiNote.ticks);
            
            if (tickDiff <= CHORD_TICK_TOLERANCE) {
                // Same time group
                currentGroup.push(noteProps);
            } else {
                // New time group
                timeGroups.push(currentGroup);
                currentGroup = [noteProps];
            }
        }
    }
    if (currentGroup.length > 0) {
        timeGroups.push(currentGroup);
    }

    // Process each time group
    const xmlElements: string[] = [];
    
    for (const group of timeGroups) {
        // Sort group: by duration (ascending), then staff, then pitch (descending)
        // This ensures the longest duration note is written last
        const sortedGroup = [...group].sort((a, b) => {
            if (a.duration !== b.duration) return a.duration - b.duration; // Shortest first, longest last
            if (a.staff !== b.staff) return a.staff - b.staff;
            return b.midiNote.midi - a.midiNote.midi; // Higher notes first
        });
        
        // Mark notes that are part of a chord (same staff, same type/dots)
        const notesWithChordInfo = sortedGroup.map((noteProps, index) => {
            let isChordNote = false;
            
            // Check if this note is part of a chord with any previous note in the same group
            for (let i = 0; i < index; i++) {
                const prevNote = sortedGroup[i];
                
                if (noteProps.staff === prevNote.staff && 
                    noteProps.type === prevNote.type &&
                    noteProps.dots === prevNote.dots) {
                    isChordNote = true;
                    break;
                }
            }
            
            return { ...noteProps, isChordNote };
        });
        
        // Write notes with backup between them
        notesWithChordInfo.forEach((noteProps, index) => {
            // Write the note
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
            
            xmlElements.push(`  <note>${chordXml}
    <pitch>
      <step>${step}</step>
${alterXml}      <octave>${octave}</octave>
    </pitch>
    <duration>${duration}</duration>
    <type>${type}</type>${dotXml}${staffXml}
  </note>`);
            
            // Add backup after this note to return to the start of the group
            // But NOT if the next note is a chord (chord doesn't advance time)
            // And NOT if this is the last note in the group
            const nextNoteIsChord = index < notesWithChordInfo.length - 1 && notesWithChordInfo[index + 1].isChordNote;
            
            if (index < notesWithChordInfo.length - 1 && !nextNoteIsChord) {
                xmlElements.push(`  <backup>\n    <duration>${duration}</duration>\n  </backup>`);
            }
        });
    }
    
    const notesXml = xmlElements.join('\n');

    // Combine all parts
    const measureContent = [attrXml, directionXml, notesXml]
        .filter(s => s.length > 0)
        .join('\n');

    const measureNumber = measures.indexOf(measure) + 1;

    return `<measure number="${measureNumber}">
${measureContent}
</measure>`;
}
