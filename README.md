# Midi2MusicXML

A TypeScript/JavaScript module for converting MIDI files to MusicXML in the browser.

## Features
- Modular 6-stage pipeline: MIDI → MusicXML
- Multi-voice, time/key signature, tempo
- Chord, beam rest and staccato detection
- Flexible staff assignment (piano, violin, viola, cello)
- Works with [@tonejs/midi](https://www.npmjs.com/package/@tonejs/midi) and [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)

## Installation

This package is not yet published on npm. To use it, you need to clone the repository directly from GitHub:

```sh
git clone https://github.com/NHuffschmid/midi2musicxml.git
```

Then, copy the `midi2musicxml` directory into your own project, or use a relative import:

```ts
import { midiToMusicXML } from './path/to/midi2musicxml';
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

See the [`example/`](example/README.md) directory for a runnable Vite + React app.

## Known Bugs / Limitations
- This project is part of the DEPINUS project: https://github.com/NHuffschmid/depinus
- The Midi2MusicXML module is used there within the ScoreView
- Other usage scenarios may work, but probably will not
- THIS PROJECT IS IN AN EARLY EXPERIMENTAL STAGE 

## Project Structure
- `analysis/` – Key, tempo, and section analysis utilities
- `models/` – Data models for each pipeline stage
- `transforms/` – Stage-to-stage transformation logic
- `utils/` – Helper functions
- `render/` – MusicXML rendering helpers

## License
MIT

## Author
Norbert Huffschmid <depinus@gmx.de>
