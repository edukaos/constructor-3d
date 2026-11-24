'use strict';
// Constructor 3D: distancias mientras movés una pieza.
// Mientras arrastrás (Manipular o Mover), el rótulo muestra la distancia libre a la pieza más cercana
// en cada dirección y a los bordes de la cama. Esas distancias son las mismas que se ven al apoyar.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

// separación libre entre dos cajas en un eje (0 si se tocan o se solapan)
function gapAxis(a,b,ax){
  const g1=b.min[ax]-a.max[ax], g2=a.min[ax]-b.max[ax], g=Math.max(g1,g2);
  return g>0?g:null;
}
// distancia mínima en cada eje a las demás piezas que se cruzan en el otro eje
function nearestGaps(o){
  const a=bbox(o), A={min:a.min,max:a.max}, out={x:null,z:null,xName:'',zName:''};
  const others=objs.filter(q=>q!==o&&q.visible&&!sel.includes(q));
  for(const q of others){
    const b=bbox(q), B={min:b.min,max:b.max};
    // en X: mismo rango en Z (se cruzan) y separación en X
    if(a.max.z>B.min.z&&a.min.z<B.max.z&&a.max.y>B.min.y&&a.min.y<B.max.y){const g=gapAxis(A,B,'x'); if(g!==null&&(out.x===null||g<out.x)){out.x=g; out.xName=M_(q).n;}}
    if(a.max.x>B.min.x&&a.min.x<B.max.x&&a.max.y>B.min.y&&a.min.y<B.max.y){const g=gapAxis(A,B,'z'); if(g!==null&&(out.z===null||g<out.z)){out.z=g; out.zName=M_(q).n;}}
  }
  // bordes de la cama
  const edge={x:Math.min(a.min.x+bed.w/2, bed.w/2-a.max.x), z:Math.min(a.min.z+bed.d/2, bed.d/2-a.max.z)};
  return {...out, bedX:Math.max(0,edge.x), bedZ:Math.max(0,edge.z)};
}
const fmtMM=v=>(Math.round(v*10)/10).toLocaleString('es-AR',{maximumFractionDigits:1})+' mm';
function distLabel(o){
  const g=nearestGaps(o), parts=[];
  if(g.x!==null)parts.push('vecina X '+fmtMM(g.x)); 
  if(g.z!==null)parts.push('vecina Z '+fmtMM(g.z));
  parts.push('borde X '+fmtMM(g.bedX)); parts.push('borde Z '+fmtMM(g.bedZ));
  return parts.join(' · ');
}
