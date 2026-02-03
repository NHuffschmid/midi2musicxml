import { Midi } from '@tonejs/midi';

export function analyzeCopyright(midi: Midi): string | undefined {
  if (Array.isArray(midi.header.meta)) {
    const copyrightMeta = midi.header.meta.find(e => e.type === 'copyright' && typeof e.text === 'string');
    if (copyrightMeta) {
      return copyrightMeta.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }
  return undefined;
}
