/**
 * Validators for MusicalModel
 * 
 * Ensures integrity and correctness of the MusicalModel.
 */

import { MusicalScore, MusicalMeasure } from '../models/MusicalModel';

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

  // Validate notes
  if (measure.notes.length === 0) {
    warnings.push({
      severity: 'warning',
      message: 'Measure has no notes',
      location
    });
  }

  measure.notes.forEach((note, noteIndex) => {
    const noteLocation = `${location}.notes[${noteIndex}]`;

    // Validate voice number
    if (note.voice <= 0) {
      errors.push({
        severity: 'error',
        message: `Invalid voice number: ${note.voice}`,
        location: noteLocation
      });
    }

    // Validate duration
    if (note.durationTicks <= 0) {
      errors.push({
        severity: 'error',
        message: `Note has invalid duration: ${note.durationTicks}`,
        location: noteLocation
      });
    }

    // Validate MIDI number
    if (note.midi < 0 || note.midi > 127) {
      errors.push({
        severity: 'error',
        message: `Invalid MIDI number: ${note.midi} (must be 0-127)`,
        location: noteLocation
      });
    }

    // Validate velocity
    if (note.velocity < 0 || note.velocity > 127) {
      errors.push({
        severity: 'error',
        message: `Invalid velocity: ${note.velocity} (must be 0-127)`,
        location: noteLocation
      });
    }

  });

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
