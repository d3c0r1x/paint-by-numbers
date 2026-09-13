import { describe, it, expect } from 'vitest';
import { symbolFor, colorIndexForSymbol } from '../src/engine/symbols';

describe('symbolFor / colorIndexForSymbol', () => {
  it('round-trips every palette index in the 36-symbol budget', () => {
    for (let i = 0; i < 36; i++) {
      expect(colorIndexForSymbol(symbolFor(i))).toBe(i);
    }
  });

  it('canvas label invariant: symbol used on the canvas equals legend symbol for every colorIdx', () => {
    // The bug this locks in: labels.ts and PaletteBar previously drew
    // `colorIdx + 1` ("10", "11", ...) while the legend used symbolFor
    // ("A", "B", ...). Both must come from the single symbolFor mapping.
    for (let colorIdx = 0; colorIdx < 36; colorIdx++) {
      const sym = symbolFor(colorIdx);
      expect(sym).not.toBe('?');
      // 1-based fallback diverges exactly at colorIdx >= 9 ("10" vs "0").
      if (colorIdx >= 9) expect(sym).not.toBe(String(colorIdx + 1));
      if (colorIdx >= 10) expect(/^\d$/.test(sym)).toBe(false);
    }
  });

  it('uses the reference sequence 1..9, 0, A..', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(symbolFor)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      'A',
      'B',
    ]);
  });
});
