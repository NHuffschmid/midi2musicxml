# Midi2MusicXML – Example App

A minimal Vite + React application demonstrating the full `midi2musicxml` pipeline end-to-end:

1. Load a local `.mid` file (drag & drop or file picker)
2. Convert MIDI → MusicXML using `midi2MusicXML()`
3. Render the result as sheet music via [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Project structure

```
example/
  src/
    App.tsx                    – Main component (drop zone, status, viewer)
    App.css                    – Styles
    components/
      MusicXMLViewer.tsx       – OSMD wrapper (accepts MusicXML string)
  index.html
  package.json
  vite.config.ts
  tsconfig.json
```

## Dependencies

| Package | Purpose |
|---|---|
| `@tonejs/midi` | Parse raw MIDI binary into a structured object |
| `opensheetmusicdisplay` | Render MusicXML as SVG sheet music |
| `react` / `react-dom` | UI framework |
| `vite` | Build tool / dev server |
