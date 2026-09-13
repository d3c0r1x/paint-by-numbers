import { describe, it, expect } from 'vitest';
import { labDistance2000, rgbToLab } from '../src/engine/colorSpace';
import { quantize } from '../src/engine/quantize';
import { autoKWithFloorForTest } from '../src/engine/pipeline';

/** Sharma, Wu & Dalal (2005) reference pairs — subset of the published
 * 34-case table (values copied from the paper's tabulated results). */
interface Case {
  lab1: [number, number, number];
  lab2: [number, number, number];
  de: number;
}

const CASES: Case[] = [
  { lab1: [50.0, 2.6772, -79.7751], lab2: [50.0, 0.0, -82.7485], de: 2.0425 },
  { lab1: [50.0, 3.1571, -77.2803], lab2: [50.0, 0.0, -82.7485], de: 2.8615 },
  { lab1: [50.0, 2.8361, -74.02], lab2: [50.0, 0.0, -82.7485], de: 3.4412 },
  { lab1: [50.0, -1.3802, -84.2814], lab2: [50.0, 0.0, -82.7485], de: 1.0 },
  { lab1: [50.0, -1.1848, -84.8006], lab2: [50.0, 0.0, -82.7485], de: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [73.0, 25.0, -18.0], de: 27.1492 },
  { lab1: [50.0, 2.5, 0.0], lab2: [61.0, -5.0, 29.0], de: 22.8977 },
  { lab1: [50.0, 2.5, 0.0], lab2: [56.0, -27.0, -3.0], de: 31.903 },
  { lab1: [50.0, 2.5, 0.0], lab2: [58.0, 24.0, 15.0], de: 19.4535 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 3.1736, 0.5854], de: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 3.2972, 0.0], de: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 1.8634, 0.5757], de: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 3.2592, 0.335], de: 1.0 },
  { lab1: [60.2574, -34.0099, 36.2677], lab2: [60.4626, -34.1751, 39.4387], de: 1.2644 },
  { lab1: [63.0109, -31.0961, -5.8663], lab2: [62.8187, -29.7946, -4.0864], de: 1.263 },
  { lab1: [61.2901, 3.7196, -5.3901], lab2: [61.4292, 2.248, -4.962], de: 1.8731 },
  { lab1: [35.0831, -44.1164, 3.7933], lab2: [35.0232, -40.0716, 1.5901], de: 1.8645 },
  { lab1: [22.7233, 20.0904, -46.694], lab2: [23.0331, 14.973, -42.5619], de: 2.0373 },
  { lab1: [36.4612, 47.858, 18.3852], lab2: [36.2715, 50.5065, 21.2231], de: 1.4146 },
  { lab1: [90.8027, -2.0831, 1.441], lab2: [91.1528, -1.6435, 0.0447], de: 1.4441 },
  { lab1: [90.9257, -0.5406, -0.9208], lab2: [88.6381, -0.8985, -0.7239], de: 1.5381 },
  { lab1: [6.7747, -0.2908, -2.4247], lab2: [5.8714, -0.0985, -2.2286], de: 0.6377 },
  { lab1: [2.0776, 0.0795, -1.135], lab2: [0.9033, -0.0636, -0.5514], de: 0.9082 },
];

describe('labDistance2000 (Sharma et al. 2005 reference pairs)', () => {
  for (const [i, c] of CASES.entries()) {
    it(`case ${i + 1}: ΔE00 = ${c.de}`, () => {
      const d = labDistance2000(c.lab1, c.lab2);
      expect(Math.abs(d - c.de)).toBeLessThan(0.02);
    });
  }

  it('is symmetric and zero for identical colors', () => {
    const a: [number, number, number] = [53.2, 80.1, 67.2];
    const b: [number, number, number] = [61.5, -5.3, 29.0];
    expect(labDistance2000(a, b)).toBeCloseTo(labDistance2000(b, a), 10);
    expect(labDistance2000(a, a)).toBe(0);
  });
});

describe('auto-k floor (≥ 90% of points within ΔE00 ≤ 10)', () => {
  it('demands more colors when a gradient is crushed at low k', () => {
    // Wide L* gradient: low k cannot keep 90% of points within ΔE00 ≤ 10.
    const n = 900;
    const lab = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) {
      lab[i * 3] = (i / n) * 90 + 5; // L spreads 5..95
      lab[i * 3 + 1] = 0;
      lab[i * 3 + 2] = 0;
    }
    const k = autoKWithFloorForTest(lab, n, 2, 36);
    const q = quantize(lab, k, 1);
    let ok = 0;
    for (let i = 0; i < n; i++) {
      const p: [number, number, number] = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
      if (Math.abs(labDistance2000(p, q.palette[q.labels[i]].lab)) <= 10) ok++;
    }
    expect(ok / n).toBeGreaterThanOrEqual(0.9);
  });

  it('keeps k minimal for a flat image', () => {
    const n = 400;
    const lab = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) {
      lab[i * 3] = 60;
      lab[i * 3 + 1] = 5;
      lab[i * 3 + 2] = -5;
    }
    const k = autoKWithFloorForTest(lab, n, 10, 36);
    expect(k).toBeLessThanOrEqual(12);
  });
});

describe('medoid palette colors', () => {
  it('palette colors are actual input colors, not washed-out means', () => {
    // Half saturated red members, half near-white — a mean would produce a
    // pale pink; the medoid must be one of the actual inputs.
    const members: [number, number, number][] = [
      [45, 70, 55],
      [45.5, 71, 54],
      [44.5, 69, 56],
      [45.2, 70.5, 55.2],
      [95, 2, 3],
      [94.8, 2.2, 2.8],
      [95.2, 1.8, 3.2],
      [94.9, 2.1, 2.9],
    ];
    const lab = new Float64Array(members.length * 3);
    members.forEach((m, i) => lab.set(m, i * 3));
    const q = quantize(lab, 2, 1);
    const q2 = quantize(lab, 2, 1);
    // Deterministic
    expect(q.palette.map((p) => p.hex)).toEqual(q2.palette.map((p) => p.hex));
    // Every palette color coincides with some member.
    for (const entry of q.palette) {
      const hit = members.some(
        (m) => Math.abs(m[0] - entry.lab[0]) < 1e-6 && Math.abs(m[1] - entry.lab[1]) < 1e-6,
      );
      expect(hit).toBe(true);
    }
  });
});

describe('CIEDE2000 sanity against rgbToLab', () => {
  it('red vs green ΔE00 is large, near-identical reds are small', () => {
    const red = rgbToLab(220, 40, 40);
    const red2 = rgbToLab(222, 41, 41);
    const green = rgbToLab(40, 160, 60);
    expect(labDistance2000(red, red2)).toBeLessThan(2);
    expect(labDistance2000(red, green)).toBeGreaterThan(20);
  });
});
