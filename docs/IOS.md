# PaintByNumbers для iPad (нативное приложение)

Нативный клиент на SwiftUI + PencilKit поверх того же алгоритмического ядра
(`ios/PaintEngine` — порт веб-конвейера v3.1 на Swift с XCTest-тестами).

## Что внутри

- **PaintEngine** (Swift Package, чистый Foundation — тестируется на любой ОС):
  CIEDE2000 (эталонные пары Sharma), guided filter (мягкий r=3/eps=80), SLIC,
  k-means с **medoid-палитрой**, авто-k (elbow + ΔE00-floor ≥90% ≤10),
  **контраст-осознанное слияние** (ΔE00 ≥ 12 → деталь выживает), 2× majority,
  векторные контуры (Дуглас–Пекер → Чайкин), номера, fill-рендер.
- **Приложение** (iOS 17.5+, iPad): импорт фото → умная конвертация с прогрессом
  → холст со слоями (фон → контуры+номера → подсветка → PencilKit-краска) →
  палитра с номерами и свободными цветами → «Закончить за меня» → экспорт/
  «Поделиться». Зум — UIScrollView; проекты — Codable в Documents.
- **Pencil Pro**: Squeeze — палитра у кончика пера + тактильный отклик;
  двойное касание — кисть↔ластик; hover — системный курсор; хаптика на выбор
  цвета, undo и заливку.

## Сборка (CI)

GitHub Actions (`.github/workflows/ios.yml`) на macos-15:
1. `swift test` в `ios/PaintEngine` — XCTest-набор.
2. XcodeGen (`xcodegen generate` из `ios/project.yml`) → `xcodebuild build`
   на симуляторе → сборка **unsigned IPA** артефактом
   (`PaintByNumbers-unsigned-ipa`).

## Установка на iPad с Windows (без Mac)

1. Скачайте артефакт `PaintByNumbers-unsigned.ipa` из CI (вкладка Actions).
2. Вариант A — **AltStore/Sideloadly**: установите AltServer на Windows,
   войдите бесплатным Apple ID, откройте IPA через Sideloadly/AltStore —
   подпись действует 7 дней, переподписка одним кликом.
3. На iPad: Настройки → Основные → VPN и управление устройством → доверять
   профилю разработчика.
4. Вариант B — свой платный Apple Developer аккаунт: подпишите IPA любым
   инструментом (например, iOS App Signer) и установите через Apple
   Configurator/iTunes.

## Локальная разработка (нужен Mac)

```bash
cd ios
xcodegen generate          # создаёт PaintByNumbers.xcodeproj
open PaintByNumbers.xcodeproj
# или только движок:
cd PaintEngine && swift test
```
