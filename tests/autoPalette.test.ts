import { describe, it, expect } from 'vitest';
import { refinePalette, MAX_PALETTE } from '../src/engine/autoPalette';
import { symbolFor, colorIndexForSymbol } from '../src/engine/symbols';
import type { PaletteEntry } from '../src/engine/types';

function entry(index: number, lab: [number, number, number], pixelCount: number): PaletteEntry {
  return { index, lab, hex: '#000000', pixelCount };
}

describe('refinePalette', () => {
  it('merges perceptually close colors and keeps distinct ones', () => {
    const input = [
      entry(0, [70, 5, 5], 500),
      entry(1, [69, 6, 4], 300), // ΔE ≈ 1.7 → merge into 0
      entry(2, [30, 40, 50], 200), // far away → keep
    ];
    const { palette, remap } = refinePalette(input, 12);
    expect(palette).toHaveLength(2);
    expect(palette[0].pixelCount).toBe(800);
    expect(palette[1].pixelCount).toBe(200);
    // remap is a total function: every old index maps to a valid new index
    for (let i = 0; i < input.length; i++) {
      expect(remap[i]).toBeGreaterThanOrEqual(0);
      expect(remap[i]).toBeLessThan(palette.length);
    }
    expect(remap[0]).toBe(remap[1]);
    expect(remap[2]).not.toBe(remap[0]);
  });

  it('caps the palette at MAX_PALETTE symbols', () => {
    // 50 maximally distant colors (L from 0 to 100 spread, high chroma spread)
    const input: PaletteEntry[] = [];
    for (let i = 0; i < 50; i++) {
      input.push(entry(i, [(i * 100) / 50, (i % 2) * 80 - 40, ((i * 13) % 4) * 40 - 60], 10));
    }
    const { palette } = refinePalette(input, 2, MAX_PALETTE);
    expect(palette.length).toBeLessThanOrEqual(MAX_PALETTE);
  });

  it('is deterministic', () => {
    const mk = () => [
      entry(0, [70, 5, 5], 500),
      entry(1, [69, 6, 4], 300),
      entry(2, [30, 40, 50], 200),
      entry(3, [31, 41, 51], 100),
    ];
    const a = refinePalette(mk(), 12);
    const b = refinePalette(mk(), 12);
    expect(a.palette.map((p) => p.hex)).toEqual(b.palette.map((p) => p.hex));
    expect([...a.remap]).toEqual([...b.remap]);
  });
});

describe('symbols', () => {
  it('maps 1..9 then 0 then A..Z like the reference legend', () => {
    expect(symbolFor(0)).toBe('1');
    expect(symbolFor(7)).toBe('8');
    expect(symbolFor(8)).toBe('9');
    expect(symbolFor(9)).toBe('0');
    expect(symbolFor(10)).toBe('A');
    expect(symbolFor(35)).toBe('Z');
  });

  it('round-trips through colorIndexForSymbol', () => {
    for (let i = 0; i < 36; i++) {
      expect(colorIndexForSymbol(symbolFor(i))).toBe(i);
    }
  });
});
