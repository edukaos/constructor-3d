'use strict';
// Constructor 3D: tornillos y tuercas con rosca métrica real (ISO, paso grueso), paramétricos.
// La rosca se arma como una superficie r(ángulo, altura) con perfil trapezoidal de 60°, así la malla
// sale cerrada sin operaciones booleanas. La tuerca roscada usa el mismo perfil más una holgura.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

// [paso, cabeza hexagonal: ancho entre caras, alto de cabeza]
const METRIC={M2:[0.4,4,1.4],M3:[0.5,5.5,2],M4:[0.7,7,2.8],M5:[0.8,8,3.5],M6:[1,10,4],M8:[1.25,13,5.3],M10:[1.5,16,6.4],M12:[1.75,18,7.5],M16:[2,24,10],M20:[2.5,30,12.5]};
const thD=th=>parseFloat(String(th).slice(1));

// Perfil ISO dentro de un paso (fase 0..1): cresta plana P/8, flanco 5P/16, fondo plano P/4, flanco 5P/16. 1 = cresta, 0 = fondo.
function thProfile(f){
  f=((f%1)+1)%1;
  if(f<1/16||f>=15/16)return 1;
  if(f<6/16)return 1-(f-1/16)/(5/16);
  if(f<10/16)return 0;
  return (f-10/16)/(5/16);
}
const hexR=(af,a)=>{const s=Math.PI/3, t=((a%s)+s)%s-s/2; return af/2/Math.cos(t);};   // radio del hexágono (esquinas en 0°, 60°…)

// Malla cerrada a partir de anillos: cada anillo es {y, r:(a)=>radio}. Pared exterior; si hay rIn, es un tubo.
function ringSolid(rings,seg,inner){
  const P=[], T=[], n=rings.length, ring=(list,k)=>{const out=[]; for(const R of list){const row=[]; for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2, r=R.r(a); row.push(P.length/3); P.push(r*Math.cos(a),R.y,-r*Math.sin(a));} out.push(row);} return out;};
  const O=ring(rings), I=inner?ring(inner):null;
  const wall=(G,flip)=>{for(let j=0;j<G.length-1;j++)for(let i=0;i<seg;i++){const a=G[j][i],b=G[j][(i+1)%seg],c=G[j+1][(i+1)%seg],d=G[j+1][i]; if(!flip)T.push(a,b,c,a,c,d); else T.push(a,c,b,a,d,c);}};
  wall(O,false);
  if(I){
    wall(I,true);
    const capA=(o,i,up)=>{for(let k=0;k<seg;k++){const a=o[k],b=o[(k+1)%seg],c=i[(k+1)%seg],d=i[k]; if(up)T.push(a,b,c,a,c,d); else T.push(a,c,b,a,d,c);}};
    capA(O[n-1],I[I.length-1],true); capA(O[0],I[0],false);
  }else{
    const cb=P.length/3; P.push(0,rings[0].y,0); const ct=P.length/3; P.push(0,rings[n-1].y,0);
    for(let i=0;i<seg;i++){T.push(cb,O[0][(i+1)%seg],O[0][i]); T.push(ct,O[n-1][i],O[n-1][(i+1)%seg]);}
  }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setIndex(T);
  const ng=g.toNonIndexed(); ng.computeVertexNormals(); ng.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count*2),2));
  return ng;
}
// Radio de la rosca exterior en un punto: d = diámetro nominal, P = paso; se achica al principio y al final (entrada de rosca)
function thR(d,P,a,y,y0,y1,extra=0){
  const dep=0.6134*P, f=y/P-a/(Math.PI*2), run=Math.min(1,Math.max(0,(y-y0)/P),Math.max(0,(y1-y)/P));
  return d/2-dep+dep*thProfile(f)*run+extra;
}
function buildBolt(p){
  const [P,af,k]=METRIC[p.th]||METRIC.M8, d=thD(p.th), L=Math.max(P*3,p.L), head=p.head!=='none';
  const seg=Math.max(48,Math.round(d*10/6)*6), dy=P/12, rings=[];
  const y0=head?k:0, y1=y0+L;
  if(head){
    const ch=Math.min(0.6,k*0.2), Rc=hexR(af,0)-ch;   // chaflán abajo y arriba de la cabeza
    rings.push({y:0,r:a=>Math.min(hexR(af,a),Rc)},{y:ch,r:a=>hexR(af,a)},{y:k-ch,r:a=>hexR(af,a)},{y:k,r:a=>Math.min(hexR(af,a),Rc)});
  }
  for(let y=y0;y<=y1+1e-9;y+=dy){const yy=Math.min(y,y1); rings.push({y:yy+(head&&yy===y0?1e-4:0),r:a=>thR(d,P,a,yy,y0,y1)});}
  if(rings[rings.length-1].y<y1-1e-6)rings.push({y:y1,r:a=>thR(d,P,a,y1,y0,y1)});
  return ringSolid(rings,seg);
}
function buildNutThreaded(p){
  const [P]=METRIC[p.th]||METRIC.M8, d=thD(p.th), h=p.h, c=p.cl==null?0.25:p.cl, seg=Math.max(48,Math.round(d*10/6)*6), dy=P/12;
  const outer=[], inner=[];
  for(let y=0;y<=h+1e-9;y+=dy){const yy=Math.min(y,h); outer.push({y:yy,r:a=>hexR(p.af,a)}); inner.push({y:yy,r:a=>thR(d,P,a,yy,-1e9,1e9,c)});}
  if(outer[outer.length-1].y<h-1e-6){outer.push({y:h,r:a=>hexR(p.af,a)}); inner.push({y:h,r:a=>thR(d,P,a,h,-1e9,1e9,c)});}
  return ringSolid(outer,seg,inner);
}

