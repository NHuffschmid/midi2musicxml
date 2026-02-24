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
  // Only allow up to one dot (no double/triple dotted notes)
  const filteredTypeMap = typeMap.filter(entry => entry.dots <= 1);
  let bestMatch = filteredTypeMap[0];
  let bestDiff = Math.abs(durationTicks - pulsesPerQuarterNote * bestMatch.factor);
  for (const entry of filteredTypeMap) {
    const diff = Math.abs(durationTicks - pulsesPerQuarterNote * entry.factor);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = entry;
    }
  }
  // Use relative tolerance: 20% of the expected duration (tolerant for human performance)
  // Minimum of 10% of a quarter note to handle small variations
  const tolerance = Math.max(pulsesPerQuarterNote * bestMatch.factor * 0.2, pulsesPerQuarterNote * 0.1);
  if (bestDiff < tolerance) {
    const type = bestMatch.name.startsWith('dotted ')
      ? bestMatch.name.replace('dotted ', '')
      : bestMatch.name;

    // Safety check: ensure dots never exceeds 1
    const safeDots = Math.min(bestMatch.dots, 1);

    //console.log(`[midiTicksToXmlDurationType] durationTicks=${durationTicks}, matched type=${type}, dots=${safeDots}, duration=${pulsesPerQuarterNote * bestMatch.factor}`);

    return {
      duration: pulsesPerQuarterNote * bestMatch.factor,
      type,
      dots: safeDots,
    };
  }
  // Fallback: treat as quarter
  //console.warn(
  //  `midiTicksToXmlDurationType: Unmatched durationTicks=${durationTicks}, pulsesPerQuarterNote=${pulsesPerQuarterNote}. Falling back to quarter note.`
  //);
  return { duration: pulsesPerQuarterNote, type: 'quarter', dots: 0 };
}
