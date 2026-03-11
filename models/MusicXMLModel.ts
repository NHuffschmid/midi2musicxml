/**
 * MusicXMLModel - Stage 5 of the pipeline
 * 
 * DOM-like structure that maps 1:1 to MusicXML elements.
 * This makes serialization to XML trivial.
 * 
 * Almost directly corresponds to MusicXML schema.
 */

export interface MusicXMLDocument {
  version: string; // e.g., "3.1"
  scorePartwise: ScorePartwise;
}

export interface ScorePartwise {
  work?: Work;
  identification?: Identification;
  partList: PartList;
  parts: Part[];
}

export interface Work {
  workTitle?: string;
}

export interface Identification {
  creator?: Creator[];
  rights?: string;
}

export interface Creator {
  type: string; // e.g., "composer"
  name: string;
}

export interface PartList {
  scoreParts: ScorePart[];
}

export interface ScorePart {
  id: string;
  partName: string;
}

export interface Part {
  id: string;
  measures: Measure[];
}

export interface Measure {
  number: number;
  print?: Print;
  attributes?: Attributes;
  direction?: Direction[];
  notes: NoteElement[];
  barline?: Barline[];
}

export interface Attributes {
  divisions?: number; // Divisions per quarter note
  key?: Key;
  time?: Time;
  staves?: number;
  clef?: Clef[];
}

export interface Key {
  fifths: number;
  mode?: string;
}

export interface Time {
  beats: number;
  beatType: number;
}

export interface Clef {
  sign: string; // G, F, C, etc.
  line?: number;
  clefOctaveChange?: number;
  number?: number; // Staff number for this clef
}

export interface Direction {
  placement?: string;
  directionType: DirectionType[];
  sound?: Sound;
}

export interface DirectionType {
  words?: Words;
  pedal?: Pedal;
}

export interface Words {
  text: string;
  fontSize?: string;
  color?: string;
}

export interface Pedal {
  type: 'start' | 'stop' | 'change';
  line?: boolean;
}

export interface Sound {
  tempo?: number;
}

export interface NoteElement {
  pitch: MusicXMLPitch;
  duration: number;
  voice?: number;
  type: string; // quarter, eighth, etc.
  dot?: number; // Number of dots
  notations?: Notations;
  staff?: number;
  startTick: number;
}

export interface MusicXMLPitch {
  step: string;
  alter?: number;
  octave: number;
}

export interface Notations {
  tied?: Tied[];
  tuplet?: Tuplet[];
  articulations?: Articulation[];
}

export interface Tied {
  type: 'start' | 'stop';
}

export interface Tuplet {
  type: 'start' | 'stop';
  bracket?: boolean;
  number?: number;
  showNumber?: string; // actual, both, none
}

export interface Articulation {
  type: 'staccato' | 'tenuto' | 'accent' | 'staccatissimo';
}

export interface Print {
  newSystem?: boolean;
  newPage?: boolean;
}

export interface Barline {
  location: 'left' | 'right' | 'middle';
  barStyle?: 'light-light' | 'light-heavy' | 'heavy-light' | 'heavy-heavy' | 'regular' | 'dotted' | 'dashed' | 'heavy' | 'none';
}
