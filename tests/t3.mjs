import {open,check,msg,saveProj,clickObj,summary,screenOf,exportStl,clk} from './lib.mjs';
import fs from 'fs';
const {browser,page,errs}=await open();
const cnt=async()=> (await saveProj(page)).objs.length;
const blur=()=>page.evaluate(()=>document.activeElement&&document.activeElement.blur());
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.dispatchEvent('#'+id,'change'); await page.waitForTimeout(100);};
async function fresh(){ await page.click('#pnew'); await page.waitForTimeout(200); }
async function addAt(key,x,z){ await page.keyboard.press(key); await page.waitForTimeout(150); await set('px',x); await set('pz',z); await blur(); }
const sel=(pos,shift)=>clickObj(page,pos,{shift});
const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;

// --- Exportación con un cubo parado sobre la cama
await fresh(); await addAt('1',0,0);
let ex=await exportStl(page);
check('Exportar STL: archivo modelo.stl directo',/^modelo.*\.stl$/.test(ex.name),ex.name);
check('STL: volumen cubo 25³',near(ex.vol,15625,5),'vol='+ex.vol.toFixed(1));
check('STL: Z hacia arriba (0..25)',near(ex.mn[2],0,0.01)&&near(ex.mx[2],25,0.01),`z=${ex.mn[2].toFixed(2)}..${ex.mx[2].toFixed(2)}`);
check('STL: cerrado (sin aristas abiertas)',ex.openEdges===0,'abiertas='+ex.openEdges);

// --- Restar: volumen correcto y malla cerrada
await fresh(); await addAt('1',-10,0); await addAt('2',8,0);
await sel([16,12.5,0]); await page.click('[data-op=subtract]'); await page.waitForTimeout(600);
ex=await exportStl(page);
check('Restar: volumen < cubo y > 0',ex.vol>8000&&ex.vol<15625,'vol='+ex.vol.toFixed(0));
check('Restar: malla cerrada',ex.openEdges===0,'abiertas='+ex.openEdges);
// --- Unir: volumen
await fresh(); await addAt('1',-10,0); await addAt('2',8,0);
await sel([-18,12.5,0]); await sel([16,12.5,0],true); await page.click('[data-op=union]'); await page.waitForTimeout(600);
ex=await exportStl(page);
check('Unir: volumen entre cubo y cubo+esfera',ex.vol>15625&&ex.vol<15625+8181,'vol='+ex.vol.toFixed(0));
check('Unir: malla cerrada',ex.openEdges===0,'abiertas='+ex.openEdges);

// --- Dividir: dos mitades con suma de volumen = 15625
await fresh(); await addAt('1',0,0); await sel([0,12.5,0]);
await page.click('#dividir'); await page.waitForTimeout(200); await page.click('#sapply'); await page.waitForTimeout(700);
ex=await exportStl(page);
check('Dividir: volumen total se conserva',near(ex.vol,15625,20),'vol='+ex.vol.toFixed(0));
check('Dividir: cerrado',ex.openEdges===0,'abiertas='+ex.openEdges);

// --- Medidas, bordes, rotación, apoyar
await fresh(); await addAt('1',0,0); await sel([0,12.5,0]);
await set('dx',50); let p=(await saveProj(page)).objs[0];
check('Medida X=50 regenera cubo (p.w=50)',p.p&&near(p.p.w,50,0.01),JSON.stringify(p.p));
await set('rad',5); p=(await saveProj(page)).objs[0];
check('Radio de borde 5',p.p&&near(p.p.r,5,0.01),JSON.stringify(p.p));
await set('rz',45); p=(await saveProj(page)).objs[0];
check('Rotación Z=45° (cuaternión z≈0.38)',near(p.q[2],Math.sin(Math.PI/8),0.01),JSON.stringify(p.q.map(n=>+n.toFixed(2))));
await set('rz',0); await set('py',40); await page.click('#ground'); await page.waitForTimeout(200);
p=(await saveProj(page)).objs[0];
check('Apoyar: baja hasta la base (y=12.5)',near(p.pos[1],12.5,0.01),'y='+p.pos[1]);

// --- Copiar/pegar/duplicar/borrar
await fresh(); await addAt('1',0,0); await sel([0,12.5,0]);
await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v'); await page.waitForTimeout(200);
check('Ctrl+C / Ctrl+V → 2 objetos',await cnt()===2,await msg(page));
await page.keyboard.press('Control+d'); await page.waitForTimeout(200);
check('Ctrl+D → 3 objetos',await cnt()===3);
await page.keyboard.press('Delete'); await page.waitForTimeout(200);
check('Supr borra el seleccionado → 2',await cnt()===2);

// --- Espejo / Alinear
await fresh(); await addAt('1',-30,0); await addAt('3',30,30); await blur();
await sel([-30,12.5,0]); await sel([30,12.5,30],true);
await page.click('#alinear'); await page.click('[data-al="x:mid"]'); await page.waitForTimeout(200);
p=(await saveProj(page)).objs; check('Alinear X centro: mismo X',near(p[0].pos[0],p[1].pos[0],0.01),p.map(o=>o.pos[0].toFixed(1)).join(' / '));

await page.click('[data-mir="x"]'); await page.waitForTimeout(200);
check('Espejo X sin errores',errs.length===0,errs.join(';'));

// --- Snap / transparente / multi
await page.click('#snap'); check('Snap se activa',await page.$eval('#snap',b=>b.classList.contains('on')));
await clk(page,'#ghost'); check('Transparente se activa',await page.$eval('#ghost',b=>b.classList.contains('on')));
await page.click('#multi'); check('Multi se activa',await page.$eval('#multi',b=>b.classList.contains('on')));

console.log('errores:',errs);
summary(); await browser.close();
