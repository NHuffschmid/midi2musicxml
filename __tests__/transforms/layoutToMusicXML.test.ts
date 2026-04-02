import { describe, it, expect } from 'vitest';
import { layoutToMusicXML } from '../../transforms/layoutToMusicXML';
import { musicXMLToString } from '../../transforms/musicXMLToString';
import type { LayoutScore, LayoutNote } from '../../models/LayoutModel';

/**
 * Unit tests covering both layoutToMusicXML (Stage 4 → 5) and
 * musicXMLToString (Stage 5 → 6) because the XML string tests require
 * a fully initialised MusicXMLDocument.
 *
 * layoutToMusicXML tests – verify the in-memory MusicXMLDocument structure.
 * musicXMLToString tests  – verify the serialised XML string.
 */

// ─── Shared factory ───────────────────────────────────────────────────────────

function makeLayout(notes: LayoutNote[] = [], opts: Partial<LayoutScore> = {}): LayoutScore {
  return {
    title: opts.title,
    composer: opts.composer,
    copyright: opts.copyright,
    parts: [
      {
        id: 'P1',
        name: 'Piano',
        staffCount: 1,
        clefs: [{ sign: 'G', line: 2 }],
        measures: [
          {
            number: 1,
            timeSignature: { beats: 4, beatType: 4 },
            keySignature: { fifths: 0, mode: 'major' },
            tempo: 120,
            staves: [{ number: 1, notes }],
          },
        ],
      },
    ],
  };
}

function makeLayoutNote(
  step: string,
  octave: number,
  alter: number,
  startTick: number,
  type = 'quarter',
  dots = 0,
): LayoutNote {
  return {
    pitch: { step: step as LayoutNote['pitch']['step'], alter, octave },
    type: type as LayoutNote['type'],
    dots,
    startTick,
    durationTicks: 480,
  };
}

// ─── layoutToMusicXML ─────────────────────────────────────────────────────────

describe('layoutToMusicXML', () => {

  it('sets document version to 3.1', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    expect(doc.version).toBe('3.1');
  });

  it('includes divisions in the first measure attributes', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    expect(doc.scorePartwise.parts[0].measures[0].attributes?.divisions).toBe(480);
  });

  it('includes key signature in the first measure', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    expect(doc.scorePartwise.parts[0].measures[0].attributes?.key?.fifths).toBe(0);
    expect(doc.scorePartwise.parts[0].measures[0].attributes?.key?.mode).toBe('major');
  });

  it('includes time signature in the first measure', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    const time = doc.scorePartwise.parts[0].measures[0].attributes?.time;
    expect(time?.beats).toBe(4);
    expect(time?.beatType).toBe(4);
  });

  it('includes clef in the first measure', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    const clef = doc.scorePartwise.parts[0].measures[0].attributes?.clef;
    expect(clef).toBeDefined();
    expect(clef?.[0]?.sign).toBe('G');
  });

  it('populates the part list with the correct part ID', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    expect(doc.scorePartwise.partList.scoreParts[0].id).toBe('P1');
  });

  it('transfers note pitch correctly', () => {
    const notes = [makeLayoutNote('G', 4, 0, 0)];
    const doc = layoutToMusicXML(makeLayout(notes), { divisions: 480 });
    const note = doc.scorePartwise.parts[0].measures[0].notes[0];
    expect(note.pitch.step).toBe('G');
    expect(note.pitch.octave).toBe(4);
  });

  it('omits alter for natural notes (alter=0)', () => {
    const notes = [makeLayoutNote('C', 4, 0, 0)];
    const doc = layoutToMusicXML(makeLayout(notes), { divisions: 480 });
    const note = doc.scorePartwise.parts[0].measures[0].notes[0];
    expect(note.pitch.alter).toBeUndefined();
  });

  it('includes alter for accidental notes (alter≠0)', () => {
    const notes = [makeLayoutNote('F', 4, 1, 0)]; // F#
    const doc = layoutToMusicXML(makeLayout(notes), { divisions: 480 });
    const note = doc.scorePartwise.parts[0].measures[0].notes[0];
    expect(note.pitch.alter).toBe(1);
  });

  it('assigns a direction with tempo text in the first measure', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    expect(doc.scorePartwise.parts[0].measures[0].direction).toBeDefined();
    const dir = doc.scorePartwise.parts[0].measures[0].direction![0];
    expect(dir.sound?.tempo).toBe(120);
  });

  it('emits a work title when the layout has a title', () => {
    const doc = layoutToMusicXML(makeLayout([], { title: 'Nocturne' }), { divisions: 480 });
    expect(doc.scorePartwise.work?.workTitle).toBe('Nocturne');
  });

  // ── Beam assignment ───────────────────────────────────────────────────────

  it('adds beam elements to consecutive beamable (eighth) notes in the same beat', () => {
    const eighthNotes = [
      makeLayoutNote('C', 4, 0, 0,   'eighth'),
      makeLayoutNote('D', 4, 0, 240, 'eighth'),
    ];
    const doc = layoutToMusicXML(makeLayout(eighthNotes), { divisions: 480 });
    const notes = doc.scorePartwise.parts[0].measures[0].notes;
    expect(notes[0].beam?.[0]?.type).toBe('begin');
    expect(notes[1].beam?.[0]?.type).toBe('end');
  });

  it('does NOT add beam elements to non-beamable (quarter) notes', () => {
    const quarterNotes = [
      makeLayoutNote('C', 4, 0, 0),
      makeLayoutNote('D', 4, 0, 480),
    ];
    const doc = layoutToMusicXML(makeLayout(quarterNotes), { divisions: 480 });
    const notes = doc.scorePartwise.parts[0].measures[0].notes;
    notes.forEach(n => expect(n.beam).toBeUndefined());
  });
});

