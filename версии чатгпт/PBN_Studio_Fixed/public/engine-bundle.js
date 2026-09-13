/** Color space conversions per SPEC Task 4 (standard sRGB/D65 formulas). */
// XYZ (D65) → linear sRGB inverse matrix
const M_INV = [
    3.2404542, -1.5371385, -0.4985314,
    -0.969266, 1.8760108, 0.041556,
    0.0556434, -0.2040259, 1.0572252,
];
// White point D65
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;
const EPS = 0.008856;
const KAPPA = 7.787;
function srgbChannelToLinear(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function linearChannelToSrgb(c) {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(255 * v);
}
function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}
function f(t) {
    return t > EPS ? Math.cbrt(t) : KAPPA * t + 16 / 116;
}
function finv(u) {
    const c = u * u * u;
    return c > EPS ? c : (u - 16 / 116) / KAPPA;
}
/** sRGB (0..255) → CIELAB, D65 reference white. */
function rgbToLab(r, g, b) {
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
function labToRgb(L, a, b) {
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
function labDistance2000(a, b) {
    const L1 = a[0], a1 = a[1], b1 = a[2];
    const L2 = b[0], a2 = b[1], b2 = b[2];
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const Cbar = (C1 + C2) / 2;
    const c7 = Cbar ** 7;
    const G = 0.5 * (1 - Math.sqrt(c7 / (c7 + 25 ** 7)));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);
    const hue = (ap, bv) => {
        if (ap === 0 && bv === 0)
            return 0;
        let deg = (Math.atan2(bv, ap) * 180) / Math.PI;
        if (deg < 0)
            deg += 360;
        return deg;
    };
    const h1p = hue(a1p, b1);
    const h2p = hue(a2p, b2);
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        const diff = h2p - h1p;
        if (Math.abs(diff) <= 180)
            dhp = diff;
        else if (diff > 180)
            dhp = diff - 360;
        else
            dhp = diff + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * (Math.PI / 180));
    const Lbp = (L1 + L2) / 2;
    const Cbp = (C1p + C2p) / 2;
    let hbp;
    if (C1p * C2p === 0) {
        hbp = h1p + h2p;
    }
    else if (Math.abs(h1p - h2p) <= 180) {
        hbp = (h1p + h2p) / 2;
    }
    else if (h1p + h2p < 360) {
        hbp = (h1p + h2p + 360) / 2;
    }
    else {
        hbp = (h1p + h2p - 360) / 2;
    }
    const rad = Math.PI / 180;
    const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) +
        0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
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
function labDistance(a, b) {
    const dl = a[0] - b[0];
    const da = a[1] - b[1];
    const db = a[2] - b[2];
    return Math.sqrt(dl * dl + da * da + db * db);
}
/** Lab tuple → '#rrggbb' lowercase hex. */
function labToHex(lab) {
    const [r, g, b] = labToRgb(lab[0], lab[1], lab[2]);
    return ('#' +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0'));
}
/** '#rgb' | '#rrggbb' → [r, g, b] (0..255). Returns null on malformed input. */
function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m)
        return null;
    let h = m[1];
    if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}
/** YIQ luminance heuristic per SPEC Task 14: Y >= 128 → light color (dark digit). */
function yiqLuma(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Guided filter (He et al., 2010) over Lab planes — SPEC v3 Task 5.5.
 * Edge-preserving smoothing: kills photo grain/texture WITHOUT blurring
 * region boundaries. Implemented with O(N) box filters (moving sums),
 * no integral-image allocations beyond a couple of Float64 planes.
 *
 * Self-guided variant: the image guides itself per channel, which is the
 * standard fast approximation for denoising and is plenty for regionizing.
 */
/** Box (moving-average) filter of a single-channel plane, radius r, O(N). */
function boxFilter(src, w, h, r) {
    const tmp = new Float64Array(src.length);
    const out = new Float64Array(src.length);
    // Horizontal pass: sliding window sum.
    for (let y = 0; y < h; y++) {
        const row = y * w;
        let acc = 0;
        for (let x = -r; x <= r; x++)
            acc += src[row + Math.min(w - 1, Math.max(0, x))];
        const denom = 2 * r + 1;
        for (let x = 0; x < w; x++) {
            tmp[row + x] = acc / denom;
            const add = src[row + Math.min(w - 1, x + r + 1)];
            const sub = src[row + Math.max(0, x - r)];
            acc += add - sub;
        }
    }
    // Vertical pass: sliding window sum over the horizontal result.
    const denom = 2 * r + 1;
    for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++)
            acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
            out[y * w + x] = acc / denom;
            const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
            const sub = tmp[Math.max(0, y - r) * w + x];
            acc += add - sub;
        }
    }
    return out;
}
function mul(a, b) {
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++)
        out[i] = a[i] * b[i];
    return out;
}
function addScaled(a, b, s) {
    // Guided-filter output: q = ā·I + b̄
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++)
        out[i] = a[i] * b[i] + s[i];
    return out;
}
/** Self-guided filter of one plane. eps controls edge preservation:
 * small eps → sharper edges preserved, more texture kept; larger → smoother. */
function guidedPlane(p, w, h, r, eps) {
    const meanI = boxFilter(p, w, h, r);
    const meanII = boxFilter(mul(p, p), w, h, r);
    // var = E[I²] − E[I]² ; a = var/(var+eps), b = mean − a·mean
    const varI = new Float64Array(p.length);
    const a = new Float64Array(p.length);
    const b = new Float64Array(p.length);
    for (let i = 0; i < p.length; i++) {
        varI[i] = Math.max(0, meanII[i] - meanI[i] * meanI[i]);
        a[i] = varI[i] / (varI[i] + eps);
        b[i] = meanI[i] * (1 - a[i]);
    }
    const meanA = boxFilter(a, w, h, r);
    const meanB = boxFilter(b, w, h, r);
    return addScaled(meanA, p, meanB);
}
/** Smooth all three Lab planes with a guided filter. Returns a new buffer. */
function guidedSmoothLab(lab, w, h, opts = {}) {
    const r = opts.radius ?? 4;
    const eps = opts.eps ?? 300;
    const n = w * h;
    const out = new Float64Array(n * 3);
    for (let c = 0; c < 3; c++) {
        const plane = new Float64Array(n);
        for (let i = 0; i < n; i++)
            plane[i] = lab[i * 3 + c];
        const smooth = guidedPlane(plane, w, h, r, eps);
        for (let i = 0; i < n; i++)
            out[i * 3 + c] = smooth[i];
    }
    return out;
}

