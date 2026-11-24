'use strict';
// Constructor 3D: Sketch 2D y calcar imagen.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Sketch 2D: línea, arco, rectángulo y círculo con cotas; Extruir y Revolucionar =====
// Los bocetos se guardan en userData.fx (k:'sketch') para poder volver a editarlos desde el Historial.
var sk=null;
const SK_SEG=64, skRay=new THREE.Raycaster(), skV2=new THREE.Vector2();
const skClone=o=>JSON.parse(JSON.stringify(o));
function zf(){return parseFloat(getComputedStyle(document.documentElement).zoom)||1;}
function skArcPts(a,b,bulge){
  const th=4*Math.atan(bulge), dx=b.x-a.x, dy=b.y-a.y, c=Math.hypot(dx,dy); if(c<1e-9||Math.abs(th)<1e-6)return [];
  const k=(c/2)/Math.tan(th/2), cx=(a.x+b.x)/2-dy/c*k, cy=(a.y+b.y)/2+dx/c*k, r=Math.hypot(a.x-cx,a.y-cy), a0=Math.atan2(a.y-cy,a.x-cx), n=Math.max(2,Math.ceil(Math.abs(th)/(Math.PI/36))), out=[];
  for(let i=1;i<n;i++){const t=a0+th*i/n; out.push([cx+r*Math.cos(t),cy+r*Math.sin(t)]);}
  return out;
}
function skBulge(p0,m,p2){
  const ax=p0.x,ay=p0.y,bx=m.x,by=m.y,cx=p2.x,cy=p2.y, d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by)); if(Math.abs(d)<1e-9)return 0;
  const ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d, uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d;
  const TAU=Math.PI*2, mod=x=>((x%TAU)+TAU)%TAU, a0=Math.atan2(ay-uy,ax-ux), a1=Math.atan2(by-uy,bx-ux), a2=Math.atan2(cy-uy,cx-ux), s=mod(a2-a0), sm=mod(a1-a0);
  return Math.tan((sm<=s?s:-(TAU-s))/4);
}
// puntos [x,y] de una forma (los círculos y los arcos se pasan a segmentos)
// esquinas redondeadas: cada vértice recto con radio cr se reemplaza por un arco tangente a sus dos lados
function skCorner(P,i,r,closed){
  const n=P.length, cur=P[i], prev=P[(i-1+n)%n], next=P[(i+1)%n];
  if(!(r>0)||(!closed&&(i===0||i===n-1)))return null;
  if(prev.b||cur.b)return {bad:'arco'};
  const l1=Math.hypot(cur.x-prev.x,cur.y-prev.y), l2=Math.hypot(next.x-cur.x,next.y-cur.y); if(l1<1e-9||l2<1e-9)return null;
  const d1x=(cur.x-prev.x)/l1, d1y=(cur.y-prev.y)/l1, d2x=(next.x-cur.x)/l2, d2y=(next.y-cur.y)/l2;
  const cr=d1x*d2y-d1y*d2x, dt=d1x*d2x+d1y*d2y, ph=Math.acos(Math.max(-1,Math.min(1,dt)));
  if(ph<1e-3||Math.PI-ph<1e-3)return null;
  const want=r*Math.tan(ph/2), t=Math.min(want,0.5*Math.min(l1,l2));
  return {A:{x:cur.x-d1x*t,y:cur.y-d1y*t},B:{x:cur.x+d2x*t,y:cur.y+d2y*t},b:(cr>=0?1:-1)*Math.tan(ph/4),reff:t/Math.tan(ph/2),clamped:t<want-1e-9};
}
function skRoundVerts(P,rs,closed){
  const out=[]; P.forEach((q,i)=>{const c=skCorner(P,i,rs[i],closed); if(!c||c.bad){out.push({x:q.x,y:q.y,b:q.b||0}); return;} out.push({x:c.A.x,y:c.A.y,b:c.b},{x:c.B.x,y:c.B.y,b:0});});
  return out;
}
const skRectP=s=>[{x:s.x,y:s.y,b:0},{x:s.x+s.w,y:s.y,b:0},{x:s.x+s.w,y:s.y+s.h,b:0},{x:s.x,y:s.y+s.h,b:0}];
function skTess(s){
  if(s.t==='rect'){ if(s.cr&&s.cr.some(r=>r>0))return skTessV(skRoundVerts(skRectP(s),s.cr,true),true); const x2=s.x+s.w, y2=s.y+s.h; return [[s.x,s.y],[x2,s.y],[x2,y2],[s.x,y2]];}
  if(s.t==='circ'){const o=[]; for(let i=0;i<SK_SEG;i++){const a=Math.PI*2*i/SK_SEG; o.push([s.x+s.r*Math.cos(a),s.y+s.r*Math.sin(a)]);} return o;}
  return skTessV(s.v.some(q=>q.cr>0)?skRoundVerts(s.v,s.v.map(q=>q.cr||0),s.closed):s.v,s.closed);
}
function skTessV(V,closed){
  const out=[], n=V.length, last=closed?n:n-1;
  for(let i=0;i<n;i++){out.push([V[i].x,V[i].y]); if(i<last&&V[i].b)out.push(...skArcPts(V[i],V[(i+1)%n],V[i].b));}
  return out;
}
const skIsClosed=s=>s.t!=='path'||s.closed;
function skPolys(shapes){return shapes.filter(s=>skIsClosed(s)&&!(s.t==='circ'&&!(s.r>0))&&!(s.t==='rect'&&(!s.w||!s.h))).map(skTess).filter(p=>p.length>=3);}
// arma la geometría (en coordenadas del mundo) desde un boceto; devuelve {geo,W} o {err}
// Alternativa sin manifold (por ejemplo si el motor no carga): extrusión y revolución con Three.js
function sketchBuildThree(p){
  const polys=skPolys(p.shapes); if(!polys.length)return {err:'No hay formas cerradas en el boceto.'};
  try{
    const inside=(pt,poly)=>{let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j]; if((a[1]>pt[1])!==(b[1]>pt[1])&&pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])c=!c;} return c;};
    const depth=polys.map((q,i)=>polys.reduce((d,r,k)=>d+(k!==i&&inside(q[0],r)?1:0),0));
    let g;
    if(p.mode==='revolve'){
      if((p.deg||360)<360)return {err:'Revolucionar menos de 360° necesita el motor de formas, que no cargó. Recargá la página.'};
      if(polys.length>1)return {err:'Revolucionar un perfil con huecos o varias formas necesita el motor de formas, que no cargó. Recargá la página.'};
      if(polys[0].some(q=>q[0]<-1e-6))return {err:'Para revolucionar, dibujá el perfil a la derecha del eje rojo.'};
      const mk=pts=>new THREE.LatheGeometry(pts.map(q=>new THREE.Vector2(Math.max(0,q[0]),q[1])),72,0,Math.PI*2);
      g=mk(polys[0]);
      const pos=g.attributes.position, idx=g.index; let vol=0; for(let i=0;i<idx.count;i+=3){const a=idx.getX(i)*3,b=idx.getX(i+1)*3,c=idx.getX(i+2)*3; vol+=pos.array[a]*(pos.array[b+1]*pos.array[c+2]-pos.array[b+2]*pos.array[c+1])-pos.array[a+1]*(pos.array[b]*pos.array[c+2]-pos.array[b+2]*pos.array[c])+pos.array[a+2]*(pos.array[b]*pos.array[c+1]-pos.array[b+1]*pos.array[c]);}
      if(vol<0)g=mk(polys[0].slice().reverse());
    } else {
      const shapes=[]; polys.forEach((q,i)=>{ if(depth[i]%2)return; const sh=new THREE.Shape(q.map(v=>new THREE.Vector2(v[0],v[1]))); polys.forEach((h,k)=>{ if(depth[k]===depth[i]+1&&inside(h[0],q))sh.holes.push(new THREE.Path(h.map(v=>new THREE.Vector2(v[0],v[1])))); }); shapes.push(sh); });
      g=new THREE.ExtrudeGeometry(shapes,{depth:Math.max(0.1,p.h),bevelEnabled:false,curveSegments:1});
      if(p.plane==='xz')g.rotateX(-Math.PI/2); else g.translate(0,0,-p.h/2);
    }
    g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals(); g.computeBoundingBox(); g.translate(0,-g.boundingBox.min.y,0);
    if(!g.attributes.position.count)return {err:'El boceto no generó ninguna forma. Revisá que las formas estén cerradas.'};
    const mesh=new THREE.Mesh(g); recenter(mesh); mesh.updateMatrix(); return {geo:mesh.geometry,W:mesh.matrix.clone()};
  }catch(e){console.error(e); return {err:'No se pudo generar la forma desde el boceto.'};}
}
function sketchBuild(p){
  if(!MF)return sketchBuildThree(p);
  const polys=skPolys(p.shapes); if(!polys.length)return {err:'No hay formas cerradas en el boceto.'};
  const del=[];
  try{
    const cs=new MF.CrossSection(polys,'EvenOdd'); del.push(cs); let m;
    if(p.mode==='revolve'){
      const r=cs.revolve(72,Math.min(360,Math.max(1,p.deg||360))); del.push(r); m=r.rotate([-90,0,0]);
    } else {
      const e=cs.extrude(Math.max(0.1,p.h)); del.push(e);
      m=p.plane==='xz'?e.transform([1,0,0,0, 0,0,-1,0, 0,1,0,0, 0,0,0,1]):e.translate([0,0,-p.h/2]);
    }
    del.push(m); const g=fromManifold(m); g.computeBoundingBox(); g.translate(0,-g.boundingBox.min.y,0);
    if(!g.attributes.position.count)return {err:'El boceto no generó ninguna forma. Revisá que las formas estén cerradas y, al revolucionar, a la derecha del eje.'};
    const mesh=new THREE.Mesh(g); recenter(mesh); mesh.updateMatrix(); return {geo:mesh.geometry,W:mesh.matrix.clone()};
  }catch(e){console.error(e); return {err:'No se pudo generar la forma desde el boceto.'};}
  finally{del.forEach(x=>{try{x.delete();}catch(_){}});}
}
const skW=(u,v)=>sk.plane==='xz'?new THREE.Vector3(u,0.06,-v):new THREE.Vector3(u,v,0.06);
function skLine(pts,color,closed,op,du,dv){
  const a=pts.map(p=>skW(p[0]+(du||0),p[1]+(dv||0))); if(closed&&a.length)a.push(a[0].clone());
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(a),new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:op==null?1:op})); l.renderOrder=20; return l;
}
function skDots(pts,color,size){
  const g=new THREE.BufferGeometry().setFromPoints(pts.map(p=>skW(p[0],p[1])));
  const d=new THREE.Points(g,new THREE.PointsMaterial({color,size:size||10,sizeAttenuation:false,depthTest:false})); d.renderOrder=size>10?23:21; return d;
}
function skFill(pts){
  try{ const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1]))), g=new THREE.ShapeGeometry(sh);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x8db9ff,transparent:true,opacity:.16,depthTest:false,side:THREE.DoubleSide,depthWrite:false}));
    if(sk.plane==='xz'){m.rotation.x=-Math.PI/2; m.position.y=0.05;} else m.position.z=0.05; m.renderOrder=18; return m; }catch(e){return null;}
}
function skNodeAt(e,onlyCorners){
  const r=canvas.getBoundingClientRect(), sc=q=>{const w=skW(q[0],q[1]).project(cam); return [r.left+(w.x+1)/2*r.width, r.top+(1-w.y)/2*r.height];};
  let best=13, hit=null;
  sk.shapes.forEach((s,si)=>{ if(onlyCorners&&s.t==='circ')return; skVerts(s).forEach((q,i)=>{ if(onlyCorners&&!skIsClosed(s)&&s.t==='path'&&(i===0||i===s.v.length-1))return; const c=sc(q), d=Math.hypot(c[0]-e.clientX,c[1]-e.clientY)-(si===sk.sel?3:0); if(d<best){best=d; hit={si,i};} }); });
  return hit;
}
function skHint(){
  if(!sk)return; const el=sk.bar.querySelector('#skhint'); if(!el)return; const t=sk.tool, s=sk.shapes[sk.sel]; let h;
  if(t==='path')h=sk.cur?'Seguí tocando puntos. Tocá el primero para cerrar la forma, o Enter para terminar.':'Línea: tocá en el plano para poner el primer punto.';
  else if(t==='arc')h=!sk.cur?'Arco: tocá el punto de inicio.':sk.arcEnd?'Ahora tocá un punto por donde pasa el arco.':'Tocá el punto final del arco.';
  else if(t==='rect')h=sk.cur?'Soltá o tocá la esquina opuesta.':'Rectángulo: arrastrá en el plano de una esquina a la opuesta.';
  else if(t==='circ')h=sk.cur?'Soltá o tocá un punto del borde.':'Círculo: arrastrá desde el centro hasta el borde.';
  else if(t==='corner')h='Empalme: poné el radio y tocá una esquina (cuadradito) para redondearla.';
  else if(!s)h='Seleccionar: tocá una forma o un cuadradito (nodo) para elegirlo.';
  else if(sk.node>=0&&s.t==='circ')h='Centro seleccionado (naranja): arrastralo para mover el círculo.';
  else if(sk.node>=0)h='Nodo seleccionado (naranja): arrastralo para moverlo, o usá el deslizador para redondear esa esquina.';
  else h='Forma seleccionada: cambiá sus medidas abajo, tocá un nodo para moverlo, o usá el deslizador para redondear todas las esquinas.';
  el.textContent=h;
}
function skDragMove(e){
  const d=sk.drag; if(!d.moved){ if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)<4)return; d.moved=true; skPush(); }
  const p=skPt(e,{si:d.si,i:d.i}); if(!p)return; const s=sk.shapes[d.si]; let t='X '+p.x+' · Y '+p.y;
  if(s.t==='path')s.v[d.i].x=p.x, s.v[d.i].y=p.y;
  else if(s.t==='circ')s.x=p.x, s.y=p.y;
  else { const oldV=skVerts(s), D=oldV[d.i], O=oldV[(d.i+2)%4];
    let w=Math.abs(p.x-d.opp.x), h=Math.abs(p.y-d.opp.y); if(w<0.01||h<0.01)return;
    const x0=Math.min(p.x,d.opp.x), y0=Math.min(p.y,d.opp.y), idx=(nx,ny)=>{const ix=nx>x0+w/2?1:0, iy=ny>y0+h/2?1:0; return [[0,3],[1,2]][ix][iy];};
    if(s.cr){ const nc=[0,0,0,0]; oldV.forEach((q,k)=>{ const nx=q[0]===D[0]?p.x:O[0], ny=q[1]===D[1]?p.y:O[1]; nc[idx(nx,ny)]=s.cr[k]||0; }); s.cr=nc; }
    d.i=idx(p.x,p.y); sk.node=d.i; s.x=x0; s.y=y0; s.w=w; s.h=h; t+='  ·  '+(Math.round(w*100)/100)+' × '+(Math.round(h*100)/100)+' mm'; }
  sk.dragTxt=t; skRedraw();
}
function skLiveCr(rr){
  const s=sk.shapes[sk.sel]; if(!s||s.t==='circ')return; if(!sk.crLive){skPush(); sk.crLive=true;}
  const P=s.t==='rect'?skRectP(s):s.v, cl=skIsClosed(s), idxs=(sk.node>=0&&sk.node<P.length)?[sk.node]:P.map((_,i)=>i);
  idxs.forEach(i=>{ if(!cl&&(i===0||i===P.length-1))return; if(rr>0){const c=skCorner(P,i,rr,cl); if(!c||c.bad)return;} if(s.t==='rect'){s.cr=s.cr||[0,0,0,0]; s.cr[i]=rr;} else if(rr>0)s.v[i].cr=rr; else delete s.v[i].cr; });
  skRedraw();
}
function skClear(grp){while(grp.children.length){const c=grp.children.pop(); if(c.geometry)c.geometry.dispose(); if(c.material)c.material.dispose();}}
const skVerts=s=>s.t==='rect'?[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]]:s.t==='circ'?[[s.x,s.y]]:s.v.map(v=>[v.x,v.y]);
function skCurShape(){ // forma en curso (con el cursor como último punto)
  const c=sk.cur, m=sk.mouse; if(!c||!m)return null;
  if(c.t==='path'){
    const v=c.v.map(q=>({...q}));
    if(sk.arcEnd){const e=sk.arcEnd; v[v.length-1].b=skBulge(v[v.length-1],m,e); v.push({x:e.x,y:e.y,b:0});} else v.push({x:m.x,y:m.y,b:0});
    return {t:'path',v,closed:false};
  }
  if(c.t==='rect')return {t:'rect',x:c.x,y:c.y,w:m.x-c.x,h:m.y-c.y};
  if(c.t==='circ')return {t:'circ',x:c.x,y:c.y,r:Math.hypot(m.x-c.x,m.y-c.y)};
  return null;
}
function skRedraw(){
  if(!sk)return; skClear(sk.lines); if(sk.sel<0||!sk.shapes[sk.sel])sk.node=-1;
  sk.shapes.forEach((s,i)=>{
    const isSel=i===sk.sel, dim=sk.sel>=0&&!isSel, cl=skIsClosed(s), pts=skTess(s);
    const col=isSel?0xBFE0FF:cl?0xF5C451:0xff8c6b, op=dim?.5:1;
    if(isSel){
      if(cl){const f=skFill(pts); if(f)sk.lines.add(f);}
      [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].forEach(o=>sk.lines.add(skLine(pts,col,cl,1,o[0],o[1])));
    } else sk.lines.add(skLine(pts,col,cl,op));
    sk.lines.add(skDots(skVerts(s),isSel?0x8db9ff:col,10));
  });
  if(sk.hover&&sk.shapes[sk.hover.si]&&!(sk.hover.si===sk.sel&&sk.hover.i===sk.node)){const q=skVerts(sk.shapes[sk.hover.si])[sk.hover.i]; if(q)sk.lines.add(skDots([q],0x5CF2FF,15));}
  if(sk.node>=0&&sk.shapes[sk.sel]){const q=skVerts(sk.shapes[sk.sel])[sk.node]; if(q)sk.lines.add(skDots([q],0xFF7A1A,16));}
  const p=skCurShape(); if(p){sk.lines.add(skLine(skTess(p),0xffffff,false)); sk.lines.add(skDots(skVerts(p),0xffffff,10));}
  skImgHandles(); skLabel(); skHint();
}
function skLabel(){
  const el=sk.lab; if(sk.drag&&sk.drag.moved&&sk.me){ const r=$('#wrap').getBoundingClientRect(), z=zf(); el.textContent=sk.dragTxt||''; el.hidden=false; el.style.left=((sk.me.x-r.left)/z+14)+'px'; el.style.top=((sk.me.y-r.top)/z+14)+'px'; return; }
  const p=skCurShape(), m=sk.mouse; if(!p||!m||!sk.me){el.hidden=true; return;}
  let t=''; const f=x=>(Math.round(x*100)/100).toString().replace('.',',');
  if(p.t==='rect')t=f(Math.abs(p.w))+' × '+f(Math.abs(p.h))+' mm';
  else if(p.t==='circ')t='R '+f(p.r)+' mm  ·  Ø '+f(p.r*2);
  else {const a=p.v[p.v.length-2]||p.v[0], b=p.v[p.v.length-1]; t='L '+f(Math.hypot(b.x-a.x,b.y-a.y))+' mm  ·  '+f(((Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)+360)%360)+'°';}
  const r=$('#wrap').getBoundingClientRect(), z=zf();
  el.textContent=t; el.hidden=false; el.style.left=((sk.me.x-r.left)/z+14)+'px'; el.style.top=((sk.me.y-r.top)/z+14)+'px';
}
function skPt(e,skip){
  const r=canvas.getBoundingClientRect(); skV2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1); skRay.setFromCamera(skV2,cam);
  const pl=sk.plane==='xz'?new THREE.Plane(new THREE.Vector3(0,1,0),0):new THREE.Plane(new THREE.Vector3(0,0,1),0), hit=new THREE.Vector3();
  if(!skRay.ray.intersectPlane(pl,hit))return null;
  let u=hit.x, v=sk.plane==='xz'?-hit.z:hit.y, snapped=false;
  const all=[]; sk.shapes.forEach((s,si)=>skVerts(s).forEach((q,i)=>{ if(skip&&skip.si===si&&skip.i===i)return; all.push(q); })); if(sk.cur)all.push(...(sk.cur.t==='path'?sk.cur.v.map(q=>[q.x,q.y]):[[sk.cur.x,sk.cur.y]]));
  let best=11, bp=null; const sc=q=>{const w=skW(q[0],q[1]).project(cam); return [r.left+(w.x+1)/2*r.width, r.top+(1-w.y)/2*r.height];};
  for(const q of all){const s=sc(q), d=Math.hypot(s[0]-e.clientX,s[1]-e.clientY); if(d<best){best=d; bp=q;}}
  if(bp){u=bp[0]; v=bp[1]; snapped=true;} else if(sk.snap>0){u=Math.round(u/sk.snap)*sk.snap; v=Math.round(v/sk.snap)*sk.snap;}
  u=+u.toFixed(4); v=+v.toFixed(4); return {x:u,y:v,snapped};
}
function skPush(){sk.hist.push(skClone(sk.shapes)); if(sk.hist.length>50)sk.hist.shift();}
function skAdd(s){skPush(); sk.shapes.push(s); sk.sel=-1; sk.cur=null; sk.arcEnd=null; skRedraw(); skDims();}
function skUndo(){
  if(sk.cur){ if(sk.arcEnd){sk.arcEnd=null;} else if(sk.cur.t==='path'&&sk.cur.v.length>1){sk.cur.v.pop(); if(sk.cur.v.length)sk.cur.v[sk.cur.v.length-1].b=0;} else sk.cur=null; skRedraw(); return; }
  if(!sk.hist.length){msg('No hay nada para deshacer en el boceto.'); return;}
  sk.shapes=sk.hist.pop(); sk.sel=-1; skRedraw(); skDims();
}
function skFinishPath(close,keepB){
  const c=sk.cur; if(!c||c.t!=='path')return;
  const v=c.v; if(v.length<2){sk.cur=null; sk.arcEnd=null; skRedraw(); return;}
  if(!keepB)v[v.length-1].b=0; skAdd({t:'path',v,closed:!!close&&v.length>=3});
}
function skClick(e){
  const p=skPt(e); if(!p)return; sk.mouse=p; const t=sk.tool;
  if(t==='corner'){
    const r=canvas.getBoundingClientRect(), sc=q=>{const w=skW(q[0],q[1]).project(cam); return [r.left+(w.x+1)/2*r.width, r.top+(1-w.y)/2*r.height];};
    let best=16, hit=null;
    sk.shapes.forEach((s,si)=>{
      if(s.t==='circ')return; const P=s.t==='rect'?skRectP(s):s.v, closed=skIsClosed(s);
      P.forEach((q,i)=>{ if(!closed&&(i===0||i===P.length-1))return; const c=sc([q.x,q.y]), d=Math.hypot(c[0]-e.clientX,c[1]-e.clientY); if(d<best){best=d; hit={si,i,s,P,closed};} });
    });
    if(!hit){msg('Tocá cerca de una esquina de una forma (los puntos). Los círculos y los extremos de un trazo abierto no tienen esquinas.'); return;}
    const rr=sk.cr, test=skCorner(hit.P,hit.i,rr>0?rr:1,hit.closed);
    if(test&&test.bad){skWarn('Esa esquina toca un arco: solo se pueden redondear esquinas entre dos tramos rectos.'); return;}
    if(!test){skWarn('Ahí no hay una esquina para redondear (los lados están alineados).'); return;}
    skPush();
    if(hit.s.t==='rect'){hit.s.cr=hit.s.cr||[0,0,0,0]; hit.s.cr[hit.i]=rr;} else if(rr>0)hit.s.v[hit.i].cr=rr; else delete hit.s.v[hit.i].cr;
    sk.sel=hit.si; sk.node=hit.i; skRedraw(); skDims();
    msg(rr>0?('Esquina redondeada con radio '+(Math.round(test.reff*100)/100)+' mm'+(test.clamped?' (el radio era muy grande para ese lado y se achicó)':'')+'.'):'Esquina vuelta recta.');
    return;
  }
  if(t==='sel'){
    const h=skNodeAt(e);
    if(h){ sk.sel=h.si; sk.node=h.i; sk.drag={si:h.si,i:h.i,x0:e.clientX,y0:e.clientY,moved:false}; const sh=sk.shapes[h.si]; if(sh.t==='rect'){const V=skVerts(sh)[(h.i+2)%4]; sk.drag.opp={x:V[0],y:V[1]};} skRedraw(); skDims(); return; }
    let best=1e9, bi=-1; const r=canvas.getBoundingClientRect(), sc=q=>{const w=skW(q[0],q[1]).project(cam); return [r.left+(w.x+1)/2*r.width, r.top+(1-w.y)/2*r.height];};
    sk.shapes.forEach((s,i)=>{const pts=skTess(s).map(sc), n=pts.length, cl=skIsClosed(s);
      for(let k=0;k<(cl?n:n-1);k++){const a=pts[k], b=pts[(k+1)%n], dx=b[0]-a[0], dy=b[1]-a[1], L=dx*dx+dy*dy||1, u=Math.max(0,Math.min(1,((e.clientX-a[0])*dx+(e.clientY-a[1])*dy)/L)), d=Math.hypot(a[0]+u*dx-e.clientX,a[1]+u*dy-e.clientY); if(d<best){best=d; bi=i;}}});
    sk.sel=best<14?bi:-1; sk.node=-1; skRedraw(); skDims(); return;
  }
  if(t==='rect'||t==='circ'){
    if(!sk.cur){sk.cur={t,x:p.x,y:p.y}; skRedraw(); return;}
    const s=skCurShape(); if(!s)return;
    if(s.t==='rect'){const x=Math.min(s.x,s.x+s.w), y=Math.min(s.y,s.y+s.h); if(Math.abs(s.w)<0.01||Math.abs(s.h)<0.01){sk.cur=null; skRedraw(); return;} skAdd({t:'rect',x,y,w:Math.abs(s.w),h:Math.abs(s.h)});}
    else {if(s.r<0.01){sk.cur=null; skRedraw(); return;} skAdd(s);}
    return;
  }
  // línea o arco (polilínea)
  if(!sk.cur){sk.cur={t:'path',v:[{x:p.x,y:p.y,b:0}]}; skRedraw(); return;}
  const v=sk.cur.v, first=v[0], near=v.length>=2&&Math.hypot(p.x-first.x,p.y-first.y)<1e-6;
  if(t==='arc'){
    if(!sk.arcEnd){ if(Math.hypot(p.x-v[v.length-1].x,p.y-v[v.length-1].y)<1e-6)return; sk.arcEnd={x:p.x,y:p.y}; msg('Ahora tocá un punto por donde pasa el arco.'); skRedraw(); return; }
    const E=sk.arcEnd; v[v.length-1].b=skBulge(v[v.length-1],p,E); sk.arcEnd=null;
    if(Math.hypot(E.x-first.x,E.y-first.y)<1e-6&&v.length>=2){skFinishPath(true,true); return;}
    v.push({x:E.x,y:E.y,b:0}); skRedraw(); return;
  }
  if(near&&v.length>=3){skFinishPath(true); return;}
  if(Math.hypot(p.x-v[v.length-1].x,p.y-v[v.length-1].y)<1e-6)return;
  v.push({x:p.x,y:p.y,b:0}); skRedraw();
}
// panel de la forma seleccionada: tarjetas Medidas / Esquinas / Acciones
function skMirror(s){ skPush(); const c=skClone([s])[0]; if(c.t==='rect'){c.x=-(c.x+c.w); if(c.cr)c.cr=[c.cr[1],c.cr[0],c.cr[3],c.cr[2]];} else if(c.t==='circ')c.x=-c.x; else c.v.forEach(q=>{q.x=-q.x; q.b=-(q.b||0);}); sk.shapes.push(c); sk.sel=sk.shapes.length-1; skRedraw(); skDims(); msg('Copia con simetría agregada. Si se superpone con la original, esa zona queda como hueco: separalas o dibujá la mitad de un lado del eje.'); }
function skDims(){
  const box=sk.dimsEl; box.textContent=''; const s=sk.shapes[sk.sel]; box.hidden=!s; skSync(); if(!s)return;
  const card=(t,ic)=>{const c=document.createElement('div'); c.className='skc'; const h=document.createElement('h4'); h.textContent=ic+' '+t; c.appendChild(h); box.appendChild(c); return c;};
  const inp=(get,set,min)=>{const i=document.createElement('input'); i.type='number'; i.step='0.1'; if(min!==undefined)i.min=min; i.value=+get().toFixed(3); i.onchange=()=>{const x=parseFloat(i.value); if(isNaN(x)||(min!==undefined&&x<min)){i.value=+get().toFixed(3); return;} skPush(); set(x); skRedraw();}; return i;};
  const row=(ic,lab,...els)=>{const r=document.createElement('div'); r.className='skf'; const i=document.createElement('i'); i.textContent=ic; r.appendChild(i); r.append(lab+' '); els.forEach(e=>r.append(e)); return r;};
  const nm={rect:'Rectángulo',circ:'Círculo',path:s.closed?'Contorno':'Trazo abierto'}[s.t];
  const m=card('Medidas · '+nm,'▭');
  if(s.t==='rect'){ m.append(row('↔','Ancho',inp(()=>s.w,x=>s.w=x,0.01),' mm'), row('↕','Alto',inp(()=>s.h,x=>s.h=x,0.01),' mm'), row('✥','Posición X',inp(()=>s.x,x=>s.x=x),' Y ',inp(()=>s.y,x=>s.y=x))); }
  else if(s.t==='circ'){ m.append(row('◯','Radio',inp(()=>s.r,x=>s.r=x,0.01),' mm'), row('✥','Centro X',inp(()=>s.x,x=>s.x=x),' Y ',inp(()=>s.y,x=>s.y=x))); }
  else { const lst=document.createElement('div'); lst.className='sklist'; s.v.forEach((q,i)=>lst.appendChild(row('•','Punto '+(i+1)+' · X',inp(()=>q.x,x=>q.x=x),' Y ',inp(()=>q.y,x=>q.y=x)))); m.appendChild(lst); }
  if(s.t!=='circ'){
    const c=card('Esquinas redondeadas','◜');
    const r=document.createElement('input'); r.type='range'; r.min=0; r.max=30; r.step=0.5; r.dataset.cr='r';
    const n=document.createElement('input'); n.type='number'; n.min=0; n.step=0.5; n.dataset.cr='n';
    const sr=document.createElement('div'); sr.className='skf'; sr.append(r,n,' mm'); c.appendChild(sr); skCrBind(c);
    const hint=document.createElement('small'); hint.textContent=(sk.node>=0?'El deslizador cambia solo la esquina seleccionada (nodo naranja).':'El deslizador cambia todas las esquinas de la forma, en vivo. Para una sola, tocá su nodo.')+' O usá estos botones:'; c.appendChild(hint);
    const setAll=(rr)=>{ const P=s.t==='rect'?skRectP(s):s.v, cl=skIsClosed(s); let k=0, skipped=0; skPush();
      P.forEach((q,i)=>{ if(!cl&&(i===0||i===P.length-1))return; const cc=skCorner(P,i,rr>0?rr:1,cl); if(!cc||cc.bad){skipped++; return;} k++; if(s.t==='rect'){s.cr=s.cr||[0,0,0,0]; s.cr[i]=rr;} else if(rr>0)s.v[i].cr=rr; else delete s.v[i].cr; });
      skRedraw(); skDims(); msg(rr>0?(k+' esquina(s) redondeada(s)'+(skipped?'; '+skipped+' no se pudieron (tocan un arco o están alineadas)':'')+'.'):'Esquinas vueltas rectas.'); };
    const ba=document.createElement('button'); ba.type='button'; ba.textContent='◜ Todas redondas'; ba.title='Redondea todas las esquinas rectas con ese radio'; ba.onclick=()=>setAll(sk.cr);
    const bz=document.createElement('button'); bz.type='button'; bz.textContent='◻ Todas rectas'; bz.title='Vuelve rectas todas las esquinas'; bz.onclick=()=>setAll(0);
    const bw=document.createElement('div'); bw.className='skbt'; bw.append(ba,bz); c.appendChild(bw);
  }
  const ac=card('Acciones','⚙');
  if(skIsClosed(s)){ const oi=document.createElement('input'); oi.type='number'; oi.step='0.5'; oi.value=sk.off; oi.onchange=()=>{const x=parseFloat(oi.value); if(isNaN(x)||x===0)oi.value=sk.off; else sk.off=x;}; const rr=row('▣','Distancia de desfase',oi,' mm'); rr.title='Negativo: achica. Positivo: agranda. Después tocá Desfase arriba.'; ac.appendChild(rr); const sm=document.createElement('small'); sm.textContent='Después tocá Desfase en la barra de arriba.'; ac.appendChild(sm); }
  const d=document.createElement('button'); d.type='button'; d.className='skdel'; d.textContent='🗑 Eliminar'; d.onclick=()=>{skPush(); sk.shapes.splice(sk.sel,1); sk.sel=-1; skRedraw(); skDims();}; ac.appendChild(d);
}
async function skOffset(s,d){
  if(!sk||!d)return;
  if(s.t==='circ'){ if(s.r+d<=0.01){skWarn('El desfase es mayor que el círculo: probá con un valor más chico.'); return;} skPush(); sk.shapes.push({t:'circ',x:s.x,y:s.y,r:s.r+d}); sk.sel=sk.shapes.length-1; skRedraw(); skDims(); return; }
  await loadManifold(); if(!MF){skWarn('El desfase necesita el motor de formas, que no cargó. Recargá la página o usá la versión de GitHub Pages.'); return;}
  const cs=new MF.CrossSection([skTess(s)],'EvenOdd'); let o;
  try{
    o=cs.offset(d,'Round',2,48); const polys=o.toPolygons().filter(q=>q.length>=3);
    if(!polys.length){skWarn('El desfase es mayor que la forma: probá con un valor más chico.'); return;}
    skPush(); polys.forEach(q=>sk.shapes.push({t:'path',v:q.map(v=>({x:v[0],y:v[1],b:0})),closed:true})); sk.sel=sk.shapes.length-1; skRedraw(); skDims();
    msg('Contorno desfasado agregado ('+(d>0?'+':'')+d+' mm). Si queda dentro del original, al extruir es un hueco.');
  }catch(e){console.error(e); skWarn('No se pudo desfasar esta forma.');}
  finally{cs.delete(); if(o)o.delete();}
}
function skHelpers(){
  skClear(sk.help); const gold=0xF5C451;
  if(sk.plane==='xy'){
    const g=new THREE.GridHelper(240,24,gold,gold); g.rotation.x=Math.PI/2; g.position.y=120; g.material.transparent=true; g.material.opacity=0.22; g.material.depthWrite=false; sk.help.add(g);
    const ax=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0.05),new THREE.Vector3(0,240,0.05)]),new THREE.LineBasicMaterial({color:0xff8c6b,depthTest:false})); ax.renderOrder=19; sk.help.add(ax);
  } else {
    const mk=(a,b)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:gold,transparent:true,opacity:.5,depthTest:false})); l.renderOrder=19; return l;};
    sk.help.add(mk(new THREE.Vector3(-200,0.05,0),new THREE.Vector3(200,0.05,0)),mk(new THREE.Vector3(0,0.05,-200),new THREE.Vector3(0,0.05,200)));
  }
}
function skView(){
  const hf=THREE.MathUtils.degToRad(camP.fov)/2, xz=sk.plane==='xz', t1=new THREE.Vector3(0,xz?0:60,0), dist=130/Math.tan(hf), dir=xz?new THREE.Vector3(0,1,0.0001).normalize():new THREE.Vector3(0,0,1);
  cam.far=Math.max(ortho?4000:1000,dist*10); if(ortho){cam.near=-dist*10; cam.zoom=(ORTH_H/2)/130;} cam.updateProjectionMatrix();
  camAnim={p0:cam.position.clone(),t0:orbit.target.clone(),p1:t1.clone().addScaledVector(dir,dist),t1,s:performance.now()};
}
function skSetPlane(pl){
  if(!sk||sk.plane===pl)return; sk.plane=pl; sk.cur=null; sk.arcEnd=null; sk.sel=-1; skImgPlace(); skHelpers(); skRedraw(); skDims(); skView(); skSync();
  msg(pl==='xy'?'Plano Frente: dibujá el perfil a la derecha del eje rojo y usá Revolucionar para girarlo.':'Plano Planta: dibujá sobre la cama y usá Extruir para darle altura.');
}
function skSync(){
  if(!sk)return; sk.bar.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===sk.tool));
  sk.bar.querySelectorAll('[data-pl]').forEach(b=>b.classList.toggle('on',b.dataset.pl===sk.plane));
  sk.revBtn.disabled=sk.plane!=='xy'; sk.degIn.disabled=sk.plane!=='xy'; sk.revBox.style.opacity=sk.plane==='xy'?1:.45;
  const q=sk.shapes[sk.sel]; sk.bar.querySelector('#skoffb').disabled=!(q&&skIsClosed(q)); sk.bar.querySelector('#skmirb').disabled=!q;
  sk.bar.querySelector('#skctx').hidden=sk.tool!=='corner'; const wp=$('#wrap'); wp.classList.toggle('sksel',sk.tool==='sel'); wp.classList.toggle('skcor',sk.tool==='corner');
}
function skSetCr(x,from){ sk.cr=x; sk.bar.querySelectorAll('[data-cr]').forEach(i=>{ if(i!==from)i.value=x; }); }
function skCrBind(root){ root.querySelectorAll('[data-cr]').forEach(i=>{ i.value=sk.cr; i.oninput=()=>{const x=parseFloat(i.value); if(!(x>=0))return; skSetCr(x,i); skLiveCr(x);}; i.onchange=()=>{const x=parseFloat(i.value); if(!(x>=0)){i.value=sk.cr; return;} if(sk.crLive){sk.crLive=false; skDims();}}; }); }
function skWarn(t){ msg(t); let w=$('#skwarn'); if(!w){w=document.createElement('div'); w.id='skwarn'; $('#wrap').appendChild(w);} w.textContent=t; w.hidden=false; clearTimeout(skWarn.t); skWarn.t=setTimeout(()=>{w.hidden=true;},4500); }
async function skFinish(mode){
  if(!sk)return; if(sk.cur&&sk.cur.t==='path')skFinishPath(false);
  if(sk.cur&&(sk.cur.t==='rect'||sk.cur.t==='circ')&&sk.mouse){ const q=skCurShape(); if(q.t==='rect'&&Math.abs(q.w)>=0.01&&Math.abs(q.h)>=0.01)skAdd({t:'rect',x:Math.min(q.x,q.x+q.w),y:Math.min(q.y,q.y+q.h),w:Math.abs(q.w),h:Math.abs(q.h)}); else if(q.t==='circ'&&q.r>=0.01)skAdd(q); else {sk.cur=null; skRedraw();} }
  if(mode==='revolve'&&sk.plane!=='xy'){skWarn('Para Revolucionar cambiá al plano Frente.'); return;}
  sk.shapes.forEach(s=>{ if(s.t==='path'&&!s.closed&&s.v.length>=3)s.closed=true; });
  const params={plane:sk.plane,shapes:skClone(sk.shapes),mode,h:Math.max(0.1,sk.h),deg:Math.min(360,Math.max(1,sk.deg))};
  if(!skPolys(params.shapes).length){skWarn('Primero dibujá una forma cerrada: rectángulo o círculo (arrastrá, o tocá dos veces), o una línea que vuelva a tocar su primer punto.'); return;}
  const open=sk.shapes.filter(s=>!skIsClosed(s)&&!(s.t==='path'&&s.v.length>=3)).length, edit=sk.edit;
  if(edit){skExit(); await fxEdit(edit,0,params); return;}
  await busyOn('Creando la forma…');
  try{
    await loadManifold();
    const r=sketchBuild(params); if(r.err){skWarn(r.err); return;}
    const m=addMesh(r.geo,undefined,newName('Boceto')); m.position.setFromMatrixPosition(r.W);
    m.updateMatrix(); m.userData.fx={id:++fxId,k:'sketch',params,items:[],res0:m.matrix.toArray()};
    skExit(); select([m]); updateDims(); commit();
    msg((mode==='revolve'?'Forma revolucionada':'Forma extruida')+(open?' (los trazos abiertos se ignoraron)':'')+'. Podés cambiar los valores o volver a editar el boceto desde el Historial.');
  }catch(err){console.error(err); skWarn('No se pudo crear la forma: '+((err&&err.message)||err));}
  finally{busyOff();}
}
function skExit(){
  if(!sk)return; const s=sk; sk=null;
  if(s.img){s.img.tex.dispose(); s.img.mesh.material.dispose(); s.img.mesh.geometry.dispose();}
  scene.remove(s.g); skClear(s.lines); skClear(s.help); s.bar.remove(); s.lab.remove();
  orbit.enableRotate=true; tc.enabled=!scaleUI; $('#wrap').classList.remove('sketching','sksel','skcor'); $('#skbtn').classList.remove('on'); fxShown=''; updateDims();
}

