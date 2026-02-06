import { Note } from '../types';

/**
 * Converts MIDI note duration (durationTicks) to MusicXML duration and type.
 * @param durationTicks
 * @param pulsesPerQuarterNote
 */
export function midiTicksToXmlDurationType(
  durationTicks: number,
  pulsesPerQuarterNote: number
): { duration: number; type: string; dots: number } {
  // Standard and dotted MusicXML types
  const typeMap = [
    { name: 'whole', factor: 4, dots: 0 },
    { name: 'dotted half', factor: 3, dots: 1 },
    { name: 'half', factor: 2, dots: 0 },
    { name: 'dotted quarter', factor: 1.5, dots: 1 },
    { name: 'quarter', factor: 1, dots: 0 },
    { name: 'dotted eighth', factor: 0.75, dots: 1 },
    { name: 'eighth', factor: 0.5, dots: 0 },
    { name: 'dotted 16th', factor: 0.375, dots: 1 },
    { name: '16th', factor: 0.25, dots: 0 },
    { name: 'dotted 32nd', factor: 0.1875, dots: 1 },
    { name: '32nd', factor: 0.125, dots: 0 },
    { name: 'dotted 64th', factor: 0.09375, dots: 1 },
    { name: '64th', factor: 0.0625, dots: 0 },
  ];
  for (const entry of typeMap) {
    if (Math.abs(durationTicks - pulsesPerQuarterNote * entry.factor) < pulsesPerQuarterNote * 0.1) {
      // Remove 'dotted ' prefix for MusicXML type
      const type = entry.name.startsWith('dotted ')
        ? entry.name.replace('dotted ', '')
        : entry.name;
      return {
        duration: pulsesPerQuarterNote * entry.factor,
        type,
        dots: entry.dots,
      };
    }
  }
  // Fallback: treat as quarter
  console.warn(
    `midiTicksToXmlDurationType: Unmatched durationTicks=${durationTicks}, pulsesPerQuarterNote=${pulsesPerQuarterNote}. Falling back to quarter note.`
  );
  return { duration: pulsesPerQuarterNote, type: 'quarter', dots: 0 };
}
