import { DOMParser, XMLSerializer } from 'xmldom';

/**
 * Analyzes tempo changes and adds fermata symbols where appropriate.
 * Removes temporary x-tempo elements from the MusicXML document.
 */
export function handleTempo(musicXml: string): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(musicXml, 'text/xml');
    
    const tempoElements = Array.from(xmlDoc.getElementsByTagName('x-tempo'));
    const tempoData: { element: Element, note: Element, bpm: number }[] = [];
    
    // Collect all tempo markers
    tempoElements.forEach(tempoEl => {
        const noteEl = tempoEl.parentNode as Element;
        if (noteEl && noteEl.tagName === 'note') {
            const bpm = parseFloat(tempoEl.getAttribute('bpm') || '0');
            tempoData.push({ element: tempoEl, note: noteEl, bpm });
        }
    });
    
    // Detect significant tempo drops followed by increase or end
    //const TEMPO_DROP_THRESHOLD = 0.7; // 30% or more drop
    const TEMPO_DROP_THRESHOLD = 0.9;
    
    for (let i = 0; i < tempoData.length - 1; i++) {
        const current = tempoData[i];
        const next = tempoData[i + 1];
        
        // Check if tempo drops significantly
        const tempoRatio = next.bpm / current.bpm;
        if (tempoRatio < TEMPO_DROP_THRESHOLD) {
            // Check if tempo recovers afterwards or this is near the end
            let shouldAddFermata = false;
            
            if (i === tempoData.length - 2) {
                // Near end of piece
                shouldAddFermata = true;
            } else {
                const following = tempoData[i + 2];
                const recoveryRatio = following.bpm / next.bpm;
                if (recoveryRatio > 1.2) {
                    // Tempo increases again by 20%+
                    shouldAddFermata = true;
                }
            }
            
            if (shouldAddFermata) {
                // Add fermata to the note with slower tempo
                const notationsElements = next.note.getElementsByTagName('notations');
                let notationsEl = notationsElements.length > 0 ? notationsElements[0] : null;
                if (!notationsEl) {
                    notationsEl = xmlDoc.createElement('notations');
                    // Insert before staff element if it exists
                    const staffElements = next.note.getElementsByTagName('staff');
                    const staffEl = staffElements.length > 0 ? staffElements[0] : null;
                    if (staffEl) {
                        next.note.insertBefore(notationsEl, staffEl);
                    } else {
                        next.note.appendChild(notationsEl);
                    }
                }
                
                const fermataEl = xmlDoc.createElement('fermata');
                fermataEl.setAttribute('type', 'upright');
                notationsEl.appendChild(fermataEl);
                
                console.log(`[handleTempo] Added fermata: tempo drop from ${current.bpm} to ${next.bpm} BPM`);
            }
        }
    }
    
    // Remove all x-tempo elements
    tempoData.forEach(({ element }) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
}
