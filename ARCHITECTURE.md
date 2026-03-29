# MIDI to MusicXML Converter - Pipeline Architecture

## Overview

This module converts MIDI files to MusicXML format using a **7-stage pipeline architecture** (Stage 1.5 is optional and only active for live-recorded MIDI). Each stage transforms the data through increasingly refined models, making the conversion process modular, testable, and maintainable.

## Pipeline Stages

```
Stage 1:   MIDI (tonejs)          ← raw MIDI data
    ↓
Stage 1.5: QuantizedModel         ← optional: live-recording detection +
    ↓                                tempo estimation + grid quantization
    ↓                                (score-derived files pass through unchanged)
Stage 2:   TemporalModel
    ↓
Stage 3:   NotationModel
    ↓
Stage 4:   LayoutModel
    ↓
Stage 5:   MusicXMLModel
    ↓
Stage 6:   XML String
```

### Stage 1: MIDI Data (Input)
- **Format**: `tonejs/midi` library objects
- **Content**: Raw MIDI events, notes, tempo changes
- **Location**: External library
- **Utility**: `utils/collectMidiNotes.ts` — reads all tracks, sorts by onset tick, assigns per-note tempo from header

### Stage 1.5: QuantizedModel (optional)

Inserted between raw MIDI data (Stage 1) and the TemporalModel (Stage 2).  
This stage is **only active for live-recorded MIDI** — score-derived files pass through unchanged.

#### Detection

A MIDI file is classified as *score-derived* when the fraction of notes whose `ticks` and `durationTicks` are exact multiples of the quantization grid meets or
exceeds the detection threshold.

#### Sub-steps for live-recorded input

**Step A — Global tempo estimation (IOI histogram)**

1. Extract note onset times (seconds), deduplicate chord notes within a 20 ms window.
2. Compute consecutive **Inter-Onset Intervals (IOIs)**.
3. Filter IOIs to the musical beat range **[0.25 s, 1.5 s]** (= [40 BPM, 240 BPM]).
4. Build a histogram (20 ms bins) and find the dominant peak — the most common IOI,
   which approximates the beat period `T`.
5. Test candidate beat periods: `T × {0.5, 1, 2}` (half-beat, beat, two-beat).
6. Select the candidate whose BPM falls in **[60, 180]**; if none qualifies, pick the
   closest one. Round to the nearest musically natural value → stored as `estimatedBpm`.

**Step B — Tempo-map construction**

1. Divide the piece into windows of **4 measures** (in original tick space).
2. For each window, search over BPM candidates in `[globalBpm × 0.9, globalBpm × 1.1]`
   using 80 evenly-spaced steps.
3. For each candidate BPM, compute the scale factor `bpm / referenceBpm` and evaluate
   the **mean-square distance** of rescaled ticks to the nearest beat-grid position
   (multiple of `ppq`).
4. The candidate with the lowest MSE becomes the local BPM for that window.
5. Windows with fewer than 4 notes fall back to `globalBpm`.
6. Result: a sorted `TempoMapEntry[]` array — one entry per window.

**Step C — Tempo-map application**

For each note, the local BPM at its original tick is **linearly interpolated** from the
tempo map.  Ticks and durationTicks are multiplied by `localBpm / referenceBpm`.
The real-time fields (`time`, `duration` in seconds) remain unchanged — they are used
only for pause-based section detection in Stage 2.

**Step D — Grid quantization**

Onset ticks and duration ticks are snapped to the nearest multiple of the grid
(`ppq / gridDivisor`). This removes any residual offset
left after Step C.

- **Model**: `models/QuantizedModel.ts`
- **Transform**: `transforms/midiToQuantized.ts`
- **Utilities**: `utils/estimateGlobalTempo.ts`, `utils/buildTempoMap.ts`,
  `utils/applyTempoMap.ts`, `utils/quantizeMidiNotes.ts`
- **Key types**: `QuantizedScore` — carries `notes`, `wasQuantized`, `gridAlignmentRatio`,
  `estimatedBpm?`, `tempoMap?`; `TempoMapEntry` — `{ startTick, bpm }`

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
  - **Beam computation** (`computeBeamsForNotes`): calculates beam groups per staff based on beat boundaries and time signature. Consecutive beamable notes (eighth, 16th, 32nd, 64th) within the same beat are grouped with `begin` / `continue` / `end` markers. Compound time (6/8, 9/8, 12/8) uses dotted-quarter as beam group unit.
  - Notes carry `startTick` for later backup/forward calculation
  - Chord flag (`chord`) is transferred from `LayoutNote.isChord`
- **Key model types**:
  - `NoteElement`: `pitch`, `duration`, `type`, `voice?`, `dot?`, `chord?`, `staff?`, `beam?`, `startTick`, `notations?`
  - `Beam`: `{ number?: number; type: 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook' }`
- **File**: `models/MusicXMLModel.ts`
- **Transform**: `transforms/layoutToMusicXML.ts`

### Stage 6: XML String (Output)
- **Purpose**: Serialized MusicXML
- **Responsibilities**:
  - Convert MusicXML DOM to XML string
  - **Measure preprocessing** via `measurePreprocessor.ts` (see below)
  - Proper formatting and indentation
- **Transform**: `transforms/musicXMLToString.ts`

## Measure Preprocessing (Stage 6 helper)

Before serialization, each measure's note list passes through a four-step pipeline in `transforms/measurePreprocessor.ts`:

