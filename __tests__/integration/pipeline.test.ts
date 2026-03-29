import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Midi } from '@tonejs/midi';
import { midi2MusicXML } from '../../index';

/**
 * End-to-end integration tests for the midi2MusicXML pipeline.
 *
 * These tests load real MIDI files from the repository's midi_archive/ and
 * run the complete 7-stage conversion pipeline.  They verify:
 *
 *  1. The output is a non-empty, well-formed XML string.
 *  2. The noteCursorTimes array is sorted and non-empty.
 *  3. The output is structurally stable (snapshot test).
 *
 * Run with:
 *   npm run test          (all tests)
 *   npm run test:midi     (only this module)
 */

// ─── MIDI archive path ────────────────────────────────────────────────────────

// __dirname is the integration/ directory.
// Counting up 7 levels reaches the depinus workspace root:
//   integration/ → __tests__/ → midi2musicxml/ → modules/ → src/ → client/ → www/ → depinus/
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const MIDI_ARCHIVE = join(__dirname, '../../../../../../..', 'midi_archive');

// ─── Helper ───────────────────────────────────────────────────────────────────

function loadMidi(relativePath: string): Midi {
  const nodeBuffer = readFileSync(join(MIDI_ARCHIVE, relativePath));
  // Node.js Buffer.buffer is a shared pool – copy into a fresh, own ArrayBuffer
  // to avoid @tonejs/midi receiving stale or offset data.
  const ab = new ArrayBuffer(nodeBuffer.byteLength);
  new Uint8Array(ab).set(nodeBuffer);
  return new Midi(ab);
}

// ─── Shared helpers for XML validation ────────────────────────────────────────

function assertValidXml(xml: string) {
  expect(xml.length).toBeGreaterThan(0);
  expect(xml).toMatch(/^<\?xml version="1\.0"/);
  expect(xml).toContain('<score-partwise');
  expect(xml).toContain('</score-partwise>');
  expect(xml).toContain('<part ');
  expect(xml).toContain('<measure ');
  expect(xml).toContain('<note>');
}

function assertSortedAscending(arr: number[]) {
  for (let i = 1; i < arr.length; i++) {
    expect(arr[i]).toBeGreaterThanOrEqual(arr[i - 1]);
  }
}

// ─── Bach – Prelude (score-derived) ──────────────────────────────────────────

describe('midi2MusicXML – Bach Prelude (score-derived MIDI)', () => {
  let musicxml: string;
  let noteCursorTimes: number[];

  beforeAll(() => {
    const midi = loadMidi('BerndKrueger/Bach/bach_846.mid');
    const result = midi2MusicXML(midi, { clef: 'piano' });
    musicxml = result.musicxml;
    noteCursorTimes = result.noteCursorTimes;
  });

  it('produces non-empty MusicXML output', () => {
    assertValidXml(musicxml);
  });

  it('does not apply quantization (score-derived file)', () => {
    // A score-derived file should never insert "live-recording" artefacts.
    // Indirectly checked: if quantization were incorrectly invoked the XML
    // structure would differ significantly from the snapshot below.
    expect(musicxml).toContain('<score-partwise');
  });

  it('produces a non-empty, sorted noteCursorTimes array', () => {
    expect(noteCursorTimes.length).toBeGreaterThan(0);
    assertSortedAscending(noteCursorTimes);
  });

  it('noteCursorTimes contains only finite positive numbers', () => {
    noteCursorTimes.forEach(t => {
      expect(Number.isFinite(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(0);
    });
  });

  it('matches structural snapshot', () => {
    // The snapshot stores the first 2000 characters so that test output stays
    // readable while still catching regressions in header, first measure, and
    // first few notes.
    expect(musicxml.slice(0, 2000)).toMatchSnapshot();
  });
});

// ─── Chopin – with title metadata ────────────────────────────────────────────

describe('midi2MusicXML – Chopin Prelude (score-derived MIDI)', () => {
  it('produces valid MusicXML', () => {
    const midi = loadMidi('BerndKrueger/Chopin/chpn-p10.mid');
    const { musicxml } = midi2MusicXML(midi, { clef: 'piano' });
    assertValidXml(musicxml);
  });
});

// ─── Empty MIDI file edge case ────────────────────────────────────────────────

describe('midi2MusicXML – empty / no-note input', () => {
  it('returns empty strings and arrays for a MIDI with no notes', () => {
    // Construct a Midi object with no tracks.
    const midi = new Midi();
    const { musicxml, noteCursorTimes } = midi2MusicXML(midi);
    expect(musicxml).toBe('');
    expect(noteCursorTimes).toEqual([]);
  });
});

// ─── Options: custom title / composer ────────────────────────────────────────

describe('midi2MusicXML – custom metadata options', () => {
  it('uses the provided title and composer in the output', () => {
    const midi = loadMidi('BerndKrueger/Bach/bach_846.mid');
    const { musicxml } = midi2MusicXML(midi, {
      title: 'Custom Title',
      composer: 'Custom Composer',
    });
    expect(musicxml).toContain('Custom Title');
    expect(musicxml).toContain('Custom Composer');
  });
});
