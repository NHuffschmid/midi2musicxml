/**
 * Test helper: creates a minimal mock Midi object for unit tests.
 *
 * Only the fields actually read by the pipeline transforms are populated.
 * Cast to `unknown as Midi` keeps TypeScript happy without a full stub.
 */
import type { Midi } from '@tonejs/midi';

interface MockMidiOptions {
  ppq?: number;
  timeSignatures?: Array<{ timeSignature: [number, number]; ticks: number }>;
  tempos?: Array<{ ticks: number; bpm: number }>;
  meta?: Array<{ type: string; text?: string }>;
  name?: string;
  /** Extra tracks (array of { notes: ... } objects). Not used by most transforms. */
  tracks?: unknown[];
}

/**
 * Returns a Midi-shaped object that satisfies the subset of the API that the
 * midi2musicxml pipeline actually uses.
 */
export function makeMidi(opts: MockMidiOptions = {}): Midi {
  const ppq = opts.ppq ?? 480;
  const bpm = opts.tempos?.[0]?.bpm ?? 120;

  return {
    header: {
      ppq,
      timeSignatures: opts.timeSignatures ?? [{ timeSignature: [4, 4], ticks: 0 }],
      tempos: opts.tempos ?? [{ ticks: 0, bpm }],
      meta: opts.meta ?? [],
      name: opts.name ?? '',
      /** Simplistic linear tempo-map for tests that call this method. */
      ticksToSeconds: (tick: number) => tick / (ppq * (bpm / 60)),
    },
    tracks: opts.tracks ?? [],
  } as unknown as Midi;
}
