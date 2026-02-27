/**
 * Pipeline Models - All stages of the MIDI to MusicXML conversion
 * 
 * Stage 1: MIDI (tonejs/midi) - Raw MIDI data
 * Stage 2: MusicalModel - Musical semantics (voices, notes, rests)
 * Stage 3: NotationModel - Notation decisions (beaming, stems)
 * Stage 4: LayoutModel - Layout decisions (staves, systems)
 * Stage 5: MusicXMLModel - MusicXML DOM structure
 */

export * from './MusicalModel';
export * from './NotationModel';
export * from './LayoutModel';
export * from './MusicXMLModel';
