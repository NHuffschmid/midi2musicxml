# MIDI to MusicXML Converter - Pipeline Architecture

## Overview

This module converts MIDI files to MusicXML format using a **5-stage pipeline architecture**. Each stage transforms the data through increasingly refined models, making the conversion process modular, testable, and maintainable.

## Pipeline Stages

```
MIDI (tonejs)
    ↓
Stage 2: MusicalModel
    ↓
Stage 3: NotationModel
    ↓
Stage 4: LayoutModel
    ↓
Stage 5: MusicXMLModel
    ↓
XML String
```

### Stage 1: MIDI Data (Input)
- **Format**: `tonejs/midi` library objects
- **Content**: Raw MIDI events, notes, tempo changes
- **Location**: External library

### Stage 2: MusicalModel
- **Purpose**: Musical semantics and structure
- **Responsibilities**:
  - Voice separation (highest notes → Voice 1)
  - Rest insertion (fill gaps in each voice)
  - Chord grouping (simultaneous notes)
  - Extract time signature, key signature, tempo
- **Key Feature**: Each voice is continuous (notes and rests fill all time)
- **File**: `models/MusicalModel.ts`
- **Transform**: `transforms/midiToMusical.ts`

### Stage 3: NotationModel
- **Purpose**: Notation-specific decisions
- **Responsibilities**:
  - Convert MIDI ticks to concrete note values (quarter, eighth, etc.)
  - Convert MIDI numbers to pitches (step, alter, octave)
  - Determine stem directions (Voice 1: up, Voice 2+: down)
  - Beaming information (future)
  - Tuplets recognition (future)
- **File**: `models/NotationModel.ts`
- **Transform**: `transforms/musicalToNotation.ts`

### Stage 4: LayoutModel
- **Purpose**: Physical layout decisions
- **Responsibilities**:
  - Assign notes to staves (Piano: C4+ → treble, <C4 → bass)
  - Set clef types (G, F, C)
  - System breaks (future)
  - Page breaks (future)
- **File**: `models/LayoutModel.ts`
- **Transform**: `transforms/notationToLayout.ts`

### Stage 5: MusicXMLModel
- **Purpose**: MusicXML DOM structure
- **Responsibilities**:
  - 1:1 mapping to MusicXML elements
  - Ready for serialization
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
│   ├── MusicalModel.ts
│   ├── NotationModel.ts
│   ├── LayoutModel.ts
│   ├── MusicXMLModel.ts
│   └── index.ts
├── transforms/          # Transformation functions between stages
│   ├── midiToMusical.ts
│   ├── musicalToNotation.ts
│   ├── notationToLayout.ts
│   ├── layoutToMusicXML.ts
│   ├── musicXMLToString.ts
│   └── index.ts
├── analysis/            # MIDI analysis utilities
│   ├── analyzeTitle.ts
│   ├── analyzeComposer.ts
│   ├── analyzeCopyright.ts
│   ├── analyzeKey.ts
│   ├── analyzeSections.ts
│   └── analyzeTempo.ts
├── utils/               # Helper functions
│   ├── collectMidiNotes.ts
│   ├── collectMidiMeasures.ts
│   └── midiTicksToXmlDurationType.ts
├── render/              # Legacy rendering (deprecated, will be removed)
├── types.ts             # Legacy types (for backwards compatibility)
└── index.ts             # Main entry point
```

## Voice Separation Strategy

The pipeline uses a **pragmatic voice separation** approach:

1. **Voices are created only when necessary** for notation purposes
2. **Highest notes → Voice 1** (stems up)
3. **Lower notes → Voice 2, 3, etc.** (stems down)
4. **Rule**: New voice is created when notes overlap in time

### Example

```
MIDI Input:
  C4 [half note, holds 2 beats]
  E4 [quarter note, starts after 1 eighth rest]

Voice Separation:
  Voice 1: [eighth rest] E4 [quarter]
  Voice 2: C4 [half]

Result: Voice 1 is higher → notated above Voice 2
```

## Key Design Decisions

### 1. Voice Structure is Immutable
Once voices are separated in **Stage 2**, they remain unchanged through all subsequent stages. This ensures consistency and simplifies debugging.

### 2. Rests Fill All Gaps
Each voice is continuous. Rests are inserted wherever there are gaps, even when other voices are playing.

### 3. Minimal Voices
Voices are only created when overlap occurs. A simple melody uses one voice, complex polyphony uses multiple voices.

### 4. Staff Assignment by Pitch
For piano: C4 (MIDI 60) is the split point. Notes >= C4 go to treble clef, < C4 to bass clef.

## Adding New Features

### Example: Adding Pedal Support

1. **Stage 2 (MusicalModel)**: Add `pedalEvents: PedalEvent[]` to measures
2. **Stage 3 (NotationModel)**: Pass through unchanged
3. **Stage 4 (LayoutModel)**: Pass through unchanged
4. **Stage 5 (MusicXMLModel)**: Add `Direction` elements with `<pedal>` tags
5. **Stage 6**: Serialize pedal directions

### Example: Adding Dynamics

1. **Stage 2**: Analyze MIDI velocity to determine dynamics (p, mf, f, etc.)
2. **Stage 3**: Add `DynamicMarking` to notes/measures
3. **Stage 4**: Pass through
4. **Stage 5**: Add `Direction` elements with `<dynamics>` tags
5. **Stage 6**: Serialize dynamics

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
