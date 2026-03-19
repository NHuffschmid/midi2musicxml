/**
 * Pipeline Models - All stages of the MIDI to MusicXML conversion
 * 
 * Stage 1: MIDI (tonejs/midi) - Raw MIDI data
 * Stage 2: TemporalModel - Time-based structure (sections, measures)
 * Stage 3: NotationModel - Notation decisions (duration types, pitches)
 * Stage 4: LayoutModel - Layout decisions (staff assignment)
 * Stage 5: MusicXMLModel - MusicXML DOM structure
 * Stage 6: XML String - Serialized output
 */

export * from './TemporalModel';
export * from './NotationModel';
export * from './LayoutModel';
export * from './MusicXMLModel';
