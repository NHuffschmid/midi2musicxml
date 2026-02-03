import { Midi } from '@tonejs/midi';

export function analyzeTempo(midi: Midi): number | undefined {
  if (midi.header.tempos && midi.header.tempos.length > 0) {
    return Math.round(midi.header.tempos[0].bpm);
  }
  return undefined;
}