```
NoteElement[]
      │
      ▼
Step 1 – resolveChords()
      Marks chord notes (chord = true), unifies voice per tick+staff group.
      │
      ▼
Step 2 – resolveBeams()
      Ensures all notes in a beam group (begin→continue→end) share the
      voice of the first note in that group.
      │
      ▼
Step 3 – assignVoices()
      Maps staff numbers to final consecutive voice numbers (staff 1 → voice 1,
      staff 2 → voice 2, …). Chord notes inherit voice from their primary note.
      │
      ▼
Step 4 – buildMeasureEvents()
      Sorts notes by voice, then by startTick within each voice.
      Inserts <backup> (cursor jump back) or <forward> (cursor jump ahead)
      events wherever the time cursor must move between notes.
      │
      ▼
MeasureEvent[]  ({ kind: 'note' } | { kind: 'backup' } | { kind: 'forward' })
```

Each step is a pure function and can be unit-tested independently.

## Directory Structure

```
midi2musicxml/
├── models/              # Type definitions for each pipeline stage
│   ├── QuantizedModel.ts  ← Stage 1.5 model
│   ├── TemporalModel.ts
│   ├── NotationModel.ts
│   ├── LayoutModel.ts
│   ├── MusicXMLModel.ts
│   └── index.ts
├── transforms/          # Transformation functions between stages
│   ├── midiToQuantized.ts     ← Stage 1.5: detection + IOI tempo estimation + quantization
│   ├── midiToTemporal.ts
│   ├── temporalToNotation.ts
│   ├── notationToLayout.ts
│   ├── layoutToMusicXML.ts    ← includes computeBeamsForNotes()
│   ├── measurePreprocessor.ts ← chord/beam/voice resolution + backup/forward
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
│   ├── quantizeMidiNotes.ts
│   ├── estimateGlobalTempo.ts ← IOI-based BPM estimation (Stage 1.5 Step A)
│   ├── buildTempoMap.ts       ← Window-based tempo map (Stage 1.5 Step B)
│   ├── applyTempoMap.ts       ← Tick rescaling (Stage 1.5 Step C)
│   └── midiTicksToXmlDurationType.ts
├── debug/               # Debug and testing utilities
│   ├── dumpQuantizedModel.ts
│   ├── dumpTemporalModel.ts
│   ├── dumpNotationModel.ts
│   ├── dumpLayoutModel.ts    ← outputs chord (isChord) per note
│   ├── dumpMusicXMLModel.ts  ← outputs startTick, voice, chord, beam per note
│   └── index.ts
├── types.ts             # Common types and interfaces
└── index.ts             # Main entry point
```

## Section Detection

Sections are detected in **Stage 2 (TemporalModel)** based on pauses between measures:

- **Pause Threshold**: 2.0 seconds (configurable)
- **Detection**: Compare last note end time of measure N with first note start time of measure N+1
- **Result**: Measures are grouped into sections, each with its own key signature and time signature

This allows the pipeline to handle multi-movement pieces or compositions with distinct sections.

## Key Design Decisions

### 1. Direct Temporal to Notation Conversion
**Stage 2 (TemporalModel)** provides time-based structure and common types (`TimeSignature`, `KeySignature`, `PedalEvent`), which are directly consumed by **Stage 3 (NotationModel)**. This eliminates an unnecessary intermediate layer and simplifies the pipeline.

### 2. Voice Assignment in Stage 6 (not Stage 5)
Voices are derived from staff numbers in `assignVoices()` (Step 3 of the measure preprocessor), not stored in the MusicXMLModel. This keeps Stage 5 free of layout concerns. Rule: staff 1 → voice 1, staff 2 → voice 2, etc. Chord notes inherit the voice of their primary tone.

### 3. Staff Assignment by Pitch
For piano: The average pitch of all notes in a measure is calculated (clamped to MIDI 52–66 range). Notes >= average go to treble clef, < average to bass clef.

### 4. Chord Detection by Note Type (Stage 4)
Chords are detected in **Stage 4 (LayoutModel)** within each staff independently:
- **Criteria**: Two notes form a chord if they have the same `startTick` (±10 tick tolerance), same `type` (quarter, eighth, etc.), and same `dots`
- **Sorting**: Chord notes are sorted from lowest to highest pitch (bass to treble)
- **MusicXML**: First note is rendered normally, subsequent notes get `<chord/>` element and share the same voice

### 5. Beam Computation in Stage 5 (layoutToMusicXML)
Beams are calculated in `computeBeamsForNotes()` per staff immediately after note conversion, before staves are merged. This ensures chord notes and primary notes within the same staff are correctly grouped. The function:
- Groups consecutive beamable primary notes within the same beat boundary
- Sets `beam: [{ number: 1, type: 'begin'|'continue'|'end' }]` on each note
- Propagates the beam marker to chord notes following their primary

### 6. Backup/Forward in Stage 6 (measurePreprocessor)
`<backup>` and `<forward>` elements are not stored in MusicXMLModel — they are computed dynamically by `buildMeasureEvents()` (Step 4). The time cursor advances with each non-chord note's `duration`. A jump back (new voice starting earlier) produces `<backup>`, a gap produces `<forward>`.

### 7. Rests Not Yet Implemented
The current pipeline does NOT handle:
- **Rests**: Gaps between notes are not filled with rest symbols

