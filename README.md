# Paint by Numbers

> **Интересный личный проект, над которым я работал длительное время.** Проект начинался как идея «фото → картина по номерам», а затем вырос в browser-first приложение с реальной обработкой изображений, Web Worker, Canvas, IndexedDB и экспериментальным iPad-клиентом.
>
> **Status:** active portfolio project / browser MVP.
>
> [Live demo](https://d3c0r1x.github.io/paint-by-numbers/)

## Что делает

Пользователь загружает фотографию → приложение строит набор цветных областей с номерами → пользователь может раскрашивать результат прямо в браузере.

Главное отличие: преобразование выполняется **на стороне клиента**, без обязательной отправки изображения на сервер.

## Pipeline

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
vectorization
  ↓
contours + number placement
  ↓
Canvas painting
```

## Возможности

- загрузка изображения;
- автоматическая генерация палитры;
- сегментация;
- объединение соседних областей;
- отрисовка контуров;
- номера внутри областей;
- кисть;
- ластик;
- fill;
- zoom;
- pan;
- прогресс обработки;
- локальное сохранение проектов;
- demo на GitHub Pages;
- экспериментальный SwiftUI/PencilKit client.

## Структура

```
src/
  ...                    # React application
  image processing       # segmentation / palette / regions
  worker                 # heavy processing outside UI thread
  canvas                 # painting surface
  state                  # Zustand
  storage                # Dexie / IndexedDB

tests/
  ...                    # Vitest tests

docs/
  SPEC.md                # подробная спецификация pipeline
```

Точные имена модулей лучше смотреть в текущем каталоге `src/`; документация алгоритмов находится в [docs/SPEC.md](docs/SPEC.md).

## Локальный запуск

### Требования

- Node.js;
- npm.

### Установка

```bash
npm install
```

### Development

```bash
npm run dev
```

Vite поднимет локальный dev server и выведет URL в консоль.

### Production build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

### Tests

```bash
npm test
```

### Watch mode

```bash
npm run test:watch
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Пример использования

1. Открыть приложение.
2. Загрузить фотографию.
3. Дождаться завершения обработки.
4. Получить изображение с областями и номерами.
5. Выбрать цвет.
6. Закрашивать области кистью или fill.
7. Использовать zoom/pan для мелких участков.
8. Вернуться к проекту позже через локальное хранение.

## Почему используется Web Worker

SLIC, quantization и работа с большими пиксельными массивами могут блокировать main thread.

Поэтому тяжёлые вычисления вынесены в worker:

```
UI thread
   ↓ postMessage
Worker
   ↓ progress / result
UI thread
```

Это делает интерфейс заметно устойчивее на больших изображениях.

## Цветовое пространство

Для perceptual comparison используются OKLab / CIEDE2000.

Это позволяет сравнивать близость цветов не только как расстояние между RGB-тройками.

## Local storage

Dexie работает поверх IndexedDB.

В результате пользовательские проекты можно хранить локально без отдельного backend.

## Performance

Слабое место проекта — большие изображения.

Чем больше:

- ширина;
- высота;
- количество superpixels;
- количество цветовых регионов,

тем дороже обработка.

Ограниченная палитра нужна не только для скорости, но и для того, чтобы итог оставался практически раскрашиваемым.

## iPad experiment

В репозитории есть экспериментальная SwiftUI/PencilKit часть.

Это **pilot**, а не опубликованное App Store приложение.

Идея — перенести core-концепцию рисования и обработки в native touch workflow.

## Тесты

На текущем состоянии репозитория — **88 тестов** по направлениям:

- colour math;
- quantization;
- SLIC;
- region merge;
- vectorization;
- number placement;
- storage;
- UI behaviour.

## Ограничения

- большие фотографии обрабатываются дольше;
- палитра намеренно ограничена;
- RGB-палитра не моделирует реальное смешивание физической краски;
- iPad часть экспериментальная.

## AI-assisted development

AI использовался для черновой реализации, рутинного UI-кода и генерации тестовых идей.

Архитектура pipeline, выбор алгоритмов, debugging, validation и финальное поведение — моя зона ответственности.

## Лицензия

MIT.
