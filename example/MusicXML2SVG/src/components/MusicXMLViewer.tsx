import React, { useEffect, useRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface MusicXMLViewerProps {
  musicXmlPath: string;
}

export const MusicXMLViewer: React.FC<MusicXMLViewerProps> = ({ musicXmlPath }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!containerRef.current || !musicXmlPath) return;

    const loadAndRender = async () => {
      try {
        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create new OSMD instance
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current!, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
        });

        // Load and render the MusicXML file
        await osmdRef.current.load(musicXmlPath);
        osmdRef.current.render();
      } catch (error) {
        console.error('Error loading MusicXML:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<p style="color: red;">Fehler beim Laden der MusicXML-Datei: ${error}</p>`;
        }
      }
    };

    loadAndRender();

    // Cleanup
    return () => {
      if (osmdRef.current) {
        osmdRef.current.clear();
      }
    };
  }, [musicXmlPath]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        overflow: 'auto',
        minHeight: '400px',
        border: '1px solid #ccc',
        padding: '20px',
        backgroundColor: '#fff'
      }}
    />
  );
};