// ===== Calcar una imagen en el Sketch (fondo + contorno automático) =====
function skRawPt(e){
  const r=canvas.getBoundingClientRect(); skV2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1); skRay.setFromCamera(skV2,cam);
  const pl=sk.plane==='xz'?new THREE.Plane(new THREE.Vector3(0,1,0),0):new THREE.Plane(new THREE.Vector3(0,0,1),0), hit=new THREE.Vector3();
  if(!skRay.ray.intersectPlane(pl,hit))return null; return {x:hit.x,y:sk.plane==='xz'?-hit.z:hit.y};
}
function skImgPlace(){
  const I=sk&&sk.img; if(!I)return; const m=I.mesh; m.scale.set(I.w,I.w/I.asp,1);
  if(sk.plane==='xz'){m.rotation.set(-Math.PI/2,0,0); m.position.set(I.x,0.02,-I.y);} else {m.rotation.set(0,0,0); m.position.set(I.x,I.y,0.02);}
  m.material.opacity=I.op;
}
function skImgSync(){
  const I=sk.img, b=sk.bar; if(!I)return; skImgPlace();
  const set=(q,v)=>{const el=b.querySelector(q); if(document.activeElement!==el)el.value=v;};
  set('#skiw',+I.w.toFixed(2)); set('#skix',+I.x.toFixed(2)); set('#skiy',+I.y.toFixed(2)); set('#skio',Math.round(I.op*100));
  b.querySelector('#skimv').textContent=I.edit?'✔ Listo (bloquear imagen)':'✥ Mover imagen'; b.querySelector('#skimv').classList.toggle('pri',I.edit);
}
function skImgHandles(){
  const I=sk.img; if(!I||!I.edit)return; const h=I.w/I.asp, cs=[[I.x-I.w/2,I.y-h/2],[I.x+I.w/2,I.y-h/2],[I.x+I.w/2,I.y+h/2],[I.x-I.w/2,I.y+h/2]];
  sk.lines.add(skLine(cs,0xffffff,true,.9)); sk.lines.add(skDots(cs,0xffffff,13));
}
function skImgDown(e){
  const I=sk.img; if(!I||!I.edit)return false; const p=skRawPt(e); if(!p)return true;
  const h=I.w/I.asp, cs=[[I.x-I.w/2,I.y-h/2],[I.x+I.w/2,I.y-h/2],[I.x+I.w/2,I.y+h/2],[I.x-I.w/2,I.y+h/2]], r=canvas.getBoundingClientRect();
  let best=18, ci=-1; cs.forEach((q,i)=>{const w=skW(q[0],q[1]).project(cam), d=Math.hypot(r.left+(w.x+1)/2*r.width-e.clientX,r.top+(1-w.y)/2*r.height-e.clientY); if(d<best){best=d; ci=i;}});
  if(ci>=0)I.drag={k:'scale',d0:Math.hypot(cs[ci][0]-I.x,cs[ci][1]-I.y),w0:I.w};
  else if(Math.abs(p.x-I.x)<=I.w/2&&Math.abs(p.y-I.y)<=h/2)I.drag={k:'move',dx:p.x-I.x,dy:p.y-I.y};
  return true;
}
addEventListener('pointermove',e=>{
  const I=sk&&sk.img; if(!I||!I.drag)return; const p=skRawPt(e); if(!p)return;
  if(I.drag.k==='move'){I.x=p.x-I.drag.dx; I.y=p.y-I.drag.dy;} else I.w=Math.max(2,I.drag.w0*Math.hypot(p.x-I.x,p.y-I.y)/I.drag.d0);
  skImgSync(); skRedraw();
},true);
addEventListener('pointerup',()=>{ if(sk&&sk.img)sk.img.drag=null; },true);
function skImgRemove(){ const I=sk.img; if(!I)return; I.tex.dispose(); I.mesh.material.dispose(); I.mesh.geometry.dispose(); sk.g.remove(I.mesh); sk.img=null; const b=sk.bar; b.querySelector('#skiopts').hidden=true; b.querySelector('#skirm').hidden=true; b.querySelector('#skiload').textContent='🖼 Cargar imagen'; skRedraw(); }
function skImgLoad(file){
  const url=URL.createObjectURL(file), im=new Image();
  im.onerror=()=>{URL.revokeObjectURL(url); msg('No se pudo abrir esa imagen. Probá con JPG, PNG o WebP.');};
  im.onload=()=>{
    URL.revokeObjectURL(url); if(!sk)return;
    const k=Math.min(1,1024/Math.max(im.width,im.height)), W=Math.max(1,Math.round(im.width*k)), H=Math.max(1,Math.round(im.height*k));
    const disp=document.createElement('canvas'); disp.width=W; disp.height=H; disp.getContext('2d').drawImage(im,0,0,W,H);
    const ana=document.createElement('canvas'); ana.width=W; ana.height=H; const ag=ana.getContext('2d'); ag.fillStyle='#fff'; ag.fillRect(0,0,W,H); ag.drawImage(im,0,0,W,H);
    if(sk.img)skImgRemove();
    const tex=new THREE.CanvasTexture(disp); tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.5,depthTest:false,depthWrite:false,side:THREE.DoubleSide})); mesh.renderOrder=2; mesh.raycast=()=>{}; sk.g.add(mesh);
    const asp=W/H, w=Math.min(100,Math.max(20,200/Math.max(1,asp>1?1:1/asp)*0.5));
    sk.img={mesh,tex,cv:ana,asp,w,x:0,y:sk.plane==='xy'?w/asp/2:0,op:.5,edit:true,drag:null};
    const b=sk.bar; b.querySelector('#skiopts').hidden=false; b.querySelector('#skirm').hidden=false; b.querySelector('#skiload').textContent='🖼 Cambiar imagen';
    skImgSync(); skRedraw();
    msg('Imagen cargada: arrastrala para moverla y usá los puntos blancos de las esquinas para agrandarla o achicarla. Poné el ancho real en mm y tocá Listo.');
  };
  im.src=url;
}
function skRdp(P,tol){
  if(P.length<3)return P; const keep=new Uint8Array(P.length); keep[0]=keep[P.length-1]=1; const st=[[0,P.length-1]];
  while(st.length){const [a,b]=st.pop(); let md=0,mi=-1; const ax=P[a][0],ay=P[a][1],dx=P[b][0]-ax,dy=P[b][1]-ay,L=Math.hypot(dx,dy)||1e-9;
    for(let i=a+1;i<b;i++){const d=Math.abs((P[i][0]-ax)*dy-(P[i][1]-ay)*dx)/L; if(d>md){md=d; mi=i;}}
    if(md>tol&&mi>0){keep[mi]=1; st.push([a,mi],[mi,b]);}}
  return P.filter((_,i)=>keep[i]);
}
function skRdpClosed(P,tol){
  let k=0,md=-1; for(let i=1;i<P.length;i++){const d=Math.hypot(P[i][0]-P[0][0],P[i][1]-P[0][1]); if(d>md){md=d; k=i;}}
  const A=skRdp(P.slice(0,k+1),tol), B=skRdp(P.slice(k).concat([P[0]]),tol); return A.concat(B.slice(1,-1));
}
function skImgContour(){
  const I=sk.img; if(!I)return; const cv=I.cv, w0=cv.width, h0=cv.height, W=w0+2, H=h0+2, d=cv.getContext('2d').getImageData(0,0,w0,h0).data, b=sk.bar;
  const thr=parseFloat(b.querySelector('#skith').value)/100, inv=b.querySelector('#skiinv').checked, det=parseFloat(b.querySelector('#skidt').value)/100;
  let G=new Float32Array(W*H).fill(1);
  for(let y=0;y<h0;y++)for(let x=0;x<w0;x++){const i=(y*w0+x)*4, g=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255; G[(y+1)*W+x+1]=inv?1-g:g;}
  for(let pass=0;pass<2;pass++){ const G2=new Float32Array(W*H).fill(1); for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){let t=0; for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)t+=G[(y+j)*W+x+i]; G2[y*W+x]=t/9;} G=G2; }
  const val=(x,y)=>G[y*W+x], pos=new Map(), segs=[], tt=(a,c)=>{const dn=c-a; return Math.abs(dn)<1e-9?.5:Math.max(0,Math.min(1,(thr-a)/dn));};
  const eH=(x,y)=>{const k=(y*W+x)*2; if(!pos.has(k))pos.set(k,[x+tt(val(x,y),val(x+1,y)),y]); return k;}, eV=(x,y)=>{const k=(y*W+x)*2+1; if(!pos.has(k))pos.set(k,[x,y+tt(val(x,y),val(x,y+1))]); return k;};
  for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){
    const c=(val(x,y)<thr?8:0)|(val(x+1,y)<thr?4:0)|(val(x+1,y+1)<thr?2:0)|(val(x,y+1)<thr?1:0); if(c===0||c===15)continue;
    const T=()=>eH(x,y), B=()=>eH(x,y+1), L=()=>eV(x,y), R=()=>eV(x+1,y);
    switch(c){case 1:case 14:segs.push([L(),B()]); break; case 2:case 13:segs.push([B(),R()]); break; case 3:case 12:segs.push([L(),R()]); break; case 4:case 11:segs.push([T(),R()]); break;
      case 5:segs.push([T(),R()],[L(),B()]); break; case 6:case 9:segs.push([T(),B()]); break; case 7:case 8:segs.push([T(),L()]); break; case 10:segs.push([T(),L()],[B(),R()]); break;}
  }
  const adj=new Map(); segs.forEach((sg,i)=>sg.forEach(e=>{if(!adj.has(e))adj.set(e,[]); adj.get(e).push(i);}));
  const used=new Uint8Array(segs.length), loops=[];
  for(let i=0;i<segs.length;i++){
    if(used[i])continue; const loop=[pos.get(segs[i][0])]; let cur=i, to=segs[i][1];
    for(;;){used[cur]=1; loop.push(pos.get(to)); const nx=adj.get(to).find(j=>j!==cur&&!used[j]); if(nx===undefined)break; cur=nx; const sg=segs[cur]; to=sg[0]===to?sg[1]:sg[0];}
    loop.pop(); loops.push(loop);
  }
  const hmm=I.w/I.asp, tolPx=(I.w*(0.001+(1-det)*0.008))/(I.w/w0), minA=0.0003*w0*h0;
  const area=P=>{let a=0; for(let i=0;i<P.length;i++){const q=P[(i+1)%P.length]; a+=P[i][0]*q[1]-q[0]*P[i][1];} return Math.abs(a)/2;};
  const out=loops.map(P=>({P,a:area(P)})).filter(o=>o.P.length>=4&&o.a>=minA).sort((a,c)=>c.a-a.a).slice(0,60).map(o=>{
    let tol=tolPx, R=skRdpClosed(o.P,tol); while(R.length>400){tol*=1.4; R=skRdpClosed(o.P,tol);} return R;
  }).filter(R=>R.length>=3);
  if(!out.length){msg('No se encontró ninguna forma. Probá mover el umbral o tocar «Invertir».'); return;}
  skPush();
  out.forEach(R=>sk.shapes.push({t:'path',closed:true,v:R.map(([px,py])=>({x:+(I.x+((px-1+0.5)/w0-0.5)*I.w).toFixed(3),y:+(I.y-((py-1+0.5)/h0-0.5)*hmm).toFixed(3),b:0}))}));
  sk.sel=-1; sk.cur=null; skRedraw(); skDims();
  msg('Contorno creado: '+out.length+(out.length===1?' forma':' formas')+'. Si no te gusta, Ctrl+Z y probá otro umbral o detalle. Una forma dentro de otra queda como hueco.');
}
function skImgInit(){
  const b=sk.bar, q=s=>b.querySelector(s); sk.img=null;
  q('#skibtn').onclick=()=>{const p=q('#skimg'); p.hidden=!p.hidden; q('#skibtn').classList.toggle('on',!p.hidden);};
  q('#skiload').onclick=()=>q('#skifile').click();
  q('#skifile').onchange=e=>{const f=e.target.files[0]; e.target.value=''; if(f)skImgLoad(f);};
  q('#skirm').onclick=()=>{skImgRemove(); msg('Imagen quitada.');};
  q('#skimv').onclick=()=>{const I=sk.img; if(!I)return; I.edit=!I.edit; skImgSync(); skRedraw(); msg(I.edit?'Mové la imagen arrastrándola y escalala con los puntos blancos. Tocá Listo para bloquearla y dibujar.':'Imagen bloqueada: ya podés dibujar encima.');};
  const num=(id,fn)=>q(id).addEventListener('input',e=>{const v=parseFloat(e.target.value); if(sk.img&&!isNaN(v)){fn(sk.img,v); skImgPlace(); skRedraw();}});
  num('#skiw',(I,v)=>{if(v>=1)I.w=v;}); num('#skix',(I,v)=>{I.x=v;}); num('#skiy',(I,v)=>{I.y=v;}); num('#skio',(I,v)=>{I.op=Math.max(.1,Math.min(1,v/100));});
  q('#skiauto').onclick=skImgContour;
}
function skStart(o={}){
  if(sk)return; if(typeof splitting!=='undefined'&&splitting)endSplit();
  select([]); tc.enabled=false; orbit.enableRotate=false; down=null; $('#skbtn').classList.add('on');
  const IC={path:'<path d="M4 20L20 4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/>',arc:'<path d="M4 18A12 12 0 0 1 20 18"/>',rect:'<rect x="4" y="6" width="16" height="12"/>',circ:'<circle cx="12" cy="12" r="8"/>',corner:'<path d="M5 20V10a5 5 0 0 1 5-5h10"/>',off:'<rect x="3.5" y="3.5" width="17" height="17"/><rect x="8" y="8" width="8" height="8"/>',mir:'<path d="M12 3v18" stroke-dasharray="3 2"/><path d="M9 7L4 12l5 5zM15 7l5 5-5 5z"/>',sel:'<path d="M5 3l14 8-6 2-2 6z"/>',xz:'<path d="M3 15l9-5 9 5-9 5z"/>',xy:'<rect x="5" y="4" width="14" height="14"/>',img:'<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>'};
  const tb=(k,l,attr,t)=>'<button type="button" class="skt" '+attr+' title="'+t+'"><svg viewBox="0 0 24 24">'+IC[k]+'</svg><span>'+l+'</span></button>';
  const bar=document.createElement('div'); bar.id='skbar'; bar.innerHTML=
    '<div class="skhd" title="Arrastrá para mover el panel"><span>⠿ Sketch</span><small>arrastrá para mover</small><button type="button" id="skmin" title="Achicar o agrandar el panel">–</button></div>'+
    '<div class="skhint" id="skhint"></div>'+
    '<div class="skr skmain">'+
    '<div class="skgp"><small>Dibujar</small><span class="skg">'+tb('path','Línea','data-t="path"','Línea: tocá los puntos')+tb('arc','Arco','data-t="arc"','Arco: inicio, final y un punto por donde pasa')+tb('rect','Rectángulo','data-t="rect"','Rectángulo: arrastrá o tocá dos esquinas')+tb('circ','Círculo','data-t="circ"','Círculo: centro y un punto del borde')+'</span></div>'+
    '<div class="skgp"><small>Modificar</small><span class="skg">'+tb('corner','Empalme','data-t="corner"','Empalme: redondear una esquina')+tb('off','Desfase','id="skoffb"','Desfase: agrega un contorno paralelo a la forma seleccionada')+tb('mir','Simetría','id="skmirb"','Simetría: copia espejada de la forma seleccionada')+'</span></div>'+
    '<div class="skgp"><small>Elegir</small><span class="skg">'+tb('sel','Seleccionar','data-t="sel"','Seleccionar una forma para cambiar sus medidas')+'</span></div>'+
    '<div class="skgp"><small>Plano</small><span class="skg">'+tb('xz','Planta','data-pl="xz"','Dibujar sobre la cama')+tb('xy','Frente','data-pl="xy"','Dibujar en vertical, para revolucionar')+'</span></div>'+
    '<div class="skgp"><small>Imagen</small><span class="skg">'+tb('img','Calcar','id="skibtn"','Calcar una imagen: ponela de fondo y dibujá encima')+'</span></div>'+
    '<div class="skgp"><small>Imán</small><select id="skiman" title="De a cuánto se mueven los puntos"><option value="0">libre</option><option value="0.5">0,5 mm</option><option value="1" selected>1 mm</option><option value="5">5 mm</option><option value="10">10 mm</option></select></div></div>'+
    '<div class="skr skctx" id="skctx" hidden><b>Radio del empalme</b><input type="range" data-cr="r" min="0" max="30" step="0.5"><input type="number" data-cr="n" min="0" step="0.5"> mm<span>Tocá una esquina del dibujo para redondearla</span></div>'+
    '<div class="skr skimg" id="skimg" hidden><b>Imagen de fondo</b><div class="skir"><button type="button" id="skiload">🖼 Cargar imagen</button><input type="file" id="skifile" accept="image/*" hidden><button type="button" id="skirm" hidden>Quitar imagen</button></div><div id="skiopts" hidden><label>Ancho real <span><input id="skiw" type="number" min="1" step="1"> mm</span></label><label>Posición X <span><input id="skix" type="number" step="1"> Y <input id="skiy" type="number" step="1"></span></label><label>Transparencia <input id="skio" type="range" min="10" max="100" value="50"></label><button type="button" id="skimv">✥ Mover imagen</button><div class="skic"><b>Contorno automático</b><label>Umbral (claro/oscuro) <input id="skith" type="range" min="5" max="95" value="50"></label><label>Detalle <input id="skidt" type="range" min="0" max="100" value="40"></label><label>Invertir (forma clara sobre fondo oscuro) <input id="skiinv" type="checkbox"></label><button type="button" id="skiauto" class="pri">✨ Crear contorno</button></div></div></div>'+
    '<div class="skr skd" id="skdims" hidden></div>'+
    '<div class="skfin"><div class="skft"><b>ÚLTIMO PASO</b><span>Cuando termines de dibujar,<br>dale volumen a tu dibujo</span></div>'+
    '<label>Altura <input id="skh" type="number" min="0.1" step="0.5"> mm</label><button type="button" id="skext" class="pri big" title="Convertir el dibujo en una pieza 3D">⬆ Extruir</button>'+
    '<span class="skor">o girarlo:</span><span class="skg2" id="skrevbox"><label>Giro <input id="skdeg" type="number" min="1" max="360" step="5"> °</label><button type="button" id="skrev" title="Girar el dibujo alrededor del eje (plano Frente)">↻ Revolución</button></span>'+
    '<button type="button" id="skcancel">Cancelar</button></div>';
  const lab=document.createElement('div'); lab.id='skdim'; lab.hidden=true; $('#wrap').appendChild(lab); $('#wrap').appendChild(bar); $('#wrap').classList.add('sketching');
  const g=new THREE.Group(), lines=new THREE.Group(), help=new THREE.Group(); g.add(help,lines); scene.add(g);
  sk={plane:o.plane||'xz',shapes:o.shapes?skClone(o.shapes):[],tool:o.shapes&&o.shapes.length?'sel':'path',cur:null,arcEnd:null,sel:-1,snap:1,cr:3,mouse:null,me:null,hist:[],edit:o.piece||null,off:-2,h:o.h||10,deg:o.deg||360,g,lines,help,bar,lab,
    dimsEl:bar.querySelector('#skdims'),revBtn:bar.querySelector('#skrev'),degIn:bar.querySelector('#skdeg'),revBox:bar.querySelector('#skrevbox')};
  bar.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const keep=['path','arc'].includes(sk.tool)&&['path','arc'].includes(b.dataset.t)&&sk.cur&&sk.cur.t==='path'; sk.tool=b.dataset.t; if(!keep)sk.cur=null; sk.arcEnd=null; skRedraw(); skSync(); msg({path:'Línea: tocá los puntos; tocá el primero para cerrar, o doble toque / Enter para terminar abierta.',arc:'Arco: tocá el inicio, después el final y por último un punto por donde pasa el arco.',rect:'Rectángulo: tocá una esquina y la opuesta.',circ:'Círculo: tocá el centro y después un punto del borde.',corner:'Empalme: poné el radio y tocá una esquina recta para redondearla. Para cambiarla, tocala de nuevo con otro radio (0 la vuelve recta).',sel:'Seleccionar: tocá una forma para cambiar sus medidas o borrarla.'}[sk.tool]);});
  bar.querySelectorAll('[data-pl]').forEach(b=>b.onclick=()=>skSetPlane(b.dataset.pl));
  bar.querySelector('#skiman').onchange=e=>sk.snap=parseFloat(e.target.value);
  { const hd=bar.querySelector('.skhd'), wr=$('#wrap'); let pos=null; try{pos=JSON.parse(localStorage.getItem('c3d_skpos')||'null');}catch(e){}
    const place=(l,t)=>{ const mw=wr.clientWidth-bar.offsetWidth, mh=wr.clientHeight-bar.offsetHeight; l=Math.max(0,Math.min(mw,l)); t=Math.max(0,Math.min(mh,t)); bar.style.left=l+'px'; bar.style.top=t+'px'; bar.style.right='auto'; bar.style.bottom='auto'; bar.style.transform='none'; return [l,t]; };
    if(pos&&matchMedia('(min-width:761px) and (pointer:fine)').matches)requestAnimationFrame(()=>{ if(sk&&sk.bar===bar)place(pos[0],pos[1]); });
    hd.onpointerdown=e=>{ if(e.target.closest('button')||e.button!==0)return; e.preventDefault(); e.stopPropagation(); const z=zf(), sx=e.clientX, sy=e.clientY, l0=bar.offsetLeft, t0=bar.offsetTop; hd.setPointerCapture(e.pointerId); bar.classList.add('drag');
      hd.onpointermove=ev=>{ pos=place(l0+(ev.clientX-sx)/z, t0+(ev.clientY-sy)/z); };
      hd.onpointerup=ev=>{ hd.onpointermove=null; hd.onpointerup=null; bar.classList.remove('drag'); try{localStorage.setItem('c3d_skpos',JSON.stringify(pos));}catch(e2){} }; };
    bar.querySelector('#skmin').onclick=()=>{ const m=bar.classList.toggle('min'); bar.querySelector('#skmin').textContent=m?'+':'–'; }; }
  skCrBind(bar); bar.querySelector('#skoffb').onclick=()=>{const q=sk.shapes[sk.sel]; if(q&&skIsClosed(q))skOffset(q,sk.off);}; bar.querySelector('#skmirb').onclick=()=>{const q=sk.shapes[sk.sel]; if(q)skMirror(q);};
  bar.querySelector('#skh').value=sk.h; bar.querySelector('#skh').onchange=e=>{const x=parseFloat(e.target.value); if(x>0)sk.h=x; else e.target.value=sk.h;};
  sk.degIn.value=sk.deg; sk.degIn.onchange=e=>{const x=parseFloat(e.target.value); if(x>=1&&x<=360)sk.deg=x; else e.target.value=sk.deg;};
  bar.querySelector('#skext').onclick=()=>skFinish('extrude'); sk.revBtn.onclick=()=>skFinish('revolve'); bar.querySelector('#skcancel').onclick=()=>{skExit(); msg('Sketch cancelado.');};
  skImgInit(); skHelpers(); skRedraw(); skSync(); skView();
  msg(o.piece?'Editando el boceto: cambiá las formas y tocá Extruir o Revolucionar para aplicar.':'Sketch: dibujá con Línea, Arco, Rectángulo o Círculo. Una forma dentro de otra queda como hueco.');
}
canvas.addEventListener('pointerdown',e=>{ if(!sk||e.button!==0)return; e.stopImmediatePropagation(); e.preventDefault(); down=null; if(skImgDown(e))return; const had=!!sk.cur; skClick(e); sk.dn=(!had&&sk.cur&&(sk.cur.t==='rect'||sk.cur.t==='circ'))?{x:e.clientX,y:e.clientY}:null; },true);
addEventListener('pointerup',e=>{ if(!sk||!sk.dn)return; const d=sk.dn; sk.dn=null; if(e.button!==0||!sk.cur||Math.hypot(e.clientX-d.x,e.clientY-d.y)<8)return; skClick(e); });
canvas.addEventListener('pointermove',e=>{ if(!sk)return; sk.me={x:e.clientX,y:e.clientY}; if(sk.drag){skDragMove(e); return;} const p=skPt(e); if(!p)return; sk.mouse=p;
  if(sk.tool==='sel'||sk.tool==='corner'){ const h=skNodeAt(e,sk.tool==='corner'), k=h?h.si+':'+h.i:''; if(k!==sk.hk){sk.hk=k; sk.hover=h; skRedraw();} if(sk.tool==='sel')canvas.style.cursor=h?'move':''; }
  if(sk.cur)skRedraw(); else sk.lab.hidden=true; });
