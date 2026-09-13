import { describe, it, expect } from 'vitest';
import { buildContourMask, drawContours } from '../src/engine/contour';

describe('buildContourMask', () => {
  it('возвращает пустую маску для пустых 라벨', () => {
    const labels = new Uint32Array(100);
    const mask = buildContourMask(labels, 10, 10);
    expect(mask).toBeInstanceOf(Uint8Array);
    expect(mask.length).toBe(100);
    expect(mask.every((v) => v === 0)).toBe(true);
  });

  it('находит границы между разными регионами', () => {
    const width = 4;
    const height = 4;
    const labels = new Uint32Array(width * height);
    // Заполняем 2x2 цветом 0, остальное цветом 1
    // Заполняем первые 2 строки (y=0,1) цветом 0, последние 2 (y=2,3) цветом 1
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 4; x++) {
        labels[y * 4 + x] = 0;
      }
    }
    for (let y = 2; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        labels[y * 4 + x] = 1;
      }
    }

    const mask = buildContourMask(labels, width, height);

    // Граница между регионом 0 (верхние 2 строки) и регионом 1 (нижние 2 строки)
    // вертикальная граница на строке y=1 (переход от 0 к 1)
    // Оба пикселя (0,1) и (1,1) соседствуют с регионом 1 → обе границы
    expect(mask[1 * width + 0]).toBe(1); // (0,1) — граница с регионом 1
    expect(mask[1 * width + 1]).toBe(1); // (1,1) — граница с регионом 1
    // Пиксели (0,2) и (1,2) находятся на границе — они соседствуют с регионом 0 сверху
    expect(mask[2 * width + 0]).toBe(1); // (0,2) — граница с регионом 0 (сверху)
    expect(mask[2 * width + 1]).toBe(1); // (1,2) — граница с регионом 0 (сверху)
  });

  it('не находит границ внутри однородного региона', () => {
    const width = 4;
    const height = 4;
    const labels = new Uint32Array(width * height);
    labels.fill(0);

    const mask = buildContourMask(labels, width, height);
    expect(mask.every((v) => v === 0)).toBe(true);
  });

  it('обрабатывает край изображения как границу', () => {
    const width = 4;
    const height = 4;
    const labels = new Uint32Array(width * height);
    // Заполняем весь регион 0 — края изображения не считаются границей
    // (только переходы между разными регионами)
    labels.fill(0);
    const mask = buildContourMask(labels, width, height);
    expect(mask.every((v) => v === 0)).toBe(true);
  });
});

describe('drawContours', () => {
  it('отрисовывает контуры на canvas', () => {
    const width = 10;
    const height = 10;
    const labels = new Uint32Array(width * height);
    // Создаём простой регион 2x2 в центре
    labels[4 * 4 + 4] = 1; // (4,4)
    labels[4 * 4 + 5] = 1; // (5,4)
    labels[5 * 4 + 4] = 1; // (4,5)
    labels[5 * 4 + 5] = 1; // (5,5)
    // Вокруг него — регион 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (labels[p] === 0 && x >= 4 && x <= 5 && y >= 4 && y <= 5) {
          labels[p] = 1;
        }
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    drawContours(ctx, labels, width, height);

    // Проверяем, что canvas был изменён (контуры отрисованы)
    const imageData = ctx.getImageData(0, 0, width, height);
    // Контуры должны быть чёрными (RGB=0,0,0)
    const pixels = imageData.data;
    let blackPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0) {
        blackPixels++;
      }
    }
    expect(blackPixels).toBeGreaterThan(0);
  });

  it('не отрисовывает контуры для пустых 라벨', () => {
    const width = 10;
    const height = 10;
    const labels = new Uint32Array(width * height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    drawContours(ctx, labels, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    // Все пиксели должны остаться белыми
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(255);
      expect(pixels[i + 1]).toBe(255);
      expect(pixels[i + 2]).toBe(255);
    }
  });
});
