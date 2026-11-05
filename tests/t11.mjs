import {open,check,summary,exportStl,msg} from './lib.mjs';
const {browser,page,errs}=await open();
async function reset(){ await page.click('#pnew'); await page.waitForTimeout(300); const d=await page.$('#dgo'); if(d&&await d.isVisible())await d.click(); await page.waitForTimeout(200);}
for(const kind of ['box','sphere','cylinder']){
 await reset(); await page.click('[data-add='+kind+']'); await page.waitForTimeout(400);
 const b=await exportStl(page); await page.keyboard.press('Escape');
 await page.click('#fuzzbtn'); await page.waitForTimeout(200);
 const t0=Date.now(); await page.click('#fuzzgo'); await page.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:90000}); await page.waitForTimeout(300);
 console.log(kind,(Date.now()-t0)+'ms',await msg(page));
 const a=await exportStl(page); await page.keyboard.press('Escape');
 console.log(' antes',b.tris,b.mn.map(v=>+v.toFixed(2)),b.mx.map(v=>+v.toFixed(2)),'despues',a.tris,a.mn.map(v=>+v.toFixed(2)),a.mx.map(v=>+v.toFixed(2)),'abiertas',a.openEdges,'vol',b.vol.toFixed(0),a.vol.toFixed(0));
 check(kind+': muchos más triángulos',a.tris>b.tris*20,a.tris);
 check(kind+': cerrado (sin bordes abiertos)',a.openEdges===0,a.openEdges);
 check(kind+': tamaño casi igual',[0,1,2].every(k=>Math.abs((a.mx[k]-a.mn[k])-(b.mx[k]-b.mn[k]))<1.2));
 check(kind+': volumen parecido',Math.abs(a.vol-b.vol)/b.vol<0.08);
 check(kind+': base lisa (min Y igual)',Math.abs(a.mn[1]-b.mn[1])<0.01,a.mn[1]);
 if(kind==='sphere')await page.screenshot({path:'/tmp/f1.png'});
}
await reset(); await page.click('[data-add=cylinder]'); await page.waitForTimeout(300); await page.click('#fuzzbtn'); await page.selectOption('#fuzzm','smooth'); await page.click('#fuzzgo'); await page.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:90000}); await page.waitForTimeout(400); await page.screenshot({path:'/tmp/f2.png'});
check('Sin errores',errs.length===0,JSON.stringify(errs));
summary(); await browser.close();
