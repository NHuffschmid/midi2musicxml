import { System } from '../types';
import { voiceToXml } from './voiceToXml';

export function systemToXml(system: System): string {
    return system.voices.map((voice, idx) => voiceToXml(voice, idx)).join('\n');
}
