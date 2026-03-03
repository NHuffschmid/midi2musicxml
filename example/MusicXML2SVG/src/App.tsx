import { useState } from 'react';
import { MusicXMLViewer } from './components/MusicXMLViewer';
import './App.css';

// List of available MusicXML files
const musicXmlFiles = [
  '/musicxml/OfForeignCountriesMeasure10.xml',
  '/musicxml/note_durations.xml'
];

function App() {
  const [selectedFile, setSelectedFile] = useState<string>(musicXmlFiles[0]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>MusicXML Viewer</h1>
        <p>Visualization of MusicXML files with OpenSheetMusicDisplay</p>
      </header>

      <main className="App-main">
        <div className="file-selector">
          <label htmlFor="musicxml-select">Select MusicXML file:</label>
          <select
            id="musicxml-select"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            {musicXmlFiles.map((filePath) => {
              const fileName = filePath.split('/').pop();
              return (
                <option key={filePath} value={filePath}>
                  {fileName}
                </option>
              );
            })}
          </select>
        </div>

        <div className="viewer-container">
          <MusicXMLViewer musicXmlPath={selectedFile} />
        </div>
      </main>
    </div>
  );
}

export default App;
