# Midi2MusicXML

A TypeScript/JavaScript module for converting MIDI files to MusicXML.

## Features
- Modular 6-stage pipeline: MIDI → MusicXML
- Multi-voice, time/key signature, tempo
- Chord and beam detection
- Flexible staff assignment (piano, violin, viola, cello)
- Works with [@tonejs/midi](https://www.npmjs.com/package/@tonejs/midi) and [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)

## Installation
- to be defined

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

## Example

See the [`example/`](example/README.md) directory for a runnable Vite + React app.

## Known Bugs / Limitations
- This project is part of the DEPINUS project: https://github.com/NHuffschmid/depinus
- It is used there within the ScoreView
- Other usage scenarios may work, but probably will not  

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

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