addEventListener('pointerup',e=>{ if(!sk||!sk.drag)return; const d=sk.drag; sk.drag=null; sk.lab.hidden=true; if(d.moved){ skRedraw(); skDims(); msg('Nodo movido.'); } });
canvas.addEventListener('dblclick',e=>{ if(sk&&sk.cur&&sk.cur.t==='path'){e.preventDefault(); const v=sk.cur.v; if(v.length>=2&&Math.hypot(v[v.length-1].x-v[v.length-2].x,v[v.length-1].y-v[v.length-2].y)<1e-6)v.pop(); skFinishPath(false);} });
addEventListener('keydown',e=>{
  if(!sk)return; const inp=e.target&&e.target.closest&&e.target.closest('input,select,textarea'); if(inp)return;
  if(e.key==='Escape'){e.stopImmediatePropagation(); e.preventDefault(); if(sk.cur){sk.cur=null; sk.arcEnd=null; skRedraw();} else if(sk.sel>=0){sk.sel=-1; skRedraw(); skDims();} else {skExit(); msg('Sketch cancelado.');} return;}
  if(e.key==='Enter'){e.stopImmediatePropagation(); e.preventDefault(); if(sk.cur&&sk.cur.t==='path')skFinishPath(false); return;}
  if((e.key==='Delete'||e.key==='Backspace')&&sk.sel>=0){e.stopImmediatePropagation(); e.preventDefault(); skPush(); sk.shapes.splice(sk.sel,1); sk.sel=-1; skRedraw(); skDims(); return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.stopImmediatePropagation(); e.preventDefault(); skUndo(); return;}
  if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1)e.stopImmediatePropagation();
},true);
(function(){const b=document.createElement('button'); b.id='skbtn'; b.type='button'; b.title='Sketch 2D: dibujar un perfil y extruirlo o revolucionarlo';
  b.innerHTML='<svg viewBox="0 0 24 24"><path class="f a" d="M4 17V9l5-4h6l5 4v8l-5 3H9z"/><path class="d" d="M4 9l5 4h6l5-4M9 13v7M15 13v7"/></svg>Sketch';
  b.onclick=()=>{ if(sk){skExit(); return;} skStart(); };
  const h=document.createElement('div'); h.hidden=true; h.appendChild(b); document.body.appendChild(h);})();