// --- enganche con las piezas paramétricas que ya existen ---
{
  const buildGeoBase=buildGeo;
  buildGeo=function(p){
    if(p.t==='bolt')return buildBolt(p);
    if(p.t==='nut'&&p.thr)return buildNutThreaded(p);
    return buildGeoBase(p);
  };
  const rebuildBase=rebuild;
  rebuild=function(o,patch){
    const p=o.userData.p;
    if(p&&p.t==='bolt'){ p.L*=o.scale.y; Object.assign(p,patch||{}); o.geometry.dispose(); o.geometry=buildGeo(p); o.scale.set(1,1,1); return; }
    return rebuildBase(o,patch);
  };
  const syncBase=syncParam;
  syncParam=function(p){
    syncBase(p);
    const b=p&&p.t==='bolt', n=p&&p.t==='nut';
    $('#pbolt').hidden=!b; $('#pnutthr').hidden=!n; $('#bhint').hidden=!(b||n);
    if(b){ $('#prow').hidden=false; $('#ptitle').firstChild.nodeValue='Tornillo '; if(document.activeElement!==$('#bTh'))$('#bTh').value=p.th; num('#bL',p.L); if(document.activeElement!==$('#bHead'))$('#bHead').value=p.head||'hex'; boltHint(p); }
    if(n){ $('#nThr').checked=!!p.thr; num('#nCl',p.cl==null?0.25:p.cl); $('#nClw').hidden=!p.thr; $('#nBore').closest('label').hidden=!!p.thr; boltHint(p); }
  };
  const applyBase=applyParam;
  applyParam=function(patch){
    const o=sel[sel.length-1]; if(!o||!o.userData.p)return;
    if(o.userData.p.t!=='bolt')return applyBase(patch);
    const y0=bbox(o).min.y; o.scale.set(1,1,1); rebuild(o,patch); o.position.y+=y0-bbox(o).min.y; updateDims(); syncParam(o.userData.p);
  };
}
function boltHint(p){
  const d=thD(p.th), t=$('#bhint'); if(!t)return;
  t.textContent=d<6?'Con impresoras FDM, las roscas de menos de M6 suelen salir empastadas: para imprimir conviene M6 o más, capa de 0,12 mm.':'Imprimí el tornillo parado, con la cabeza abajo. Holgura recomendada en la tuerca: 0,2 a 0,3 mm.';
}
// Cambia un parámetro solo si es distinto del actual (así no se llena el historial de pasos repetidos)
function setThreadParam(t,patch){
  const o=sel[sel.length-1], p=o&&o.userData.p; if(!p||p.t!==t)return;
  if(Object.keys(patch).every(k=>p[k]===patch[k]))return;
  applyParam(patch); syncParam(o.userData.p); commit();
}
$('#bTh').addEventListener('change',()=>setThreadParam('bolt',{th:$('#bTh').value}));
$('#bHead').addEventListener('change',()=>setThreadParam('bolt',{head:$('#bHead').value}));
$('#bL').addEventListener('change',()=>{const v=parseFloat($('#bL').value); if(v>0)setThreadParam('bolt',{L:Math.min(300,v)});});
$('#nThr').addEventListener('change',()=>setThreadParam('nut',{thr:$('#nThr').checked}));
$('#nCl').addEventListener('change',()=>{const v=parseFloat($('#nCl').value); if(v>=0)setThreadParam('nut',{cl:Math.min(1,v)});});
