import type { PipelineResult, PaletteEntry, RegionInfo } from './engine/types';

export interface CatalogArtwork {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  categoryEn: string;
  difficulty: 'Легко' | 'Средне' | 'Сложно';
  minutes: number;
  tags: string[];
  palette: PaletteEntry[];
  result: PipelineResult;
  previewUrl: string;
  source: Blob;
}

type Scene = Omit<CatalogArtwork, 'palette' | 'result' | 'previewUrl' | 'source'> & {
  colors: string[];
  svg: string;
};

const SCENES: Scene[] = [
  {
    id: 'aurora-lake',
    title: 'Северное озеро',
    titleEn: 'Northern Lake',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Средне',
    minutes: 42,
    tags: ['горы', 'ночь', 'пейзаж'],
    colors: ['#17223d', '#315f7e', '#5d91a3', '#d48f5e', '#f4d58a', '#29473f', '#f7eee0'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><defs><linearGradient id="sky" y2="1"><stop stop-color="#17223d"/><stop offset=".7" stop-color="#5d91a3"/><stop offset="1" stop-color="#d48f5e"/></linearGradient></defs><rect width="720" height="480" fill="url(#sky)"/><path d="M0 280 150 110 270 260 410 90 720 300V480H0Z" fill="#29473f"/><path d="m410 90 90 190h-180z" fill="#f7eee0" opacity=".88"/><path d="M0 325q180-60 360 0t360-8v163H0z" fill="#315f7e"/><path d="M0 390q190-45 370 0t350-8v98H0z" fill="#17223d" opacity=".72"/><circle cx="575" cy="105" r="39" fill="#f4d58a"/></svg>',
  },
  {
    id: 'quiet-fox',
    title: 'Тихий лис',
    titleEn: 'Quiet Fox',
    category: 'Животные',
    categoryEn: 'Animals',
    difficulty: 'Легко',
    minutes: 28,
    tags: ['животные', 'портрет', 'тёплый'],
    colors: ['#f1e7d2', '#b85d3e', '#8d4033', '#2b2520', '#e5a26c', '#fff8ec'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f1e7d2"/><circle cx="360" cy="260" r="155" fill="#b85d3e"/><path d="M235 155 190 65l105 55 65-30 65 30L530 65l-45 100" fill="#8d4033"/><path d="M245 255q32-34 64 0-32 48-64 0m166 0q32-34 64 0-32 48-64 0" fill="#fff8ec"/><circle cx="277" cy="258" r="12" fill="#2b2520"/><circle cx="443" cy="258" r="12" fill="#2b2520"/><ellipse cx="360" cy="323" rx="38" ry="27" fill="#2b2520"/><path d="M320 365q40 34 80 0" fill="none" stroke="#fff8ec" stroke-width="12" stroke-linecap="round"/><path d="M105 400q100-110 190-30" fill="none" stroke="#e5a26c" stroke-width="32" stroke-linecap="round"/></svg>',
  },
  {
    id: 'botanica',
    title: 'Ботаника №7',
    titleEn: 'Botanica No. 7',
    category: 'Цветы',
    categoryEn: 'Flowers',
    difficulty: 'Легко',
    minutes: 24,
    tags: ['цветы', 'зелёный', 'минимализм'],
    colors: ['#edf3e8', '#6c9565', '#86aa68', '#405d49', '#e0a15c', '#d67a70'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#edf3e8"/><path d="M360 450V180" stroke="#405d49" stroke-width="22" stroke-linecap="round"/><path d="M360 315Q225 225 110 295q110 100 250 48" fill="#6c9565"/><path d="M360 275q125-130 270-55-100 130-270 100" fill="#86aa68"/><circle cx="360" cy="145" r="76" fill="#e0a15c"/><circle cx="300" cy="100" r="38" fill="#d67a70"/><circle cx="420" cy="100" r="38" fill="#d67a70"/><circle cx="360" cy="62" r="34" fill="#f2c878"/></svg>',
  },
  {
    id: 'blue-coast',
    title: 'Синий берег',
    titleEn: 'Blue Coast',
    category: 'Путешествия',
    categoryEn: 'Travel',
    difficulty: 'Средне',
    minutes: 36,
    tags: ['море', 'лето', 'пейзаж'],
    colors: ['#b9deec', '#4d8b9e', '#2e6674', '#d6be91', '#405d54', '#f5ce78'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#b9deec"/><circle cx="575" cy="105" r="52" fill="#f5ce78"/><path d="M0 275q150-75 300 5t420-12v212H0z" fill="#d6be91"/><path d="M0 310q160-70 340 4t380-16v182H0z" fill="#4d8b9e"/><path d="M0 390q170-42 350 0t370-12v92H0z" fill="#2e6674"/><path d="M80 315 150 145l75 170zm130 0 78-210 90 210z" fill="#405d54"/></svg>',
  },
  {
    id: 'midnight-city',
    title: 'Полночный город',
    titleEn: 'Midnight City',
    category: 'Архитектура',
    categoryEn: 'Architecture',
    difficulty: 'Сложно',
    minutes: 55,
    tags: ['город', 'ночь', 'урбанистика'],
    colors: ['#101827', '#283854', '#f2e6ba', '#f2c968', '#1b2638', '#54718b'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#101827"/><circle cx="570" cy="90" r="48" fill="#f2e6ba"/><path d="M0 300h85V155h65v145h58V115h68v185h65V180h70v120h65V105h72v195h68v-150h65v330H0z" fill="#283854"/><g fill="#f2c968"><path d="M105 180h22v35h-22zm0 58h22v35h-22zm120-87h24v38h-24zm0 62h24v38h-24zm132 16h24v38h-24zm138-87h24v38h-24zm0 62h24v38h-24z"/></g><rect y="400" width="720" height="80" fill="#1b2638"/></svg>',
  },
  {
    id: 'peonies',
    title: 'Пионы в вазе',
    titleEn: 'Peonies in a Vase',
    category: 'Цветы',
    categoryEn: 'Flowers',
    difficulty: 'Сложно',
    minutes: 48,
    tags: ['цветы', 'розовый', 'натюрморт'],
    colors: ['#f4eee7', '#d76f83', '#e18b9b', '#c85e78', '#557057', '#f4c9d2', '#b98163'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f4eee7"/><path d="M330 450q15-160 0-265M450 450q-15-150 30-275" stroke="#557057" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="325" cy="145" r="84" fill="#d76f83"/><circle cx="220" cy="230" r="78" fill="#e18b9b"/><circle cx="475" cy="170" r="86" fill="#c85e78"/><circle cx="515" cy="280" r="72" fill="#e18b9b"/><g fill="#f4c9d2"><circle cx="325" cy="145" r="30"/><circle cx="220" cy="230" r="28"/><circle cx="475" cy="170" r="30"/><circle cx="515" cy="280" r="25"/></g><path d="M255 350h270l-35 100H290z" fill="#b98163"/></svg>',
  },
  {
    id: 'mountain-sunset',
    title: 'Горный закат',
    titleEn: 'Mountain Sunset',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Средне',
    minutes: 38,
    tags: ['горы', 'закат', 'пейзаж'],
    colors: ['#1a1a2e', '#533483', '#e94560', '#f5a623', '#f4d35e'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1a2e"/><stop offset=".45" stop-color="#533483"/><stop offset=".75" stop-color="#e94560"/><stop offset="1" stop-color="#f5a623"/></linearGradient></defs><rect width="720" height="480" fill="url(#sky)"/><path d="M0 320 90 240 160 300 240 200 340 280 420 180 520 250 620 210 720 290V480H0Z" fill="#1a1a2e" opacity=".85"/><path d="M0 360 80 300 150 350 240 280 340 340 440 290 540 330 640 300 720 340V480H0Z" fill="#533483" opacity=".65"/><circle cx="575" cy="120" r="52" fill="#f5a623"/><circle cx="575" cy="120" r="36" fill="#f4d35e"/></svg>',
  },
  {
    id: 'forest-clearing',
    title: 'Лесная поляна',
    titleEn: 'Forest Clearing',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Легко',
    minutes: 26,
    tags: ['лес', 'зелень', 'свет'],
    colors: ['#2d5a3d', '#4a7c59', '#7ba05b', '#c5e0a6', '#f5f5f0', '#8b6b4a'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#2d5a3d"/><path d="M0 380q90-50 180-20s150 40 240-10 180-30 210-10" fill="#4a7c59"/><ellipse cx="360" cy="340" rx="200" ry="60" fill="#7ba05b"/><ellipse cx="360" cy="335" rx="160" ry="40" fill="#c5e0a6"/><ellipse cx="360" cy="330" rx="100" ry="20" fill="#f5f5f0"/><circle cx="180" cy="200" r="80" fill="#4a7c59"/><circle cx="180" cy="200" r="40" fill="#7ba05b"/><path d="M160 200h40v60H160z" fill="#8b6b4a"/><circle cx="540" cy="160" r="65" fill="#4a7c59"/><circle cx="540" cy="160" r="32" fill="#7ba05b"/><path d="M520 160h40v50h-40z" fill="#8b6b4a"/><circle cx="360" cy="130" r="55" fill="#4a7c59"/><circle cx="360" cy="130" r="26" fill="#7ba05b"/><path d="M340 130h40v45h-40z" fill="#8b6b4a"/></svg>',
  },
  {
    id: 'kimono',
    title: 'Японская вешалка',
    titleEn: 'Kimono Rack',
    category: 'Культура',
    categoryEn: 'Culture',
    difficulty: 'Сложно',
    minutes: 50,
    tags: ['япония', 'текстиль', 'укладка'],
    colors: [
      '#1a1a1a',
      '#c45a5a',
      '#f4d35e',
      '#2d5a3d',
      '#e8b84b',
      '#5b7fd4',
      '#f5f0e8',
      '#8b4513',
    ],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f5f0e8"/><rect x="280" y="40" width="8" height="400" fill="#8b4513"/><rect x="432" y="40" width="8" height="400" fill="#8b4513"/><rect x="280" y="40" width="160" height="8" fill="#8b4513"/><rect x="280" y="432" width="160" height="8" fill="#8b4513"/><path d="M300 60L460 60 450 200 310 200Z" fill="#c45a5a"/><path d="M300 60 460 60 450 100 310 100Z" fill="#f4d35e"/><path d="M310 200 450 200 450 380 310 380Z" fill="#2d5a3d"/><path d="M310 200 450 200 445 280 315 280Z" fill="#c45a5a"/><path d="M300 60h20l15 140h-50z" fill="#e8b84b"/><path d="M440 60h-20l-15 140h50z" fill="#5b7fd4"/><path d="M360 80v160" stroke="#1a1a1a" stroke-width="3" fill="none"/></svg>',
  },
  {
    id: 'winter-forest',
    title: 'Зимний лес',
    titleEn: 'Winter Forest',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Средне',
    minutes: 34,
    tags: ['зима', 'лес', 'снег'],
    colors: ['#d6e4f0', '#8fa8c9', '#5b7fa3', '#2d4a6f', '#f0f4f8', '#4a5568'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#d6e4f0"/><path d="M0 420q90-30 180-10s150 25 240-5 180-20 210-5" fill="#8fa8c9"/><path d="M0 390q100-40 200-10s150 30 240-5 180-25 200-5" fill="#5b7fa3"/><circle cx="120" cy="180" r="45" fill="#2d4a6f"/><circle cx="105" cy="170" r="12" fill="#f0f4f8"/><circle cx="130" cy="178" r="8" fill="#f0f4f8"/><circle cx="140" cy="182" r="10" fill="#f0f4f8"/><circle cx="115" cy="190" r="6" fill="#f0f4f8"/><circle cx="280" cy="150" r="55" fill="#2d4a6f"/><circle cx="265" cy="138" r="14" fill="#f0f4f8"/><circle cx="290" cy="148" r="10" fill="#f0f4f8"/><circle cx="300" cy="155" r="12" fill="#f0f4f8"/><circle cx="275" cy="160" r="8" fill="#f0f4f8"/><circle cx="450" cy="120" r="48" fill="#2d4a6f"/><circle cx="435" cy="108" r="12" fill="#f0f4f8"/><circle cx="460" cy="118" r="10" fill="#f0f4f8"/><circle cx="470" cy="125" r="14" fill="#f0f4f8"/><circle cx="440" cy="135" r="8" fill="#f0f4f8"/><path d="M600 420h30v-60h-30z" fill="#4a5568"/><path d="M650 420h30v-45h-30z" fill="#4a5568"/><path d="M700 420h30v-55h-30z" fill="#4a5568"/></svg>',
  },
  {
    id: 'mountain-stream',
    title: 'Горный поток',
    titleEn: 'Mountain Stream',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Средне',
    minutes: 40,
    tags: ['горы', 'вода', 'пейзаж'],
    colors: ['#1a3a4a', '#3a6b8a', '#7ab0d4', '#a8d5e2', '#e8f4f8', '#5a7a5a', '#8a6a4a'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#1a3a4a"/><path d="M0 320 90 280 180 310 270 270 360 300 450 260 540 290 630 270 720 300V480H0Z" fill="#3a6b8a"/><path d="M0 350 100 320 200 350 300 310 400 340 500 310 600 330 720 320V480H0Z" fill="#7ab0d4"/><path d="M0 400 80 380 160 400 240 370 320 390 400 380 480 395 560 385 640 400 720 390V480H0Z" fill="#a8d5e2"/><path d="M100 380q30-20 60 0t60 0t60 0" fill="none" stroke="#e8f4f8" stroke-width="3" opacity=".6"/><path d="M250 360q25-15 50 0t50 0t50 0" fill="none" stroke="#e8f4f8" stroke-width="2" opacity=".5"/><circle cx="570" cy="120" r="42" fill="#e8f4f8"/><circle cx="570" cy="120" r="28" fill="#f0f4f8"/><path d="M350 200 420 150 490 200 420 250Z" fill="#5a7a5a"/><path d="M400 180 440 170 480 200 440 210Z" fill="#8a6a4a"/></svg>',
  },
  {
    id: 'night-city-2',
    title: 'Ночной город',
    titleEn: 'Night City',
    category: 'Архитектура',
    categoryEn: 'Architecture',
    difficulty: 'Средне',
    minutes: 45,
    tags: ['город', 'ночь', 'огни'],
    colors: ['#0a0a1a', '#1a2a3a', '#2a3a4a', '#f0d080', '#c0a060', '#4a5a6a', '#6a8a9a'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#0a0a1a"/><rect x="0" y="350" width="720" height="30" fill="#1a2a3a"/><path d="M0 350h60V200h40v150h50V180h60v170h40V160h50v190h60V140h50v210h40V190h60v160h50V170h60v180h40V150h50v200h60V180h50v170h60V160h50v190h60V200h40v150h50V170h60v180h40V190h50v160h60V150h50v200h40V210h50v140h60V170h50v180h60V160h50v190h60V180h40v170h50V200h60v150h40V180h50v170h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40v150h50V170h60v180h40V190h50v160h60V150h50v200h40V180h50v170h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V180h50v170h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V190h50v160h60V150h50v200h40V170h50v180h60V160h50v190h60V180h40V170h50v180h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V190h50v160h60V150h50v200h40V180h50v170h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V190h50v160h60V150h50v200h40V170h50v180h60V160h50v190h60V180h40V170h50v180h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V180h50v170h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V190h50v160h60V150h50v200h40V170h50v180h60V160h50v190h60V180h40V170h50v180h60V160h50v190h60V170h40V160h50v190h60V180h50v170h60V160h50v190h60V200h40V190h50v160H0z" fill="#2a3a4a"/><g fill="#f0d080"><path d="M60 200h15v15h-15z"/><path d="M160 180h15v15h-15z"/><path d="M260 210h15v15h-15z"/><path d="M360 190h15v15h-15z"/><path d="M460 200h15v15h-15z"/><path d="M560 180h15v15h-15z"/><path d="M100 150h12v12h-12z"/><path d="M200 140h12v12h-12z"/><path d="M300 160h12v12h-12z"/><path d="M400 150h12v12h-12z"/><path d="M500 140h12v12h-12z"/><path d="M600 160h12v12h-12z"/></g><circle cx="600" cy="100" r="35" fill="#f0d080"/><circle cx="600" cy="100" r="22" fill="#fff8e0"/><path d="M660 180q20-30 40 0" fill="none" stroke="#f0d080" stroke-width="2" opacity=".6"/></svg>',
  },
];

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeResult(colors: string[], seed: number): PipelineResult {
  const width = 360;
  const height = 240;
  const cols = 12;
  const rows = 8;
  const labels = new Uint32Array(width * height);
  const regions: RegionInfo[] = [];
  const palette: PaletteEntry[] = colors.map((hex, index) => ({
    index,
    hex,
    lab: [0, 0, 0],
    pixelCount: 0,
  }));
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const id = regions.length;
      const x0 = Math.floor((gx * width) / cols);
      const x1 = Math.floor(((gx + 1) * width) / cols);
      const y0 = Math.floor((gy * height) / rows);
      const y1 = Math.floor(((gy + 1) * height) / rows);
      const colorIdx = (gx * 3 + gy * 5 + seed) % colors.length;
      const area = (x1 - x0) * (y1 - y0);
      regions.push({ colorIdx, area, labelX: (x0 + x1) / 2, labelY: (y0 + y1) / 2, fontSize: 13 });
      palette[colorIdx].pixelCount += area;
      for (let y = y0; y < y1; y++) labels.fill(id, y * width + x0, y * width + x1);
    }
  }
  return { width, height, labels, palette, regions };
}

export function getCatalogArtworks(): CatalogArtwork[] {
  return SCENES.map((scene, index) => {
    const result = makeResult(scene.colors, index);
    return {
      ...scene,
      palette: result.palette,
      result,
      previewUrl: toDataUrl(scene.svg),
      source: new Blob([scene.svg], { type: 'image/svg+xml' }),
    };
  });
}
