/** Color space conversions per SPEC Task 4 (standard sRGB/D65 formulas). */

// XYZ (D65) → linear sRGB inverse matrix
const M_INV = [
  3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556, 0.0556434, -0.2040259,
  1.0572252,
] as const;

// White point D65
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

const EPS = 0.008856;
const KAPPA = 7.787;

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(255 * v);
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function f(t: number): number {
  return t > EPS ? Math.cbrt(t) : KAPPA * t + 16 / 116;
}

function finv(u: number): number {
  const c = u * u * u;
  return c > EPS ? c : (u - 16 / 116) / KAPPA;
}

/** sRGB (0..255) → CIELAB, D65 reference white. */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  const x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / XN;
  const y = (0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl) / YN;
  const z = (0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) / ZN;

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIELAB → sRGB (0..255, rounded and clamped). */
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const x = finv(fx) * XN;
  const y = finv(fy) * YN;
  const z = finv(fz) * ZN;

  const rl = M_INV[0] * x + M_INV[1] * y + M_INV[2] * z;
  const gl = M_INV[3] * x + M_INV[4] * y + M_INV[5] * z;
  const bl = M_INV[6] * x + M_INV[7] * y + M_INV[8] * z;

  return [
    clamp255(linearChannelToSrgb(rl)),
    clamp255(linearChannelToSrgb(gl)),
    clamp255(linearChannelToSrgb(bl)),
  ];
}

/** CIEDE2000 color difference (Sharma, Wu & Dalal 2005 reference
 * implementation). Perceptually uniform where CIE76 over- and under-scores:
 * saturated regions, near-neutrals, and the blue hue band. Used by the
 * contrast-aware region merge and the auto-k floor. */
export function labDistance2000(a: [number, number, number], b: [number, number, number]): number {
  const L1 = a[0],
    a1 = a[1],
    b1 = a[2];
  const L2 = b[0],
    a2 = b[1],
    b2 = b[2];

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const c7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(c7 / (c7 + 25 ** 7)));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const hue = (ap: number, bv: number): number => {
    if (ap === 0 && bv === 0) return 0;
    let deg = (Math.atan2(bv, ap) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  };
  const h1p = hue(a1p, b1);
  const h2p = hue(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * (Math.PI / 180));

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let hbp: number;
  if (C1p * C2p === 0) {
    hbp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hbp = (h1p + h2p + 360) / 2;
  } else {
    hbp = (h1p + h2p - 360) / 2;
  }

  const rad = Math.PI / 180;
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const cp7 = Cbp ** 7;
  const RC = 2 * Math.sqrt(cp7 / (cp7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;

  const tL = dLp / SL;
  const tC = dCp / SC;
  const tH = dHp / SH;
  return Math.sqrt(tL * tL + tC * tC + tH * tH + RT * tC * tH);
}

/** Euclidean distance in CIELAB. */
export function labDistance(a: [number, number, number], b: [number, number, number]): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** Lab tuple → '#rrggbb' lowercase hex. */
export function labToHex(lab: [number, number, number]): string {
  const [r, g, b] = labToRgb(lab[0], lab[1], lab[2]);
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}

/** '#rgb' | '#rrggbb' → [r, g, b] (0..255). Returns null on malformed input. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** YIQ luminance heuristic per SPEC Task 14: Y >= 128 → light color (dark digit). */
export function yiqLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
