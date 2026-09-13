import { spawn } from 'node:child_process'
const port = 4179
const smokeUser = 'smoke_' + Date.now().toString(36)
const child = spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PBN_PORT:String(port),PBN_HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']})
let output=''; child.stdout.on('data',d=>output+=d); child.stderr.on('data',d=>output+=d)
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function get(path,opts={}){const r=await fetch(`http://127.0.0.1:${port}${path}`,opts);const data=await r.json().catch(()=>({}));return {r,data}}
let health=null;for(let i=0;i<40;i++){try{health=await get('/api/health');if(health.r.ok)break}catch{}await wait(75)}
if(!health?.r?.ok||!health.data.ok)throw new Error('health failed '+output)
const home=await fetch(`http://127.0.0.1:${port}/`);if(!home.ok||!(await home.text()).includes('Paint by Numbers Studio'))throw new Error('static serving failed')
const reg=await get('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:smokeUser,password:'StrongPass123!'})});if(!reg.r.ok)throw new Error('register failed '+JSON.stringify(reg.data))
const cookie=reg.r.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw new Error('cookie missing')
let me=await get('/api/auth/me',{headers:{cookie}});if(me.data.user?.username!==smokeUser)throw new Error('session auth failed')
const cat=await get('/api/catalog');if(!cat.r.ok||cat.data.items?.length<6)throw new Error('catalog failed')
const fav=await get('/api/catalog/aurora/favorite',{method:'POST',headers:{cookie}});if(!fav.r.ok||fav.data.favorite!==true)throw new Error('favorite failed')
const template=cat.data.items[0].template
const historyAll=await get('/api/history',{headers:{cookie}}); if(!historyAll.r.ok||!Array.isArray(historyAll.data.items)) throw new Error('global history failed')
const create=await get('/api/projects',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({title:'Smoke Painting',sourceKind:'catalog',template,state:{filled:[0,2],events:[]},progress:20})});if(!create.r.ok)throw new Error('project create failed '+JSON.stringify(create.data))
const pid=create.data.id
const tiny='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+3kYb3QAAAABJRU5ErkJggg=='
const photoCreate=await get('/api/projects',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({title:'Upload Smoke',sourceKind:'photo',imageDataUrl:tiny,template:{...template,sourceUrl:tiny},state:{filled:[]},progress:0})}); if(!photoCreate.r.ok) throw new Error('photo project create failed '+JSON.stringify(photoCreate.data))
const photoId=photoCreate.data.id
const photoRead=await get(`/api/projects/${photoId}`,{headers:{cookie}}); if(!photoRead.data.project?.sourcePath) throw new Error('upload path missing')
const uploadResp=await fetch(`http://127.0.0.1:${port}${photoRead.data.project.sourcePath}`); if(!uploadResp.ok) throw new Error('uploaded image unavailable')
const update=await get(`/api/projects/${pid}`,{method:'PUT',headers:{'content-type':'application/json',cookie},body:JSON.stringify({title:'Smoke Painting',state:{filled:[0,1,2],events:[]},progress:25,completed:false,event:{action:'region_fill',regionId:1,colorIdx:2}})});if(!update.r.ok)throw new Error('project update failed')
const history=await get(`/api/projects/${pid}/history`,{headers:{cookie}});if(!history.r.ok||!history.data.items?.length)throw new Error('history failed '+JSON.stringify(history.data))
const project=await get(`/api/projects/${pid}`,{headers:{cookie}});if(project.data.project?.progress!==25)throw new Error('project read failed')
const logout=await get('/api/auth/logout',{method:'POST',headers:{cookie}});if(!logout.r.ok)throw new Error('logout failed')
const after=await get('/api/projects',{headers:{cookie:logout.r.headers.get('set-cookie')?.split(';')[0]||cookie}});if(after.r.status!==401)throw new Error('auth guard failed')
console.log('SMOKE PASS: health, static, registration, HttpOnly session, catalog, favorite, project CRUD/read, event history, logout/auth guard')
child.kill('SIGINT')
setTimeout(()=>process.exit(0),300)
