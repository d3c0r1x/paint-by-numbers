import http from 'node:http'
import { URL } from 'node:url'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const ROOT = process.cwd()
const PUBLIC = path.join(ROOT, 'public')
const DATA = path.join(ROOT, 'data')
const UPLOADS = path.join(DATA, 'uploads')
const DEMO = path.join(PUBLIC, 'demo')
const PORT = Number(process.env.PBN_PORT || 4173)
const HOST = process.env.PBN_HOST || '127.0.0.1'

await mkdir(UPLOADS, { recursive: true })
await mkdir(path.join(DATA, 'generated'), { recursive: true })
await mkdir(DEMO, { recursive: true })

const db = new DatabaseSync(path.join(DATA, 'pbn.sqlite'))
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  colors INTEGER NOT NULL,
  regions INTEGER NOT NULL,
  tags TEXT NOT NULL,
  preview_svg TEXT NOT NULL,
  template_json TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_path TEXT,
  template_json TEXT NOT NULL,
  paint_state_json TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  region_id INTEGER,
  color_idx INTEGER,
  payload_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id TEXT NOT NULL REFERENCES catalog(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, catalog_id)
);
`)

const now = () => Date.now()
const uid = () => crypto.randomUUID()
const json = (res, code, data, headers = {}) => {
  const body = Buffer.from(JSON.stringify(data))
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(body)
}
const parseBody = async (req, limit = 15 * 1024 * 1024) => {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('Payload too large'), { statusCode: 413 })
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}
const randomToken = () => crypto.randomBytes(32).toString('base64url')
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}
const verifyPassword = (password, stored) => {
  const [alg, salt, hex] = String(stored).split('$')
  if (alg !== 'scrypt' || !salt || !hex) return false
  const derived = crypto.scryptSync(password, salt, 64)
  const storedBuf = Buffer.from(hex, 'hex')
  return storedBuf.length === derived.length && crypto.timingSafeEqual(storedBuf, derived)
}
const cookieValue = (req, name) => {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}
const setCookie = (res, token, maxAge) => {
  res.setHeader('Set-Cookie', `pbn_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`)
}
const authUser = (req) => {
  const token = cookieValue(req, 'pbn_session')
  if (!token) return null
  const row = db.prepare(`SELECT s.user_id, s.expires_at, u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(hashToken(token))
  if (!row || row.expires_at < now()) return null
  db.prepare('UPDATE users SET last_seen_at=? WHERE id=?').run(now(), row.user_id)
  return { id: row.user_id, username: row.username }
}
const requireAuth = (req, res) => {
  const user = authUser(req)
  if (!user) { json(res, 401, { error: 'AUTH_REQUIRED' }); return null }
  return user
}

