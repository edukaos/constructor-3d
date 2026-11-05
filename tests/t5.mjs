import {open,check,msg,saveProj,clickObj,summary,screenOf} from './lib.mjs';
import * as THREE from ''+(process.env.C3D_LIBS||new URL('./node_modules/',import.meta.url).pathname)+'three/build/three.module.js';
import fs from 'fs';
const {browser,page,errs}=await open();
const blur=()=>page.evaluate(()=>document.activeElement&&document.activeElement.blur());
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.dispatchEvent('#'+id,'change'); await page.waitForTimeout(100);};
const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;
const dims=async()=>[await page.inputValue('#dx'),await page.inputValue('#dy'),await page.inputValue('#dz')].map(Number);
async function drag(from,dx,dy,n=10){await page.mouse.move(from.x,from.y);await page.mouse.down();for(let i=1;i<=n;i++)await page.mouse.move(from.x+dx*i/n,from.y+dy*i/n);await page.mouse.up();await page.waitForTimeout(250);}

// Enter en un campo suelta el foco → los atajos vuelven
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(150);
await page.fill('#px','0'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
await page.keyboard.press('2'); await page.waitForTimeout(200);
check('Enter en un campo: el atajo "2" vuelve a agregar formas',(await saveProj(page)).objs.length===2);

// Objeto muy chico → muy grande con la esquina
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(150);
await page.fill('#px','0'); await page.fill('#pz','0'); await page.fill('#dx','2'); await page.fill('#dy','2'); await page.fill('#dz','2');
await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let o=(await saveProj(page)).objs[0]; console.log('  cubito:',JSON.stringify(o.p&&[o.p.w,o.p.h,o.p.d]),o.pos.map(n=>+n.toFixed(1)));
await clickObj(page,[0,o.pos[1],0]); await page.keyboard.press('e'); await page.waitForTimeout(300);
let h=await screenOf(page,[o.pos[0]+1,o.pos[1]+1,o.pos[2]+1]);
await drag(h,300,-250);
let d=await dims(); check('Cubito 2 mm → grande: crece mucho sin voltearse',d[0]>15&&d[0]===d[1],'dims='+d.join(' x '));
// seguir arrastrando de vuelta hacia adentro hasta casi cero no debe invertir ni romper
o=(await saveProj(page)).objs[0];
h=await screenOf(page,[o.pos[0]+o.p.w/2,o.pos[1]+o.p.h/2,o.pos[2]+o.p.d/2]);
await drag(h,-600,500,16);
d=await dims(); check('Arrastrar hacia adentro: nunca invierte (>0)',d[0]>0&&d[1]>0&&d[2]>0,'dims='+d.join(' x '));

// Cara (un solo eje)
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(150); await page.fill('#px','0'); await page.fill('#pz','0'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
await clickObj(page,[0,12.5,0]); await page.keyboard.press('e'); await page.waitForTimeout(300);
h=await screenOf(page,[12.5,12.5,0]);   // cara +X
await drag(h,90,10);
d=await dims(); check('Punto de cara: cambia un solo eje',d[0]>30&&near(d[1],25,0.01)&&near(d[2],25,0.01),'dims='+d.join(' x '));

// Rendimiento con malla pesada (esfera ~ 200k triángulos importada, luego dividir)
const sg=new THREE.SphereGeometry(30,360,280); const g=sg.toNonIndexed(); const p=g.attributes.position.array; const n=p.length/9;
const b=Buffer.alloc(84+n*50); b.writeUInt32LE(n,80); for(let i=0;i<n;i++){const q=84+i*50; for(let k=0;k<9;k++)b.writeFloatLE(p[i*9+k],q+12+k*4);}
console.log('  malla de prueba:',n,'triángulos');
await page.click('#pnew'); await page.waitForTimeout(200);
let t0=Date.now(); await page.setInputFiles('#file',{name:'pesada.stl',mimeType:'model/stl',buffer:b}); await page.waitForFunction(()=>/Importado|No se pudo/.test(document.querySelector('#msg').textContent),null,{timeout:60000});
console.log('  import:',((Date.now()-t0)/1000).toFixed(1),'s ·',await msg(page));
await page.waitForTimeout(500);
await page.click('#dividir'); await page.waitForTimeout(300);
t0=Date.now(); await page.evaluate(()=>{window.__busy=false; const b=document.querySelector('#busy'); new MutationObserver(()=>{if(!b.hidden&&b.textContent.includes('Dividiendo'))window.__busy=true;}).observe(b,{attributes:true,childList:true,characterData:true,subtree:true});}); await page.click('#sapply'); await page.waitForFunction(()=>/dividida|no corta/.test(document.querySelector('#msg').textContent),null,{timeout:120000});
const secs=(Date.now()-t0)/1000;
check('Cartel "Dividiendo…" aparece mientras procesa',await page.evaluate(()=>window.__busy));
await page.waitForSelector('#busy',{state:'hidden',timeout:5000}); check('Cartel desaparece al terminar',true);
check('Dividir malla de 200k triángulos termina',/dividida/.test(await msg(page)),secs.toFixed(1)+' s');
console.log('errores:',errs);
summary(); await browser.close();
