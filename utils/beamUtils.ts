import { DOMParser, XMLSerializer } from 'xmldom';

/**
 * Optimizes beams in all measures of a MusicXML document using xmldom.
 * Groups adjacent subdivision notes and adds <beam> elements.
 * Returns the updated MusicXML as string.
 */
export function setBeams(musicXml: string): string {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const doc = parser.parseFromString(musicXml, 'application/xml');

    const measures = doc.getElementsByTagName('measure');
    for (let m = 0; m < measures.length; m++) {
        const measure = measures[m];
        const notes: Element[] = [];
        for (let i = 0; i < measure.childNodes.length; i++) {
            const node = measure.childNodes[i] as Element;
            if (node.nodeType === 1 && node.nodeName === 'note') {
                notes.push(node);
            }
        }

        // Helper to group by type
        function groupBeamsByType(typeName: string, beamNumber: number) {
            let beamGroup: number[] = [];
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const typeElem = Array.from(note.childNodes).find(
                    (n) => n.nodeType === 1 && (n as Element).nodeName === 'type'
                ) as Element | undefined;
                const typeText = typeElem && typeElem.textContent;
                if (typeText === typeName) {
                    beamGroup.push(i);
                } else {
                    if (beamGroup.length > 1) {
                        for (let j = 0; j < beamGroup.length; j++) {
                            const beamElem = doc.createElement('beam');
                            beamElem.setAttribute('number', beamNumber.toString());
                            if (j === 0) beamElem.textContent = 'begin';
                            else if (j === beamGroup.length - 1) beamElem.textContent = 'end';
                            else beamElem.textContent = 'continue';
                            notes[beamGroup[j]].appendChild(beamElem);
                        }
                    }
                    beamGroup = [];
                }
            }
            // Handle beam group at end
            if (beamGroup.length > 1) {
                for (let j = 0; j < beamGroup.length; j++) {
                    const beamElem = doc.createElement('beam');
                    beamElem.setAttribute('number', beamNumber.toString());
                    if (j === 0) beamElem.textContent = 'begin';
                    else if (j === beamGroup.length - 1) beamElem.textContent = 'end';
                    else beamElem.textContent = 'continue';
                    notes[beamGroup[j]].appendChild(beamElem);
                }
            }
        }

        // Group eighth notes (beam number 1)
        groupBeamsByType('eighth', 1);
        // Group 16th notes (beam number 1 and 2)
        groupBeamsByType('16th', 1);
        let beamGroup16: number[] = [];
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const typeElem = Array.from(note.childNodes).find(
                (n) => n.nodeType === 1 && (n as Element).nodeName === 'type'
            ) as Element | undefined;
            const typeText = typeElem && typeElem.textContent;
            if (typeText === '16th') {
                beamGroup16.push(i);
            } else {
                if (beamGroup16.length > 1) {
                    for (let j = 0; j < beamGroup16.length; j++) {
                        const beamElem = doc.createElement('beam');
                        beamElem.setAttribute('number', '2');
                        if (j === 0) beamElem.textContent = 'begin';
                        else if (j === beamGroup16.length - 1) beamElem.textContent = 'end';
                        else beamElem.textContent = 'continue';
                        notes[beamGroup16[j]].appendChild(beamElem);
                    }
                }
                beamGroup16 = [];
            }
        }
        if (beamGroup16.length > 1) {
            for (let j = 0; j < beamGroup16.length; j++) {
                const beamElem = doc.createElement('beam');
                beamElem.setAttribute('number', '2');
                if (j === 0) beamElem.textContent = 'begin';
                else if (j === beamGroup16.length - 1) beamElem.textContent = 'end';
                else beamElem.textContent = 'continue';
                notes[beamGroup16[j]].appendChild(beamElem);
            }
        }

        // Group 32nd notes (beam number 1, 2, 3)
        groupBeamsByType('32nd', 1);
        groupBeamsByType('32nd', 2);
        let beamGroup32: number[] = [];
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const typeElem = Array.from(note.childNodes).find(
                (n) => n.nodeType === 1 && (n as Element).nodeName === 'type'
            ) as Element | undefined;
            const typeText = typeElem && typeElem.textContent;
            if (typeText === '32nd') {
                beamGroup32.push(i);
            } else {
                if (beamGroup32.length > 1) {
                    for (let j = 0; j < beamGroup32.length; j++) {
                        const beamElem = doc.createElement('beam');
                        beamElem.setAttribute('number', '3');
                        if (j === 0) beamElem.textContent = 'begin';
                        else if (j === beamGroup32.length - 1) beamElem.textContent = 'end';
                        else beamElem.textContent = 'continue';
                        notes[beamGroup32[j]].appendChild(beamElem);
                    }
                }
                beamGroup32 = [];
            }
        }
        if (beamGroup32.length > 1) {
            for (let j = 0; j < beamGroup32.length; j++) {
                const beamElem = doc.createElement('beam');
                beamElem.setAttribute('number', '3');
                if (j === 0) beamElem.textContent = 'begin';
                else if (j === beamGroup32.length - 1) beamElem.textContent = 'end';
                else beamElem.textContent = 'continue';
                notes[beamGroup32[j]].appendChild(beamElem);
            }
        }

        // Group 64th notes (beam number 1, 2, 3, 4)
        groupBeamsByType('64th', 1);
        groupBeamsByType('64th', 2);
        groupBeamsByType('64th', 3);
        let beamGroup64: number[] = [];
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const typeElem = Array.from(note.childNodes).find(
                (n) => n.nodeType === 1 && (n as Element).nodeName === 'type'
            ) as Element | undefined;
            const typeText = typeElem && typeElem.textContent;
            if (typeText === '64th') {
                beamGroup64.push(i);
            } else {
                if (beamGroup64.length > 1) {
                    for (let j = 0; j < beamGroup64.length; j++) {
                        const beamElem = doc.createElement('beam');
                        beamElem.setAttribute('number', '4');
                        if (j === 0) beamElem.textContent = 'begin';
                        else if (j === beamGroup64.length - 1) beamElem.textContent = 'end';
                        else beamElem.textContent = 'continue';
                        notes[beamGroup64[j]].appendChild(beamElem);
                    }
                }
                beamGroup64 = [];
            }
        }
        if (beamGroup64.length > 1) {
            for (let j = 0; j < beamGroup64.length; j++) {
                const beamElem = doc.createElement('beam');
                beamElem.setAttribute('number', '4');
                if (j === 0) beamElem.textContent = 'begin';
                else if (j === beamGroup64.length - 1) beamElem.textContent = 'end';
                else beamElem.textContent = 'continue';
                notes[beamGroup64[j]].appendChild(beamElem);
            }
        }
    }
    return serializer.serializeToString(doc);
}
