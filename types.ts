// Supported rendering clef types
export type ClefType = 'piano' | 'violin' | 'viola' | 'cello';

// --- Render-specific Types ---
export interface RenderNote extends Note {
    isRest?: boolean;
    isChord?: boolean;
}

export interface RenderMeasure {
    notes: RenderNote[];
}

// MusicXML Model Types

export type Note = {
    step: string;
    alter?: number;
    octave: number;
    duration: number;
    type: string;
    dots?: number;
    tick?: number;
};

export type Measure = {
    notes: Note[];
};

export type Section = {
    notes: Note[];
    attributes?: {
        key?: string;
        time?: { beats: number; beatType: number };
        clef?: { sign: string; line: number };
    };
    sound?: {
        tempo: number;
    };
    direction?: {
        tempo: number;
        beatUnit?: string;
    };
};

export type Score = {
    title?: string;
    composer?: string;
    copyright?: string;
    pulsesPerQuarterNote: number;
    sections: Section[];
};

