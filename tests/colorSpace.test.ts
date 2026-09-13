import { describe, it, expect } from 'vitest';
import { rgbToLab, labToRgb, labDistance, labToHex, hexToRgb } from '../src/engine/colorSpace';

describe('rgbToLab reference values', () => {
  it('white → L=100, a=0, b=0', () => {
    const [L, a, b] = rgbToLab(255, 255, 255);
    expect(L).toBeCloseTo(100, 1);
    expect(a).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(0, 1);
  });

  it('black → 0,0,0', () => {
    const [L, a, b] = rgbToLab(0, 0, 0);
    expect(L).toBeCloseTo(0, 1);
    expect(a).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(0, 1);
  });

  it('red (255,0,0) → L≈53.23, a≈80.11, b≈67.22 (±0.5)', () => {
    const [L, a, b] = rgbToLab(255, 0, 0);
    expect(L).toBeCloseTo(53.23, 0); // within ±0.5
    expect(a).toBeCloseTo(80.11, 0);
    expect(b).toBeCloseTo(67.22, 0);
  });
});

describe('roundtrip rgb → lab → rgb (±1 per channel)', () => {
  const samples: Array<[number, number, number]> = [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [128, 128, 128],
    [255, 128, 0],
    [30, 200, 150],
    [200, 30, 90],
    [17, 4, 201],
    [254, 254, 100],
  ];

  for (const [r, g, b] of samples) {
    it(`roundtrips rgb(${r},${g},${b})`, () => {
      const lab = rgbToLab(r, g, b);
      const [r2, g2, b2] = labToRgb(lab[0], lab[1], lab[2]);
      expect(Math.abs(r2 - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(g2 - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(b2 - b)).toBeLessThanOrEqual(1);
    });
  }
});

describe('labDistance', () => {
  it('is zero for identical colors', () => {
    expect(labDistance([50, 10, -5], [50, 10, -5])).toBe(0);
  });

  it('is euclidean', () => {
    expect(labDistance([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 6);
  });
});

describe('hex helpers', () => {
  it('labToHex formats #rrggbb', () => {
    expect(labToHex([100, 0, 0])).toBe('#ffffff');
    expect(labToHex([0, 0, 0])).toBe('#000000');
  });

  it('hexToRgb parses 3 and 6 digit forms', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('abc')).toEqual([170, 187, 204]);
    expect(hexToRgb('nope')).toBeNull();
  });
});
