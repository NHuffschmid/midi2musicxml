// Inject Vite define variable for tests
(globalThis as any).__MIDI2MUSICXML_VERSION__ = require('../package.json').version;
