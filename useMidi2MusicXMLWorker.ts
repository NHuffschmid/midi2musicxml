import { useRef, useCallback } from 'react';
import { Midi } from '@tonejs/midi';

export function useMidi2MusicXMLWorker() {
  const workerRef = useRef<Worker | null>(null);

  const convert = useCallback(async (midi: Midi, title?: string, composer?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('[Midi2MusicXMLWorker] Starting midi2MusicXML conversion in Web Worker');
      
      // Terminate existing worker if any
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      // Create new worker
      const worker = new Worker(
        new URL('../../workers/midi2MusicXML.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      // Listen for response
      worker.onmessage = (event: MessageEvent) => {
        const { success, xml, error } = event.data;
        console.log('[Midi2MusicXMLWorker] Received response from worker, success:', success);
        
        if (success) {
          resolve(xml);
        } else {
          reject(new Error(error));
        }
        
        // Cleanup
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = (error) => {
        console.error('[Midi2MusicXMLWorker] Worker error:', error);
        reject(error);
        worker.terminate();
        workerRef.current = null;
      };

      // Send MIDI data to worker
      const midiBytes = midi.toArray();
      worker.postMessage({ midiBytes, title, composer });
    });
  }, []);

  return convert;
}