function slic(lab, w, h, opts) {
    const n = w * h;
    if (n === 0)
        return { ids: new Int32Array(0), means: new Float64Array(0), sizes: new Int32Array(0), count: 0 };
    const requestedK = Math.max(1, Math.min(opts.numSuperpixels, n));
    const compactness = Math.max(0.1, opts.compactness ?? 10);
    const iterations = Math.max(1, opts.iterations ?? 8);
    const aspect = w / Math.max(1, h);
    const gridCols = Math.max(1, Math.round(Math.sqrt(requestedK * aspect)));
    const gridRows = Math.max(1, Math.round(requestedK / gridCols));
    const stepX = w / gridCols;
    const stepY = h / gridRows;
    const S = Math.sqrt(n / Math.max(1, gridCols * gridRows));
    const grad = new Float64Array(n);
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            const dl = lab[(p + 1) * 3] - lab[(p - 1) * 3];
            const dt = lab[(p + w) * 3] - lab[(p - w) * 3];
            grad[p] = dl * dl + dt * dt;
        }
    }
    const centers = [];
    const occupied = new Set();
    for (let gy = 0; gy < gridRows; gy++) {
        for (let gx = 0; gx < gridCols; gx++) {
            let cx = Math.min(w - 1, Math.floor((gx + 0.5) * stepX));
            let cy = Math.min(h - 1, Math.floor((gy + 0.5) * stepY));
            let bestX = cx;
            let bestY = cy;
            let bestG = Infinity;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = Math.max(0, Math.min(w - 1, cx + dx));
                    const ny = Math.max(0, Math.min(h - 1, cy + dy));
                    const g = grad[ny * w + nx];
                    if (g < bestG) {
                        bestG = g;
                        bestX = nx;
                        bestY = ny;
                    }
                }
            }
            cx = bestX;
            cy = bestY;
            const key = `${cx},${cy}`;
            if (occupied.has(key))
                continue;
            occupied.add(key);
            const p = cy * w + cx;
            centers.push(lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], cx, cy);
        }
    }
    const kc = centers.length / 5;
    const ids = new Int32Array(n).fill(-1);
    const distBuf = new Float64Array(n);
    const sums = new Float64Array(kc * 5);
    const counts = new Int32Array(kc);
    const spatialWeight = (compactness / Math.max(S, 1)) ** 2;
    for (let iter = 0; iter < iterations; iter++) {
        sums.fill(0);
        counts.fill(0);
        distBuf.fill(Infinity);
        for (let c = 0; c < kc; c++) {
            const o5 = c * 5;
            const cL = centers[o5];
            const cA = centers[o5 + 1];
            const cB = centers[o5 + 2];
            const cX = centers[o5 + 3];
            const cY = centers[o5 + 4];
            const radius = 2 * S;
            const x0 = Math.max(0, Math.floor(cX - radius));
            const x1 = Math.min(w - 1, Math.ceil(cX + radius));
            const y0 = Math.max(0, Math.floor(cY - radius));
            const y1 = Math.min(h - 1, Math.ceil(cY + radius));
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const p = y * w + x;
                    const o = p * 3;
                    const dl = lab[o] - cL;
                    const da = lab[o + 1] - cA;
                    const db = lab[o + 2] - cB;
                    const dx = x - cX;
                    const dy = y - cY;
                    const d = dl * dl + da * da + db * db + spatialWeight * (dx * dx + dy * dy);
                    if (d < distBuf[p]) {
                        distBuf[p] = d;
                        ids[p] = c;
                    }
                }
            }
        }
        let maxMove = 0;
        for (let p = 0; p < n; p++) {
            const c = ids[p];
            if (c < 0)
                continue;
            const o = p * 3;
            const s = c * 5;
            sums[s] += lab[o];
            sums[s + 1] += lab[o + 1];
            sums[s + 2] += lab[o + 2];
            sums[s + 3] += p % w;
            sums[s + 4] += Math.floor(p / w);
            counts[c]++;
        }
        for (let c = 0; c < kc; c++) {
            if (counts[c] === 0)
                continue;
            const o5 = c * 5;
            const inv = 1 / counts[c];
            const nL = sums[o5] * inv;
            const nA = sums[o5 + 1] * inv;
            const nB = sums[o5 + 2] * inv;
            const nX = sums[o5 + 3] * inv;
            const nY = sums[o5 + 4] * inv;
            maxMove = Math.max(maxMove, Math.abs(nL - centers[o5]), Math.abs(nA - centers[o5 + 1]), Math.abs(nB - centers[o5 + 2]), Math.abs(nX - centers[o5 + 3]), Math.abs(nY - centers[o5 + 4]));
            centers[o5] = nL;
            centers[o5 + 1] = nA;
            centers[o5 + 2] = nB;
            centers[o5 + 3] = nX;
            centers[o5 + 4] = nY;
        }
        if (maxMove < 0.25)
            break;
    }
    // Guarantee complete labeling for any pixels missed by a local search window.
    for (let p = 0; p < n; p++) {
        if (ids[p] >= 0)
            continue;
        const x = p % w;
        const y = Math.floor(p / w);
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < kc; c++) {
            const dx = x - centers[c * 5 + 3];
            const dy = y - centers[c * 5 + 4];
            const d = dx * dx + dy * dy;
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        ids[p] = best;
    }
    const sizes = new Int32Array(kc);
    const sums2 = new Float64Array(kc * 3);
    for (let p = 0; p < n; p++) {
        const c = ids[p];
        const o = p * 3;
        sizes[c]++;
        sums2[c * 3] += lab[o];
        sums2[c * 3 + 1] += lab[o + 1];
        sums2[c * 3 + 2] += lab[o + 2];
    }
    const means = new Float64Array(kc * 3);
    for (let c = 0; c < kc; c++) {
        if (sizes[c] === 0)
            continue;
        const inv = 1 / sizes[c];
        means[c * 3] = sums2[c * 3] * inv;
        means[c * 3 + 1] = sums2[c * 3 + 1] * inv;
        means[c * 3 + 2] = sums2[c * 3 + 2] * inv;
    }
    return { ids, means, sizes, count: kc };
}

/** K-means++ quantization in CIELAB per SPEC Task 5.
 * v3.1: the palette color of each cluster is its **medoid** — the member
 * closest to the centroid — instead of the mean. Means wash saturated
 * accents (blush, lips, bokeh highlights) toward gray; a medoid keeps the
 * paint color a color that actually occurs in the image. */
