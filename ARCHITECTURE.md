# MIDI to MusicXML Converter - Pipeline Architecture

## Overview

This module converts MIDI files to MusicXML format using a **7-stage pipeline architecture**. Each stage transforms the data through increasingly refined models, making the conversion process modular, testable, and maintainable.

## Pipeline Stages

```
MIDI (tonejs)
    ↓
Stage 2: TemporalModel
    ↓
Stage 3: MusicalModel
    ↓
Stage 4: NotationModel
    ↓
Stage 5: LayoutModel
    ↓
Stage 6: MusicXMLModel
    ↓
Stage 7: XML String
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
- **Key Feature**: Focuses purely on temporal/rhythmic structure, no musical interpretation yet
- **File**: `models/TemporalModel.ts`
- **Transform**: `transforms/midiToTemporal.ts`

### Stage 3: MusicalModel
- **Purpose**: Musical semantics and structure
- **Responsibilities**:
  - Voice separation (highest notes → Voice 1)
  - Rest insertion (fill gaps in each voice)
  - Chord grouping (simultaneous notes)
  - Propagate metadata (time/key signature, tempo) from TemporalModel
- **Key Feature**: Each voice is continuous (notes and rests fill all time)
- **File**: `models/MusicalModel.ts`
- **Transform**: `transforms/temporalToMusical.ts`

### Stage 4: NotationModel
- **Purpose**: Notation-specific decisions
- **Responsibilities**:
  - Convert MIDI ticks to concrete note values (quarter, eighth, etc.)
  - Convert MIDI numbers to pitches (step, alter, octave)
  - Determine stem directions (Voice 1: up, Voice 2+: down)
  - Beaming information (future)
  - Tuplets recognition (future)
- **File**: `models/NotationModel.ts`
- **Transform**: `transforms/musicalToNotation.ts`

### Stage 5: LayoutModel
- **Purpose**: Physical layout decisions
- **Responsibilities**:
  - Assign notes to staves (Piano: C4+ → treble, <C4 → bass)
  - Set clef types (G, F, C)
  - System breaks (section starts)
  - Page breaks (future)
- **File**: `models/LayoutModel.ts`
- **Transform**: `transforms/notationToLayout.ts`

### Stage 6: MusicXMLModel
- **Purpose**: MusicXML DOM structure
- **Responsibilities**:
  - 1:1 mapping to MusicXML elements
  - Ready for serialization
- **File**: `models/MusicXMLModel.ts`
- **Transform**: `transforms/layoutToMusicXML.ts`

### Stage 7: XML String (Output)
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
│   ├── MusicalModel.ts
│   ├── NotationModel.ts
│   ├── LayoutModel.ts
│   ├── MusicXMLModel.ts
│   └── index.ts
├── transforms/          # Transformation functions between stages
│   ├── midiToTemporal.ts
│   ├── temporalToMusical.ts
│   ├── musicalToNotation.ts
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
│   ├── dumpMusicalModel.ts
│   ├── dumpNotationModel.ts
│   ├── dumpLayoutModel.ts
│   ├── dumpMusicXMLModel.ts
│   └── index.ts
├── types.ts             # Common types and interfaces
└── index.ts             # Main entry point
```

## Voice Separation Strategy

The pipeline uses a **pragmatic voice separation** approach in **Stage 3 (MusicalModel)**:

1. **Voices are created only when necessary** for notation purposes
2. **Highest notes → Voice 1** (stems up)
3. **Lower notes → Voice 2, 3, etc.** (stems down)
4. **Rule**: New voice is created when notes overlap in time

### Example

```
Temporal Input (Stage 2):
  Measure contains: C4 [half note], E4 [quarter note]

Voice Separation (Stage 3):
  Voice 1: [eighth rest] E4 [quarter]
  Voice 2: C4 [half]

Result: Voice 1 is higher → notated above Voice 2
```

## Section Detection

Sections are detected in **Stage 2 (TemporalModel)** based on pauses between measures:

- **Pause Threshold**: 2.0 seconds (configurable)
- **Detection**: Compare last note end time of measure N with first note start time of measure N+1
- **Result**: Measures are grouped into sections, each with its own key signature and time signature

This allows the pipeline to handle multi-movement pieces or compositions with distinct sections.

## Key Design Decisions

### 1. Voice Structure is Immutable
Once voices are separated in **Stage 2**, they remain unchanged through all subsequent stages. This ensures consistency and simplifies debugging.

### 2. Rests Fill All Gaps
Each voice is continuous. Rests are inserted wherever there are gaps, even when other voices are playing.

### 3. Minimal Voices
Voices are only created when overlap occurs. A simple melody uses one voice, complex polyphony uses multiple voices.

## Key Design Decisions

### 1. Separation of Temporal and Musical Concerns
**Stage 2 (TemporalModel)** focuses purely on time-based structure (measures, sections), while **Stage 3 (MusicalModel)** handles musical interpretation (voices, chords). This separation makes the pipeline more maintainable and testable.

### 2. Voice Structure is Immutable
Once voices are separated in **Stage 3**, they remain unchanged through all subsequent stages. This ensures consistency and simplifies debugging.

### 3. Rests Fill All Gaps
Each voice is continuous. Rests are inserted wherever there are gaps, even when other voices are playing.

### 4. Minimal Voices
Voices are only created when overlap occurs. A simple melody uses one voice, complex polyphony uses multiple voices.

### 5. Staff Assignment by Pitch
For piano: C4 (MIDI 60) is the split point. Notes >= C4 go to treble clef, < C4 to bass clef.

## Adding New Features

### Example: Adding Pedal Support

1. **Stage 2 (TemporalModel)**: Detect pedal events from MIDI control changes
2. **Stage 3 (MusicalModel)**: Add `pedalEvents: PedalEvent[]` to measures
3. **Stage 4 (NotationModel)**: Pass through unchanged
4. **Stage 5 (LayoutModel)**: Pass through unchanged
5. **Stage 6 (MusicXMLModel)**: Add `Direction` elements with `<pedal>` tags
6. **Stage 7**: Serialize pedal directions

### Example: Adding Dynamics

1. **Stage 2**: Analyze MIDI velocity patterns across measures
2. **Stage 3**: Determine dynamics (p, mf, f, etc.) and add `DynamicMarking` to measures
3. **Stage 4**: Pass through
4. **Stage 5**: Pass through
5. **Stage 6**: Add `Direction` elements with `<dynamics>` tags
6. **Stage 7**: Serialize dynamics

## Testing Strategy

Each stage can be tested independently:

```typescript
// Test Stage 2
const musicalModel = midiToMusical(sections, options);
expect(musicalModel.parts[0].measures[0].voices).toHaveLength(2);

// Test Stage 3
const notationModel = musicalToNotation(musicalModel, options);
expect(notationModel.parts[0].measures[0].voices[0].events[0].type).toBe('note');

// Test full pipeline
const xml = midi2MusicXML(midi, { clef: 'piano' });
expect(xml).toContain('<note>');
```

## Future Enhancements

### Short Term
- [ ] Improve chord detection (use tick tolerance consistently)
- [ ] Add beaming logic (group eighth notes, etc.)
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
MIDI → MusicalModel → NotationModel → LayoutModel → MusicXMLModel → XML
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
- Total complexity: O(5n) ≈ O(n)
- Intermediate models are lightweight
- Memory usage is acceptable for typical MIDI files (<10k notes)

For very large files (>100k notes), consider streaming or chunking strategies.

## License

See LICENSE file for details.
