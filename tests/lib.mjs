import {open} from './harness.mjs';
import * as THREE from 'three';
import fs from 'fs';
export {open};
export const results=[];
export function check(name,ok,info=''){results.push({name,ok}); console.log((ok?'PASS ':'FAIL ')+name+(info?'  → '+info:''));}
export async function msg(page){return (await page.textContent('#msg')).trim();}
export async function saveProj(page){
  const [dl]=await Promise.all([page.waitForEvent('download',{timeout:8000}),page.click('#psave')]);
  const p=await dl.path(); return JSON.parse(fs.readFileSync(p,'utf8'));
}
export async function screenOf(page,pos){
  const r=await page.$eval('#c',c=>{const b=c.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};});
  const cam=new THREE.PerspectiveCamera(50,r.w/r.h,0.1,1000); cam.position.set(60,50,80); cam.lookAt(0,0,0); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
  const v=new THREE.Vector3(...pos).project(cam);
  return {x:r.x+(v.x+1)/2*r.w, y:r.y+(1-v.y)/2*r.h};
}
export async function clickObj(page,pos,opts={}){const s=await screenOf(page,pos); if(opts.shift)await page.keyboard.down('Shift'); await page.mouse.click(s.x,s.y); if(opts.shift)await page.keyboard.up('Shift'); await page.waitForTimeout(150);}
export function summary(){const f=results.filter(r=>!r.ok); console.log(`\n${results.length-f.length}/${results.length} OK`+(f.length?'  FALLAN: '+f.map(x=>x.name).join(' | '):''));}
export async function exportStl(page){
  await page.click('#stl'); await page.waitForTimeout(150);
  const [dl]=await Promise.all([page.waitForEvent('download',{timeout:15000}),page.click('#ex1')]);
  const buf=fs.readFileSync(await dl.path()); const n=buf.readUInt32LE(80); const tris=[];
  for(let i=0;i<n;i++){const o=84+i*50+12; const t=[]; for(let k=0;k<3;k++)t.push([buf.readFloatLE(o+k*12),buf.readFloatLE(o+k*12+4),buf.readFloatLE(o+k*12+8)]); tris.push(t);}
  let vol=0; const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const [a,b,c] of tris){vol+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6; for(const p of [a,b,c])for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}}
  const key=p=>p.map(v=>Math.round(v*1000)).join(','); const edges=new Map();
  for(const [a,b,c] of tris)for(const [p,q] of [[a,b],[b,c],[c,a]]){const k1=key(p),k2=key(q); if(k1===k2)continue; const k=k1<k2?k1+'|'+k2:k2+'|'+k1; edges.set(k,(edges.get(k)||0)+1);}
  let open=0; for(const v of edges.values())if(v%2!==0)open++;
  return {name:dl.suggestedFilename(),bytes:buf.length,tris:n,vol,mn,mx,openEdges:open};
}
