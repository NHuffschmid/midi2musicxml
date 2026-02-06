import { Note } from '../types';

/**
 * Converts MIDI note duration (durationTicks) to MusicXML duration and type.
 * @param durationTicks
 * @param pulsesPerQuarterNote
 */
export function midiTicksToXmlDurationType(durationTicks: number, pulsesPerQuarterNote: number): { duration: number, type: string } {
  // Standard MusicXML types
  const typeMap = [
    { name: 'whole', factor: 4 },
    { name: 'half', factor: 2 },
    { name: 'quarter', factor: 1 },
    { name: 'eighth', factor: 0.5 },
    { name: '16th', factor: 0.25 },
    { name: '32nd', factor: 0.125 },
    { name: '64th', factor: 0.0625 },
  ];
  for (const entry of typeMap) {
    if (Math.abs(durationTicks - pulsesPerQuarterNote * entry.factor) < pulsesPerQuarterNote * 0.1) {
      return { duration: pulsesPerQuarterNote * entry.factor, type: entry.name };
    }
  }
  // Fallback: treat as quarter
  return { duration: pulsesPerQuarterNote, type: 'quarter' };
}
