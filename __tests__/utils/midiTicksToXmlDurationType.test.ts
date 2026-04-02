import { describe, it, expect } from 'vitest';
import { midiTicksToXmlDurationType } from '../../utils/midiTicksToXmlDurationType';

/**
 * Unit tests for midiTicksToXmlDurationType.
 *
 * The function maps a raw tick duration to the nearest standard MusicXML note
 * type (whole, half, quarter, …) together with a dot count.  It uses a
 * relative tolerance of 20 % so that slightly-off live-recorded values
 * map to the correct type.
 */
describe('midiTicksToXmlDurationType', () => {
  const PPQ = 480;

  // ── Standard note values ──────────────────────────────────────────────────

  it('maps a whole note (1920 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(1920, PPQ);
    expect(result.type).toBe('whole');
    expect(result.dots).toBe(0);
  });

  it('maps a half note (960 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(960, PPQ);
    expect(result.type).toBe('half');
    expect(result.dots).toBe(0);
  });

  it('maps a quarter note (480 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(480, PPQ);
    expect(result.type).toBe('quarter');
    expect(result.dots).toBe(0);
  });

  it('maps an eighth note (240 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(240, PPQ);
    expect(result.type).toBe('eighth');
    expect(result.dots).toBe(0);
  });

  it('maps a 16th note (120 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(120, PPQ);
    expect(result.type).toBe('16th');
    expect(result.dots).toBe(0);
  });

  it('maps a 32nd note (60 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(60, PPQ);
    expect(result.type).toBe('32nd');
    expect(result.dots).toBe(0);
  });

  // ── Dotted note values ────────────────────────────────────────────────────

  it('maps a dotted half note (1440 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(1440, PPQ);
    expect(result.type).toBe('half');
    expect(result.dots).toBe(1);
  });

  it('maps a dotted quarter note (720 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(720, PPQ);
    expect(result.type).toBe('quarter');
    expect(result.dots).toBe(1);
  });

  it('maps a dotted eighth note (360 ticks at PPQ=480)', () => {
    const result = midiTicksToXmlDurationType(360, PPQ);
    expect(result.type).toBe('eighth');
    expect(result.dots).toBe(1);
  });

  // ── Tolerance: slightly-off live-recorded values ─────────────────────────

  it('maps a slightly-short quarter note (450 ticks) within 20% tolerance', () => {
    // 450 / 480 = 0.9375 – within 20 % of a quarter (factor 1.0)
    const result = midiTicksToXmlDurationType(450, PPQ);
    expect(result.type).toBe('quarter');
    expect(result.dots).toBe(0);
  });

  it('maps a slightly-long eighth note (255 ticks) within 20% tolerance', () => {
    // 255 / 480 ≈ 0.53 – within 20 % of an eighth (factor 0.5)
    const result = midiTicksToXmlDurationType(255, PPQ);
    expect(result.type).toBe('eighth');
    expect(result.dots).toBe(0);
  });

  // ── Dots are always ≤ 1 ───────────────────────────────────────────────────

  it('never returns dots > 1', () => {
    const candidates = [1920, 960, 480, 240, 120, 60, 1440, 720, 360];
    for (const ticks of candidates) {
      const { dots } = midiTicksToXmlDurationType(ticks, PPQ);
      expect(dots).toBeLessThanOrEqual(1);
    }
  });

  // ── Different PPQ values ──────────────────────────────────────────────────

  it('works correctly with PPQ=960 (double resolution)', () => {
    // quarter at PPQ=960 = 960 ticks
    expect(midiTicksToXmlDurationType(960, 960).type).toBe('quarter');
    // eighth at PPQ=960 = 480 ticks
    expect(midiTicksToXmlDurationType(480, 960).type).toBe('eighth');
  });
});
