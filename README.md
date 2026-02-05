# Midi2MusicXML

A TypeScript/JavaScript module for converting MIDI files to MusicXML.

## Features
- to be defined

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
	const musicXml = midi2MusicXML(midi);
	console.log(musicXml);
}

convertMidiFile('https://www.mutopiaproject.org/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.mid');
```

## Project Structure
- `/` – Main module code
- `render/` – MusicXML rendering functions
- `analysis/` – analysis utilities
- `utils/` – helpers

## License
MIT

## Author
Norbert Huffschmid <depinus@gmx.de>

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Example
See the (not yet existing) `examples/` directory for sample MIDI and MusicXML files.
