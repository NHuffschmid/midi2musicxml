# MIDI to MusicXML Converter - Pipeline Architecture

## Overview

This module converts MIDI files to MusicXML format using a **6-stage pipeline architecture**. Each stage transforms the data through increasingly refined models, making the conversion process modular, testable, and maintainable.

## Pipeline Stages

```
MIDI (tonejs)
    ↓
Stage 2: TemporalModel
    ↓
Stage 3: NotationModel
    ↓
Stage 4: LayoutModel
    ↓
Stage 5: MusicXMLModel
    ↓
Stage 6: XML String
```

### Stage 1: MIDI Data (Input)
- **Format**: `tonejs/midi` library objects
- **Content**: Raw MIDI events, notes, tempo changes
- **Location**: External library

### Stage 2: TemporalModel
- **Purpose**: Time-based structure analysis
- **Responsibilities**:
  - Group notes into measures based on time signatures
  - Detect sections based on pauses between measures
  - Extract time signature, key signature, tempo for each section
  - Preserve measure boundaries and timing information
  - Define common types: `TimeSignature`, `KeySignature`, `PedalEvent`
- **Key Feature**: Focuses purely on temporal/rhythmic structure, no musical interpretation yet
- **File**: `models/TemporalModel.ts`
- **Transform**: `transforms/midiToTemporal.ts`

### Stage 3: NotationModel
- **Purpose**: Notation-specific decisions
- **Responsibilities**:
  - Convert MIDI ticks to concrete note values (quarter, eighth, etc.)
  - Convert MIDI numbers to pitches (step, alter, octave)
  - Propagate metadata (time/key signature, tempo) from TemporalModel
  - Beaming information (future)
  - Tuplets recognition (future)
- **File**: `models/NotationModel.ts`
- **Transform**: `transforms/temporalToNotation.ts`

### Stage 4: LayoutModel
- **Purpose**: Physical layout decisions
- **Responsibilities**:
  - Assign notes to staves (grouped by staff)
  - **Detect chords** (notes with same start time and note type)
  - Set clef types (G, F, C)
  - System breaks (section starts)
  - Page breaks (future)
- **Key Features**:
  - Chord detection: Notes are grouped as chords if they have the same `startTick` (within 10 tick tolerance), same `type`, and same `dots`
  - Chord notes are sorted from lowest to highest pitch (bass to treble)
  - First note of a chord has no `isChord` flag, subsequent notes have `isChord: true`
- **Structure**:
  - `LayoutMeasure` contains `staves: LayoutStaff[]` (notes grouped by staff)
  - Each `LayoutStaff` has `number` and `notes: LayoutNote[]`
  - `clefs` array at part level describes clef for each staff
- **File**: `models/LayoutModel.ts`
- **Transform**: `transforms/notationToLayout.ts`

### Stage 5: MusicXMLModel
- **Purpose**: MusicXML DOM structure
- **Responsibilities**:
  - 1:1 mapping to MusicXML elements
  - Ready for serialization
  - During XML serialization, `<backup>` elements are written before notes as needed
- **File**: `models/MusicXMLModel.ts`
- **Transform**: `transforms/layoutToMusicXML.ts`

### Stage 6: XML String (Output)
- **Purpose**: Serialized MusicXML
- **Responsibilities**:
  - Convert MusicXML DOM to XML string
  - Proper formatting and indentation
- **Transform**: `transforms/musicXMLToString.ts`

## Directory Structure

```
midi2musicxml/
├── models/              # Type definitions for each pipeline stage
│   ├── TemporalModel.ts
│   ├── NotationModel.ts
│   ├── LayoutModel.ts
│   ├── MusicXMLModel.ts
│   ─── index.ts
├── transforms/          # Transformation functions between stages
│   ├── midiToTemporal.ts
│   ├── temporalToNotation.ts
│   ├── notationToLayout.ts
│   ├── layoutToMusicXML.ts
│   ├── musicXMLToString.ts
│   └── index.ts
├── analysis/            # MIDI analysis utilities
│   ├── analyzeTitle.ts
│   ├── analyzeComposer.ts
│   ├── analyzeCopyright.ts
│   ├── analyzeBeats.ts
│   ├── analyseKey.ts
│   └── analyzeTempo.ts
├── utils/               # Helper functions
│   ├── collectMidiNotes.ts
│   └── midiTicksToXmlDurationType.ts
├── debug/               # Debug and testing utilities
│   ├── dumpTemporalModel.ts
│   ├── dumpNotationModel.ts
│   ├── dumpLayoutModel.ts
│   ├── dumpMusicXMLModel.ts
│   └── index.ts
├── types.ts             # Common types and interfaces
└── index.ts             # Main entry point
```


### Key Features

- **Temporal ordering**: Ensures notes appear in correct chronological sequence in MusicXML
- **Automatic backup**: When a note starts before current time cursor, a backup element is generated
- **Per-measure reset**: Voice numbering starts fresh at each measure boundary
- **Simple and predictable**: No complex overlap detection needed

