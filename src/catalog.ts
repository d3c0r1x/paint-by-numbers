import type { PipelineResult, PaletteEntry, RegionInfo } from './engine/types'

export interface CatalogArtwork {
  id: string
  title: string
  titleEn: string
  category: string
  categoryEn: string
  difficulty: 'Легко' | 'Средне' | 'Сложно'
  minutes: number
  tags: string[]
  palette: PaletteEntry[]
  result: PipelineResult
  previewUrl: string
  source: Blob
}

type Scene = Omit<CatalogArtwork, 'palette' | 'result' | 'previewUrl' | 'source'> & {
  colors: string[]
  svg: string
}

const SCENES: Scene[] = [
  {
    id: 'aurora-lake', title: 'Северное озеро', titleEn: 'Northern Lake', category: 'Природа', categoryEn: 'Nature', difficulty: 'Средне', minutes: 42, tags: ['горы', 'ночь', 'пейзаж'],
    colors: ['#17223d', '#315f7e', '#5d91a3', '#d48f5e', '#f4d58a', '#29473f', '#f7eee0'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><defs><linearGradient id="sky" y2="1"><stop stop-color="#17223d"/><stop offset=".7" stop-color="#5d91a3"/><stop offset="1" stop-color="#d48f5e"/></linearGradient></defs><rect width="720" height="480" fill="url(#sky)"/><path d="M0 280 150 110 270 260 410 90 720 300V480H0Z" fill="#29473f"/><path d="m410 90 90 190h-180z" fill="#f7eee0" opacity=".88"/><path d="M0 325q180-60 360 0t360-8v163H0z" fill="#315f7e"/><path d="M0 390q190-45 370 0t350-8v98H0z" fill="#17223d" opacity=".72"/><circle cx="575" cy="105" r="39" fill="#f4d58a"/></svg>',
  },
  {
    id: 'quiet-fox', title: 'Тихий лис', titleEn: 'Quiet Fox', category: 'Животные', categoryEn: 'Animals', difficulty: 'Легко', minutes: 28, tags: ['животные', 'портрет', 'тёплый'],
    colors: ['#f1e7d2', '#b85d3e', '#8d4033', '#2b2520', '#e5a26c', '#fff8ec'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f1e7d2"/><circle cx="360" cy="260" r="155" fill="#b85d3e"/><path d="M235 155 190 65l105 55 65-30 65 30L530 65l-45 100" fill="#8d4033"/><path d="M245 255q32-34 64 0-32 48-64 0m166 0q32-34 64 0-32 48-64 0" fill="#fff8ec"/><circle cx="277" cy="258" r="12" fill="#2b2520"/><circle cx="443" cy="258" r="12" fill="#2b2520"/><ellipse cx="360" cy="323" rx="38" ry="27" fill="#2b2520"/><path d="M320 365q40 34 80 0" fill="none" stroke="#fff8ec" stroke-width="12" stroke-linecap="round"/><path d="M105 400q100-110 190-30" fill="none" stroke="#e5a26c" stroke-width="32" stroke-linecap="round"/></svg>',
  },
  {
    id: 'botanica', title: 'Ботаника №7', titleEn: 'Botanica No. 7', category: 'Цветы', categoryEn: 'Flowers', difficulty: 'Легко', minutes: 24, tags: ['цветы', 'зелёный', 'минимализм'],
    colors: ['#edf3e8', '#6c9565', '#86aa68', '#405d49', '#e0a15c', '#d67a70'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#edf3e8"/><path d="M360 450V180" stroke="#405d49" stroke-width="22" stroke-linecap="round"/><path d="M360 315Q225 225 110 295q110 100 250 48" fill="#6c9565"/><path d="M360 275q125-130 270-55-100 130-270 100" fill="#86aa68"/><circle cx="360" cy="145" r="76" fill="#e0a15c"/><circle cx="300" cy="100" r="38" fill="#d67a70"/><circle cx="420" cy="100" r="38" fill="#d67a70"/><circle cx="360" cy="62" r="34" fill="#f2c878"/></svg>',
  },
  {
    id: 'blue-coast', title: 'Синий берег', titleEn: 'Blue Coast', category: 'Путешествия', categoryEn: 'Travel', difficulty: 'Средне', minutes: 36, tags: ['море', 'лето', 'пейзаж'],
    colors: ['#b9deec', '#4d8b9e', '#2e6674', '#d6be91', '#405d54', '#f5ce78'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#b9deec"/><circle cx="575" cy="105" r="52" fill="#f5ce78"/><path d="M0 275q150-75 300 5t420-12v212H0z" fill="#d6be91"/><path d="M0 310q160-70 340 4t380-16v182H0z" fill="#4d8b9e"/><path d="M0 390q170-42 350 0t370-12v92H0z" fill="#2e6674"/><path d="M80 315 150 145l75 170zm130 0 78-210 90 210z" fill="#405d54"/></svg>',
  },
  {
    id: 'midnight-city', title: 'Полночный город', titleEn: 'Midnight City', category: 'Архитектура', categoryEn: 'Architecture', difficulty: 'Сложно', minutes: 55, tags: ['город', 'ночь', 'урбанистика'],
    colors: ['#101827', '#283854', '#f2e6ba', '#f2c968', '#1b2638', '#54718b'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#101827"/><circle cx="570" cy="90" r="48" fill="#f2e6ba"/><path d="M0 300h85V155h65v145h58V115h68v185h65V180h70v120h65V105h72v195h68v-150h65v330H0z" fill="#283854"/><g fill="#f2c968"><path d="M105 180h22v35h-22zm0 58h22v35h-22zm120-87h24v38h-24zm0 62h24v38h-24zm132 16h24v38h-24zm138-87h24v38h-24zm0 62h24v38h-24z"/></g><rect y="400" width="720" height="80" fill="#1b2638"/></svg>',
  },
  {
    id: 'peonies', title: 'Пионы в вазе', titleEn: 'Peonies in a Vase', category: 'Цветы', categoryEn: 'Flowers', difficulty: 'Сложно', minutes: 48, tags: ['цветы', 'розовый', 'натюрморт'],
    colors: ['#f4eee7', '#d76f83', '#e18b9b', '#c85e78', '#557057', '#f4c9d2', '#b98163'],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f4eee7"/><path d="M330 450q15-160 0-265M450 450q-15-150 30-275" stroke="#557057" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="325" cy="145" r="84" fill="#d76f83"/><circle cx="220" cy="230" r="78" fill="#e18b9b"/><circle cx="475" cy="170" r="86" fill="#c85e78"/><circle cx="515" cy="280" r="72" fill="#e18b9b"/><g fill="#f4c9d2"><circle cx="325" cy="145" r="30"/><circle cx="220" cy="230" r="28"/><circle cx="475" cy="170" r="30"/><circle cx="515" cy="280" r="25"/></g><path d="M255 350h270l-35 100H290z" fill="#b98163"/></svg>',
  },
]

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function makeResult(colors: string[], seed: number): PipelineResult {
  const width = 360
  const height = 240
  const cols = 12
  const rows = 8
  const labels = new Uint32Array(width * height)
  const regions: RegionInfo[] = []
  const palette: PaletteEntry[] = colors.map((hex, index) => ({ index, hex, lab: [0, 0, 0], pixelCount: 0 }))
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const id = regions.length
      const x0 = Math.floor(gx * width / cols)
      const x1 = Math.floor((gx + 1) * width / cols)
      const y0 = Math.floor(gy * height / rows)
      const y1 = Math.floor((gy + 1) * height / rows)
      const colorIdx = (gx * 3 + gy * 5 + seed) % colors.length
      const area = (x1 - x0) * (y1 - y0)
      regions.push({ colorIdx, area, labelX: (x0 + x1) / 2, labelY: (y0 + y1) / 2, fontSize: 13 })
      palette[colorIdx].pixelCount += area
      for (let y = y0; y < y1; y++) labels.fill(id, y * width + x0, y * width + x1)
    }
  }
  return { width, height, labels, palette, regions }
}

export function getCatalogArtworks(): CatalogArtwork[] {
  return SCENES.map((scene, index) => {
    const result = makeResult(scene.colors, index)
    return { ...scene, palette: result.palette, result, previewUrl: toDataUrl(scene.svg), source: new Blob([scene.svg], { type: 'image/svg+xml' }) }
  })
}
