# Раскраска по номерам (Paint by Numbers)

[**Живая демо-версия на Netlify**](https://paint-by-numbers-d3c0r1x.netlify.app) *(или GitHub Pages, когда настроим)*

Приложение, которое превращает ваше фото в раскраску по номерам — и вы рисуете её кистью, как настоящую картину.

## Что внутри

- **Веб-версия** — React + TypeScript + Vite + Tailwind v4. Работает в Safari на iPad (точка использования).
- **iOS-версия** — SwiftUI + PencilKit + Swift Package (PaintEngine) — нативная версия того же движка.
- **Движок v3** — guided filter → SLIC суперпиксели → k-means с авто-k → векторные контуры (Douglas–Peucker → Chaikin) → номера.

## Быстрый старт (веб)

```bash
npm install
npm run dev
```

Откройте `http://localhost:5173` в браузере. На iPad — через мобильную сеть (пункт "На этом iPad" в Safari).

## Структура проекта

```
src/
├── engine/     # Конвертация: colorSpace, quantize, segment, slic, smooth,
│               # vectorize, labels, pipeline, worker, fillRender, autoPalette
├── canvas/     # BrushEngine (кисть/ластик), ViewTransform ( zoom/pan),
│               # useCanvasLayers (слои: фон → контуры → подсветка → краска)
├── screens/    # HomeScreen, ProcessingScreen, ColoringScreen
├── ui/         # PaletteBar, ColorCircle, Button, icons
├── storage/    # Dexie (IndexedDB) — сохранение проектов
├── catalog.ts  # Мгновенные шаблоны (SVG → мокаяп)
├── export/     # export PNG/JPEG + нативный share
└── locales/    # ru.json, en.json
tests/          # vitest — 88 тестов (алгоритмы + storage)
```

## Тесты

```bash
npm test
```

88 тестов: colorSpace, quantize, segment, SLIC, pipeline, CIEDE2000, autoPalette, fillRender, symbols, storage.

## iOS (опционально)

См. [README-IOS.md](./README-IOS.md) — билд через GitHub Actions, установка через AltStore/Sideloadly.

## Развитие (для разработчиков)

См. [SPEC.md](./SPEC.md) — полная спецификация проекта с заданиями для Cursor.

## Лицензия

MIT — используйте свободно для обучения и личного творчества.
