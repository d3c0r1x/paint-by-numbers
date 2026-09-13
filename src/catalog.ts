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
  {
    id: 'space-rocks',
    title: 'Космические скалы',
    titleEn: 'Space Rocks',
    category: 'Космос',
    categoryEn: 'Cosmos',
    difficulty: 'Средне',
    minutes: 44,
    tags: ['космос', 'planet', 'sci-fi'],
    colors: ['#0a1a2a', '#1a3a5a', '#3a6a9a', '#6a9aba', '#d4a574', '#c97a4a'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#0a1a2a"/><circle cx="575" cy="95" r="38" fill="#f4d35e"/><path d="M0 300 50 260 95 300 135 250 185 300 240 260 290 300 345 255 400 300 455 265 515 300 575 255 635 300 685 265V480H0Z" fill="#1a3a5a"/><path d="M0 360 70 330 145 365 215 335 290 370 365 340 440 370 515 345 590 370 665 340 720 360V480H0Z" fill="#3a6a9a"/><path d="M0 410 80 390 160 415 240 390 320 415 400 395 480 415 560 400 640 415 720 400V480H0Z" fill="#6a9aba"/><circle cx="120" cy="90" r="12" fill="#f4d35e" opacity=".7"/><circle cx="200" cy="70" r="8" fill="#f4d35e" opacity=".6"/><circle cx="330" cy="85" r="10" fill="#f4d35e" opacity=".5"/></svg>',
  },
  {
    id: 'garden-birds',
    title: 'Садовые птицы',
    titleEn: 'Garden Birds',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Легко',
    minutes: 30,
    tags: ['птицы', 'сад', 'уют'],
    colors: ['#f4e8d1', '#b5a882', '#6b7f4f', '#3a4a2a', '#d4a574', '#f0e0c0'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f4e8d1"/><path d="M0 380q90-45 180-20s150 30 240-10 180-25 210-10" fill="#b5a882"/><ellipse cx="360" cy="340" rx="220" ry="55" fill="#6b7f4f"/><ellipse cx="360" cy="335" rx="170" ry="38" fill="#f0e0c0"/><ellipse cx="360" cy="330" rx="110" ry="18" fill="#f4e8d1"/><circle cx="190" cy="150" r="30" fill="#b5a882"/><circle cx="190" cy="150" r="16" fill="#f4e8d1"/><path d="M190 120q0-20 15-20 10 20 0 30" fill="#b5a882"/><circle cx="170" cy="145" r="4" fill="#3a4a2a"/><circle cx="195" cy="145" r="4" fill="#3a4a2a"/><path d="M220 150q20-10 40 0" fill="none" stroke="#b5a882" stroke-width="4" stroke-linecap="round"/><circle cx="510" cy="120" r="28" fill="#6b7f4f"/><circle cx="510" cy="120" r="14" fill="#f4e8d1"/><path d="M510 90q0-18 14-18 10 18 0 28" fill="#6b7f4f"/><circle cx="495" cy="115" r="3" fill="#3a4a2a"/><circle cx="515" cy="115" r="3" fill="#3a4a2a"/><path d="M540 120q20-10 40 0" fill="none" stroke="#6b7f4f" stroke-width="4" stroke-linecap="round"/><path d="M300 420q30-25 60 0t60 0t60 0" fill="none" stroke="#6b7f4f" stroke-width="3" opacity=".6" stroke-linecap="round"/></svg>',
  },
  {
    id: 'soccer-ball',
    title: 'Футбольный мяч',
    titleEn: 'Soccer Ball',
    category: 'Спорт',
    categoryEn: 'Sports',
    difficulty: 'Легко',
    minutes: 22,
    tags: ['спорт', 'форма', 'минимализм'],
    colors: ['#f4f0e8', '#1a1a1a', '#8b4513', '#f0d080', '#5b7fd4'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f4f0e8"/><circle cx="360" cy="240" r="140" fill="#f4f0e8" stroke="#1a1a1a" stroke-width="4"/><circle cx="360" cy="240" r="140" fill="none" stroke="#8b4513" stroke-width="2" opacity=".4"/><g fill="#1a1a1a"><path d="M360 100l20 14-20 14zm0 280l-20 14 20 14z"/><path d="M260 240l-14 20 14 20zm280 0l14 20-14 20z"/><path d="M280 160l20-14 14 20-20 14-14 20zm120 80-20-14-14 20 20 14 14-20zm-120 80 20-14 14 20-20 14-14 20zm120-80-20-14-14 20 20 14 14-20zm-120-80 20-14 14 20-20 14-14 20zm120 80-20-14-14 20 20 14 14-20zm-120 80 20-14 14 20-20 14-14 20z"/></g><circle cx="360" cy="240" r="40" fill="#f0d080"/><circle cx="360" cy="240" r="20" fill="#5b7fd4"/><circle cx="360" cy="240" r="6" fill="#1a1a1a"/></svg>',
  },
  {
    id: 'lake-pines',
    title: 'Сосновый озёрный лес',
    titleEn: 'Pine Lake Forest',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Средне',
    minutes: 40,
    tags: ['лес', 'озеро', 'сосны'],
    colors: ['#1f3b2a', '#3a5c3e', '#6a8a5a', '#8a9a6a', '#d4c8a0', '#f0e8d0'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#1f3b2a"/><circle cx="120" cy="120" r="60" fill="#3a5c3e"/><circle cx="120" cy="120" r="30" fill="#6a8a5a"/><circle cx="120" cy="120" r="12" fill="#8a9a6a"/><circle cx="200" cy="170" r="50" fill="#3a5c3e"/><circle cx="200" cy="170" r="25" fill="#6a8a5a"/><circle cx="200" cy="170" r="10" fill="#8a9a6a"/><circle cx="290" cy="140" r="55" fill="#3a5c3e"/><circle cx="290" cy="140" r="28" fill="#6a8a5a"/><circle cx="290" cy="140" r="11" fill="#8a9a6a"/><circle cx="390" cy="160" r="48" fill="#3a5c3e"/><circle cx="390" cy="160" r="24" fill="#6a8a5a"/><circle cx="390" cy="160" r="9" fill="#8a9a6a"/><circle cx="480" cy="120" r="62" fill="#3a5c3e"/><circle cx="480" cy="120" r="31" fill="#6a8a5a"/><circle cx="480" cy="120" r="13" fill="#8a9a6a"/><path d="M0 380q90-30 180-10s150 20 240-5 180-15 210-5" fill="#6a8a5a"/><path d="M0 420q100-20 200-10s150 15 240-5 180-10 200-5" fill="#8a9a6a"/><path d="M0 450q120-10 240-5s180 5 240 0" fill="#d4c8a0"/><path d="M0 470q120-5 240 0s180 5 240 0" fill="#f0e8d0"/></svg>',
  },
  {
    id: 'urban-bridge',
    title: 'Городской мост',
    titleEn: 'Urban Bridge',
    category: 'Архитектура',
    categoryEn: 'Architecture',
    difficulty: 'Средне',
    minutes: 42,
    tags: ['мост', 'город', 'архитектура'],
    colors: ['#1a1a2e', '#3a4a6a', '#6a7a9a', '#2a3a4a', '#f0d080', '#c0a060'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#1a1a2e"/><rect x="0" y="380" width="720" height="100" fill="#3a4a6a"/><rect x="0" y="370" width="720" height="10" fill="#2a3a4a"/><path d="M0 360 60 340 120 360 180 340 240 360 300 340 360 360 420 340 480 360 540 340 600 360 660 340 720 360V480H0Z" fill="#6a7a9a"/><path d="M60 360L120 360L120 320L60 320Z" fill="#1a1a2e"/><path d="M240 360L300 360L300 320L240 320Z" fill="#1a1a2e"/><path d="M420 360L480 360L480 320L420 320Z" fill="#1a1a2e"/><path d="M600 360L660 360L660 320L600 320Z" fill="#1a1a2e"/><path d="M60 320 120 320 180 280 240 320 300 280 360 320 420 280 480 320 540 280 600 320 660 280 720 320" stroke="#f0d080" stroke-width="2" fill="none" opacity=".6"/><circle cx="575" cy="95" r="38" fill="#f0d080"/><circle cx="575" cy="95" r="22" fill="#c0a060"/></svg>',
  },
  {
    id: 'cat-window',
    title: 'Кот в окне',
    titleEn: 'Cat in the Window',
    category: 'Животные',
    categoryEn: 'Animals',
    difficulty: 'Легко',
    minutes: 26,
    tags: ['коты', 'уют', 'окно'],
    colors: ['#f4e8d1', '#8b7355', '#5a4a3a', '#c45a5a', '#f4d35e', '#f0e0c0'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f4e8d1"/><rect x="200" y="80" width="320" height="280" rx="8" fill="#f0e0c0" stroke="#8b7355" stroke-width="4"/><rect x="280" y="40" width="160" height="40" fill="#8b7355"/><rect x="300" y="30" width="120" height="20" fill="#c45a5a"/><path d="M300 160L320 160L320 180L300 180Z" fill="#5a4a3a"/><path d="M420 160L440 160L440 180L420 180Z" fill="#5a4a3a"/><circle cx="300" cy="140" r="18" fill="#8b7355"/><circle cx="420" cy="140" r="18" fill="#8b7355"/><circle cx="300" cy="135" r="4" fill="#5a4a3a"/><circle cx="420" cy="135" r="4" fill="#5a4a3a"/><path d="M300 145q5-8 10 0" fill="none" stroke="#5a4a3a" stroke-width="2"/><path d="M420 145q5-8 10 0" fill="none" stroke="#5a4a3a" stroke-width="2"/><path d="M360 160q20-20 40 0M350 175q30-15 60 0" fill="none" stroke="#f4d35e" stroke-width="3" stroke-linecap="round"/><path d="M360 200q30-25 60 0" fill="none" stroke="#f0e0c0" stroke-width="4" stroke-linecap="round"/></svg>',
  },
  {
    id: 'mountain-peaks',
    title: 'Горные пики',
    titleEn: 'Mountain Peaks',
    category: 'Природа',
    categoryEn: 'Nature',
    difficulty: 'Сложно',
    minutes: 52,
    tags: ['горы', 'пики', 'снежные'],
    colors: ['#0a1a2a', '#2a3a4a', '#5a7a9a', '#a0b0c0', '#f0f4f8', '#f4d35e'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#0a1a2a"/><path d="M0 320 70 200 140 320 210 150 280 320 350 180 420 320 490 130 560 320 630 200 720 320V480H0Z" fill="#2a3a4a"/><path d="M0 360 80 300 160 360 240 280 320 360 400 260 480 360 560 290 640 360 720 300V480H0Z" fill="#5a7a9a"/><path d="M0 410 60 380 120 410 180 370 240 410 300 380 360 410 420 370 480 410 540 380 600 410 660 380 720 400V480H0Z" fill="#a0b0c0"/><circle cx="580" cy="85" r="40" fill="#f4d35e"/><circle cx="580" cy="85" r="25" fill="#f0f4f8"/><circle cx="50" cy="80" r="12" fill="#f4d35e" opacity=".7"/><circle cx="150" cy="60" r="8" fill="#f4d35e" opacity=".6"/><circle cx="300" cy="80" r="10" fill="#f4d35e" opacity=".5"/></svg>',
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
