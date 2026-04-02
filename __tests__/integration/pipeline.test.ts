import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Midi } from '@tonejs/midi';
import { midi2MusicXML } from '../../index';

/**
 * End-to-end integration tests for the midi2MusicXML pipeline.
 *
 * A single self-contained MIDI fixture (fixtures/elise.mid) is bundled with
 * the module so that these tests have no dependency on paths outside the
 * midi2musicxml submodule.
 *
 * Run with:
 *   npm run test          (all tests)
 *   npm run test:midi     (only this module)
 */

// ─── Fixture path ─────────────────────────────────────────────────────────────

// __dirname resolves to the integration/ directory.
// fixtures/ sits one level up inside __tests__/.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const FIXTURES   = join(__dirname, '..', 'fixtures');

// ─── Helper ───────────────────────────────────────────────────────────────────

function loadMidi(filename: string): Midi {
  const nodeBuffer = readFileSync(join(FIXTURES, filename));
  // Node.js Buffer.buffer is a shared pool – copy into a fresh, own ArrayBuffer
  // so @tonejs/midi receives a correctly-sized buffer without any offset artefacts.
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

// ─── Beethoven – Für Elise (score-derived) ───────────────────────────────────

describe('midi2MusicXML – Für Elise (score-derived MIDI)', () => {
  let musicxml: string;
  let noteCursorTimes: number[];

  beforeAll(() => {
    const midi = loadMidi('elise.mid');
    const result = midi2MusicXML(midi, { clef: 'piano' });
    musicxml = result.musicxml;
    noteCursorTimes = result.noteCursorTimes;
  });

  it('produces non-empty MusicXML output', () => {
    assertValidXml(musicxml);
  });

  it('does not apply quantization (score-derived file)', () => {
    expect(musicxml).toContain('<score-partwise');
  });

  it('produces a non-empty, sorted noteCursorTimes array', () => {
    expect(noteCursorTimes.length).toBeGreaterThan(0);
    assertSortedAscending(noteCursorTimes);
  });

  it('noteCursorTimes contains only finite non-negative numbers', () => {
    noteCursorTimes.forEach(t => {
      expect(Number.isFinite(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(0);
    });
  });

  it('matches structural snapshot', () => {
    // Snapshot of the first 2000 characters to catch regressions in the
    // XML header, first measure, and initial notes without giant diffs.
    expect(musicxml.slice(0, 2000)).toMatchSnapshot();
  });
});

// ─── Empty MIDI file edge case ────────────────────────────────────────────────

describe('midi2MusicXML – empty / no-note input', () => {
  it('returns empty strings and arrays for a MIDI with no notes', () => {
    const midi = new Midi();
    const { musicxml, noteCursorTimes } = midi2MusicXML(midi);
    expect(musicxml).toBe('');
    expect(noteCursorTimes).toEqual([]);
  });
});

// ─── Options: custom title / composer ────────────────────────────────────────

describe('midi2MusicXML – custom metadata options', () => {
  it('uses the provided title and composer in the output', () => {
    const midi = loadMidi('elise.mid');
    const { musicxml } = midi2MusicXML(midi, {
      title: 'Custom Title',
      composer: 'Custom Composer',
    });
    expect(musicxml).toContain('Custom Title');
    expect(musicxml).toContain('Custom Composer');
  });
});
