// Escalar un grupo con las manijas del visor: el conjunto entero crece desde la cara opuesta
import {open,check,summary} from './lib.mjs';
const {browser,page,errs}=await open();
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.waitForTimeout(80);};
const blur=()=>page.evaluate(()=>document.activeElement&&document.activeElement.blur());
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await set('px',-50); await set('pz',0); await blur();
await page.keyboard.press('1'); await set('px',50); await set('pz',0); await blur();
await page.evaluate(()=>{select([objs[0],objs[1]]); groupSel(); select([objs[0],objs[1]]);});
await page.waitForTimeout(150);
const before=await page.evaluate(()=>{const b=groupBox(); return {x0:b.min.x,x1:b.max.x};});
// pantalla de la manija de la cara +X del grupo
await page.evaluate(()=>{ $('#grpp').hidden=true; }); await page.waitForTimeout(100);
// elegimos una manija de la cara +X que no quede tapada por un panel (el punto tiene que ser del visor)
const pt=await page.evaluate(()=>{
  const r=canvas.getBoundingClientRect();
  for(const h of sh.filter(q=>q.visible&&q.userData.s.x===1)){
    const v=h.position.clone().project(cam), x=r.left+(v.x+1)/2*r.width, y=r.top+(1-v.y)/2*r.height;
    if(document.elementFromPoint(x,y)===canvas) return {x,y,vis:true,s:h.userData.s.toArray()};
  }
  return {x:0,y:0,vis:false};
});
check('Manija de la cara +X visible en el visor con el grupo elegido',pt.vis===true,JSON.stringify(pt));
await page.mouse.move(pt.x,pt.y); await page.mouse.down();
for(let i=1;i<=10;i++){await page.mouse.move(pt.x+i*12,pt.y); await page.waitForTimeout(16);}
await page.mouse.up(); await page.waitForTimeout(150);
const after=await page.evaluate(()=>{const b=groupBox(); const w=o=>{const q=bbox(o);return q.max.x-q.min.x;}; return {x0:b.min.x,x1:b.max.x,w0:w(objs[0]),w1:w(objs[1]),p1:objs[1].position.x};});
check('El grupo creció en X',after.x1-after.x0>before.x1-before.x0+5,JSON.stringify({before,after}));
check('La cara opuesta (−X) quedó fija',Math.abs(after.x0-before.x0)<0.5,JSON.stringify({before,after}));
check('Las dos piezas crecieron en X (de 25 a más de 26 mm cada una)',after.w0>26&&after.w1>26,JSON.stringify(after));
check('La pieza B se corrió con el grupo (no se quedó en su lugar)',after.p1>50+5,JSON.stringify(after));
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
