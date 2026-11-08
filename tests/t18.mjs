import {open,check,summary,exportStl} from './lib.mjs';
const {browser,page,errs}=await open();
await page.setViewportSize({width:1366,height:800});
const ids=['rbox','rcyl','hcyl','qsph','caps','elip','gota','tpri','ppri','opri','star','hear','stai','arch','roof','wash','lper','uper','cros','keyc','nut','gear','arro','brac'];
async function reset(){ await page.click('#pnew'); await page.waitForTimeout(250); const d=await page.$('#dgo'); if(d&&await d.isVisible())await d.click(); await page.waitForTimeout(150);}
await reset(); await page.click('#shpbtn'); await page.waitForFunction(()=>document.querySelectorAll('#shpgrid img').length>=24,null,{timeout:30000});
check('Panel muestra 24 miniaturas',true); await page.screenshot({path:'/tmp/L1.png'});
check('Buscador filtra',await (async()=>{await page.fill('#shpq','estre'); await page.waitForTimeout(150); const n=await page.locator('#shpgrid button').count(); await page.fill('#shpq',''); await page.waitForTimeout(150); return n===1;})());
await page.click('#shpcats button:has-text("Taller")'); await page.waitForTimeout(150); check('Categoría Taller tiene 5',await page.locator('#shpgrid button').count()===5);
await page.click('#shpcats button:has-text("Todas")');
for(const id of ids){
  await reset(); if(await page.evaluate(()=>document.querySelector('#shpp').hidden))await page.click('#shpbtn'); await page.waitForSelector('#shpgrid button[data-id='+id+']');
  await page.click('#shpgrid button[data-id='+id+']'); await page.waitForTimeout(200);
  let st; try{st=await exportStl(page);}catch(e){check(id+' exporta',false,String(e).slice(0,100)); continue;} await page.keyboard.press('Escape');
  const sz=[0,1,2].map(k=>+(st.mx[k]-st.mn[k]).toFixed(1));
  check(id+': sólido cerrado, base en cama, vol>0',st.openEdges===0&&Math.abs(st.mn[2])<0.01&&st.vol>50&&st.tris>=8,JSON.stringify({sz,tris:st.tris,open:st.openEdges,vol:Math.round(st.vol),minz:st.mn[2]}));
}
check('Sin errores',errs.length===0,JSON.stringify(errs)); summary(); await browser.close();
