import { useEffect, useRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface MusicXMLViewerProps {
  /** MusicXML document as a string (not a URL). */
  musicxml: string;
}

export function MusicXMLViewer({ musicxml }: MusicXMLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef      = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!containerRef.current || !musicxml) return;

    let cancelled = false;

    const render = async () => {
      // Tear down any previous instance
      if (osmdRef.current) {
        osmdRef.current.clear();
        osmdRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const osmd = new OpenSheetMusicDisplay(containerRef.current!, {
        autoResize: true,
        backend:    'svg',
        drawTitle:  true,
      });
      osmdRef.current = osmd;

      // OSMD accepts a raw MusicXML string directly
      await osmd.load(musicxml);

      if (!cancelled) {
        await osmd.render();
      }
    };

    render().catch(err => console.error('OSMD render error:', err));

    return () => {
      cancelled = true;
      osmdRef.current?.clear();
      osmdRef.current = null;
    };
  }, [musicxml]);

  return <div ref={containerRef} />;
}
