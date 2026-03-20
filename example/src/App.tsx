/**
 * App.tsx – Root component of the midi2musicxml example application.
 *
 * This app demonstrates the full midi2musicxml pipeline in the browser:
 *   1. The user selects a clef (piano, violin, viola, or cello).
 *   2. A local MIDI file is loaded via drag-and-drop or file picker.
 *   3. The MIDI data is converted to MusicXML using the midi2musicxml module.
 *   4. The resulting MusicXML is rendered as sheet music via OpenSheetMusicDisplay.
 */

import { useState, useRef, DragEvent, ChangeEvent, useCallback, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
import { midi2MusicXML } from '../../index.ts';
import { MusicXMLViewer } from './components/MusicXMLViewer';
import './App.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function App() {
  const [musicxml, setMusicxml] = useState<string | null>(null);
  const [status, setStatus]     = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  // Clef selection state
  const [clef, setClef] = useState<'piano' | 'violin' | 'viola' | 'cello'>('piano');
  // Store the last loaded MIDI buffer for re-conversion
  const lastMidiBuffer = useRef<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert MIDI buffer to MusicXML using the selected clef
  const convertBuffer = useCallback(async (buffer: ArrayBuffer, clefOverride?: typeof clef) => {
    const midi = new Midi(buffer);
    // Pass clef option to midi2MusicXML
    const { musicxml: xml } = midi2MusicXML(midi, { clef: clefOverride ?? clef });
    if (!xml) throw new Error('Conversion produced an empty score.');
    setMusicxml(xml);
    setStatus('success');
  }, [clef]);

  // Handle file input and store buffer for later re-conversion
  async function handleFile(file: File) {
    setStatus('loading');
    setErrorMsg('');
    try {
      const buffer = await file.arrayBuffer();
      lastMidiBuffer.current = buffer;
      await convertBuffer(buffer);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // When clef changes and a score is already loaded, re-convert with the new clef.
  // setStatus('loading') is called first, then the conversion is deferred to a new
  // macrotask via setTimeout so React can render the loading banner before the
  // synchronous midi2MusicXML computation blocks the main thread.
  useEffect(() => {
    if (musicxml && lastMidiBuffer.current) {
      setStatus('loading');
      const buf = lastMidiBuffer.current;
      setTimeout(() => {
        convertBuffer(buf, clef).catch(e => {
          setErrorMsg(e instanceof Error ? e.message : String(e));
          setStatus('error');
        });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clef]);

  // ── Render ───────────────────────────────────────────────────────────────

  const busy = status === 'loading';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Midi2MusicXML</h1>
        <p>Convert MIDI files to MusicXML and render them as sheet music</p>
      </header>


      <main className="App-main">
        {/* Clef selector */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <label htmlFor="clef-select" style={{ fontWeight: 500, marginRight: 8 }}>
            Select clef:
          </label>
          <select
            id="clef-select"
            value={clef}
            onChange={e => setClef(e.target.value as 'piano' | 'violin' | 'viola' | 'cello')}
            style={{ fontSize: '1rem', padding: '0.2em 0.6em', borderRadius: 4 }}
          >
            <option value="piano">Piano (Grand Staff)</option>
            <option value="violin">Violin (Treble)</option>
            <option value="viola">Viola (Alto)</option>
            <option value="cello">Cello (Bass)</option>
          </select>
        </div>

        {/* File drop zone */}
        <div
          className={`drop-zone${isDragging ? ' dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !busy && fileInputRef.current?.click()}
          role="button"
          aria-label="Drop MIDI file or click to browse"
        >
          <span className="drop-icon">🎵</span>
          <span>Drop a <code>.mid</code> file here, or click to browse</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>

        {/* ── Status messages ─────────────────────────────────────────────── */}
        {status === 'loading' && (
          <div className="status-banner loading">
            {musicxml ? 'Updating score for new clef…' : 'Converting MIDI to MusicXML…'}
          </div>
        )}
        {status === 'error' && (
          <div className="status-banner error">⚠ {errorMsg}</div>
        )}

        {/* ── Sheet music viewer ──────────────────────────────────────────── */}
        {musicxml && status === 'success' && (
          <div className="viewer-container">
            <MusicXMLViewer musicxml={musicxml} />
          </div>
        )}

      </main>
    </div>
  );
}