function svgScene(kind) {
  const scenes = {
    aurora: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#0d1836"/><stop offset=".55" stop-color="#2c7aa3"/><stop offset="1" stop-color="#e9b96e"/></linearGradient></defs><rect width="640" height="420" fill="url(#g)"/><path d="M0 230 Q140 130 260 225 T520 180 T800 220 L800 420 L0 420Z" fill="#15352f"/><path d="M0 290 Q150 210 300 290 T640 250 V420 H0Z" fill="#173e64" opacity=".75"/><circle cx="500" cy="105" r="34" fill="#ffe7a5"/><path d="M80 330 L190 210 250 280 340 170 470 330Z" fill="#101d35"/><path d="M0 360 Q150 340 300 365 T640 355 V420 H0Z" fill="#d39d65"/></svg>`,
    fox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f1ead8"/><circle cx="315" cy="225" r="130" fill="#b85d3e"/><path d="M210 125 L180 70 250 100 315 80 380 100 450 70 420 130" fill="#8e4334"/><circle cx="270" cy="220" r="16" fill="#2b2520"/><circle cx="360" cy="220" r="16" fill="#2b2520"/><ellipse cx="315" cy="285" rx="42" ry="30" fill="#27211e"/><path d="M270 315 Q315 345 360 315" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M95 100 Q160 160 190 115" fill="none" stroke="#d5c7b5" stroke-width="18" stroke-linecap="round"/></svg>`,
    botanica: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#edf4ea"/><path d="M315 380 V170" stroke="#405b47" stroke-width="18" stroke-linecap="round"/><path d="M315 240 Q210 175 130 230 Q200 300 315 270" fill="#6d9665"/><path d="M315 210 Q420 125 520 190 Q450 260 315 240" fill="#83a85d"/><circle cx="315" cy="135" r="62" fill="#e3a35c"/><circle cx="270" cy="102" r="28" fill="#d57c58"/><circle cx="360" cy="102" r="28" fill="#d57c58"/><circle cx="315" cy="80" r="26" fill="#f2c86b"/></svg>`,
    coast: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#b9dded"/><rect y="255" width="640" height="165" fill="#d6bf93"/><path d="M0 285 Q145 225 275 295 T640 270 V420 H0Z" fill="#4d8b9e"/><path d="M0 335 Q145 295 300 338 T640 325 V420 H0Z" fill="#2f6a75"/><circle cx="480" cy="110" r="48" fill="#f6cf7b"/><path d="M90 305 L150 175 210 305Z" fill="#405f54"/><path d="M190 305 L255 150 330 305Z" fill="#355348"/></svg>`,
    nightcity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#101827"/><circle cx="500" cy="90" r="44" fill="#f3e6bc"/><path d="M0 285 H90 V150 H145 V285 H205 V120 H260 V285 H320 V170 H380 V285 H445 V105 H510 V285 H580 V135 H640 V420 H0Z" fill="#283854"/><g fill="#f3ce76"><rect x="106" y="172" width="18" height="28"/><rect x="106" y="220" width="18" height="28"/><rect x="220" y="145" width="18" height="28"/><rect x="220" y="195" width="18" height="28"/><rect x="345" y="195" width="18" height="28"/><rect x="470" y="133" width="18" height="28"/><rect x="470" y="180" width="18" height="28"/><rect x="602" y="165" width="18" height="28"/></g><rect y="330" width="640" height="90" fill="#182231"/></svg>`,
    peonies: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f4eee7"/><g stroke="#557057" stroke-width="13" stroke-linecap="round"><path d="M275 400 Q300 280 270 175"/><path d="M420 400 Q390 305 440 190"/></g><g><circle cx="300" cy="150" r="70" fill="#d76f83"/><circle cx="220" cy="220" r="68" fill="#e18b9b"/><circle cx="410" cy="170" r="72" fill="#c85e78"/><circle cx="455" cy="260" r="64" fill="#ea9aaa"/></g><g fill="#f4c9d2"><circle cx="300" cy="150" r="28"/><circle cx="220" cy="220" r="24"/><circle cx="410" cy="170" r="28"/><circle cx="455" cy="260" r="22"/></g></svg>`,
  }
  return scenes[kind] || scenes.aurora
}

function templateFor(kind) {
  const W = 320, H = 210
  const base = { width: W, height: H, kind, regions: [], palette: [] }
  // Four-to-eight large deterministic regions. The engine handles user-uploaded photos;
  // catalog templates deliberately remain lightweight and instantly loadable.
  const defs = {
    aurora: { colors: ['#15213d','#2d78a0','#194f62','#d6a063','#f6d88b','#304c44'], shapes: 9 },
    fox: { colors: ['#b85d3e','#f1ead8','#2b2520','#8e4334','#d5c7b5','#e18a69'], shapes: 10 },
    botanica: { colors: ['#edf4ea','#6d9665','#83a85d','#405b47','#e3a35c','#d57c58'], shapes: 10 },
    coast: { colors: ['#b9dded','#d6bf93','#4d8b9e','#2f6a75','#405f54','#f6cf7b'], shapes: 9 },
    nightcity: { colors: ['#101827','#283854','#f3e6bc','#f3ce76','#182231','#35516f'], shapes: 12 },
    peonies: { colors: ['#f4eee7','#d76f83','#e18b9b','#c85e78','#ea9aaa','#557057','#f4c9d2'], shapes: 12 },
  }
  const cfg = defs[kind] || defs.aurora
  base.palette = cfg.colors.map((hex, index) => ({ index, hex, pixelCount: 0 }))
  // Grid-like regions with curved semantic-ish names; regions are masks encoded as run-length-ish rectangles.
  const cols = 5, rows = 3
  let id = 0
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    const x = Math.round(gx * W / cols), y = Math.round(gy * H / rows)
    const x2 = Math.round((gx + 1) * W / cols), y2 = Math.round((gy + 1) * H / rows)
    const colorIdx = (gx * 2 + gy + (kind === 'fox' ? 1 : 0)) % cfg.colors.length
    base.regions.push({ id: id++, colorIdx, x, y, x2, y2, labelX: (x+x2)/2, labelY: (y+y2)/2 })
  }
  return base
}

