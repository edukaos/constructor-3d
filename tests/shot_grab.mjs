// Recorre el grabado paso a paso y saca capturas para revisar el comportamiento
import {open} from './lib.mjs';
const OUT='/tmp/claude-0/-home-user/edc7455f-cdba-5a75-8804-bd20c0eae3fc/scratchpad/';
const {browser,page,errs}=await open();
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(100);
await page.click('#textbtn'); await page.waitForTimeout(200);
await page.fill('#tstr','HOLA');
await page.evaluate(()=>{select([objs[0]]);});
await page.click('#tgrab'); await page.waitForTimeout(800);
await page.screenshot({path:OUT+'g1_inicio.png'});
const pts=await page.evaluate(()=>{const r=canvas.getBoundingClientRect(); const b=bbox(objs[0]); const cs=[[0.5,0.5],[0.2,0.5],[0.8,0.5]].map(([fx,fz])=>{const v=new THREE.Vector3(b.min.x+(b.max.x-b.min.x)*fx,b.max.y,b.min.z+(b.max.z-b.min.z)*fz).project(cam); return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};}); const s=new THREE.Vector3((b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,b.max.z).project(cam); cs.push({x:r.left+(s.x+1)/2*r.width,y:r.top+(1-s.y)/2*r.height}); return cs;});
for(let i=0;i<pts.length;i++){ await page.mouse.move(pts[i].x,pts[i].y,{steps:5}); await page.waitForTimeout(250); const st=await page.evaluate(()=>({aimN:grab&&grab.aim?grab.aim.n.toArray().map(v=>+v.toFixed(2)):null, pos:grab?grab.m.position.toArray().map(v=>+v.toFixed(1)):null})); console.log('punto',i,JSON.stringify(st)); await page.screenshot({path:OUT+`g2_hover${i}.png`}); }
await page.mouse.click(pts[0].x,pts[0].y); await page.waitForTimeout(300);
await page.screenshot({path:OUT+'g3_fijado.png'});
console.log('tras fijar: grab', await page.evaluate(()=>!!grab));
console.log('errores', errs.join('|'));
await browser.close();
