import { useState, useMemo } from 'react';
import { MusicXMLViewer } from './components/MusicXMLViewer';
import './App.css';

// Dynamically import all MusicXML files from assets/musicxml folder
const musicXmlModules = import.meta.glob('./assets/musicxml/*.xml', { eager: true, query: '?url', import: 'default' });

function App() {
  // Extract file paths from the imported modules
  const musicXmlFiles = useMemo(() => {
    return Object.entries(musicXmlModules).map(([_path, url]) => url as string);
  }, []);

  const [selectedFile, setSelectedFile] = useState<string>(musicXmlFiles[0] || '');

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
