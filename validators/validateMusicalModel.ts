/**
 * Validators for MusicalModel
 * 
 * Ensures integrity and correctness of the MusicalModel.
 */

import { MusicalScore, MusicalMeasure, MusicalVoice } from '../models/MusicalModel';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  severity: 'error';
  message: string;
  location?: string;
}

export interface ValidationWarning {
  severity: 'warning';
  message: string;
  location?: string;
}

/**
 * Validate entire MusicalScore
 */
export function validateMusicalModel(score: MusicalScore): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate metadata
  if (!score.title && !score.composer) {
    warnings.push({
      severity: 'warning',
      message: 'Score has neither title nor composer',
      location: 'metadata'
    });
  }

  // Validate parts
  if (score.parts.length === 0) {
    errors.push({
      severity: 'error',
      message: 'Score has no parts',
      location: 'parts'
    });
  }

  score.parts.forEach((part, partIndex) => {
    if (part.measures.length === 0) {
      errors.push({
        severity: 'error',
        message: `Part ${part.id} has no measures`,
        location: `parts[${partIndex}]`
      });
    }

    part.measures.forEach((measure, measureIndex) => {
      const measureResult = validateMeasure(measure, partIndex, measureIndex);
      errors.push(...measureResult.errors);
      warnings.push(...measureResult.warnings);
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate single measure
 */
function validateMeasure(
  measure: MusicalMeasure,
  partIndex: number,
  measureIndex: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const location = `parts[${partIndex}].measures[${measureIndex}]`;

  // Validate measure number
  if (measure.number <= 0) {
    errors.push({
      severity: 'error',
      message: `Invalid measure number: ${measure.number}`,
      location
    });
  }

  // Validate time signature
  if (measure.timeSignature) {
    if (measure.timeSignature.beats <= 0 || measure.timeSignature.beatType <= 0) {
      errors.push({
        severity: 'error',
        message: `Invalid time signature: ${measure.timeSignature.beats}/${measure.timeSignature.beatType}`,
        location
      });
    }
  }

  // Validate key signature
  if (measure.keySignature) {
    if (measure.keySignature.fifths < -7 || measure.keySignature.fifths > 7) {
      errors.push({
        severity: 'error',
        message: `Invalid key signature fifths: ${measure.keySignature.fifths} (must be -7 to +7)`,
        location
      });
    }
  }

  // Validate voices
  if (measure.voices.length === 0) {
    errors.push({
      severity: 'error',
      message: 'Measure has no voices',
      location
    });
  }

  measure.voices.forEach((voice, voiceIndex) => {
    const voiceResult = validateVoice(voice, partIndex, measureIndex, voiceIndex, measure.timeSignature);
    errors.push(...voiceResult.errors);
    warnings.push(...voiceResult.warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate single voice
 */
function validateVoice(
  voice: MusicalVoice,
  partIndex: number,
  measureIndex: number,
  voiceIndex: number,
  timeSignature?: { beats: number; beatType: number }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const location = `parts[${partIndex}].measures[${measureIndex}].voices[${voiceIndex}]`;

  // Validate voice number
  if (voice.voiceNumber <= 0) {
    errors.push({
      severity: 'error',
      message: `Invalid voice number: ${voice.voiceNumber}`,
      location
    });
  }

  // Validate events
  if (voice.events.length === 0) {
    warnings.push({
      severity: 'warning',
      message: 'Voice has no events',
      location
    });
  }

  // Check for gaps or overlaps
  let lastEndTick = 0;
  voice.events.forEach((event, eventIndex) => {
    const eventLocation = `${location}.events[${eventIndex}]`;

    // Validate duration
    if (event.durationTicks <= 0) {
      errors.push({
        severity: 'error',
        message: `Event has invalid duration: ${event.durationTicks}`,
        location: eventLocation
      });
    }

    // Check for gaps
    if (event.startTick > lastEndTick) {
      warnings.push({
        severity: 'warning',
        message: `Gap detected: ${lastEndTick} to ${event.startTick}`,
        location: eventLocation
      });
    }

    // Check for overlaps
    if (event.startTick < lastEndTick) {
      errors.push({
        severity: 'error',
        message: `Overlap detected: event starts at ${event.startTick} but previous ends at ${lastEndTick}`,
        location: eventLocation
      });
    }

    if (event.type === 'note') {
      // Validate MIDI number
      if (event.midi < 0 || event.midi > 127) {
        errors.push({
          severity: 'error',
          message: `Invalid MIDI number: ${event.midi} (must be 0-127)`,
          location: eventLocation
        });
      }

      // Validate velocity
      if (event.velocity < 0 || event.velocity > 127) {
        errors.push({
          severity: 'error',
          message: `Invalid velocity: ${event.velocity} (must be 0-127)`,
          location: eventLocation
        });
      }
    }

    lastEndTick = event.startTick + event.durationTicks;
  });

  // Validate total duration matches time signature (if available)
  if (timeSignature && voice.events.length > 0) {
    const totalDuration = voice.events.reduce((sum, e) => sum + e.durationTicks, 0);
    const expectedDuration = (timeSignature.beats * 480 * 4) / timeSignature.beatType; // Assuming PPQ = 480
    
    if (Math.abs(totalDuration - expectedDuration) > 10) { // Tolerance of 10 ticks
      warnings.push({
        severity: 'warning',
        message: `Voice duration (${totalDuration}) doesn't match time signature expectation (${expectedDuration})`,
        location
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Generate validation report as string
 */
export function formatValidationReport(result: ValidationResult): string {
  let report = '';

  if (result.valid) {
    report += '✅ Validation passed!\n';
  } else {
    report += '❌ Validation failed!\n';
  }

  if (result.errors.length > 0) {
    report += `\n🔴 Errors (${result.errors.length}):\n`;
    result.errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error.message}`;
      if (error.location) report += ` [${error.location}]`;
      report += '\n';
    });
  }

  if (result.warnings.length > 0) {
    report += `\n⚠️  Warnings (${result.warnings.length}):\n`;
    result.warnings.forEach((warning, index) => {
      report += `  ${index + 1}. ${warning.message}`;
      if (warning.location) report += ` [${warning.location}]`;
      report += '\n';
    });
  }

  return report;
}
