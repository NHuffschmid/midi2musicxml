/**
 * Transform: MusicXMLModel → XML String
 * 
 * Serializes MusicXML DOM structure to XML string.
 */

import {
  MusicXMLDocument,
  ScorePartwise,
  Part,
  Measure,
  Attributes,
  NoteElement,
  Direction,
  Clef,
  Key,
  Time,
  Print,
  Barline
} from '../models/MusicXMLModel';

/**
 * Main serialize function: MusicXMLModel → XML String
 */
export function musicXMLToString(doc: MusicXMLDocument): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  xml += `<score-partwise version="${doc.version}">\n`;
  xml += serializeScorePartwise(doc.scorePartwise);
  xml += `</score-partwise>`;
  return xml;
}

/**
 * Serialize score-partwise element
 */
function serializeScorePartwise(score: ScorePartwise): string {
  let xml = '';

  // Work
  if (score.work?.workTitle) {
    xml += `  <work>\n`;
    xml += `    <work-title>${escapeXml(score.work.workTitle)}</work-title>\n`;
    xml += `  </work>\n`;
  }

  // Identification
  if (score.identification) {
    xml += `  <identification>\n`;
    if (score.identification.creator) {
      for (const creator of score.identification.creator) {
        xml += `    <creator type="${creator.type}">${escapeXml(creator.name)}</creator>\n`;
      }
    }
    if (score.identification.rights) {
      xml += `    <rights>${escapeXml(score.identification.rights)}</rights>\n`;
    }
    xml += `  </identification>\n`;
  }

  // Part list
  xml += `  <part-list>\n`;
  for (const scorePart of score.partList.scoreParts) {
    xml += `    <score-part id="${scorePart.id}">\n`;
    const preserveSpace = scorePart.partName.trim() === '' && scorePart.partName.length > 0;
    xml += `      <part-name${preserveSpace ? ' xml:space="preserve"' : ''}>${escapeXml(scorePart.partName)}</part-name>\n`;
    xml += `    </score-part>\n`;
  }
  xml += `  </part-list>\n`;

  // Parts
  for (const part of score.parts) {
    xml += serializePart(part);
  }

  return xml;
}

/**
 * Serialize part element
 */
function serializePart(part: Part): string {
  let xml = `  <part id="${part.id}">\n`;
  
  for (const measure of part.measures) {
    xml += serializeMeasure(measure);
  }
  
  xml += `  </part>\n`;
  return xml;
}

/**
 * Serialize measure element
 */
function serializeMeasure(measure: Measure): string {
  let xml = `    <measure number="${measure.number}">\n`;

  // Print
  if (measure.print) {
    xml += serializePrint(measure.print);
  }

  // Barline (left side)
  if (measure.barline) {
    for (const barline of measure.barline) {
      if (barline.location === 'left') {
        xml += serializeBarline(barline);
      }
    }
  }

  // Attributes
  if (measure.attributes) {
    xml += serializeAttributes(measure.attributes);
  }

  // Directions
  if (measure.direction) {
    for (const direction of measure.direction) {
      xml += serializeDirection(direction);
    }
  }

  // Notes
  for (const note of measure.notes) {
    xml += serializeNote(note);
  }

  // Backup
  if (measure.backup) {
    for (const backup of measure.backup) {
      xml += `      <backup>\n`;
      xml += `        <duration>${backup.duration}</duration>\n`;
      xml += `      </backup>\n`;
    }
  }

  // Barline (right/middle side)
  if (measure.barline) {
    for (const barline of measure.barline) {
      if (barline.location !== 'left') {
        xml += serializeBarline(barline);
      }
    }
  }

  xml += `    </measure>\n`;
  return xml;
}

/**
 * Serialize attributes element
 */
function serializeAttributes(attr: Attributes): string {
  let xml = `      <attributes>\n`;

  if (attr.divisions !== undefined) {
    xml += `        <divisions>${attr.divisions}</divisions>\n`;
  }

  if (attr.key) {
    xml += serializeKey(attr.key);
  }

  if (attr.time) {
    xml += serializeTime(attr.time);
  }

  if (attr.staves !== undefined) {
    xml += `        <staves>${attr.staves}</staves>\n`;
  }

  if (attr.clef) {
    for (const clef of attr.clef) {
      xml += serializeClef(clef);
    }
  }

  xml += `      </attributes>\n`;
  return xml;
}

/**
 * Serialize key element
 */
function serializeKey(key: Key): string {
  let xml = `        <key>\n`;
  xml += `          <fifths>${key.fifths}</fifths>\n`;
  if (key.mode) {
    xml += `          <mode>${key.mode}</mode>\n`;
  }
  xml += `        </key>\n`;
  return xml;
}

/**
 * Serialize time element
 */
function serializeTime(time: Time): string {
  let xml = `        <time>\n`;
  xml += `          <beats>${time.beats}</beats>\n`;
  xml += `          <beat-type>${time.beatType}</beat-type>\n`;
  xml += `        </time>\n`;
  return xml;
}

/**
 * Serialize clef element
 */
