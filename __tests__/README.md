# MIDI to MusicXML Tests

## Test Strategy

### Unit Tests
Tests for individual transform functions:
- `midiToMusical.test.ts` - Tests for Stage 2
- `musicalToNotation.test.ts` - Tests for Stage 3
- `notationToLayout.test.ts` - Tests for Stage 4
- `layoutToMusicXML.test.ts` - Tests for Stage 5

### Integration Tests
Tests with real MIDI files:
- `pipeline.integration.test.ts` - Complete pipeline
- `realMidi.test.ts` - Tests with real MIDI files

### Snapshot Tests
Compares model dumps with expected outputs:
- `snapshots/` - Saved model dumps

## Test Utilities

### Debug/Dump Functions
```typescript
import { dumpMusicalModel, prettyPrintMusicalModel } from '../debug';

const dump = dumpMusicalModel(musicalScore);
console.log(prettyPrintMusicalModel(musicalScore));
```

### Validators
```typescript
import { validateMusicalModel, formatValidationReport } from '../validators';

const validation = validateMusicalModel(musicalScore);
if (!validation.valid) {
  console.log(formatValidationReport(validation));
}
```

## Running Tests

```bash
# Only midi2musicxml tests (recommended)
npm run test:midi

# With UI
npm run test:midi:ui

# All project tests (watch mode)
npm test

# All tests once
npm test -- run

# Specific test file
npm test -- midiToMusical.test.ts

# With coverage
npm run test:coverage

# Filter by test name
npm test -- -t "should create valid MusicalModel"
```

## Test Data

### Creating Test Sections
```typescript
const sections: Section[] = [{
  measures: [{
    notes: [{
      midi: 60,        // C4
      name: 'C4',
      ticks: 0,
      time: 0,
      duration: 1,
      durationTicks: 480,
      velocity: 64,
      bars: 0
    }]
  }],
  key: 'C',
  time: { beats: 4, beatType: 4 },
  tempo: 120
}];
```

## Debugging Failed Tests

### 1. Dump the Model
```typescript
const musicalScore = midiToMusical(sections, options);
console.log(prettyPrintMusicalModel(musicalScore));
```

### 2. Validate
```typescript
const validation = validateMusicalModel(musicalScore);
console.log(formatValidationReport(validation));
```

### 3. Inspect Statistics
```typescript
const dump = dumpMusicalModel(musicalScore);
console.log(dump.statistics);
```

## Example Test Cases

### Voice Separation
- Single melody → 1 voice
- Chord → 1 voice with chord notes
- Polyphony → Multiple voices

### Rest Insertion
- Gap at start → Rest before note
- Gap in middle → Rest between notes
- Gap at end → Rest after note

### Chord Detection
- Simultaneous notes → Same voice, marked as chord
- Notes within tolerance (20 ticks) → Chord

### Validation
- Negative durations → Error
- Invalid MIDI numbers → Error
- Overlapping events → Error
- Missing time signature → Warning
