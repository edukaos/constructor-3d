// Distancias al mover: vecina en X y Z, y bordes de la cama
import {open,check,summary} from './lib.mjs';
const {browser,page,errs}=await open();
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.waitForTimeout(80);};
const blur=()=>page.evaluate(()=>document.activeElement&&document.activeElement.blur());
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await set('px',-50); await set('pz',0); await blur();   // cubo A: x de -62,5 a -37,5
await page.keyboard.press('1'); await set('px',50); await set('pz',0); await blur();    // cubo B: x de 37,5 a 62,5
const g=await page.evaluate(()=>{const a=objs[1]; return distLabel(a);});
check('Cubo B: 75 mm libres hasta A en X',g.includes('vecina X 75 mm'),g);
check('Cubo B: sin vecina en Z (no se cruzan)',!g.includes('vecina Z'),g);
check('Cubo B: a 110−62,5 = 47,5 mm del borde de la cama en X',g.includes('borde X 47,5 mm'),g);
const d=await page.evaluate(()=>{const a=objs[0]; return distLabel(a);});
check('Cubo A: 110−62,5 = 47,5 mm del borde izquierdo',d.includes('borde X 47,5 mm'),d);
await page.evaluate(()=>{objs[1].position.x=37.5+ -37.5+0; });
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
