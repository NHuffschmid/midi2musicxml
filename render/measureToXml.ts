import { Section, RenderMeasure, MidiMeasure } from '../types';
import { noteToXml } from './noteToXml';
import { midiNoteToPitch } from '../utils/midiNoteToPitch';
import { midiTicksToXmlDurationType } from '../utils/midiTicksToXmlDurationType';

export function measureToXml(measure: MidiMeasure, section: Section, pulsesPerQuarterNote: number): string {
    // Check if this is the first measure by looking at the temporary measures array
    const measures = section.measures;
    const isFirstMeasure = measures && measures[0] === measure;
    
    // Get section properties or use defaults
    const key = section.key ?? '0M';
    const time = section.time ?? { beats: 4, beatType: 4 };
    const tempo = section.tempo ?? 120;
    
    let attrXml = '';
    let directionXml = '';
    
    if (isFirstMeasure) {
        // Parse key format "2M" or "2m" → fifths and mode
        const keyMatch = key.match(/^([+-]?\d+)([Mm])$/);
        const fifths = keyMatch ? parseInt(keyMatch[1]) : 0;
        const mode = keyMatch && keyMatch[2] === 'm' ? 'minor' : 'major';
        
        // divisions = pulsesPerQuarterNote (duration units per quarter note)
        const divisions = pulsesPerQuarterNote;
        
        attrXml = `  <attributes>
    <divisions>${divisions}</divisions>
    <key>
      <fifths>${fifths}</fifths>
      <mode>${mode}</mode>
    </key>
    <time>
      <beats>${time.beats}</beats>
      <beat-type>${time.beatType}</beat-type>
    </time>
    <clef>
      <sign>G</sign>
      <line>2</line>
    </clef>
  </attributes>`;

        directionXml = `  <direction placement="above">
    <direction-type>
      <metronome>
        <beat-unit>quarter</beat-unit>
        <per-minute>${tempo}</per-minute>
      </metronome>
    </direction-type>
  </direction>`;
    }
    
    // Convert all MIDI notes in this measure to MusicXML
    const notesXml = measure.notes.map(midiNote => {
        const { step, alter, octave } = midiNoteToPitch(midiNote.midi);
        const { duration, type, dots } = midiTicksToXmlDurationType(
            midiNote.durationTicks,
            pulsesPerQuarterNote
        );
        
        const alterXml = alter !== undefined && alter !== 0 
            ? `    <alter>${alter}</alter>\n` 
            : '';
        const dotXml = dots > 0 ? '\n  ' + '<dot/>'.repeat(dots) : '';
        
        return `  <note>
    <pitch>
      <step>${step}</step>
${alterXml}      <octave>${octave}</octave>
    </pitch>
    <duration>${duration}</duration>
    <type>${type}</type>${dotXml}
  </note>`;
    }).join('\n');
    
    // Combine all parts
    const measureContent = [attrXml, directionXml, notesXml]
        .filter(s => s.length > 0)
        .join('\n');
    
    const measureNumber = measures.indexOf(measure) + 1;
    
    return `<measure number="${measureNumber}">
${measureContent}
</measure>`;
}
