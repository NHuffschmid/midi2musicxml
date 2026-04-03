
# Midi2MusicXML

![CI](https://github.com/NHuffschmid/midi2musicxml/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

A TypeScript/JavaScript module for converting MIDI files to MusicXML.

## Features
- Modular 7-stage pipeline: MIDI → MusicXML
- Multi-voice, time/key signature, tempo
- Chord, beam rest and staccato detection
- Flexible staff assignment (piano, violin, viola, cello)
- Works with [@tonejs/midi](https://www.npmjs.com/package/@tonejs/midi) and [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)


## Live Demo

A live demo, where you can convert any midi file of your choice to MusicXML, is available [here](https://nhuffschmid.github.io/midi2musicxml/).

An example application, that uses the Midi2MusicXML module during midi playback, looks like [this](https://nhuffschmid.github.io/midi2musicxml/elise.mp4).

## Installation

This package is not yet published on npm. To use it, you need to clone the repository directly from GitHub:

```sh
git clone https://github.com/NHuffschmid/midi2musicxml.git
```

Then, copy the `midi2musicxml` directory into your own project, or use a relative import:

```ts
import { midi2MusicXML } from './path/to/midi2musicxml';
```

Alternatively, you can add the module as a local npm package:

```sh
npm install /path/to/checked-out/repo/midi2musicxml
```

## Usage

```js
import { midi2MusicXML } from 'midi2musicxml';
import { Midi } from '@tonejs/midi';

// Read a local MIDI file (e.g. via a file input or drag & drop)
async function convertMidiFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);
  const { musicxml } = midi2MusicXML(midi);
  console.log(musicxml);
}

// Example: wire up a file input
document.querySelector('input[type=file]').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) convertMidiFile(file);
});
```

## API

### `midi2MusicXML(midi, options?): Midi2MusicResult`

Converts a [`@tonejs/midi`](https://www.npmjs.com/package/@tonejs/midi) `Midi` object to MusicXML.

#### `Midi2MusicXMLOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | MIDI metadata | Score title. |
| `composer` | `string` | MIDI metadata | Composer name. |
| `clef` | `'piano' \| 'violin' \| 'viola' \| 'cello'` | `'piano'` | Instrument / clef layout for staff assignment. `'piano'` produces a grand staff. |

#### `Midi2MusicResult`

| Property | Type | Description |
|----------|------|-------------|
| `musicxml` | `string` | The serialized MusicXML string, formatted and ready to render. Empty string if the MIDI contains no notes. |
| `noteCursorTimes` | `number[]` | Sorted note onset times in seconds for a note-by-note cursor animation. |

## Example

See the [`example/`](example/README.md) directory for a runnable Vite + React app. This is the source code of the [Live Demo](#live-demo).

## Known Bugs / Limitations
- This project is part of the DEPINUS project: https://github.com/NHuffschmid/depinus
- The Midi2MusicXML module is used there within the ScoreView
- Other usage scenarios may work, but probably will not
- THIS PROJECT IS IN AN EARLY EXPERIMENTAL STAGE 

## Project Structure
- `analysis/` – Analysis utilities for key, tempo, and sections
- `models/` – Data models for each pipeline stage
- `transforms/` – Transformations between pipeline stages
- `utils/` – Helper functions (e.g. MIDI/note conversion)
- `react/` – React-specific hooks and worker (optional)

## License
MIT

## Author
Norbert Huffschmid <depinus@gmx.de>