/** Deterministic PRNG (mulberry32). Same seed → same sequence. */
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const MAX_ITER = 20;
const MOVE_EPS = 0.5; // stop early when centroids move less than this (Lab units)
const MAX_FIT_POINTS = 240_000; // fit centroids on a deterministic stride subsample
function fitCentroids(lab, n, k, seed, weights) {
    const rand = mulberry32(seed);
    const centroids = [];
    const px = (i, c) => lab[i * 3 + c];
    const weight = (i) => weights ? Math.max(0, weights[i]) : 1;
    // K-means++ init
    const first = Math.floor(rand() * n);
    centroids.push([px(first, 0), px(first, 1), px(first, 2)]);
    const dist2 = new Float64Array(n).fill(Infinity);
    for (let ci = 1; ci < k; ci++) {
        let sum = 0;
        const last = centroids[centroids.length - 1];
        for (let i = 0; i < n; i++) {
            const dl = px(i, 0) - last[0];
            const da = px(i, 1) - last[1];
            const db = px(i, 2) - last[2];
            const d = dl * dl + da * da + db * db;
            if (d < dist2[i])
                dist2[i] = d;
            sum += dist2[i] * weight(i);
        }
        if (sum <= 0) {
            // All points coincide with chosen centroids; duplicate to keep k fixed.
            const src = Math.floor(rand() * n);
            centroids.push([px(src, 0), px(src, 1), px(src, 2)]);
            continue;
        }
        let r = rand() * sum;
        let pick = n - 1;
        for (let i = 0; i < n; i++) {
            r -= dist2[i] * weight(i);
            if (r <= 0) {
                pick = i;
                break;
            }
        }
        centroids.push([px(pick, 0), px(pick, 1), px(pick, 2)]);
    }
    // Lloyd iterations
    const counts = new Int32Array(k);
    const sums = new Float64Array(k * 3);
    for (let iter = 0; iter < MAX_ITER; iter++) {
        counts.fill(0);
        sums.fill(0);
        let moved = 0;
        for (let i = 0; i < n; i++) {
            const wi = weight(i);
            if (wi <= 0)
                continue;
            const L = px(i, 0);
            const A = px(i, 1);
            const B = px(i, 2);
            let best = 0;
            let bestD = Infinity;
            for (let c = 0; c < centroids.length; c++) {
                const dl = L - centroids[c][0];
                const da = A - centroids[c][1];
                const dbv = B - centroids[c][2];
                const d = dl * dl + da * da + dbv * dbv;
                if (d < bestD) {
                    bestD = d;
                    best = c;
                }
            }
            counts[best] += wi;
            sums[best * 3] += L * wi;
            sums[best * 3 + 1] += A * wi;
            sums[best * 3 + 2] += B * wi;
        }
        for (let c = 0; c < centroids.length; c++) {
            if (counts[c] === 0)
                continue; // keep previous centroid for empty clusters
            const nl = sums[c * 3] / counts[c];
            const na = sums[c * 3 + 1] / counts[c];
            const nb = sums[c * 3 + 2] / counts[c];
            moved = Math.max(moved, Math.abs(nl - centroids[c][0]), Math.abs(na - centroids[c][1]), Math.abs(nb - centroids[c][2]));
            centroids[c] = [nl, na, nb];
        }
        if (moved < MOVE_EPS)
            break;
    }
    return { centroids };
}
/** Quantize Lab pixels (3 per point) into k colors.
 * Returns palette ordered by pixelCount descending and a label map (palette index per input point). */
function quantize(lab, k, seed, weights) {
    const n = lab.length / 3;
    if (n === 0 || k < 1) {
        return { palette: [], labels: new Uint16Array(0) };
    }
    const kk = Math.min(k, 65535);
    // Deterministic subsample for centroid fitting on large images.
    let fitLab = lab;
    let fitN = n;
    if (n > MAX_FIT_POINTS) {
        const stride = Math.ceil(n / MAX_FIT_POINTS);
        fitN = Math.floor((n + stride - 1) / stride);
        fitLab = new Float64Array(fitN * 3);
        for (let j = 0; j < fitN; j++) {
            const i = Math.min(j * stride, n - 1);
            fitLab[j * 3] = lab[i * 3];
            fitLab[j * 3 + 1] = lab[i * 3 + 1];
            fitLab[j * 3 + 2] = lab[i * 3 + 2];
        }
    }
    let fitWeights;
    if (weights && fitN !== n) {
        const stride = Math.ceil(n / MAX_FIT_POINTS);
        fitWeights = new Float64Array(fitN);
        for (let j = 0; j < fitN; j++)
            fitWeights[j] = weights[Math.min(j * stride, n - 1)];
    }
    else {
        fitWeights = weights;
    }
    const { centroids } = fitCentroids(fitLab, fitN, kk, seed, fitWeights);
    // Assign every input point and build counts + medoid candidates.
    const labels = new Uint16Array(n);
    const counts = new Float64Array(centroids.length);
    const sums = new Float64Array(centroids.length * 3);
    // Medoid: member closest to the centroid (squared Lab euclidean).
    const medoidIdx = new Int32Array(centroids.length).fill(-1);
    const medoidD2 = new Float64Array(centroids.length).fill(Infinity);
    for (let i = 0; i < n; i++) {
        const L = lab[i * 3];
        const A = lab[i * 3 + 1];
        const B = lab[i * 3 + 2];
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < centroids.length; c++) {
            const dl = L - centroids[c][0];
            const da = A - centroids[c][1];
            const dbv = B - centroids[c][2];
            const d = dl * dl + da * da + dbv * dbv;
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        labels[i] = best;
        const wi = weights ? Math.max(0, weights[i]) : 1;
        counts[best] += wi;
        sums[best * 3] += L * wi;
        sums[best * 3 + 1] += A * wi;
        sums[best * 3 + 2] += B * wi;
        if (bestD < medoidD2[best]) {
            medoidD2[best] = bestD;
            medoidIdx[best] = i;
        }
    }
    // Palette sorted by pixelCount descending (color 1 = largest area).
    const order = centroids
        .map((_, i) => ({ i, count: counts[i] }))
        .sort((a, b) => b.count - a.count || a.i - b.i);
    const remap = new Int32Array(centroids.length);
    const palette = order.map((entry, newIndex) => {
        remap[entry.i] = newIndex;
        const c = centroids[entry.i];
        const count = counts[entry.i];
        // Medoid color: an actual image color, not the (washed-out) mean.
        const mi = medoidIdx[entry.i];
        const color = count > 0 && mi >= 0
            ? [lab[mi * 3], lab[mi * 3 + 1], lab[mi * 3 + 2]]
            : c;
        return { index: newIndex, lab: color, hex: labToHex(color), pixelCount: count };
    });
    for (let i = 0; i < n; i++)
        labels[i] = remap[labels[i]];
    return { palette, labels };
}

/** Smart auto-palette (replaces SPEC difficulty presets): keep practically
 * all colors — the symbol budget (1..9, 0, A..Z = 36) is the only real limit.
 * Phase 1 dedupes indistinguishable shades (ΔE00 < minDist). Phase 2 merges
 * the CLOSEST cluster pair repeatedly until the palette fits the budget, so
 * a smooth-gradient photo keeps 36 graded steps instead of collapsing.
 * All comparisons are CIEDE2000 — perceptual, unlike CIE76. */
