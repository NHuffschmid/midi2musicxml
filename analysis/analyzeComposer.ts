import { Midi } from '@tonejs/midi';

export function analyzeComposer(midi: Midi): string | undefined {
  if (Array.isArray(midi.header.meta)) {
    const composerMeta = midi.header.meta.find(e => (e.type === 'composer' || e.type === 'text') && typeof e.text === 'string');
    if (composerMeta) return composerMeta.text;
  }
  return undefined;
}
