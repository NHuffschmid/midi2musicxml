import { Midi } from '@tonejs/midi';
import { midi2MusicXML } from '../index';

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { midiBytes, options } = event.data;

  try {
    // Parse MIDI from bytes
    const midi = new Midi(midiBytes);

    // Convert to MusicXML (synchronous in worker)
    const { musicxml, noteCursorTimes } = midi2MusicXML(midi, options);

    // Send result back
    self.postMessage({ success: true, musicxml: musicxml, noteCursorTimes });
  }
  catch (error) {
    console.error('[Worker Thread] Error:', error);
    self.postMessage({ success: false, error: (error as Error).message });
  }
};
