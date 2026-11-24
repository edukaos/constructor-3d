// Grabar texto en la cara de arriba de una pieza: la pieza queda con un hueco y sigue cerrada
import {open,check,summary,exportStl} from './lib.mjs';
const {browser,page,errs}=await open();
const r1=v=>Math.round(v*10)/10;
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(200);             // cubo 25 mm
await page.evaluate(()=>{select([objs[0]]);});
const before=await page.evaluate(()=>objs.map(o=>bbox(o).getSize(new THREE.Vector3()).toArray()));
const vBefore=await exportStl(page); await page.keyboard.press('Escape');
await page.click('#textbtn'); await page.waitForTimeout(200);
await page.fill('#tstr','OK');
await page.evaluate(()=>{select([objs[0]]);});
await page.click('#tgrab'); await page.waitForTimeout(3000);
const n=await page.evaluate(()=>objs.length);
check('Queda una sola pieza (el cubo grabado)',n===1,'n='+n);
const name=await page.evaluate(()=>M_(objs[0]).n);
check('La pieza conserva su nombre',name.startsWith('Cubo'),name);
const v=await exportStl(page); await page.keyboard.press('Escape');
check('Malla cerrada tras grabar',v.openEdges===0,String(v.openEdges));
check('Tiene menos volumen que el cubo sólido (se quitó material)',v.vol<vBefore.vol-5&&v.vol>vBefore.vol*0.8,r1(vBefore.vol)+' → '+r1(v.vol));
check('Ancho y fondo del cubo no cambian',Math.abs((v.mx[0]-v.mn[0])-25)<0.1&&Math.abs((v.mx[1]-v.mn[1])-25)<0.1);
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
