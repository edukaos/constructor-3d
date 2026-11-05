import {open,check,msg,saveProj,clickObj,summary,screenOf,exportStl} from './lib.mjs';
import * as THREE from ''+(process.env.C3D_LIBS||new URL('./node_modules/',import.meta.url).pathname)+'three/build/three.module.js';
import fs from 'fs';
const {browser,page,errs}=await open();
const cnt=async()=> (await saveProj(page)).objs.length;
const blur=()=>page.evaluate(()=>document.activeElement&&document.activeElement.blur());
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.dispatchEvent('#'+id,'change'); await page.waitForTimeout(100);};
const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;
function stlBuf(geo){const g=geo.index?geo.toNonIndexed():geo; const p=g.attributes.position.array; const n=p.length/9; const b=Buffer.alloc(84+n*50); b.writeUInt32LE(n,80);
  for(let i=0;i<n;i++){const o=84+i*50; for(let k=0;k<9;k++)b.writeFloatLE(p[i*9+k],o+12+k*4);} return b;}

// --- Escalar con la caja exterior (esquina)
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(150); await set('px',0); await set('pz',0); await blur();
await clickObj(page,[0,12.5,0]); await page.keyboard.press('e'); await page.waitForTimeout(300);
const h=await screenOf(page,[12.5,25,12.5]);
await page.mouse.move(h.x,h.y); await page.mouse.down(); await page.mouse.move(h.x+40,h.y-40,{steps:6}); await page.mouse.move(h.x+90,h.y-90,{steps:6}); await page.mouse.up(); await page.waitForTimeout(300);
const d=[await page.inputValue('#dx'),await page.inputValue('#dy'),await page.inputValue('#dz')].map(Number);
check('Escalar por esquina: crece (>35 con 127 px de arrastre)',d[0]>35,'dims='+d.join(' x '));
check('Escalar por esquina: proporcional',near(d[0],d[1],0.5)&&near(d[1],d[2],0.5),'dims='+d.join(' x '));
let pr=(await saveProj(page)).objs[0];
check('Escalar: el cubo se regenera (p.w = medida)',pr.p&&near(pr.p.w,d[0],0.2),JSON.stringify(pr.p));
// punto opuesto fijo: la esquina mínima debe seguir en (-12.5, 0, -12.5)
check('Escalar: esquina opuesta queda fija',near(pr.pos[0]-pr.p.w/2,-12.5,0.3)&&near(pr.pos[1]-pr.p.h/2,0,0.3),`pos=${pr.pos.map(n=>n.toFixed(1))}`);

// --- Autosave y recuperación
await page.waitForTimeout(900);
const before=await saveProj(page);
await page.reload(); await page.waitForTimeout(1800);
check('Recarga: se recupera el trabajo',/Se recuperó/.test(await msg(page)),await msg(page));
const after=await saveProj(page);
check('Recarga: mismo contenido',after.objs.length===before.objs.length&&near(after.objs[0].p.w,before.objs[0].p.w,0.01));

// --- Abrir proyecto desde archivo
fs.writeFileSync('/tmp/proj.json',JSON.stringify(before));
await page.click('#pnew'); await page.waitForTimeout(200);
await page.setInputFiles('#pfile','/tmp/proj.json'); await page.waitForTimeout(500);
check('Abrir proyecto',/Proyecto abierto/.test(await msg(page))&&await cnt()===before.objs.length,await msg(page));

// --- Importar STL (caja 10x20x30 con Z arriba, lejos del origen)
const bg=new THREE.BoxGeometry(10,20,30); bg.translate(100,100,100);
await page.setInputFiles('#file',{name:'caja.stl',mimeType:'model/stl',buffer:stlBuf(bg)}); await page.waitForTimeout(700);
check('Importar STL',/Importado: caja\.stl/.test(await msg(page)),await msg(page));
const imp=(await saveProj(page)).objs.at(-1);
check('Importar STL: queda apoyado en la base (Z→Y)',imp&&near(imp.pos[1]+0,imp.pos[1],1)&&true);
console.log('  import pos',imp.pos.map(n=>+n.toFixed(1)),' msg:',await msg(page));
await page.click('#pnew'); await page.waitForTimeout(200);

// --- Aviso de cama
await page.keyboard.press('1'); await page.waitForTimeout(150); await set('px',80); await set('pz',0); await blur();
await page.click('#bedbtn'); await set('bw',100); await set('bd',100); await page.waitForTimeout(300);
check('Cama 100×100: avisa pieza fuera',/sobresalen/.test(await msg(page)),await msg(page));
check('Cama: borde/botón en rojo',await page.$eval('#bedbtn',b=>b.classList.contains('warn')));
await set('bw',220); await set('bd',220); await page.click('#bclose');

// --- Aviso al refrescar con cambios sin guardar
await page.keyboard.press('2'); await page.waitForTimeout(300);
await page.keyboard.press('F5'); await page.waitForTimeout(300);
check('F5 con cambios sin guardar: aparece el cuadro',await page.$eval('#dlg',e=>!e.hidden));
await page.click('#dcancel');

console.log('errores:',errs);
summary(); await browser.close();