/** Max palette size: digits 1..9 + 0 + letters A..Z = 36 symbols (reference legend). */
const MAX_PALETTE = 36;
/** Shades closer than this are considered the same paint (noise-level dupes). */
const MIN_COLOR_DISTANCE = 5;
function meanOf(c) {
    return [c.labSum[0] / c.weight, c.labSum[1] / c.weight, c.labSum[2] / c.weight];
}
function refinePalette(palette, minDist = MIN_COLOR_DISTANCE, maxColors = MAX_PALETTE) {
    const clusters = [];
    const assign = new Int32Array(palette.length);
    // Phase 1 — leader clustering: dedupe only near-identical shades.
    for (let i = 0; i < palette.length; i++) {
        const p = palette[i];
        let best = -1;
        let bestD = Infinity;
        for (let c = 0; c < clusters.length; c++) {
            const d = labDistance2000(p.lab, meanOf(clusters[c]));
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        if (best >= 0 && bestD < minDist) {
            const cl = clusters[best];
            cl.labSum[0] += p.lab[0] * p.pixelCount;
            cl.labSum[1] += p.lab[1] * p.pixelCount;
            cl.labSum[2] += p.lab[2] * p.pixelCount;
            cl.weight += p.pixelCount;
            cl.pixelCount += p.pixelCount;
            assign[i] = best;
        }
        else {
            clusters.push({
                labSum: [p.lab[0] * p.pixelCount, p.lab[1] * p.pixelCount, p.lab[2] * p.pixelCount],
                weight: p.pixelCount,
                pixelCount: p.pixelCount,
                seed: i,
            });
            assign[i] = clusters.length - 1;
        }
    }
    // Phase 2 — agglomerative: merge the closest pair until ≤ maxColors.
    while (clusters.length > maxColors) {
        let bi = 0;
        let bj = 1;
        let bestD = Infinity;
        for (let i = 0; i < clusters.length; i++) {
            const mi = meanOf(clusters[i]);
            for (let j = i + 1; j < clusters.length; j++) {
                const d = labDistance2000(mi, meanOf(clusters[j]));
                if (d < bestD) {
                    bestD = d;
                    bi = i;
                    bj = j;
                }
            }
        }
        const a = clusters[bi];
        const b = clusters[bj];
        a.labSum[0] += b.labSum[0];
        a.labSum[1] += b.labSum[1];
        a.labSum[2] += b.labSum[2];
        a.weight += b.weight;
        a.pixelCount += b.pixelCount;
        clusters.splice(bj, 1);
        // Reindex assignments above the removed slot.
        for (let i = 0; i < assign.length; i++) {
            if (assign[i] === bj)
                assign[i] = bi;
            else if (assign[i] > bj)
                assign[i] -= 1;
        }
    }
    // Palette order: pixelCount desc ⇒ symbol 1 = the largest area.
    const result = [];
    const clusterPos = new Map();
    clusters
        .map((c, i) => ({ i, pixelCount: c.pixelCount }))
        .sort((x, y) => y.pixelCount - x.pixelCount || x.i - y.i)
        .forEach(({ i }) => {
        const mean = meanOf(clusters[i]);
        let representative;
        let bestD = Infinity;
        for (let old = 0; old < palette.length; old++) {
            if (assign[old] !== i)
                continue;
            const d = labDistance2000(palette[old].lab, mean);
            if (d < bestD) {
                bestD = d;
                representative = palette[old];
            }
        }
        const color = representative?.lab ?? mean;
        clusterPos.set(i, result.length);
        result.push({ index: result.length, lab: color, hex: hexFromLab(color), pixelCount: clusters[i].pixelCount });
    });
    // Remap: every old palette index → its cluster's new position; entries of
    // clusters removed in phase 2 already point at their absorber via reindex.
    const remap = new Int32Array(palette.length);
    for (let i = 0; i < palette.length; i++) {
        remap[i] = clusterPos.get(assign[i]) ?? 0;
    }
    return { palette: result, remap };
}
function hexFromLab(lab) {
    const [r, g, b] = labToRgbSafe(lab);
    const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}
function labToRgbSafe(lab) {
    // Local conversion to avoid a circular import with colorSpace helpers.
    const f = (t) => (t > 0.206897 ? t ** 3 : (t - 4 / 29) / 7.787);
    const fy = (lab[0] + 16) / 116;
    const x = 0.95047 * f(fy + lab[1] / 500);
    const y = 1.0 * f(fy);
    const z = 1.08883 * f(fy - lab[2] / 200);
    const toS = (c) => {
        const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
        return v * 255;
    };
    const r = toS(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
    const g = toS(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
    const b = toS(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
    return [r, g, b];
}

/** Legend symbols like the reference painting: 1..9, then 0, then A..Z.
 * color 0 → "1", color 8 → "0", color 9 → "A", color 35 → "Z". */
function symbolFor(colorIndex) {
    if (colorIndex < 9)
        return String(colorIndex + 1);
    if (colorIndex === 9)
        return '0';
    const letter = colorIndex - 10;
    if (letter < 26)
        return String.fromCharCode(65 + letter);
    return '?';
}
/** Inverse mapping for parsing legend input. */
function colorIndexForSymbol(sym) {
    if (/^[1-9]$/.test(sym))
        return Number(sym) - 1;
    if (sym === '0')
        return 9;
    const code = sym.toUpperCase().charCodeAt(0);
    if (code >= 65 && code <= 90)
        return 10 + (code - 65);
    return null;
}

/** Connected regions + small-region merging per SPEC Task 6.
 * Designed for real photos: the merge loop is pure bookkeeping (no pixel
 * array concatenation); pixel lists and bboxes are rebuilt in a single
 * O(pixels) pass afterwards. */
/** Contrast-aware merging (SPEC v3.1 P0): a region smaller than minArea is
 * merged into a neighbor ONLY if their ΔE00 is below this threshold. Small
 * but contrast-bearing regions (lips, eyelets, lace, blush) survive instead
 * of being dissolved into their surroundings. */
const MERGE_CONTRAST_THRESHOLD = 12;
const UNASSIGNED = 0xffffffff;
/** Split a label map into 4-connected regions and record adjacency
 * from pixel pairs with differing labels (right/down pairs). */
function buildRegions(labels, width, height, importanceMap) {
    const n = width * height;
    const regionIds = new Uint32Array(n).fill(UNASSIGNED);
    const pixelsLists = [];
    const neighborSets = [];
    const queue = new Int32Array(n);
    for (let start = 0; start < n; start++) {
        if (regionIds[start] !== UNASSIGNED)
            continue;
        const colorIdx = labels[start];
        const id = pixelsLists.length;
        const pixels = [];
        neighborSets.push(new Set());
        let head = 0;
        let tail = 0;
        queue[tail++] = start;
        regionIds[start] = id;
        pixels.push(start);
        while (head < tail) {
            const p = queue[head++];
            const x = p % width;
            const y = (p - x) / width;
            // 4-connectivity: right, down, left, up.
            // Same-label unassigned neighbors are claimed; differing-label neighbors
            // record adjacency once both regions exist (the reverse pair is always
            // examined by the other region's BFS, so nothing is missed).
            const q4 = [x + 1 < width ? p + 1 : -1, y + 1 < height ? p + width : -1, x > 0 ? p - 1 : -1, y > 0 ? p - width : -1];
            for (const q of q4) {
                if (q < 0)
                    continue;
                if (labels[q] === colorIdx) {
                    if (regionIds[q] === UNASSIGNED) {
                        regionIds[q] = id;
                        queue[tail++] = q;
                        pixels.push(q);
                    }
                }
                else if (regionIds[q] !== UNASSIGNED) {
                    addAdjacency(neighborSets, id, regionIds[q]);
                }
            }
        }
        pixelsLists.push(pixels);
    }
    const regions = pixelsLists.map((pixels, id) => ({
        id,
        colorIdx: labels[pixels[0]],
        area: pixels.length,
        pixels,
        bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        neighbors: neighborSets[id],
        importance: 0,
    }));
    recomputeBboxes(regions, regionIds, width, height);
    if (importanceMap && importanceMap.length === regionIds.length) {
        const sums = new Float64Array(regions.length);
        for (let p = 0; p < regionIds.length; p++) {
            const rid = regionIds[p];
            sums[rid] += importanceMap[p];
        }
        for (const r of regions)
            r.importance = r.area > 0 ? Math.min(1, sums[r.id] / r.area) : 0;
    }
    return { regionIds, regions };
}
function addAdjacency(neighborSets, a, b) {
    if (a === b)
        return;
    neighborSets[a].add(b);
    neighborSets[b].add(a);
}
function recomputeBboxes(regions, regionIds, width, height) {
    for (const r of regions) {
        r.bbox = { minX: width, minY: height, maxX: -1, maxY: -1 };
    }
    for (let p = 0; p < regionIds.length; p++) {
        const r = regions[regionIds[p]];
        const x = p % width;
        const y = (p - x) / width;
        if (x < r.bbox.minX)
            r.bbox.minX = x;
        if (x > r.bbox.maxX)
            r.bbox.maxX = x;
        if (y < r.bbox.minY)
            r.bbox.minY = y;
        if (y > r.bbox.maxY)
            r.bbox.maxY = y;
    }
}
/** Merge every region smaller than minAreaPixels into its nearest neighbor
 * until none remain (isolated small regions are kept). Two merging regimes:
 *  - contrast-aware pass: contrast small regions (ΔE00 ≥ threshold with every
 *    neighbor) are KEPT — details like lips/lace survive;
 *  - everything else merges into the ΔE00-nearest alive neighbor.
 * Only area/neighbor bookkeeping happens here; pixels are rebuilt once. */
function mergeSmallRegions(seg, palette, minAreaPixels, width, height) {
    if (minAreaPixels <= 0)
        return;
    const { regions } = seg;
    const alive = regions.map(() => true);
    /** absorbedInto[a] = the region that finally absorbed a's pixels. */
    const absorbedInto = new Int32Array(regions.length).fill(-1);
    const smallQueue = [];
    for (const r of regions) {
        if (r.area < minAreaPixels)
            smallQueue.push(r.id);
    }
    const labOf = regions.map((r) => palette[r.colorIdx].lab);
    const dE00 = (a, b) => labDistance2000(labOf[a], labOf[b]);
    // Shared boundary length makes merges shape-aware: a region should prefer
    // a visually similar neighbour that also shares a substantial interface.
    const boundaryLength = buildBoundaryLengths(seg.regionIds, width, height);
    const pairKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
    let qi = 0;
    while (qi < smallQueue.length) {
        const smallId = smallQueue[qi++];
        if (!alive[smallId])
            continue;
        const small = regions[smallId];
        if (small.area >= minAreaPixels)
            continue;
        if (small.neighbors.size === 0)
            continue; // isolated: keep as-is
        // Contrast guard: a small region that stands out against EVERY alive
        // neighbor is a detail, not noise — keep it.
        let maxNeighborD = -1;
        for (const nbId of small.neighbors) {
            if (!alive[nbId])
                continue;
            const d = dE00(smallId, nbId);
            if (d > maxNeighborD)
                maxNeighborD = d;
        }
        if (maxNeighborD < 0)
            continue; // no alive neighbors: keep
        const importanceGuard = 0.42 + Math.min(0.28, minAreaPixels / 2000);
        if (maxNeighborD >= MERGE_CONTRAST_THRESHOLD)
            continue; // contrast detail: keep
        if (small.importance >= importanceGuard)
            continue; // visually important detail: keep
        // Pick the target with a shape-aware merge cost. Colour similarity is
        // still dominant, but a long shared boundary is rewarded because it tends
        // to preserve object silhouette and avoid thin accidental bridges.
        let bestId = -1;
        let bestCost = Infinity;
        const smallPerimeter = Math.max(1, estimatePerimeter(smallId, seg.regionIds, width, height));
        for (const nbId of small.neighbors) {
            if (!alive[nbId])
                continue;
            const d = dE00(smallId, nbId);
            const shared = boundaryLength.get(pairKey(smallId, nbId)) ?? 1;
            const sharedRatio = Math.min(1, shared / smallPerimeter);
            const areaRatio = Math.min(small.area, regions[nbId].area) / Math.max(small.area, regions[nbId].area);
            const cost = d * (1.0 - 0.35 * sharedRatio) * (1.0 + 0.12 * (1.0 - areaRatio));
            if (cost < bestCost) {
                bestCost = cost;
                bestId = nbId;
            }
        }
        if (bestId < 0)
            continue;
        // Absorb: rewire neighbor sets and add areas. No pixel arrays touched.
        const into = regions[bestId];
        for (const nbId of small.neighbors) {
            if (nbId === bestId)
                continue;
            regions[nbId].neighbors.delete(smallId);
            regions[nbId].neighbors.add(bestId);
            into.neighbors.add(nbId);
            const moved = boundaryLength.get(pairKey(smallId, nbId)) ?? 0;
            const existing = boundaryLength.get(pairKey(bestId, nbId)) ?? 0;
            boundaryLength.set(pairKey(bestId, nbId), existing + moved);
            boundaryLength.delete(pairKey(smallId, nbId));
        }
        into.neighbors.delete(smallId);
        boundaryLength.delete(pairKey(smallId, bestId));
        into.area += small.area;
        // Track the absorption chain so compaction can route the small region's
        // pixels (and any pixels of regions absorbed into it earlier) to `into`.
        absorbedInto[smallId] = bestId;
        alive[smallId] = false;
        small.area = 0;
        small.neighbors.clear();
        // Absorption can drag the target below minArea; re-evaluate it, but it
        // re-enters the merge only if it is still low-contrast vs its neighbors.
        if (into.area < minAreaPixels)
            smallQueue.push(bestId);
    }
    compactAndRebuild(seg, alive, absorbedInto, width, height);
}
function buildBoundaryLengths(regionIds, width, height) {
    const out = new Map();
    const key = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = y * width + x;
            const a = regionIds[p];
            if (x + 1 < width) {
                const b = regionIds[p + 1];
                if (a !== b) {
                    const k = key(a, b);
                    out.set(k, (out.get(k) ?? 0) + 1);
                }
            }
            if (y + 1 < height) {
                const b = regionIds[p + width];
                if (a !== b) {
                    const k = key(a, b);
                    out.set(k, (out.get(k) ?? 0) + 1);
                }
            }
        }
    }
    return out;
}
function estimatePerimeter(regionId, regionIds, width, height) {
    let perimeter = 0;
    for (let p = 0; p < regionIds.length; p++) {
        if (regionIds[p] !== regionId)
            continue;
        const x = p % width;
        const y = (p - x) / width;
        if (x === 0 || regionIds[p - 1] !== regionId)
            perimeter++;
        if (x + 1 === width || regionIds[p + 1] !== regionId)
            perimeter++;
        if (y === 0 || regionIds[p - width] !== regionId)
            perimeter++;
        if (y + 1 === height || regionIds[p + width] !== regionId)
            perimeter++;
    }
    return perimeter;
}
/** Compact region ids (no gaps), rebuild pixel lists and bboxes in one pass,
 * and remap neighbor sets to the new ids. Pixels of absorbed regions are
 * routed to their final absorber via the absorption chain. */
function compactAndRebuild(seg, alive, absorbedInto, width, height) {
    void height;
    const remap = new Int32Array(seg.regions.length).fill(-1);
    const kept = [];
    for (let i = 0; i < seg.regions.length; i++) {
        if (!alive[i])
            continue;
        remap[i] = kept.length;
        kept.push(seg.regions[i]);
    }
    // Resolve each dead region's final absorber once (chains are short: each
    // hop moves to an alive-or-later-absorbed region, but we guard with a walk).
    const finalTarget = new Int32Array(seg.regions.length);
    for (let i = 0; i < seg.regions.length; i++) {
        let t = i;
        while (!alive[t] && absorbedInto[t] >= 0)
            t = absorbedInto[t];
        finalTarget[i] = alive[t] ? t : -1;
    }
    const buckets = kept.map(() => []);
    const bboxes = kept.map(() => ({ minX: width, minY: Infinity, maxX: -1, maxY: -1 }));
    const { regionIds } = seg;
    for (let p = 0; p < regionIds.length; p++) {
        const origId = regionIds[p];
        const target = alive[origId] ? origId : finalTarget[origId];
        const id = target >= 0 ? remap[target] : -1;
        if (id < 0) {
            // Unreachable for well-formed input (every pixel belongs to a region
            // that stayed alive or was absorbed); guard against corrupt maps.
            regionIds[p] = 0;
            buckets[0].push(p);
            continue;
        }
        regionIds[p] = id;
        buckets[id].push(p);
        const x = p % width;
        const y = (p - x) / width;
        const b = bboxes[id];
        if (x < b.minX)
            b.minX = x;
        if (x > b.maxX)
            b.maxX = x;
        if (y < b.minY)
            b.minY = y;
        if (y > b.maxY)
            b.maxY = y;
    }
    seg.regions = kept.map((r, i) => {
        const neighbors = new Set();
        for (const nb of r.neighbors) {
            const mapped = remap[nb];
            if (mapped >= 0 && mapped !== i)
                neighbors.add(mapped);
        }
        r.id = i;
        r.pixels = buckets[i];
        r.area = buckets[i].length;
        r.bbox = bboxes[i];
        r.neighbors = neighbors;
        return r;
    });
}

function computeLabelPoints(regions, regionIds, width, height) {
    const n = width * height;
    // Stamp trick: stamp[p] === currentStamp ⇒ dist[p] is valid for region `cur`.
    const dist = new Int32Array(n);
    const stamp = new Int32Array(n);
    const queue = new Int32Array(n);
    let currentStamp = 0;
    const out = [];
    for (const region of regions) {
        currentStamp++;
        const candidates = farthestCandidates(region, regionIds, width, height, dist, stamp, queue, currentStamp);
        const point = chooseNonCollidingCandidate(candidates, region, width, out);
        const fontSize = computeAdaptiveFontSize(region, symbolFor(region.colorIdx), point, width, height);
        out.push({
            colorIdx: region.colorIdx,
            area: region.area,
            labelX: point.x + 0.5,
            labelY: point.y + 0.5,
            fontSize,
        });
    }
    return out;
}
function clampFontSize(size) {
    return Math.min(48, Math.max(10, size));
}
function farthestCandidates(region, regionIds, width, height, dist, stamp, queue, currentStamp) {
    let head = 0;
    let tail = 0;
    // Seed BFS from region pixels that touch the image edge or a non-member.
    for (const p of region.pixels) {
        const x = p % width;
        const y = (p - x) / width;
        const border = x === 0 ||
            y === 0 ||
            x === width - 1 ||
            y === height - 1 ||
            regionIds[p - 1] !== region.id ||
            regionIds[p + 1] !== region.id ||
            regionIds[p - width] !== region.id ||
            regionIds[p + width] !== region.id;
        if (border) {
            dist[p] = 0;
            stamp[p] = currentStamp;
            queue[tail++] = p;
        }
    }
    let maxDist = -1;
    let maxP = region.pixels[0];
    const top = [];
    while (head < tail) {
        const p = queue[head++];
        const d = dist[p];
        if (d > maxDist) {
            maxDist = d;
            maxP = p;
        }
        top.push({ p, d });
        const x = p % width;
        const y = (p - x) / width;
        // Neighbor in bounds, same region, not visited yet.
        if (x > 0 && regionIds[p - 1] === region.id && stamp[p - 1] !== currentStamp) {
            dist[p - 1] = d + 1;
            stamp[p - 1] = currentStamp;
            queue[tail++] = p - 1;
        }
        if (x + 1 < width && regionIds[p + 1] === region.id && stamp[p + 1] !== currentStamp) {
            dist[p + 1] = d + 1;
            stamp[p + 1] = currentStamp;
            queue[tail++] = p + 1;
        }
        if (y > 0 && regionIds[p - width] === region.id && stamp[p - width] !== currentStamp) {
            dist[p - width] = d + 1;
            stamp[p - width] = currentStamp;
            queue[tail++] = p - width;
        }
        if (y + 1 < height && regionIds[p + width] === region.id && stamp[p + width] !== currentStamp) {
            dist[p + width] = d + 1;
            stamp[p + width] = currentStamp;
            queue[tail++] = p + width;
        }
    }
    top.sort((a, b) => b.d - a.d);
    const candidates = top.slice(0, Math.min(12, top.length)).map(({ p }) => {
        const x = p % width;
        return { x, y: (p - x) / width };
    });
    if (maxDist <= 0) {
        let sx = 0, sy = 0;
        for (const p of region.pixels) {
            const x = p % width;
            sx += x;
            sy += (p - x) / width;
        }
        candidates.push({
            x: Math.round(sx / Math.max(1, region.area)),
            y: Math.round(sy / Math.max(1, region.area)),
        });
    }
    const mx = maxP % width;
    if (candidates.length === 0)
        candidates.push({ x: mx, y: (maxP - mx) / width });
    return candidates;
}
function chooseNonCollidingCandidate(candidates, region, _width, placed) {
    const font = Math.max(10, Math.round(Math.sqrt(region.area) / 3));
    const half = font * 0.42;
    for (const c of candidates) {
        const overlap = placed.some((p) => Math.abs((p.labelX - 0.5) - c.x) < half + p.fontSize * 0.42 && Math.abs((p.labelY - 0.5) - c.y) < half + p.fontSize * 0.42);
        if (!overlap)
            return c;
    }
    return candidates[0];
}
function computeAdaptiveFontSize(region, symbol, point, width, height) {
    const bboxW = Math.max(1, region.bbox.maxX - region.bbox.minX + 1);
    const bboxH = Math.max(1, region.bbox.maxY - region.bbox.minY + 1);
    const geometric = Math.sqrt(Math.max(1, region.area)) / (symbol.length > 1 ? 3.5 : 2.8);
    const fitW = bboxW * 0.72;
    const fitH = bboxH * 0.64;
    const edge = Math.max(2, Math.min(point.x - region.bbox.minX, region.bbox.maxX - point.x, point.y - region.bbox.minY, region.bbox.maxY - point.y) * 1.8);
    const size = Math.floor(Math.min(48, geometric, fitW, fitH, edge + 8));
    void width;
    void height;
    return Math.min(48, Math.max(10, size));
}
/** Draw region numbers in #333, centered on the label point (Task 7/10). */
function drawNumbers(ctx, regions) {
    ctx.save();
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const region of regions) {
        ctx.font = `${region.fontSize}px system-ui, sans-serif`;
        ctx.fillText(symbolFor(region.colorIdx), region.labelX, region.labelY);
    }
    ctx.restore();
}

/** Smart conversion pipeline (v4): guided filter → SLIC superpixels →
 * palette k-means over superpixel means (auto-k via SSE elbow, 10..36) →
 * per-pixel labels → regions → RAG small-region merge → majority filter →
 * numbers. Contours are vectorized on the main thread from `labels`
 * (see vectorize.ts), so the worker output stays transferable/plain data. Options expose detail and palette budget. */
const WORKING_MAX_SIDE = 1400;
/** Superpixel budget: SLIC K = pixels / SUPERPIXEL_AREA, clamped 2000..5000. */
const SUPERPIXEL_AREA = 350;
/** Main-thread API: run the conversion in a module web worker. */
function runConversion() { throw new Error("worker api omitted"); }
/** Full conversion on raw RGBA pixels. Executed inside the worker. */
function runPipeline(imageData, report, options = {}) {
    const detail = Math.max(0, Math.min(1, options.detail ?? 0.65));
    const protectDetails = options.protectDetails !== false;
    const targetColors = Math.max(8, Math.min(36, Math.round(options.targetColors ?? (18 + detail * 18))));
    // Step 1: downscale + guided (edge-preserving) smoothing + Lab. (0–20%)
    report({ step: 'analyze', percent: 0 });
    const raw = downscaleToLab(imageData, WORKING_MAX_SIDE);
    report({ step: 'analyze', percent: 8 });
    // v3.1 P2: softened guided filter (r=3, eps=80) — the old r=4/eps=300
    // flattened fine structures (lace, embroidery, blush) before segmentation
    // ever saw them.
    const lab = guidedSmoothLab(raw.lab, raw.width, raw.height, { radius: 3, eps: 150 - detail * 80 });
    const importanceMap = protectDetails ? computeImportanceMap(lab, raw.width, raw.height, detail) : undefined;
    const { width, height } = raw;
    report({ step: 'analyze', percent: 20 });
    // Step 2: SLIC superpixels — the unit of everything below. (20–45%)
    report({ step: 'palette', percent: 22 });
    const superpixelArea = Math.max(180, Math.round(SUPERPIXEL_AREA / (0.65 + detail)));
    const K = Math.max(300, Math.min(5000, Math.round((width * height) / superpixelArea)));
    const sp = slic(lab, width, height, { numSuperpixels: K, compactness: 14 - detail * 5, iterations: 10 });
    report({ step: 'palette', percent: 45 });
    // Step 3: palette k-means over superpixel means (area-weighted points),
    // auto-k via SSE elbow in [10..36], then perceptual refinement. (45–70%)
    const spCount = sp.count;
    const spLab = new Float64Array(spCount * 3);
    spLab.set(sp.means.subarray(0, spCount * 3));
    const spToPalette = new Int32Array(spCount);
    const weights = new Float64Array(spCount);
    for (let i = 0; i < spCount; i++)
        weights[i] = sp.sizes[i];
    const kMax = Math.max(8, Math.min(36, targetColors));
    const k = autoKWithFloor(spLab, spCount, Math.min(10, kMax), kMax, weights);
    const q = quantize(spLab, k, 1, weights);
    report({ step: 'palette', percent: 60 });
    const { palette, remap } = refinePalette(q.palette);
    // Superpixel → palette index map (q.labels is per-superpixel).
    for (let c = 0; c < spCount; c++)
        spToPalette[c] = remap[q.labels[c]];
    report({ step: 'palette', percent: 70 });
    // Step 4: paint pixels from superpixel palette indices → regions. (70–80%)
    report({ step: 'regions', percent: 72 });
    const pixelLabels = new Uint16Array(width * height);
    for (let p = 0; p < pixelLabels.length; p++) {
        const spId = sp.ids[p];
        pixelLabels[p] = spId >= 0 ? spToPalette[spId] : 0;
    }
    // Majority filter on color labels BEFORE regionization: smooths stray
    // superpixel islands without corrupting region bookkeeping. Two passes
    // (SPEC v3.1): one pass leaves second-order speckle islands behind.
    majorityFilter(pixelLabels, width, height, 2);
    const seg = buildRegions(pixelLabels, width, height, importanceMap);
    report({ step: 'regions', percent: 80 });
    // Step 5: RAG small-region merge. (80–88%)
    report({ step: 'merge', percent: 82 });
    const minAreaPixels = Math.max(120, Math.round((width * height) / (7000 + 9000 * detail)));
    mergeSmallRegions(seg, palette, minAreaPixels, width, height);
    report({ step: 'merge', percent: 86 });
    refreshPixelCounts(seg, palette);
    // Step 6: number placement (farthest-from-border ≈ polylabel). (88–100%)
    report({ step: 'contours', percent: 90 });
    report({ step: 'numbers', percent: 94 });
    const regions = computeLabelPoints(seg.regions, seg.regionIds, width, height);
    report({ step: 'numbers', percent: 100 });
    return {
        width,
        height,
        labels: seg.regionIds, // region id per pixel; regions[i].colorIdx → palette entry
        palette,
        regions,
    };
}
/** Importance map from local Lab gradient. Strong edges and fine detail get
 * higher values so visually meaningful small islands survive region merging. */
function computeImportanceMap(lab, width, height, detail) {
    const out = new Float32Array(width * height);
    let maxG = 1e-6;
    const grad = new Float64Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const p = y * width + x;
            const c = p * 3;
            const lx = lab[c + 3] - lab[c - 3];
            const ly = lab[c + width * 3] - lab[c - width * 3];
            const ax = lab[c + 4] - lab[c - 2];
            const ay = lab[c + width * 3 + 1] - lab[c - width * 3 + 1];
            const bx = lab[c + 5] - lab[c - 1];
            const by = lab[c + width * 3 + 2] - lab[c - width * 3 + 2];
            const g = Math.hypot(lx, ly) * 0.55 + Math.hypot(ax, ay) * 0.25 + Math.hypot(bx, by) * 0.20;
            grad[p] = g;
            if (g > maxG)
                maxG = g;
        }
    }
    const gamma = 0.75 + detail * 0.5;
    for (let p = 0; p < out.length; p++)
        out[p] = Math.min(1, Math.pow(grad[p] / maxG, gamma));
    return out;
}
/** Auto-k = max(SSE-elbow k, auto-k floor). The floor (SPEC v3.1 P1 rule):
 * the smallest k in range where ≥ 90% of superpixels sit within ΔE00 ≤ 10
 * of their cluster color — a computable guarantee that the palette does not
 * crush gradients into visibly wrong buckets. Exported for tests via
 * `autoKWithFloorForTest`. */
