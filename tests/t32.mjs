// Panel de propiedades con varias piezas (medidas, posición y giro del conjunto) y escalar piezas giradas sin torcerlas
import {open,check,results} from './lib.mjs';
const {browser,page,errs}=await open();
const add=async(t,x)=>{await page.click('[data-add='+t+']'); await page.waitForTimeout(250);
  await page.evaluate(x=>{const b=document.getElementById('placeok'); if(b&&!document.getElementById('placebar').hidden)b.click(); sel[0].position.x=x; updateDims(); commit();},x);};
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit(); cam.position.set(200,170,270); orbit.update();});
await add('box',-30); await add('box',30); await page.keyboard.press('Control+a'); await page.waitForTimeout(200);
const val=id=>page.inputValue(id);
check('Panel: ancho del conjunto 85',await val('#dx')==='85',await val('#dx'));
check('Panel: posición X del conjunto 0',await val('#px')==='0',await val('#px'));
const type=async(id,v)=>{await page.fill(id,String(v)); await page.press(id,'Enter'); await page.waitForTimeout(150);};
await type('#px',10);
check('Posición X mueve el conjunto',await page.evaluate(()=>objs.map(o=>o.position.x).join(','))==='-20,40');
await type('#dx',170);
const r=await page.evaluate(()=>[groupBox().getSize(new THREE.Vector3()).x, objs.map(o=>o.scale.x.toFixed(2)).join(',')]);
check('Ancho 170 escala el conjunto',Math.abs(r[0]-170)<0.01,JSON.stringify(r));
await type('#ry',90);
const rr=await page.evaluate(()=>[groupBox().getSize(new THREE.Vector3()).toArray().map(v=>+v.toFixed(1)), $('#ry').value, hist.length]);
check('Rotación Y 90 gira el conjunto una sola vez',Math.abs(rr[0][2]-170)<0.1&&rr[1]==='0',JSON.stringify(rr));
// pieza girada 30° escalada en X del mundo: sin torcer
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit();});
await add('box',-30); await add('box',30);
await page.evaluate(()=>{objs[1].rotation.y=Math.PI/6; objs[1].updateMatrixWorld(true); select([...objs]);});
await type('#dx',200);
const sh=await page.evaluate(()=>{const o=objs[1]; o.updateMatrixWorld(true); const e=o.matrixWorld.elements; const X=new THREE.Vector3(e[0],e[1],e[2]), Y=new THREE.Vector3(e[4],e[5],e[6]), Z=new THREE.Vector3(e[8],e[9],e[10]); return [Math.abs(X.dot(Z))<1e-6&&Math.abs(X.dot(Y))<1e-6, o.quaternion.w.toFixed(3), groupBox().getSize(new THREE.Vector3()).x.toFixed(2), !!o.userData.p];});
check('Pieza girada escalada sin torcer (ejes perpendiculares) y ancho 200',sh[0]&&sh[2]==='200.00',JSON.stringify(sh));
// arrastre de manija con pieza girada
await page.keyboard.press('Control+z'); await page.waitForTimeout(150); await page.evaluate(()=>select([...objs]));
const scr=v=>page.evaluate(v=>{const p=new THREE.Vector3(...v).project(cam), r=canvas.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},v);
const h=await page.evaluate(()=>{updateScaleUI(); return sh.find(h=>h.userData.face&&h.userData.s.x===1).position.toArray();}); const H=await scr(h);
await page.mouse.move(H.x,H.y); await page.mouse.down(); await page.mouse.move(H.x+60,H.y,{steps:8}); await page.mouse.up();
const sh2=await page.evaluate(()=>{const o=objs[1]; o.updateMatrixWorld(true); const e=o.matrixWorld.elements; const X=new THREE.Vector3(e[0],e[1],e[2]), Z=new THREE.Vector3(e[8],e[9],e[10]); return [Math.abs(X.dot(Z))<1e-6, o.matrixAutoUpdate, groupBox().getSize(new THREE.Vector3()).x.toFixed(1)];});
check('Manija con pieza girada: sin torcer al soltar',sh2[0]&&sh2[1],JSON.stringify(sh2));
check('Sin errores',errs.length===0,errs.join(' | '));
console.log(results.every(r=>r.ok)?results.length+'/'+results.length+' OK':'FALLAN'); await browser.close();