function serializeClef(clef: Clef): string {
  let xml = `        <clef`;
  if (clef.number !== undefined) {
    xml += ` number="${clef.number}"`;
  }
  xml += `>\n`;
  xml += `          <sign>${clef.sign}</sign>\n`;
  if (clef.line !== undefined) {
    xml += `          <line>${clef.line}</line>\n`;
  }
  if (clef.clefOctaveChange !== undefined) {
    xml += `          <clef-octave-change>${clef.clefOctaveChange}</clef-octave-change>\n`;
  }
  xml += `        </clef>\n`;
  return xml;
}

/**
 * Serialize direction element
 */
function serializeDirection(direction: Direction): string {
  let xml = `      <direction`;
  if (direction.placement) {
    xml += ` placement="${direction.placement}"`;
  }
  xml += `>\n`;

  for (const dirType of direction.directionType) {
    xml += `        <direction-type>\n`;
    
    if (dirType.words) {
      let wordsXml = `          <words`;
      if (dirType.words.fontSize) {
        wordsXml += ` font-size="${dirType.words.fontSize}"`;
      }
      if (dirType.words.color) {
        wordsXml += ` color="${dirType.words.color}"`;
      }
      wordsXml += `>${escapeXml(dirType.words.text)}</words>\n`;
      xml += wordsXml;
    }

    if (dirType.pedal) {
      let pedalXml = `          <pedal type="${dirType.pedal.type}"`;
      if (dirType.pedal.line !== undefined) {
        pedalXml += ` line="${dirType.pedal.line ? 'yes' : 'no'}"`;
      }
      pedalXml += `/>\n`;
      xml += pedalXml;
    }

    xml += `        </direction-type>\n`;
  }

  if (direction.sound?.tempo !== undefined) {
    xml += `        <sound tempo="${direction.sound.tempo}"/>\n`;
  }

  xml += `      </direction>\n`;
  return xml;
}

/**
 * Serialize note element
 */
function serializeNote(note: NoteElement): string {
  let xml = `      <note>\n`;

  // Chord
  if (note.chord) {
    xml += `        <chord/>\n`;
  }

  // Pitch or Rest
  if (note.pitch) {
    xml += `        <pitch>\n`;
    xml += `          <step>${note.pitch.step}</step>\n`;
    if (note.pitch.alter !== undefined) {
      xml += `          <alter>${note.pitch.alter}</alter>\n`;
    }
    xml += `          <octave>${note.pitch.octave}</octave>\n`;
    xml += `        </pitch>\n`;
  } else if (note.rest) {
    if (note.rest.measure) {
      xml += `        <rest measure="yes"/>\n`;
    } else {
      xml += `        <rest/>\n`;
    }
  }

  // Duration
  xml += `        <duration>${note.duration}</duration>\n`;

  // Voice
  if (note.voice !== undefined) {
    xml += `        <voice>${note.voice}</voice>\n`;
  }

  // Type
  xml += `        <type>${note.type}</type>\n`;

  // Dots
  if (note.dot) {
    for (let i = 0; i < note.dot; i++) {
      xml += `        <dot/>\n`;
    }
  }

  // Stem
  if (note.stem) {
    xml += `        <stem>${note.stem.direction}</stem>\n`;
  }

  // Beam
  if (note.beam) {
    for (const beam of note.beam) {
      xml += `        <beam number="${beam.number}">${beam.value}</beam>\n`;
    }
  }

  // Notations
  if (note.notations) {
    xml += `        <notations>\n`;
    
    if (note.notations.tied) {
      for (const tied of note.notations.tied) {
        xml += `          <tied type="${tied.type}"/>\n`;
      }
    }

    if (note.notations.tuplet) {
      for (const tuplet of note.notations.tuplet) {
        let tupletXml = `          <tuplet type="${tuplet.type}"`;
        if (tuplet.bracket !== undefined) {
          tupletXml += ` bracket="${tuplet.bracket ? 'yes' : 'no'}"`;
        }
        if (tuplet.number !== undefined) {
          tupletXml += ` number="${tuplet.number}"`;
        }
        if (tuplet.showNumber) {
          tupletXml += ` show-number="${tuplet.showNumber}"`;
        }
        tupletXml += `/>\n`;
        xml += tupletXml;
      }
    }

    if (note.notations.articulations) {
      xml += `          <articulations>\n`;
      for (const articulation of note.notations.articulations) {
        xml += `            <${articulation.type}/>\n`;
      }
      xml += `          </articulations>\n`;
    }

    xml += `        </notations>\n`;
  }

  // Staff
  if (note.staff !== undefined) {
    xml += `        <staff>${note.staff}</staff>\n`;
  }

  xml += `      </note>\n`;
  return xml;
}

/**
 * Serialize print element
 */
function serializePrint(print: any): string {
  let xml = `      <print`;
  if (print.newSystem) {
    xml += ` new-system="yes"`;
  }
  if (print.newPage) {
    xml += ` new-page="yes"`;
  }
  xml += `/>\n`;
  return xml;
}

/**
 * Serialize barline element
 */
function serializeBarline(barline: any): string {
  let xml = `      <barline location="${barline.location}">\n`;
  if (barline.barStyle) {
    xml += `        <bar-style>${barline.barStyle}</bar-style>\n`;
  }
  xml += `      </barline>\n`;
  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
