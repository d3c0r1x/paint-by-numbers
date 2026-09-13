import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
const code=await readFile(new URL('../public/engine-bundle.js',import.meta.url),'utf8')
vm.runInThisContext(code,{filename:'engine-bundle.js'})
const w=96,h=72,data=new Uint8ClampedArray(w*h*4)
for(let y=0;y<h;y++) for(let x=0;x<w;x++){const p=(y*w+x)*4;data[p]=Math.round(35+205*x/w);data[p+1]=Math.round(80+120*y/h);data[p+2]=Math.round(150+60*Math.sin(x/12));data[p+3]=255}
const image={width:w,height:h,data}
let last=null
const result=globalThis.runPipeline(image,p=>{last=p},{detail:.62,targetColors:14,protectDetails:true})
if(!result?.regions?.length||result.palette.length!==14||result.labels.length!==w*h) throw new Error('engine result invariant failed')
console.log(`ENGINE PASS: ${result.regions.length} regions / ${result.palette.length} colors / ${result.labels.length} pixels; final step ${last?.step}`)
