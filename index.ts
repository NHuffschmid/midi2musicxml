import { Midi } from '@tonejs/midi';
import { analyzeTitle } from './analysis/analyzeTitle';
import { analyzeComposer } from './analysis/analyzeComposer';
import { analyzeCopyright } from './analysis/analyzeCopyright';
import { collectMidiNotes } from './utils/collectMidiNotes';
import { midiToTemporal } from './transforms/midiToTemporal';
import { temporalToMusical } from './transforms/temporalToMusical';
import { musicalToNotation } from './transforms/musicalToNotation';
import { notationToLayout, InstrumentType } from './transforms/notationToLayout';
import { layoutToMusicXML } from './transforms/layoutToMusicXML';
import { musicXMLToString } from './transforms/musicXMLToString';
import {
  dumpTemporalModel, prettyPrintTemporalModel,
  dumpMusicalModel, prettyPrintMusicalModel,
  dumpNotationModel, prettyPrintNotationModel,
  dumpLayoutModel, prettyPrintLayoutModel,
  dumpMusicXMLModel, prettyPrintMusicXMLModel
} from './debug';
import xmlFormatter from 'xml-formatter';
import { MidiNote } from './types';

// Re-export types for backwards compatibility
export type { ClefType } from './types';

export interface Midi2MusicXMLOptions {
  title?: string;
  composer?: string;
  clef?: 'piano' | 'violin' | 'viola' | 'cello';
}

/**
 * Convert MIDI to MusicXML using 7-stage pipeline architecture:
 * 
 * Stage 1: MIDI (tonejs) - Raw MIDI data
 * Stage 2: TemporalModel - Time-based structure (sections, measures)
 * Stage 3: MusicalModel - Musical semantics (voices, notes, rests)
 * Stage 4: NotationModel - Notation decisions (beaming, stems)
 * Stage 5: LayoutModel - Layout decisions (staves, systems)
 * Stage 6: MusicXMLModel - MusicXML DOM structure
 * Stage 7: XML String - Serialized output
 */
export function midi2MusicXML(
  midi: Midi,
  options: Midi2MusicXMLOptions = {}
): string {

  // Extract metadata
  const scoreTitle = options.title ?? analyzeTitle(midi);
  const scoreComposer = options.composer ?? analyzeComposer(midi);
  const copyright = analyzeCopyright(midi);
  const pulsesPerQuarterNote = midi.header.ppq || 480;

  // Stage 1: Collect MIDI notes
  const midiNotes: MidiNote[] = collectMidiNotes(midi);
  if (midiNotes.length === 0) return '';

  // Stage 2: MIDI → TemporalModel
  const temporalScore = midiToTemporal(midiNotes, midi, {
    title: scoreTitle,
    composer: scoreComposer,
    copyright
  });
  const temporalDump = dumpTemporalModel(temporalScore);
  const temporalPrettyPrint = prettyPrintTemporalModel(temporalScore);

  // Stage 3: TemporalModel → MusicalModel
  const musicalScore = temporalToMusical(temporalScore);
  const musicalDump = dumpMusicalModel(musicalScore);
  const musicalPrettyPrint = prettyPrintMusicalModel(musicalScore);

  // Stage 4: MusicalModel → NotationModel
  const notationScore = musicalToNotation(musicalScore, {
    pulsesPerQuarterNote
  });
  const notationDump = dumpNotationModel(notationScore);
  const notationPrettyPrint = prettyPrintNotationModel(notationScore);

  // Stage 5: NotationModel → LayoutModel
  const instrument: InstrumentType = options.clef ?? 'piano';
  const layoutScore = notationToLayout(notationScore, {
    instrument
  });
  const layoutDump = dumpLayoutModel(layoutScore);
  const layoutPrettyPrint = prettyPrintLayoutModel(layoutScore);

  // Stage 6: LayoutModel → MusicXMLModel
  const musicXMLDoc = layoutToMusicXML(layoutScore, {
    divisions: pulsesPerQuarterNote
  });
  const musicXMLDump = dumpMusicXMLModel(musicXMLDoc);
  const musicXMLPrettyPrint = prettyPrintMusicXMLModel(musicXMLDoc);

  // Stage 7: MusicXMLModel → XML String
  let musicXml = musicXMLToString(musicXMLDoc);

  // Format and beautify XML
  musicXml = xmlFormatter(musicXml, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n'
  });

  // Setup MusicXML test output (Of foreign countries and people - measure 10)
  const testMusicXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>MusicXML test</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <key>
          <fifths>1</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>2</beats>
          <beat-type>4</beat-type>
        </time>
        <staves>2</staves>
        <clef number="1">
          <sign>G</sign>
          <line>2</line>
        </clef>
        <clef number="2">
          <sign>F</sign>
          <line>4</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <words font-size="10pt">♩ = 68</words>
        </direction-type>
        <sound tempo="68"/>
      </direction>

      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>480</duration>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <alter>1</alter>
          <octave>4</octave>
        </pitch>
        <duration>480</duration>
        <type>quarter</type>
        <chord/>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>480</duration>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>480</duration>
        <type>quarter</type>
        <chord/>
        <staff>1</staff>
      </note>

      <backup>
        <duration>960</duration>
      </backup>

      <note>
        <pitch>
          <step>D</step>
          <octave>3</octave>
        </pitch>
        <duration>160</duration>
        <type>eighth</type>
        <dot/>
        <staff>2</staff>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
        </time-modification>
        <notations>
          <tuplet type="start" number="1"/>
        </notations>
        <!--beam number="1">begin</beam-->
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>3</octave>
        </pitch>
        <duration>160</duration>
        <type>eighth</type>
        <staff>2</staff>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
        </time-modification>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>160</duration>
        <type>eighth</type>
        <staff>2</staff>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
        </time-modification>
        <notations>
          <tuplet type="stop" number="1"/>
        </notations>
      </note>
      <backup>
        <duration>120</duration>
      </backup>
      <note>
        <pitch>
          <step>C</step>
          <octave>3</octave>
        </pitch>
        <duration>120</duration>
        <type>16th</type>
        <staff>2</staff>
        <voice>2</voice>
        <!--beam number="1">end</beam-->
      </note>

      <note>
        <pitch>
          <step>B</step>
          <octave>2</octave>
        </pitch>
        <duration>160</duration>
        <type>eighth</type>
        <staff>2</staff>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
        </time-modification>
        <notations>
          <tuplet type="start" number="1"/>
        </notations>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>3</octave>
        </pitch>
        <duration>160</duration>
        <type>eighth</type>
        <staff>2</staff>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
        </time-modification>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>160</duration>
        <type>eighth</type>
        <staff>2</staff>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
        </time-modification>
        <notations>
          <tuplet type="stop" number="1"/>
        </notations>
      </note>
    </measure>
  </part>
</score-partwise>`.trim();

  musicXml = testMusicXml;

  return musicXml;
}
