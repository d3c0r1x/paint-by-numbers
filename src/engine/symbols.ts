/** Legend symbols like the reference painting: 1..9, then 0, then A..Z.
 * color 0 → "1", color 8 → "0", color 9 → "A", color 35 → "Z". */
export function symbolFor(colorIndex: number): string {
  if (colorIndex < 9) return String(colorIndex + 1)
  if (colorIndex === 9) return '0'
  const letter = colorIndex - 10
  if (letter < 26) return String.fromCharCode(65 + letter)
  return '?'
}

/** Inverse mapping for parsing legend input. */
export function colorIndexForSymbol(sym: string): number | null {
  if (/^[1-9]$/.test(sym)) return Number(sym) - 1
  if (sym === '0') return 9
  const code = sym.toUpperCase().charCodeAt(0)
  if (code >= 65 && code <= 90) return 10 + (code - 65)
  return null
}
