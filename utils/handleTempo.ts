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
    const TEMPO_DROP_THRESHOLD = 0.7;
    const TEMPO_RECOVERY_THRESHOLD = 1.2; // Minimum recovery ratio to add fermata
    const N_NOTES_FOR_AVERAGE = 30; // Number of notes to average for tempo comparison
    
    for (let i = 0; i < tempoData.length - 1; i++) {
        const next = tempoData[i + 1];
        
        // Calculate average tempo of the last N notes (up to current position)
        const startIndex = Math.max(0, i - N_NOTES_FOR_AVERAGE + 1);
        const notesForAverage = tempoData.slice(startIndex, i + 1);
        const averageBpm = notesForAverage.reduce((sum, data) => sum + data.bpm, 0) / notesForAverage.length;
        
        // Check if tempo drops significantly compared to average
        const tempoRatio = next.bpm / averageBpm;
        if (tempoRatio < TEMPO_DROP_THRESHOLD) {
            // Check if tempo recovers afterwards or this is near the end
            let shouldAddFermata = false;
            let targetNote: Element = next.note;
            
            if (i === tempoData.length - 2) {
                // Near end of piece - add fermata to last note
                shouldAddFermata = true;
                targetNote = next.note;
            } else {
                const following = tempoData[i + 2];
                const recoveryRatio = following.bpm / next.bpm;
                if (recoveryRatio > TEMPO_RECOVERY_THRESHOLD) {
                    // Tempo increases again by 20%+ - add fermata to note AFTER the slow note
                    shouldAddFermata = true;
                    targetNote = following.note;
                }
            }
            
            if (shouldAddFermata) {
                // Add fermata to target note
                const notationsElements = targetNote.getElementsByTagName('notations');
                let notationsEl = notationsElements.length > 0 ? notationsElements[0] : null;
                if (!notationsEl) {
                    notationsEl = xmlDoc.createElement('notations');
                    // Insert before staff element if it exists
                    const staffElements = targetNote.getElementsByTagName('staff');
                    const staffEl = staffElements.length > 0 ? staffElements[0] : null;
                    if (staffEl) {
                        targetNote.insertBefore(notationsEl, staffEl);
                    } else {
                        targetNote.appendChild(notationsEl);
                    }
                }
                
                const fermataEl = xmlDoc.createElement('fermata');
                fermataEl.setAttribute('type', 'upright');
                notationsEl.appendChild(fermataEl);
                
                console.log(`[handleTempo] Added fermata: tempo drop from ${averageBpm.toFixed(2)} (avg) to ${next.bpm} BPM`);
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
