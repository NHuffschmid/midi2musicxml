import { useState, useRef, DragEvent, ChangeEvent } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Core conversion ──────────────────────────────────────────────────────

  async function convertBuffer(buffer: ArrayBuffer) {
    const midi = new Midi(buffer);
    const { musicxml: xml } = midi2MusicXML(midi);
    if (!xml) throw new Error('Conversion produced an empty score.');
    setMusicxml(xml);
    setStatus('success');
  }

  // ── File source ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setStatus('loading');
    setErrorMsg('');
    try {
      await convertBuffer(await file.arrayBuffer());
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

  // ── Render ───────────────────────────────────────────────────────────────

  const busy = status === 'loading';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Midi2MusicXML</h1>
        <p>Convert MIDI files to MusicXML and render them as sheet music</p>
      </header>

      <main className="App-main">

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
          <div className="status-banner loading">Converting MIDI to MusicXML…</div>
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
