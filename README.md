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

async function convertMidiFile(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const midi = new Midi(arrayBuffer);
  const { musicxml } = midi2MusicXML(midi);
  console.log(musicxml);
}

convertMidiFile('https://www.mutopiaproject.org/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.mid');
```

## Example
See the (upcoming) `examples/` directory or use [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) for rendering.

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