function autoKWithFloorForTest(lab, n, kMin, kMax) {
    return autoKWithFloor(lab, n, kMin, kMax);
}
function autoKWithFloor(lab, n, kMin, kMax, weights) {
    const elbow = elbowAutoK(lab, n, kMin, kMax, weights);
    let floor = kMax;
    for (let k = kMin; k <= kMax; k++) {
        if (coverageShare(lab, n, k, weights) >= 0.9) {
            floor = k;
            break;
        }
    }
    return Math.max(elbow, floor);
}
/** Share of points within ΔE00 ≤ 10 of their k-means cluster color. */
function coverageShare(lab, n, k, weights) {
    const q = quantize(lab, k, 1, weights);
    let ok = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
        const p = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
        const c = q.palette[q.labels[i]];
        const w = weights ? Math.max(0, weights[i]) : 1;
        total += w;
        if (labDistance2000(p, c.lab) <= 10)
            ok += w;
    }
    return total > 0 ? ok / total : 0;
}
/** SSE elbow over k ∈ [kMin..kMax]: run weighted k-means for each k on the
 * superpixel means (deterministic), pick the k whose SSE point is farthest
 * below the chord connecting the curve endpoints (max perpendicular gain). */
function elbowAutoK(lab, n, kMin, kMax, weights) {
    void n;
    const ks = [];
    const sse = [];
    for (let k = kMin; k <= kMax; k += 2) {
        const q = quantize(lab, k, 1, weights);
        let s = 0;
        for (let i = 0; i < lab.length / 3; i++) {
            const c = q.labels[i];
            const dl = lab[i * 3] - q.palette[c].lab[0];
            const da = lab[i * 3 + 1] - q.palette[c].lab[1];
            const db = lab[i * 3 + 2] - q.palette[c].lab[2];
            const w = weights ? Math.max(0, weights[i]) : 1;
            s += (dl * dl + da * da + db * db) * w;
        }
        ks.push(k);
        sse.push(s);
    }
    if (sse.length < 3)
        return kMin;
    // Chord from first to last point; max perpendicular distance = elbow.
    const x0 = ks[0];
    const y0 = sse[0];
    const x1 = ks[ks.length - 1];
    const y1 = sse[sse.length - 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const norm = Math.hypot(dx, dy) || 1;
    let bestI = 0;
    let bestD = -1;
    for (let i = 0; i < ks.length; i++) {
        const d = Math.abs((ks[i] - x0) * dy - (sse[i] - y0) * dx) / norm;
        if (d > bestD) {
            bestD = d;
            bestI = i;
        }
    }
    return ks[bestI];
}
/** Majority filter: 3×3 window, reassign minority-label pixels surrounded
 * mostly by one other label. `passes` = 1..2. Generic over typed arrays. */
function majorityFilter(ids, width, height, passes) {
    for (let pass = 0; pass < passes; pass++) {
        const orig = ids.slice();
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const p = y * width + x;
                // Count neighbor labels.
                const counts = new Map();
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const q = orig[p + dy * width + dx];
                        counts.set(q, (counts.get(q) ?? 0) + 1);
                    }
                }
                const self = orig[p];
                let best = -1;
                let bestN = 0;
                for (const [label, nCount] of counts) {
                    if (label !== self && nCount > bestN) {
                        bestN = nCount;
                        best = label;
                    }
                }
                if (best >= 0 && bestN >= 6)
                    ids[p] = best;
            }
        }
    }
}
function refreshPixelCounts(seg, palette) {
    palette.forEach((p) => (p.pixelCount = 0));
    for (const r of seg.regions)
        palette[r.colorIdx].pixelCount += r.area;
}
/** Bilinear downscale to ≤ maxSide on the long side, output as Lab triples.
 * (Grain is handled by the guided filter downstream, so no extra blur here.) */
