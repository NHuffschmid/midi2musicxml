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

const midi = new Midi(/* ... */);
const musicXml = midi2MusicXML(midi);
console.log(musicXml);
```

## Project Structure
- `/` – Main module code
- `render/` – MusicXML rendering functions
- `analysis/` – analysis utilities
- `utils/` – helpers

## License
MIT

## Author
Norbert Huffschmid

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Example
See the (not yet existing) `examples/` directory for sample MIDI and MusicXML files.
