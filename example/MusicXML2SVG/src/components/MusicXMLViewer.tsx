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

    let cancelled = false;

    const loadAndRender = async () => {
      try {
        // Clear previous OSMD instance
        if (osmdRef.current) {
          osmdRef.current.clear();
          osmdRef.current = null;
        }

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create new OSMD instance
        const osmd = new OpenSheetMusicDisplay(containerRef.current!, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
        });

        osmdRef.current = osmd;

        // Load and render the MusicXML file
        await osmd.load(musicXmlPath);
        
        if (!cancelled) {
          await osmd.render();
        }
      } catch (error) {
        console.error('Error loading MusicXML:', error);
      }
    };

    loadAndRender();

    // Cleanup
    return () => {
      cancelled = true;
      if (osmdRef.current) {
        osmdRef.current.clear();
        osmdRef.current = null;
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
