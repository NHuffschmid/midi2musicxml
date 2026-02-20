import { ClefType, MidiNote, Section, MidiMeasure } from '../types';
import { renderAttributes } from './renderAttributes';
import { renderDirection } from './renderDirection';
import { renderTimeGroup } from './renderNotes';
import { midiNoteToPitch } from '../utils/midiNoteToPitch';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

// Tolerance in ticks for detecting chords (notes played at nearly the same time)
const CHORD_TICK_TOLERANCE = 20;

export interface NoteProperties {
    midiNote: MidiNote;
    step: string;
    alter: number | undefined;
    octave: number;
    duration: number;
    type: string;
    dots: number;
    staff: number;
}

export interface NoteWithChordInfo extends NoteProperties {
    isChordNote: boolean;
}

/**
 * Determines staff assignment for a note based on pitch and clef.
 */
export function getStaffForNote(midiNote: number, clef: ClefType): number {
    if (clef === 'piano') {
        return midiNote >= 60 ? 1 : 2; // C4 and above → staff 1, below C4 → staff 2
    }
    return 1; // Single staff for other clefs
}

/**
 * Sorts notes in a time group and marks which notes are part of chords.
 * Notes are sorted by duration (ascending), then staff, then pitch (descending).
 * This ensures the longest duration note is written last.
 */
function detectChordsInGroup(group: NoteProperties[]): NoteWithChordInfo[] {
    // Sort group: by duration (ascending), then staff, then pitch (descending)
    const sortedGroup = [...group].sort((a, b) => {
        if (a.duration !== b.duration) return a.duration - b.duration; // Shortest first, longest last
        if (a.staff !== b.staff) return a.staff - b.staff;
        return b.midiNote.midi - a.midiNote.midi; // Higher notes first
    });
    
    // Mark notes that are part of a chord (same staff, same type/dots)
    return sortedGroup.map((noteProps, index) => {
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
}

/**
 * Converts MIDI notes to note properties including MusicXML attributes.
 */
function convertNotesToProperties(
    notes: MidiNote[],
    pulsesPerQuarterNote: number,
    clef: ClefType
): NoteProperties[] {
    return notes.map(midiNote => {
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
}

/**
 * Groups notes by start time (within tolerance) for chord detection.
 */
function groupNotesByTime(noteProps: NoteProperties[]): NoteProperties[][] {
    const timeGroups: NoteProperties[][] = [];
    let currentGroup: NoteProperties[] = [];
    
    for (let i = 0; i < noteProps.length; i++) {
        const noteProperty = noteProps[i];
        
        if (currentGroup.length === 0) {
            currentGroup.push(noteProperty);
        } else {
            const firstInGroup = currentGroup[0];
            const tickDiff = Math.abs(noteProperty.midiNote.ticks - firstInGroup.midiNote.ticks);
            
            if (tickDiff <= CHORD_TICK_TOLERANCE) {
                // Same time group
                currentGroup.push(noteProperty);
            } else {
                // New time group
                timeGroups.push(currentGroup);
                currentGroup = [noteProperty];
            }
        }
    }
    
    if (currentGroup.length > 0) {
        timeGroups.push(currentGroup);
    }
    
    return timeGroups;
}

/**
 * Converts a MIDI measure to MusicXML measure element.
 */
export function measureToXml(
    measure: MidiMeasure,
    section: Section,
    pulsesPerQuarterNote: number,
    clef: ClefType
): string {
    // Check if this is the first measure
    const measures = section.measures;
    const isFirstMeasure = measures && measures[0] === measure;

    let attrXml = '';
    let directionXml = '';

    if (isFirstMeasure) {
        attrXml = renderAttributes(section, pulsesPerQuarterNote, clef);
        directionXml = renderDirection(section.tempo);
    }

    // Sort notes by ticks to ensure proper ordering
    const sortedNotes = [...measure.notes].sort((a, b) => a.ticks - b.ticks);

    // Convert MIDI notes to properties with MusicXML attributes
    const noteProperties = convertNotesToProperties(sortedNotes, pulsesPerQuarterNote, clef);

    // Group notes by start time for chord detection
    const timeGroups = groupNotesByTime(noteProperties);

    // Process each time group
    const xmlElements: string[] = [];
    
    for (const group of timeGroups) {
        const notesWithChordInfo = detectChordsInGroup(group);
        const groupXml = renderTimeGroup(notesWithChordInfo, clef);
        xmlElements.push(...groupXml);
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

