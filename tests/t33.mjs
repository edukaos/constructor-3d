// Tinkercad: imán de 1 mm prendido de entrada, Esc suelta la selección, apoyar al arrastrar, girar en 3 ejes, puntos de escalar
import {open,check,results} from './lib.mjs';
const {browser,page,errs}=await open();
const add=async(t,x,z=0)=>{await page.click('[data-add='+t+']'); await page.waitForTimeout(250);
  await page.evaluate(([x,z])=>{const b=document.getElementById('placeok'); if(b&&!document.getElementById('placebar').hidden)b.click(); sel[0].position.x=x; sel[0].position.z=z; updateDims(); commit();},[x,z]);};
const scr=v=>page.evaluate(v=>{const p=new THREE.Vector3(...v).project(cam), r=canvas.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},v);
const drag=async(A,B)=>{await page.mouse.move(A.x,A.y); await page.mouse.down(); await page.mouse.move((A.x+B.x)/2,(A.y+B.y)/2,{steps:6}); await page.mouse.move(B.x,B.y,{steps:6}); await page.mouse.up(); await page.waitForTimeout(100);};
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit(); cam.position.set(150,130,200); orbit.target.set(0,0,0); orbit.update();});
// 1. imán
check('Imán prendido de entrada en 1 mm',await page.evaluate(()=>$('#snap').classList.contains('on')&&snapStep()===1));
check('Pasos del imán como Tinkercad',await page.evaluate(()=>[...$('#snapstep').options].map(o=>o.value).join(','))==='0.1,0.25,0.5,1,2,5,10');
// 2. Esc
await add('box',-40); await add('box',40); await page.evaluate(()=>select([objs[0]]));
await page.keyboard.press('Escape'); check('Esc suelta la selección',await page.evaluate(()=>sel.length)===0);
await page.evaluate(()=>{select([objs[0]]); openPanel('#bedp',true);}); await page.keyboard.press('Escape');
check('Con un panel abierto, Esc cierra el panel y deja la selección',await page.evaluate(()=>$('#bedp').hidden&&sel.length===1));
// 3. apoyar al arrastrar: el cubo 0 sobre el cubo 1
await page.evaluate(()=>select([]));
let A=await scr([-40,12.5,0]), B=await scr([40,25,0]);
await drag(A,B);
let y=await page.evaluate(()=>bbox(objs[0]).min.y);
check('Arrastrar sobre otra pieza la apoya arriba',Math.abs(y-25)<0.6,y.toFixed(2));
check('Quedó apoyada encima de la otra',await page.evaluate(()=>{const a=bbox(objs[0]),b=bbox(objs[1]); return a.max.x>b.min.x&&a.min.x<b.max.x&&a.max.z>b.min.z&&a.min.z<b.max.z;}));
A=await scr(await page.evaluate(()=>bbox(objs[0]).getCenter(new THREE.Vector3()).toArray())); B=await scr([-40,0,60]);
await drag(A,B);
y=await page.evaluate(()=>bbox(objs[0]).min.y);
check('Al sacarla de arriba vuelve a la cama',Math.abs(y)<0.01,y.toFixed(2));
// 5. girar en X con la flecha roja
await page.evaluate(()=>{select([objs[1]]); updateScaleUI();});
const rx=await page.evaluate(()=>{const r=frRot.find(r=>r.userData.ax==='x'); return [r.visible, r.position.toArray()];});
check('Hay flechas para girar en X, Y y Z',await page.evaluate(()=>frRot.map(r=>r.userData.ax).join('')==='xyz'&&frRot.every(r=>r.visible)));
const R=await scr(rx[1]); await drag(R,{x:R.x,y:R.y+70});
const rot=await page.evaluate(()=>{const e=new THREE.Euler().setFromQuaternion(objs[1].quaternion); return [e.x,e.y,e.z].map(v=>v*180/Math.PI);});
check('La flecha roja gira en X, de a 22,5°',Math.abs(rot[0])>1&&Math.abs(rot[0]/22.5-Math.round(rot[0]/22.5))<1e-6&&Math.abs(rot[1])<1e-6&&Math.abs(rot[2])<1e-6,rot.map(v=>v.toFixed(1)).join(','));
await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
// 4. puntos de escalar
await page.evaluate(()=>{select([objs[1]]); updateScaleUI();});
check('9 puntos de escalar (4 esquinas, 4 lados, 1 arriba)',await page.evaluate(()=>sh.length===9&&sh.filter(h=>h.userData.face).length===5));
const size=()=>page.evaluate(()=>bbox(objs[1]).getSize(new THREE.Vector3()).toArray().map(v=>+v.toFixed(2)));
const s0=await size();
let hp=await page.evaluate(()=>sh.find(h=>h.userData.s.x===1&&h.userData.s.z===1).position.toArray());
let H=await scr(hp), T=await scr([hp[0]+10,hp[1],hp[2]+5]); await drag(H,T);
let s1=await size();
check('Esquina: cambia ancho y fondo por separado, no la altura',Math.abs(s1[0]-s0[0]-10)<0.6&&Math.abs(s1[2]-s0[2]-5)<0.6&&s1[1]===s0[1],JSON.stringify([s0,s1]));
check('Con el imán, la medida queda en mm enteros',Number.isInteger(s1[0])&&Number.isInteger(s1[2]),JSON.stringify(s1));
await page.evaluate(()=>updateScaleUI());
hp=await page.evaluate(()=>sh.find(h=>h.userData.s.y===1).position.toArray());
H=await scr(hp); T=await scr([hp[0],hp[1]+15,hp[2]]); await drag(H,T);
const s2=await size();
check('Punto de arriba: cambia solo la altura',Math.abs(s2[1]-s1[1]-15)<1&&s2[0]===s1[0]&&s2[2]===s1[2],JSON.stringify([s1,s2]));
check('La pieza sigue apoyada en la cama',await page.evaluate(()=>Math.abs(bbox(objs[1]).min.y)<0.01));
// número de versión en la barra de abajo, igual al del caché del service worker
{ const fs=await import('fs'); const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8').match(/c3d-v(\d+)/)[1];
  const v=await page.evaluate(()=>{const e=document.getElementById('stVer'); return [String(window.C3D_VERSION), e&&e.textContent];});
  check('Versión en la barra de abajo y igual a la del caché (sw.js)',v[0]===sw&&v[1]==='v'+sw,JSON.stringify(v)+' sw='+sw); }
// después de actualizar: cartel con el número nuevo y las novedades desde la versión anterior (una sola vez)
await page.evaluate(()=>localStorage.setItem('c3d_ver','15')); await page.reload(); await page.waitForTimeout(1500);
const up=await page.evaluate(()=>{const d=document.getElementById('updver'); return d&&[d.querySelector('b').textContent, d.querySelectorAll('p').length, localStorage.getItem('c3d_ver')];});
check('Al actualizar aparece "Actualizado a vN" con las novedades',!!up&&up[0]==='Actualizado a v'+(await page.evaluate(()=>C3D_VERSION))&&up[1]>=2&&up[2]===String(await page.evaluate(()=>C3D_VERSION)),JSON.stringify(up));
await page.reload(); await page.waitForTimeout(1500);
check('El cartel de novedades sale una sola vez',await page.evaluate(()=>!document.getElementById('updver')));
check('Sin errores',errs.length===0,errs.join(' | '));
console.log(results.every(r=>r.ok)?results.length+'/'+results.length+' OK':'FALLAN'); await browser.close();
