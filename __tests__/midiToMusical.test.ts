/**
 * Tests for midiToMusical transform
 * 
 * Tests the conversion from MIDI data to MusicalModel
 */

import { describe, it, expect } from 'vitest';
import { midiToMusical } from '../transforms/midiToMusical';
import { validateMusicalModel, formatValidationReport } from '../validators/validateMusicalModel';
import { dumpMusicalModel, prettyPrintMusicalModel } from '../debug/dumpMusicalModel';
import { createSimpleSection, createChord, MIDI, DURATION } from './setup';
import type { Section } from '../types';

describe('midiToMusical Transform', () => {
  
  it('should create valid MusicalModel from simple section', () => {
    // Arrange: Create a simple section with one measure
    const sections: Section[] = [createSimpleSection([{
      midi: MIDI.C4,
      durationTicks: DURATION.QUARTER
    }])];

    // Act: Transform to MusicalModel
    const musicalScore = midiToMusical(sections, {
      title: 'Test',
      composer: 'Tester',
      pulsesPerQuarterNote: 480
    });

    // Assert: Validate the model
    const validation = validateMusicalModel(musicalScore);
    if (!validation.valid) {
      console.log(formatValidationReport(validation));
    }
    expect(validation.valid).toBe(true);
    
    // Check basic structure
    expect(musicalScore.parts).toHaveLength(1);
    expect(musicalScore.parts[0].measures).toHaveLength(1);
    expect(musicalScore.parts[0].measures[0].voices).toHaveLength(1);
  });

  it('should separate overlapping notes into multiple voices', () => {
    // Arrange: Two overlapping notes (chord or polyphony)
    const sections: Section[] = [createSimpleSection([
      {
        midi: MIDI.C4,
        ticks: 0,
        durationTicks: DURATION.HALF
      },
      {
        midi: MIDI.E4, // Higher pitch, should be Voice 1
        ticks: DURATION.QUARTER, // Starts during C4
        durationTicks: DURATION.QUARTER
      }
    ])];

    // Act
    const musicalScore = midiToMusical(sections, {
      pulsesPerQuarterNote: 480
    });

    // Assert
    const measure = musicalScore.parts[0].measures[0];
    expect(measure.voices.length).toBeGreaterThan(1); // Should have multiple voices
    
    // Voice 1 should have the higher note (E4)
    const voice1 = measure.voices.find(v => v.voiceNumber === 1);
    expect(voice1).toBeDefined();
    
    // Dump for inspection
    const dump = dumpMusicalModel(musicalScore);
    expect(dump.statistics.totalVoices).toBeGreaterThan(1);
  });

  it('should fill gaps with rests', () => {
    // Arrange: Note that doesn't start at measure beginning
    const sections: Section[] = [createSimpleSection([{
      midi: MIDI.C4,
      ticks: DURATION.QUARTER, // Starts on beat 2
      durationTicks: DURATION.QUARTER
    }])];

    // Act
    const musicalScore = midiToMusical(sections, {
      pulsesPerQuarterNote: 480
    });

    // Assert
    const voice = musicalScore.parts[0].measures[0].voices[0];
    expect(voice.events).toHaveLength(3); // Rest, Note, Rest
    expect(voice.events[0].type).toBe('rest');
    expect(voice.events[1].type).toBe('note');
    expect(voice.events[2].type).toBe('rest');
    
    // First rest should be 480 ticks (quarter note)
    expect(voice.events[0].durationTicks).toBe(480);
  });

  it('should detect chords (simultaneous notes)', () => {
    // Arrange: Two notes starting at same time
    const sections: Section[] = [createSimpleSection(
      createChord([MIDI.C4, MIDI.E4], 0, DURATION.QUARTER)
    )];

    // Act
    const musicalScore = midiToMusical(sections, {
      pulsesPerQuarterNote: 480
    });

    // Assert: Should be in same voice
    const dump = dumpMusicalModel(musicalScore);
    const measure = dump.parts[0].measures[0];
    
    // Check that we have the expected notes
    expect(measure.voices.length).toBeGreaterThan(0);
    
    // Find voices with notes at tick 0
    const voicesWithNotesAtZero = measure.voices.filter(v => 
      v.events.some(e => e.type === 'note' && e.startTick === 0)
    );
    
    // Either: multiple notes in one voice (chord) OR multiple voices starting at 0 (also a chord)
    const totalNotesAtZero = voicesWithNotesAtZero.reduce((sum, v) => {
      return sum + v.events.filter(e => e.type === 'note' && e.startTick === 0).length;
    }, 0);
    
    expect(totalNotesAtZero).toBe(2); // Both C4 and E4 at tick 0
  });

  it('should preserve metadata', () => {
    // Arrange
    const sections: Section[] = [createSimpleSection()];

    // Act
    const musicalScore = midiToMusical(sections, {
      title: 'Test Title',
      composer: 'Test Composer',
      copyright: 'Test Copyright',
      pulsesPerQuarterNote: 480
    });

    // Assert
    expect(musicalScore.title).toBe('Test Title');
    expect(musicalScore.composer).toBe('Test Composer');
    expect(musicalScore.copyright).toBe('Test Copyright');
  });

  it('should handle empty measures with full-measure rest', () => {
    // Arrange
    const sections: Section[] = [createSimpleSection()];

    // Act
    const musicalScore = midiToMusical(sections, {
      pulsesPerQuarterNote: 480
    });

    // Assert
    const measure = musicalScore.parts[0].measures[0];
    expect(measure.voices).toHaveLength(1);
    expect(measure.voices[0].events).toHaveLength(1);
    expect(measure.voices[0].events[0].type).toBe('rest');
    
    // Should be a whole rest (4/4 = 1920 ticks at PPQ=480)
    const expectedDuration = (4 * 480 * 4) / 4;
    expect(measure.voices[0].events[0].durationTicks).toBe(expectedDuration);
  });
});
