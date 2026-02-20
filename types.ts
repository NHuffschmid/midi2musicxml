// Supported rendering clef types
export const ClefTypes = ['piano', 'violin', 'viola', 'cello'] as const;
export type ClefType = typeof ClefTypes[number];

// MusicXML Model Types

export type MidiNote = { // according to tonejs/midi Note interface
  midi: number;
  name: string;
  ticks: number;
  time: number;
  duration: number;
  durationTicks: number;
  velocity: number;
  bars: number;
}

export type MidiMeasure = { // according to tonejs/midi bars info
  notes: MidiNote[];
}

export type Section = {
    measures: MidiMeasure[];
    key: string;
    time: { beats: number; beatType: number };
    tempo?: number;
};

export type Score = {
    title?: string;
    composer?: string;
    copyright?: string;
    pulsesPerQuarterNote: number;
    sections: Section[];
};