// ─── musicXMLToString ─────────────────────────────────────────────────────────

describe('musicXMLToString', () => {

  it('starts with the XML declaration', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    const xml = musicXMLToString(doc);
    expect(xml).toMatch(/^<\?xml version="1\.0"/);
  });

  it('contains a <score-partwise> root element', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    const xml = musicXMLToString(doc);
    expect(xml).toContain('<score-partwise');
    expect(xml).toContain('</score-partwise>');
  });

  it('contains the <part-list> and <score-part> elements', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    const xml = musicXMLToString(doc);
    expect(xml).toContain('<part-list>');
    expect(xml).toContain('<score-part id="P1">');
  });

  it('contains note pitch elements for a C4 quarter note', () => {
    const notes = [makeLayoutNote('C', 4, 0, 0)];
    const doc = layoutToMusicXML(makeLayout(notes), { divisions: 480 });
    const xml = musicXMLToString(doc);
    expect(xml).toContain('<step>C</step>');
    expect(xml).toContain('<octave>4</octave>');
    expect(xml).toContain('<type>quarter</type>');
  });

  it('escapes XML special characters in the work title', () => {
    const doc = layoutToMusicXML(
      makeLayout([], { title: 'Prelude & Fugue <No. 1>' }),
      { divisions: 480 },
    );
    const xml = musicXMLToString(doc);
    expect(xml).toContain('Prelude &amp; Fugue &lt;No. 1&gt;');
    expect(xml).not.toContain('<No. 1>');
  });

  it('escapes ampersands in copyright text', () => {
    const doc = layoutToMusicXML(
      makeLayout([], { copyright: 'Copyright © Composer & Publisher' }),
      { divisions: 480 },
    );
    const xml = musicXMLToString(doc);
    expect(xml).toContain('Composer &amp; Publisher');
  });

  it('includes <divisions> in the first measure', () => {
    const doc = layoutToMusicXML(makeLayout(), { divisions: 480 });
    const xml = musicXMLToString(doc);
    expect(xml).toContain('<divisions>480</divisions>');
  });
});
