import { Midi } from '@tonejs/midi';
import { midi2MusicXML } from './index';

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { midiBytes, title, composer } = event.data;

  try {
    // Parse MIDI from bytes
    const midi = new Midi(midiBytes);

    // Convert to MusicXML (synchronous in worker)
    const xml = midi2MusicXML(midi, title, composer);

    // Send result back
    self.postMessage({ success: true, xml });
  }
  catch (error) {
    console.error('[Worker Thread] Error:', error);
    self.postMessage({ success: false, error: (error as Error).message });
  }
};