**Note**: Rests and chords are NOT handled in this redesigned pipeline. These features will be added later.

## Section Detection

Sections are detected in **Stage 2 (TemporalModel)** based on pauses between measures:

- **Pause Threshold**: 2.0 seconds (configurable)
- **Detection**: Compare last note end time of measure N with first note start time of measure N+1
- **Result**: Measures are grouped into sections, each with its own key signature and time signature

This allows the pipeline to handle multi-movement pieces or compositions with distinct sections.

## Key Design Decisions

## Key Design Decisions

### 1. Direct Temporal to Notation Conversion
**Stage 2 (TemporalModel)** provides time-based structure and common types (`TimeSignature`, `KeySignature`, `PedalEvent`), which are directly consumed by **Stage 3 (NotationModel)**. This eliminates an unnecessary intermediate layer and simplifies the pipeline.

### 2. Minimal Voices
Voices are only created when overlap occurs. A simple melody uses one voice, complex polyphony uses multiple voices.

### 3. Staff Assignment by Pitch
For piano: The average pitch of all notes in a measure is calculated (clamped to MIDI 52-66 range). Notes >= average go to treble clef, < average to bass clef.

### 4. Chord Detection by Note Type
Chords are detected in **Stage 4 (LayoutModel)** within each staff independently:
- **Criteria**: Two notes form a chord if they have the same `startTick` (±10 tick tolerance), same `type` (quarter, eighth, etc.), and same `dots`
- **Tolerance**: Uses note type instead of exact duration ticks to handle manually played MIDI files
- **Sorting**: Chord notes are sorted from lowest to highest pitch (bass to treble)
- **MusicXML**: First note is rendered normally, subsequent notes get `<chord/>` element and share the same voice

### 5. Rests Not Yet Implemented
The current pipeline does NOT handle:
- **Rests**: Gaps between notes are not filled with rest symbols

This feature will be implemented in a future iteration of the pipeline.

## Adding New Features

### Example: Adding Pedal Support

1. **Stage 2 (TemporalModel)**: Detect pedal events from MIDI control changes
2. **Stage 3 (NotationModel)**: Pass through `pedalEvents` unchanged
3. **Stage 4 (LayoutModel)**: Pass through unchanged
4. **Stage 5 (MusicXMLModel)**: Add `Direction` elements with `<pedal>` tags
5. **Stage 6**: Serialize pedal directions

### Example: Adding Dynamics

1. **Stage 2**: Analyze MIDI velocity patterns across measures
2. **Stage 3**: Determine dynamics (p, mf, f, etc.) and add `DynamicMarking` to measures
3. **Stage 4**: Pass through
4. **Stage 5**: Add `Direction` elements with `<dynamics>` tags
5. **Stage 6**: Serialize dynamics

## Testing Strategy

Each stage can be tested independently:

```typescript
// Test Stage 2
const temporalScore = midiToTemporal(midiNotes, midi, options);
expect(temporalScore.sections).toBeDefined();

// Test Stage 3
const notationScore = temporalToNotation(temporalScore, options);
expect(notationScore.parts[0].measures[0].notes[0].pitch).toBeDefined();

// Test full pipeline
const xml = midi2MusicXML(midi, { clef: 'piano' });
expect(xml).toContain('<note>');
```

## Future Enhancements

### Short Term
- [ ] **REST HANDLING**: Implement rest insertion to fill gaps between notes
- [x] **CHORD HANDLING**: Detect and group simultaneous notes as chords
- [x] **BEAMING**: Group eighth notes, 16th notes, etc. with beam elements
- [ ] Implement tuplet recognition (triplets, quintuplets)
- [ ] Add ties across measures
- [ ] Pedal events support

### Medium Term
- [ ] Dynamics from MIDI velocity
- [ ] Articulation marks (staccato, legato)
- [ ] Slurs and phrasing

### Long Term
- [ ] System and page breaks
- [ ] Multi-section support (key/time changes)
- [ ] Lyrics from MIDI text events
- [ ] Advanced voice separation algorithms

## Migration from Old Architecture

### Old Structure (Deprecated)
```
MIDI → MidiNote[] → MidiMeasure[] → Direct XML Rendering
```

### New Structure
```
MIDI → TemporalModel → NotationModel → LayoutModel → MusicXMLModel → XML
```

### Benefits
- **Modularity**: Each stage has clear responsibilities
- **Testability**: Each transform can be unit tested
- **Debugging**: Inspect intermediate models at any stage
- **Extensibility**: Add features without affecting other stages
- **Maintainability**: Complex logic is broken into understandable steps

## Performance Considerations

The pipeline adds minimal overhead:
- Each stage is O(n) where n = number of notes
- Total complexity: O(4n) ≈ O(n)
- Intermediate models are lightweight
- Memory usage is acceptable for typical MIDI files (<10k notes)

For very large files (>100k notes), consider streaming or chunking strategies.

## License

See LICENSE file for details.
