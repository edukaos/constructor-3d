// Alinear en el visor (como Tinkercad): puntos por eje, vista previa al pasar el mouse, clic alinea, pieza de referencia, Esc sale
import {open,check,results} from './lib.mjs';
const {browser,page,errs}=await open();
const add=async(t,x,z=0)=>{await page.click('[data-add='+t+']'); await page.waitForTimeout(250);
  await page.evaluate(([x,z])=>{const b=document.getElementById('placeok'); if(b&&!document.getElementById('placebar').hidden)b.click(); sel[0].position.x=x; sel[0].position.z=z; updateDims(); commit();},[x,z]);};
const scr=v=>page.evaluate(v=>{const p=new THREE.Vector3(...v).project(cam), r=canvas.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},v);
const dot=(k,w)=>page.evaluate(([k,w])=>{const d=alDots.find(d=>d.k===k&&d.w===w); return d.m.position.toArray();},[k,w]);
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit(); cam.position.set(170,150,230); orbit.target.set(0,0,0); orbit.update();});
await add('box',-40,-20); await add('cylinder',40,25);
await page.evaluate(()=>select([...objs])); await page.click('#alinear'); await page.waitForTimeout(200);
check('Con 2 piezas, Alinear muestra los puntos en el visor',await page.evaluate(()=>!!alMode&&alG.visible&&!$('#albar').hidden&&$('#toolp').hidden));
check('9 puntos: 3 por eje',await page.evaluate(()=>alDots.length===9));
const z0=await page.evaluate(()=>objs.map(o=>o.position.z));
// vista previa al pasar el mouse por "atrás" (Z mínimo)
let P=await scr(await dot('z','min')); await page.mouse.move(P.x,P.y); await page.waitForTimeout(150);
const zp=await page.evaluate(()=>objs.map(o=>bbox(o).min.z.toFixed(2)));
check('Pasar el mouse muestra cómo quedan (vista previa)',zp[0]===zp[1],JSON.stringify(zp));
await page.mouse.move(P.x+200,P.y+150); await page.waitForTimeout(150);
check('Al salir del punto vuelven a su lugar',JSON.stringify(await page.evaluate(()=>objs.map(o=>o.position.z)))===JSON.stringify(z0));
// clic alinea
P=await scr(await dot('z','min')); await page.mouse.move(P.x,P.y); await page.mouse.click(P.x,P.y); await page.waitForTimeout(150);
let b=await page.evaluate(()=>objs.map(o=>bbox(o).min.z));
check('Clic alinea atrás (las dos al Z mínimo del conjunto)',Math.abs(b[0]-b[1])<1e-6&&Math.abs(b[0]+32.5)<1e-6,JSON.stringify(b));
check('Sigue en modo alinear después de alinear',await page.evaluate(()=>!!alMode));
// referencia: tocar el cilindro; alinear a la derecha → el cubo va al lado derecho del cilindro, el cilindro no se mueve
const cyl=await page.evaluate(()=>bbox(objs[1]).getCenter(new THREE.Vector3()).toArray()); const C=await scr(cyl);
await page.mouse.click(C.x,C.y); await page.waitForTimeout(100);
check('Tocar una pieza la marca como referencia',await page.evaluate(()=>alMode&&alMode.ref&&alMode.ref.objs[0]===objs[1]));
const x1=await page.evaluate(()=>objs[1].position.x);
P=await scr(await dot('x','max')); await page.mouse.move(P.x,P.y); await page.mouse.click(P.x,P.y); await page.waitForTimeout(150);
b=await page.evaluate(()=>objs.map(o=>bbox(o).max.x));
check('Con referencia: el otro se alinea a ella y ella no se mueve',Math.abs(b[0]-b[1])<1e-6&&await page.evaluate(x1=>objs[1].position.x===x1,x1),JSON.stringify(b));
// deshacer vuelve atrás
await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
check('Ctrl+Z deshace la alineación',await page.evaluate(()=>Math.abs(bbox(objs[0]).max.x-bbox(objs[1]).max.x)>1));
// Esc sale (y no suelta la selección)
await page.evaluate(()=>{select([...objs]);}); await page.click('#alinear'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
check('Esc sale del modo alinear sin soltar la selección',await page.evaluate(()=>!alMode&&!alG.visible&&sel.length===2));
// con 1 pieza abre el panel
await page.evaluate(()=>select([objs[0]])); await page.click('#alinear'); await page.waitForTimeout(100);
check('Con 1 pieza, Alinear abre el panel (centrar y espejo)',await page.evaluate(()=>!alMode&&!$('#toolp').hidden));
check('Sin errores',errs.length===0,errs.join(' | '));
console.log(results.every(r=>r.ok)?results.length+'/'+results.length+' OK':'FALLAN'); await browser.close();
