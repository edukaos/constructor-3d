// Tornillos y tuercas con rosca: medidas, malla cerrada, cambio de parámetros y que el tornillo entre en la tuerca
import {open,check,summary,exportStl} from './lib.mjs';
const {browser,page,errs}=await open();
const r1=v=>Math.round(v*100)/100;
await page.click('#pnew'); await page.waitForTimeout(200);
await page.click('#shpbtn'); await page.waitForSelector('#shpgrid button[data-id=bolt]');
await page.click('#shpgrid button[data-id=bolt]'); await page.waitForTimeout(400);
let st=await exportStl(page);
const sz=[0,1,2].map(k=>r1(st.mx[k]-st.mn[k]));
check('Tornillo M8×20: alto = cabeza 5,3 + 20',Math.abs(sz[2]-25.3)<0.05,sz.join(' x '));
check('Tornillo M8: cabeza hexagonal de 13 mm entre caras',Math.abs(Math.min(sz[0],sz[1])-13)<0.1,sz.join(' x '));
check('Tornillo: malla cerrada',st.openEdges===0,String(st.openEdges));
check('Tornillo: volumen razonable (cabeza + vástago)',st.vol>1300&&st.vol<1800,st.vol.toFixed(0));
check('Panel Tornillo visible',await page.locator('#pbolt').isVisible());
// la rosca tiene relieve: radios entre el menor y el mayor
const rr=await page.evaluate(()=>{const o=objs[objs.length-1], p=o.geometry.attributes.position; let mn=1e9,mx=0; for(let i=0;i<p.count;i++){const y=p.getY(i); if(y<8||y>20)continue; const r=Math.hypot(p.getX(i),p.getZ(i)); mn=Math.min(mn,r); mx=Math.max(mx,r);} return [mn,mx];});
check('Rosca real: radio de 3,23 a 4 mm',Math.abs(rr[1]-4)<0.02&&Math.abs(rr[0]-(4-0.6134*1.25))<0.05,rr.map(r1).join(' – '));
// cambiar largo y medida
await page.fill('#bL','30'); await page.$eval('#bL',e=>e.dispatchEvent(new Event('change',{bubbles:true}))); await page.waitForTimeout(300);
await page.selectOption('#bTh','M10'); await page.waitForTimeout(300);
const h=await page.evaluate(()=>{const b=bbox(objs[objs.length-1]); return [b.max.y-b.min.y,b.max.x-b.min.x];});
check('M10×30: alto 6,4 + 30',Math.abs(h[0]-36.4)<0.05,h.map(r1).join(','));
await page.selectOption('#bHead','none'); await page.waitForTimeout(300);
const h2=await page.evaluate(()=>{const b=bbox(objs[objs.length-1]); return [b.max.y-b.min.y,b.max.x-b.min.x];});
check('Sin cabeza: varilla de 30 y 10 mm de diámetro',Math.abs(h2[0]-30)<0.05&&Math.abs(h2[1]-10)<0.1,h2.map(r1).join(','));
await page.evaluate(()=>document.activeElement&&document.activeElement.blur()); await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
check('Deshacer vuelve a la cabeza hexagonal',await page.evaluate(()=>objs[objs.length-1].userData.p.head)==='hex');
// tuerca con rosca
await page.click('#pnew'); await page.waitForTimeout(200); const dg=await page.$('#dgo'); if(dg&&await dg.isVisible())await dg.click();
await page.click('#shpbtn'); await page.waitForSelector('#shpgrid button[data-id=nutt]');
await page.click('#shpgrid button[data-id=nutt]'); await page.waitForTimeout(400);
st=await exportStl(page);
check('Tuerca roscada M8: malla cerrada',st.openEdges===0,String(st.openEdges));
check('Tuerca roscada M8: 6,5 mm de alto',Math.abs((st.mx[2]-st.mn[2])-6.5)<0.05);
const ir=await page.evaluate(()=>{const o=objs[objs.length-1], p=o.geometry.attributes.position; let mn=1e9; for(let i=0;i<p.count;i++)mn=Math.min(mn,Math.hypot(p.getX(i),p.getZ(i))); return mn;});
check('Agujero de la tuerca: menor de la rosca + holgura (3,23 + 0,25)',Math.abs(ir-(4-0.6134*1.25+0.25))<0.05,r1(ir));
check('Opción "Rosca interior" marcada',await page.$eval('#nThr',e=>e.checked));
await page.$eval('#nThr',e=>{e.checked=false; e.dispatchEvent(new Event('change',{bubbles:true}));}); await page.waitForTimeout(300);
const ir2=await page.evaluate(()=>{const o=objs[objs.length-1], p=o.geometry.attributes.position; let mn=1e9; for(let i=0;i<p.count;i++)mn=Math.min(mn,Math.hypot(p.getX(i),p.getZ(i))); return mn;});
check('Sin rosca interior vuelve al agujero liso de 8,2',Math.abs(ir2-4.1)<0.1,r1(ir2));
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