const catalogSeeds = [
  ['aurora','Aurora Lake','Nature','Medium',42,['night','mountains','warm'],1],
  ['fox','Quiet Fox','Animals','Easy',28,['animal','portrait','warm'],1],
  ['botanica','Botanica No. 7','Flowers','Easy',24,['botanical','green','minimal'],0],
  ['coast','Blue Coast','Travel','Medium',36,['sea','summer','landscape'],1],
  ['nightcity','Midnight City','Architecture','Hard',55,['city','night','urban'],1],
  ['peonies','Peonies Study','Flowers','Medium',39,['flowers','pink','classic'],0],
]
const existingCatalog = db.prepare('SELECT COUNT(*) AS n FROM catalog').get()
if (existingCatalog.n === 0) {
  const stmt = db.prepare(`INSERT INTO catalog(id,title,category,difficulty,minutes,colors,regions,tags,preview_svg,template_json,featured,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
  for (const [id,title,category,difficulty,minutes,tags,featured] of catalogSeeds) {
    const t = templateFor(id)
    stmt.run(id,title,category,difficulty,minutes,t.palette.length,t.regions.length,JSON.stringify(tags),svgScene(id),JSON.stringify(t),featured,now())
  }
}

const demoId = 'portrait-girl-demo'
const demoExists = db.prepare('SELECT 1 FROM catalog WHERE id=?').get(demoId)
const demoTemplatePath = path.join(DEMO, 'portrait-girl.json')
if (!demoExists && existsSync(demoTemplatePath)) {
  const t = JSON.parse(await readFile(demoTemplatePath, 'utf8'))
  t.sourceUrl = '/demo/portrait-girl.jpg'
  const preview = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><image href="/demo/portrait-girl.jpg" width="400" height="600" preserveAspectRatio="xMidYMid slice"/></svg>'
  db.prepare(`INSERT INTO catalog(id,title,category,difficulty,minutes,colors,regions,tags,preview_svg,template_json,featured,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(demoId,'Golden Portrait','Portraits','Medium',55,t.palette.length,t.regions.length,JSON.stringify(['portrait','golden','demo','character']),preview,JSON.stringify(t),1,now())
}

function catalogRows(userId) {
  const rows = db.prepare(`SELECT c.*, CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS favorite FROM catalog c LEFT JOIN favorites f ON f.catalog_id=c.id AND f.user_id=? ORDER BY c.featured DESC, c.created_at DESC`).all(userId || '')
  return rows.map(r => ({ ...r, tags: JSON.parse(r.tags), template: JSON.parse(r.template_json), previewSvg: r.preview_svg, previewUrl: r.id === 'portrait-girl-demo' ? '/demo/portrait-girl.jpg' : null, template_json: undefined, preview_svg: undefined }))
}

function projectList(userId) {
  return db.prepare(`SELECT p.*, c.title AS catalog_title FROM projects p LEFT JOIN catalog c ON c.id=json_extract(p.template_json,'$.catalogId') WHERE p.user_id=? ORDER BY p.updated_at DESC`).all(userId).map(p => ({
    id:p.id,title:p.title,sourceKind:p.source_kind,progress:p.progress,completed:!!p.completed,createdAt:p.created_at,updatedAt:p.updated_at,completedAt:p.completed_at,catalogTitle:p.catalog_title
  }))
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname
  const full = path.normalize(path.join(PUBLIC, requested))
  if (!full.startsWith(PUBLIC)) return json(res, 403, { error: 'FORBIDDEN' })
  if (!existsSync(full)) return json(res, 404, { error: 'NOT_FOUND' })
  const ext = path.extname(full)
  const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg' }
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' })
  createReadStream(full).pipe(res)
}

function serveUpload(res, filename) {
  const safe = path.basename(filename)
  const full = path.join(UPLOADS, safe)
  if (!existsSync(full)) return json(res, 404, { error:'NOT_FOUND' })
  const ext = path.extname(full).toLowerCase()
  const types = { '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp' }
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' })
  createReadStream(full).pipe(res)
}

async function api(req, res, pathname) {
  const method = req.method || 'GET'
  if (pathname === '/api/health' && method === 'GET') return json(res, 200, { ok:true, version:'1.0.0', sqlite:true })
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await parseBody(req, 64 * 1024)
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    if (!/^[a-zA-Z0-9_\-.]{3,24}$/.test(username)) return json(res, 400, { error:'INVALID_USERNAME' })
    if (password.length < 8) return json(res, 400, { error:'WEAK_PASSWORD' })
    const id = uid(), t = now()
    try {
      db.prepare('INSERT INTO users(id,username,password_hash,created_at,last_seen_at) VALUES(?,?,?,?,?)').run(id,username,hashPassword(password),t,t)
    } catch (e) { if (String(e.message).includes('UNIQUE')) return json(res,409,{error:'USERNAME_TAKEN'}); throw e }
    const token = randomToken()
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(hashToken(token),id,t+30*24*3600_000,t)
    setCookie(res,token,30*24*3600)
    return json(res,200,{ user:{id,username} })
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req, 64 * 1024)
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const u = db.prepare('SELECT id,username,password_hash FROM users WHERE username=?').get(username)
    if (!u || !verifyPassword(password,u.password_hash)) return json(res,401,{error:'BAD_CREDENTIALS'})
    const token = randomToken(), t = now()
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(hashToken(token),u.id,t+30*24*3600_000,t)
    setCookie(res,token,30*24*3600)
    return json(res,200,{user:{id:u.id,username:u.username}})
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = cookieValue(req,'pbn_session'); if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token))
    setCookie(res,'',0); return json(res,200,{ok:true})
  }
  if (pathname === '/api/auth/me' && method === 'GET') {
    const u = authUser(req); return json(res,200,{user:u})
  }
  if (pathname === '/api/catalog' && method === 'GET') return json(res,200,{items:catalogRows(authUser(req)?.id)})
  if (pathname.startsWith('/api/catalog/') && pathname.endsWith('/favorite') && method === 'POST') {
    const u = requireAuth(req,res); if (!u) return
    const id = pathname.split('/')[3]
    const exists = db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND catalog_id=?').get(u.id,id)
    if (exists) db.prepare('DELETE FROM favorites WHERE user_id=? AND catalog_id=?').run(u.id,id)
    else db.prepare('INSERT OR IGNORE INTO favorites(user_id,catalog_id,created_at) VALUES(?,?,?)').run(u.id,id,now())
    return json(res,200,{favorite:!exists})
  }
  if (pathname === '/api/history' && method === 'GET') {
    const u = requireAuth(req,res); if (!u) return
    const items = db.prepare(`SELECT e.id,e.action,e.region_id AS regionId,e.color_idx AS colorIdx,e.payload_json AS payload,e.created_at AS createdAt,p.title AS projectTitle FROM events e JOIN projects p ON p.id=e.project_id WHERE e.user_id=? ORDER BY e.id DESC LIMIT 300`).all(u.id).map(x=>({...x,payload:x.payload?JSON.parse(x.payload):null}))
    return json(res,200,{items})
  }
  if (pathname === '/api/projects' && method === 'GET') {
    const u = requireAuth(req,res); if (!u) return
    return json(res,200,{items:projectList(u.id)})
  }
  if (pathname === '/api/projects' && method === 'POST') {
    const u = requireAuth(req,res); if (!u) return
    const body = await parseBody(req)
    const id = uid(), t = now()
    const title = String(body.title || 'My painting').slice(0,120)
    const template = body.template || null
    const state = body.state || {filled:[], customColors:[], events:[]}
    if (!template) return json(res,400,{error:'TEMPLATE_REQUIRED'})
    let sourcePath = null
    if (body.imageDataUrl) {
      const m = String(body.imageDataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
      if (!m) return json(res,400,{error:'INVALID_IMAGE'})
      const ext = m[1] === 'jpeg' || m[1] === 'jpg' ? 'jpg' : m[1]
      const file = `${id}.${ext}`
      const data = Buffer.from(m[2], 'base64')
      if (data.length > 12*1024*1024) return json(res,413,{error:'IMAGE_TOO_LARGE'})
      await writeFile(path.join(UPLOADS,file),data)
      sourcePath = file
    }
    const storedTemplate = { ...template }; delete storedTemplate.sourceUrl
    db.prepare(`INSERT INTO projects(id,user_id,title,source_kind,source_path,template_json,paint_state_json,progress,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,u.id,title,body.sourceKind||'generated',sourcePath,JSON.stringify(storedTemplate),JSON.stringify(state),Number(body.progress||0),body.completed?1:0,t,t)
    db.prepare(`INSERT INTO events(project_id,user_id,action,payload_json,created_at) VALUES(?,?,?,?,?)`).run(id,u.id,'project_created',JSON.stringify({sourceKind:body.sourceKind||'generated'}),t)
    return json(res,201,{id})
  }
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/history') && method === 'GET') {
    const u = requireAuth(req,res); if (!u) return
    const id = pathname.split('/')[3]
    const p = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(id,u.id); if (!p) return json(res,404,{error:'NOT_FOUND'})
    const items = db.prepare('SELECT id,action,region_id AS regionId,color_idx AS colorIdx,payload_json AS payload,created_at AS createdAt FROM events WHERE project_id=? ORDER BY id DESC LIMIT 200').all(id).map(x=>({...x,payload:x.payload?JSON.parse(x.payload):null}))
    return json(res,200,{items})
  }
  if (pathname.startsWith('/api/projects/') && method === 'GET') {
    const u = requireAuth(req,res); if (!u) return
    const id = pathname.split('/')[3]
    const p = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(id,u.id)
    if (!p) return json(res,404,{error:'NOT_FOUND'})
    const loadedTemplate = JSON.parse(p.template_json); if (p.source_path) loadedTemplate.sourceUrl = `/uploads/${p.source_path}`
    return json(res,200,{project:{id:p.id,title:p.title,sourceKind:p.source_kind,sourcePath:p.source_path?`/uploads/${p.source_path}`:null,template:loadedTemplate,state:JSON.parse(p.paint_state_json),progress:p.progress,completed:!!p.completed,createdAt:p.created_at,updatedAt:p.updated_at,completedAt:p.completed_at}})
  }
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/events') && method === 'POST') {
    const u = requireAuth(req,res); if (!u) return
    const id = pathname.split('/')[3]
    const p = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(id,u.id); if (!p) return json(res,404,{error:'NOT_FOUND'})
    const body = await parseBody(req, 2*1024*1024)
    db.prepare('INSERT INTO events(project_id,user_id,action,region_id,color_idx,payload_json,created_at) VALUES(?,?,?,?,?,?,?)').run(id,u.id,String(body.action||'paint'),body.regionId??null,body.colorIdx??null,JSON.stringify(body.payload||null),now())
    return json(res,200,{ok:true})
  }
  if (pathname.startsWith('/api/projects/') && method === 'PUT') {
    const u = requireAuth(req,res); if (!u) return
    const id = pathname.split('/')[3]
    const body = await parseBody(req, 12*1024*1024)
    const p = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(id,u.id); if (!p) return json(res,404,{error:'NOT_FOUND'})
    const t = now(), progress = Math.max(0,Math.min(100,Number(body.progress||0))), completed = body.completed ? 1 : 0
    const storedTemplate = { ...(body.template||{}) }; delete storedTemplate.sourceUrl
    db.prepare('UPDATE projects SET title=?,template_json=?,paint_state_json=?,progress=?,completed=?,updated_at=?,completed_at=? WHERE id=? AND user_id=?').run(String(body.title||'My painting').slice(0,120),JSON.stringify(storedTemplate),JSON.stringify(body.state||{}),progress,completed,t,completed?t:null,id,u.id)
    if (body.event) db.prepare('INSERT INTO events(project_id,user_id,action,region_id,color_idx,payload_json,created_at) VALUES(?,?,?,?,?,?,?)').run(id,u.id,String(body.event.action||'save'),body.event.regionId??null,body.event.colorIdx??null,JSON.stringify(body.event.payload||null),t)
    return json(res,200,{ok:true,updatedAt:t})
  }
  if (pathname.startsWith('/api/projects/') && method === 'DELETE') {
    const u = requireAuth(req,res); if (!u) return
    const id = pathname.split('/')[3]
    const p = db.prepare('SELECT source_path FROM projects WHERE id=? AND user_id=?').get(id,u.id); if (!p) return json(res,404,{error:'NOT_FOUND'})
    db.prepare('DELETE FROM projects WHERE id=? AND user_id=?').run(id,u.id)
    if (p.source_path) await unlink(path.join(UPLOADS,p.source_path)).catch(()=>{})
    return json(res,200,{ok:true})
  }
  return json(res,404,{error:'NOT_FOUND'})
}

const server = http.createServer(async (req,res)=>{
  try {
    const u = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`)
    if (u.pathname.startsWith('/uploads/')) return serveUpload(res,u.pathname.slice('/uploads/'.length))
    if (u.pathname.startsWith('/api/')) return await api(req,res,u.pathname)
    return serveStatic(req,res,u.pathname)
  } catch (e) {
    console.error(e)
    json(res,e.statusCode || 500,{error:'SERVER_ERROR',detail:process.env.NODE_ENV==='production'?undefined:String(e.message)})
  }
})

server.listen(PORT,HOST,()=>console.log(`Paint by Numbers Studio → http://${HOST}:${PORT}`))
process.on('SIGINT',()=>{ db.close(); server.close(()=>process.exit(0)) })