function downscaleToLab(imageData, maxSide) {
    const sw = imageData.width;
    const sh = imageData.height;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const rgb = new Float64Array(w * h * 3);
    const src = imageData.data;
    const xRatio = sw / w;
    const yRatio = sh / h;
    for (let y = 0; y < h; y++) {
        const sy = Math.min(sh - 1, (y + 0.5) * yRatio - 0.5);
        const y0 = Math.max(0, Math.floor(sy));
        const y1 = Math.min(sh - 1, y0 + 1);
        const fy = sy - y0;
        for (let x = 0; x < w; x++) {
            const sx = Math.min(sw - 1, (x + 0.5) * xRatio - 0.5);
            const x0 = Math.max(0, Math.floor(sx));
            const x1 = Math.min(sw - 1, x0 + 1);
            const fx = sx - x0;
            for (let ch = 0; ch < 3; ch++) {
                rgb[(y * w + x) * 3 + ch] =
                    src[(y0 * sw + x0) * 4 + ch] * (1 - fx) * (1 - fy) +
                        src[(y0 * sw + x1) * 4 + ch] * fx * (1 - fy) +
                        src[(y1 * sw + x0) * 4 + ch] * (1 - fx) * fy +
                        src[(y1 * sw + x1) * 4 + ch] * fx * fy;
            }
            // Alpha: treat non-opaque pixels as white background.
            const a = src[(y0 * sw + x0) * 4 + 3] * (1 - fx) * (1 - fy) +
                src[(y0 * sw + x1) * 4 + 3] * fx * (1 - fy) +
                src[(y1 * sw + x0) * 4 + 3] * (1 - fx) * fy +
                src[(y1 * sw + x1) * 4 + 3] * fx * fy;
            if (a < 250) {
                const o = (y * w + x) * 3;
                const k = a / 255;
                rgb[o] = rgb[o] * k + 255 * (1 - k);
                rgb[o + 1] = rgb[o + 1] * k + 255 * (1 - k);
                rgb[o + 2] = rgb[o + 2] * k + 255 * (1 - k);
            }
        }
    }
    const lab = new Float64Array(w * h * 3);
    for (let p = 0; p < w * h; p++) {
        const [L, A, B] = rgbToLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
        lab[p * 3] = L;
        lab[p * 3 + 1] = A;
        lab[p * 3 + 2] = B;
    }
    return { lab, width: w, height: h };
}

