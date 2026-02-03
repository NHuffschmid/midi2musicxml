import { Midi } from '@tonejs/midi';

export function analyzeTitle(midi: Midi): string | undefined {
  // 1. Try global name meta event
  if (Array.isArray(midi.header.meta)) {
    const titleMeta = midi.header.meta.find(e => e.type === 'name' && typeof e.text === 'string');
    if (titleMeta) return titleMeta.text;
  }
  // 2. Try midi.header.name
  if (typeof midi.header.name === 'string' && midi.header.name.length > 0) {
    return midi.header.name;
  }
  return undefined;
}
