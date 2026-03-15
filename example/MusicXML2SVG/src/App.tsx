import { useState, useMemo, useEffect } from 'react';
import { MusicXMLViewer } from './components/MusicXMLViewer';
import './App.css';

// Dynamically import all MusicXML files from assets/musicxml folder
const musicXmlModules = import.meta.glob('./assets/musicxml/*.musicxml', { eager: true, query: '?url', import: 'default' });

const STORAGE_KEY = 'musicxml-viewer-selected-file';

function App() {
  // Extract file paths from the imported modules
  const musicXmlFiles = useMemo(() => {
    return Object.entries(musicXmlModules).map(([_path, url]) => url as string);
  }, []);

  // Initialize with saved selection from localStorage, or first file
  const [selectedFile, setSelectedFile] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Check if saved file still exists in the current file list
    if (saved && musicXmlFiles.includes(saved)) {
      return saved;
    }
    return musicXmlFiles[0] || '';
  });

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    if (selectedFile) {
      localStorage.setItem(STORAGE_KEY, selectedFile);
    }
  }, [selectedFile]);

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
