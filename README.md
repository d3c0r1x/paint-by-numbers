# Paint by Numbers

**Turn a photo into a paint-by-numbers coloring page and paint it directly in the browser.**

[![Tests](https://github.com/d3c0r1x/paint-by-numbers/actions/workflows/test.yml/badge.svg)](https://github.com/d3c0r1x/paint-by-numbers/actions/workflows/test.yml) · [Live demo](https://d3c0r1x.github.io/paint-by-numbers/)

## What it does

- converts a user photo into numbered regions entirely on the client;
- keeps heavy image processing inside a Web Worker so the UI stays responsive;
- builds a per-image palette with automatic color quantization;
- vectorizes region contours and places readable numbers;
- provides brush, eraser, zoom, pan, fill and progress feedback;
- saves projects locally with IndexedDB;
- includes an experimental SwiftUI/PencilKit iPad client using the same core idea.

## Processing pipeline

```
photo
  ↓
guided filter
  ↓
SLIC superpixels
  ↓
k-means / palette selection
  ↓
region merge
  ↓
vectorization + contours
  ↓
numbers + palette
  ↓
Canvas painting
```

## Engineering highlights

**Client-side processing.** The image does not need to be uploaded to a server for conversion.

**Performance.** Heavy computation is isolated in a Web Worker and progress is reported back to the UI.

**Colour difference.** The pipeline uses OKLab/CIEDE2000 for perceptual colour comparisons rather than relying only on raw RGB distance.

**Portable core.** The project includes a SwiftUI/PencilKit pilot based on the same processing concepts.

## Stack

React 19 · TypeScript 5.9 · Vite 7 · Tailwind · Zustand · Dexie/IndexedDB · Web Worker · Canvas 2D · Vitest · SwiftUI · PencilKit · GitHub Actions

## Tests

```bash
npm test
```

The web project currently contains **88 tests** covering colour calculations, quantization, SLIC, region merging, vectorization, number placement, storage and UI behaviour.

## Limitations

- large images become slower on the client;
- the palette is intentionally limited so the result remains practical to paint;
- the iOS part is a pilot, not an App Store release;
- the generated palette represents RGB colours, not physical paint mixing.

## Local run

```bash
npm install
npm run dev
npm run build
```

## AI-assisted development

AI was used for implementation drafts, routine UI work and test generation. I owned the product decomposition, algorithm choices, debugging, validation and final behaviour.

See [docs/SPEC.md](docs/SPEC.md) for the detailed processing specification.
