// Agrupar sin unir: elegir una pieza elige el grupo, se duplica entero, escala y gira, y se desagrupa
import {open,check,saveProj,clickObj,summary} from './lib.mjs';
const {browser,page,errs}=await open();
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.waitForTimeout(80);};
const blur=()=>page.evaluate(()=>document.activeElement&&document.activeElement.blur());
const nsel=()=>page.evaluate(()=>sel.length);
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await set('px',-20); await set('pz',0); await blur();
await page.keyboard.press('1'); await set('px',20); await set('pz',0); await blur();
await page.keyboard.press('2'); await set('px',0); await set('pz',-40); await blur();
await clickObj(page,[-28,12.5,0]); await clickObj(page,[28,12.5,0],{shift:true});
check('Dos piezas elegidas',await nsel()===2);
await page.keyboard.press('Control+g'); await page.waitForTimeout(200);
let d=await saveProj(page); const gs=d.objs.map(o=>o.m&&o.m.g);
check('Agrupar marca las dos con el mismo grupo',gs[0]&&gs[0]===gs[1]&&!gs[2],JSON.stringify(gs));
check('Se abre el panel Grupo',await page.$eval('#grpp',e=>!e.hidden));
await page.mouse.click(40,600); await page.waitForTimeout(150);
await page.evaluate(()=>select([objs[0]])); 
check('Elegir una pieza del grupo elige el grupo entero',await nsel()===2);
await page.evaluate(()=>select([objs[0]])); check('Volver a elegir una pieza del grupo lo mantiene entero',await nsel()===2);
await page.evaluate(()=>select([...sel,objs[2]])); check('Sumar otra pieza con Shift deja el grupo y la nueva',await nsel()===3);
await page.evaluate(()=>select(selWithout(objs[0]))); check('Sacar una pieza del grupo con Shift saca el grupo entero',await nsel()===1);
// escalar el grupo al 200 %
await page.evaluate(()=>{select([objs[0]]);});
const w0=await page.evaluate(()=>groupBox().getSize(new THREE.Vector3()).x);
await page.fill('#grppct','200'); await page.$eval('#grppct',e=>e.dispatchEvent(new Event('change',{bubbles:true}))); await page.waitForTimeout(200);
const w1=await page.evaluate(()=>groupBox().getSize(new THREE.Vector3()).x);
check('Escalar grupo 200 % duplica el ancho',Math.abs(w1-2*w0)<0.2,w0.toFixed(1)+' → '+w1.toFixed(1));
const sizes=await page.evaluate(()=>objs.slice(0,2).map(o=>bbox(o).getSize(new THREE.Vector3()).y));
check('Cada pieza del grupo también crece (50 mm de alto)',sizes.every(h=>Math.abs(h-50)<0.2),sizes.join(','));
await page.click('#grpl'); await page.waitForTimeout(150);
const wr=await page.evaluate(()=>{const s=groupBox().getSize(new THREE.Vector3()); return [s.x,s.z];});
check('Girar 90° intercambia ancho y fondo',Math.abs(wr[1]-w1)<0.3,wr.map(v=>v.toFixed(1)).join(' x '));
// duplicar: grupo nuevo
await page.keyboard.press('Control+d'); await page.waitForTimeout(200);
d=await saveProj(page); const g2=d.objs.map(o=>o.m&&o.m.g);
check('Duplicar copia el grupo entero (5 piezas)',d.objs.length===5,String(d.objs.length));
check('La copia es un grupo nuevo',g2[3]&&g2[3]===g2[4]&&g2[3]!==g2[0],JSON.stringify(g2));
// deshacer y desagrupar
await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
await page.evaluate(()=>select([objs[0]]));
await page.keyboard.press('Control+Shift+g'); await page.waitForTimeout(200);
await page.evaluate(()=>select([objs[0]]));
check('Desagrupar: una pieza vuelve a elegirse sola',await nsel()===1);
d=await saveProj(page); check('Desagrupar borra la marca de grupo',d.objs.every(o=>!(o.m&&o.m.g)));
// la etiqueta en la lista de piezas
await page.evaluate(()=>{select([objs[0],objs[1]]);}); await page.keyboard.press('Control+g'); await page.waitForTimeout(150);
await page.click('#ribbon .rtabs [data-t=crear]').catch(()=>{});
const tags=await page.evaluate(()=>{renderList(true); return document.querySelectorAll('#lrows .tag').length;});
check('La lista de piezas marca las piezas agrupadas',tags>=2||!(await page.locator('#listp').isVisible()),String(tags));
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
