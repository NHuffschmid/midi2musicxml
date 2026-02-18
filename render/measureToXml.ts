import { ClefType, Section, MidiMeasure } from '../types';
import { midiNoteToPitch } from '../utils/midiNoteToPitch';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

// Tolerance in ticks for detecting chords (notes played at nearly the same time)
const CHORD_TICK_TOLERANCE = 20;
// Tolerance for note duration differences to be considered same chord
const CHORD_DURATION_TOLERANCE = 5;

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

    // Mark notes that are part of a chord
    const noteChordInfo = sortedNotes.map((note, index) => {
        let isChordNote = false;
        const currentStaff = getStaffForNote(note.midi, clef);
        
        // Check if this note is part of a chord by comparing with previous notes
        for (let i = index - 1; i >= 0; i--) {
            const prevNote = sortedNotes[i];
            const prevStaff = getStaffForNote(prevNote.midi, clef);
            const tickDiff = Math.abs(note.ticks - prevNote.ticks);
            const durationDiff = Math.abs(note.durationTicks - prevNote.durationTicks);
            
            // Notes are in a chord if they:
            // - belong to the same staff
            // - start within tolerance
            // - have similar duration (within tolerance)
            if (currentStaff === prevStaff && 
                tickDiff <= CHORD_TICK_TOLERANCE && 
                durationDiff <= CHORD_DURATION_TOLERANCE) {
                isChordNote = true;
                break;
            }
            
            // Stop checking if we're too far from the current note's start time
            if (note.ticks - prevNote.ticks > CHORD_TICK_TOLERANCE) {
                break;
            }
        }
        
        return { note, isChordNote };
    });

    // Convert all MIDI notes in this measure to MusicXML
    const notesXml = noteChordInfo.map(({ note: midiNote, isChordNote }) => {
        const { step, alter, octave } = midiNoteToPitch(midiNote.midi);
        const { duration, type, dots } = midiTicksToXmlDurationType(
            midiNote.durationTicks,
            pulsesPerQuarterNote
        );

        const chordXml = isChordNote ? '\n    <chord/>' : '';
        const alterXml = alter !== undefined && alter !== 0
            ? `    <alter>${alter}</alter>\n`
            : '';
        const dotXml = dots > 0 ? '\n  ' + '<dot/>'.repeat(dots) : '';

        // For piano mode, assign staff based on pitch (C4 = MIDI 60)
        let staffXml = '';
        if (clef === 'piano') {
            const staffNum = midiNote.midi >= 60 ? 1 : 2; // C4 and above → staff 1, below C4 → staff 2
            staffXml = `\n    <staff>${staffNum}</staff>`;
        }

        return `  <note>${chordXml}
    <pitch>
      <step>${step}</step>
${alterXml}      <octave>${octave}</octave>
    </pitch>
    <duration>${duration}</duration>
    <type>${type}</type>${dotXml}${staffXml}
  </note>`;
    }).join('\n');

    // Combine all parts
    const measureContent = [attrXml, directionXml, notesXml]
        .filter(s => s.length > 0)
        .join('\n');

    const measureNumber = measures.indexOf(measure) + 1;

    return `<measure number="${measureNumber}">
${measureContent}
</measure>`;
}
