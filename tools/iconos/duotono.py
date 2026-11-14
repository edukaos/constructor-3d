"""Íconos duotono (propuesta B): línea azul + relleno translúcido + detalle dorado.
Reemplaza el interior de los <svg> de los botones y el bloque CSS de íconos. Las 10 formas
de "Agregar" (data-add=…) siguen siendo imágenes 3D y no se tocan.
Uso: python3 tools/iconos/duotono.py   (desde la raíz del repo)
Clases: f = forma con relleno, s = solo trazo, a = acento dorado, d = punteado, i = línea interna."""
import re
def P(d,c='s'): return f'<path class="{c}" d="{d}"/>'
def C(cx,cy,r,c='f'): return f'<circle class="{c}" cx="{cx}" cy="{cy}" r="{r}"/>'
CUBE='M12 3l8 4.5v9L12 21l-8-4.5v-9z'
SQ='M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z'
I={}
I['id=pnew']=P('M6 3h8.5L19 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z','f')+P('M12 11v6M9 14h6','s a')
I['id=popen']=P('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','f')+P('M3 10.5h18','s a')
I['id=psave']=P('M4 5.5A1.5 1.5 0 0 1 5.5 4h10.8L20 7.7V18.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z','f')+P('M8 4v5h7V4')+P('M8 20v-6h8v6','s a')
I['id=imp']=P('M12 3v12M7.5 10.5L12 15l4.5-4.5','s a')+P('M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14')
I['id=stl']=P('M12 15V3M7.5 7.5L12 3l4.5 4.5','s a')+P('M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14')
I['id=chk']=P('M12 3l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6z','f')+P('M8.5 12l2.5 2.5 4.5-5','s a')
I['id=undo']=P('M8.5 6L4 10.5 8.5 15M4 10.5h10a5 5 0 0 1 0 10h-3')
I['id=redo']=P('M15.5 6L20 10.5 15.5 15M20 10.5H10a5 5 0 0 0 0 10h3')
I['id=listbtn']=P('M4 3.5h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z','f')+P('M7 8.5h10M7 12h10M7 15.5h6','s a')
I['id=ghost']=P(CUBE,'f d')+P('M4 7.5l8 4.5 8-4.5M12 12v9','s a')
I['id=bedbtn']=P('M3 13l9-5 9 5-9 5z','f')+P('M3 13v3l9 5 9-5v-3')+P('M12 18v3','s a')
I['id=lookbtn']=C(12,12,4.2,'f a')+P('M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6')
I['data-view=front']=P(CUBE,'f')+P('M4 7.5l8 4.5 8-4.5M12 12v9')+P('M4 7.5l8 4.5v9l-8-4.5z','f a')
I['data-view=top']=P(CUBE,'f')+P('M4 7.5l8 4.5 8-4.5M12 12v9')+P('M12 3l8 4.5-8 4.5-8-4.5z','f a')
I['data-view=right']=P(CUBE,'f')+P('M4 7.5l8 4.5 8-4.5M12 12v9')+P('M20 7.5l-8 4.5v9l8-4.5z','f a')
I['data-view=iso']=P(CUBE,'f')+P('M4 7.5l8 4.5 8-4.5','s a')+P('M12 12v9','s a')
I['id=projbtn']=P('M5 5h14v14H5z','f')+P('M5 5l4.5 4.5M19 5l-4.5 4.5M5 19l4.5-4.5M19 19l-4.5-4.5','s a')+P('M9.5 9.5h5v5h-5z')
I['id=vfit']=P('M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15','s a')+P('M9.5 9.5h5v5h-5z','f')
I['id=vhelp']=P('M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','f')+P('M7 9h.01M10 9h.01M13 9h.01M16 9h.01M7.5 13h9','s a')
I['data-mode=translate']=P('M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3')+C(12,12,2.4,'f a')
I['data-mode=rotate']=P('M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5')+C(12,12,2.4,'f a')
I['data-mode=scale']=P('M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7')+P('M9.5 9.5h5v5h-5z','f a')
I['id=snap']=P('M4 4h16v16H4z','f')+P('M4 12h16M12 4v16')+C(12,12,1.9,'f a')
I['id=multi']=P('M3.5 3.5h11v11h-11z','f')+P('M9.5 9.5h11v11h-11z','f a')
I['data-op=union']=C(9,12,6)+C(15,12,6,'f a')
I['data-op=subtract']=C(9.5,12,6.5)+C(15.5,12,6,'s a d')
I['data-op=intersect']=C(9,12,6,'s')+C(15,12,6,'s')+P('M12 7.2a6 6 0 0 1 0 9.6 6 6 0 0 1 0-9.6z','f a')
I['id=hole']=P('M4 4h16v16H4z','f')+C(12,12,5,'s a d')
I['id=shellbtn']=P(CUBE,'f')+P('M12 8.5l4 2.3v4.6l-4 2.3-4-2.3v-4.6z','f a')
I['id=fuzzbtn']=P(SQ,'f')+P('M6.5 8.5q1.4-2 2.8 0t2.8 0 2.8 0M6.5 12.5q1.4-2 2.8 0t2.8 0 2.8 0M6.5 16.5q1.4-2 2.8 0t2.8 0 2.8 0','s a')
I['id=rndbtn']=P('M4.5 20.5v-10a6 6 0 0 1 6-6h9v16z','f')+P('M4.5 10.5a6 6 0 0 1 6-6h4','s a')
I['id=fitbtn']=P('M7.5 15.5L20 4M7.5 8.5L20 20')+C(6,7.5,3,'f a')+C(6,16.5,3,'f a')
I['id=dividir']=P('M3.5 5.5A1.5 1.5 0 0 1 5 4h5.5v16H5a1.5 1.5 0 0 1-1.5-1.5z','f')+P('M13.5 4H19a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20h-5.5z','f a')
I['id=alinear']=P('M4 3v18')+P('M7 5.5h12v5H7z','f')+P('M7 13.5h7.5v5H7z','f a')
I['id=ground']=P('M7 4h10v13H7z','f')+P('M3 20.5h18','s a')
I['id=face']=P(CUBE,'f')+P('M4 7.5l8 4.5 8-4.5M12 12v9')+P('M4 16.5l8 4.5 8-4.5','s a')
I['id=pattern']=''.join(C(x,y,2.2,'f a' if (x,y)==(12,12) else 'f') for y in (5.5,12,18.5) for x in (5.5,12,18.5))
I['id=measure']=P('M3.5 16.5l13-13 4 4-13 13z','f')+P('M8 12l2 2M11 9l1.5 1.5M14 6l2 2','s a')
I['id=dup']=P('M8.5 8.5h12v12h-12z','f')+P('M3.5 3.5h12v12h-12z','f a')
I['id=del']=P('M6 8h12l-1 12a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9z','f')+P('M4 5.5h16M9.5 5.5V3.5h5v2')+P('M10 11.5v5M14 11.5v5','s a')
I['id=shpbtn']=P('M3.5 3.5h7.5v7.5H3.5z','f')+C(16.5,7.2,3.9,'f a')+P('M7.2 13l4.1 7.5H3.1z','f')+P('M13 13h7.5v7.5H13z','f')
I['id=textbtn']=P('M4.5 4h15v4h-5.5v12h-4V8H4.5z','f')
I['id=svgbtn']=P('M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z','f a')
I['id=exbtn']=''

s=open('index.html').read(); miss=[]
for key,inner in I.items():
    if not inner: continue
    a,v=key.split('=')
    pat=re.compile(r'(<button[^>]*\b'+a+r'="'+re.escape(v)+r'"[^>]*>\s*<svg[^>]*>)(.*?)(</svg>)',re.S)
    s,n=pat.subn(lambda m:m.group(1)+inner+m.group(3),s,count=1)
    if n!=1: miss.append(key)
print('sin botón:',miss)
css='''/* ===== Íconos duotono: línea azul + relleno translúcido + detalle dorado ===== */
:root{--ic-b:#8db9ff;--ic-bf:rgba(110,160,255,.22);--ic-g:#F5C451;--ic-gf:rgba(245,196,81,.26);--ic-dk:#1A1405}
:root[data-theme="light"]{--ic-b:#2f6df6;--ic-bf:rgba(47,109,246,.16);--ic-g:#c98500;--ic-gf:rgba(245,196,81,.4)}
button svg :is(path,circle,ellipse){fill:none;stroke:var(--ic-b);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
button svg .f{fill:var(--ic-bf)}
button svg .a{stroke:var(--ic-g)}
button svg .f.a{fill:var(--ic-gf)}
button svg .d{stroke-dasharray:2.4 2.2}
.bar button:disabled svg{opacity:.4}
/* sobre dorado sólido: trazo oscuro */
.pnl button.pri svg :is(path,circle,ellipse),#dlg button.pri svg :is(path,circle,ellipse),#topbar #stl svg :is(path,circle,ellipse),#lrail #addbtn svg :is(path,circle,ellipse),#shpcats button.on svg :is(path,circle,ellipse){stroke:var(--ic-dk)}
.pnl button.pri svg .f,#dlg button.pri svg .f,#topbar #stl svg .f{fill:rgba(26,20,5,.18)}
@media not all and (min-width:761px) and (pointer:fine) and (prefers-reduced-transparency:no-preference){.bar button.on svg :is(path,circle,ellipse){stroke:var(--ic-dk)}.bar button.on svg .f{fill:rgba(26,20,5,.18)}}
/* menú superior: íconos un poco más grandes que los de las paletas */
@media (min-width:1100px) and (pointer:fine){#topbar button svg{width:26px;height:26px}}
'''
a=s.index('/* ===== Iconos 3D glossy ===== */'); b=s.index('/* ===== Barra de scroll fina',a)
# conservar lo que había en el bloque anterior que no es de íconos
old=s[a:b]
keep=[l for l in old.split('\n') if l.startswith('.bar button.on,.bar button.on:hover')]
for l in ['button svg .f,.ic svg .f{fill:url(#icg);fill-opacity:.62}\n','.bar button.on svg .f,.pnl button.pri svg .f,#shpcats button.on svg .f{fill:#fff;fill-opacity:.4}\n','.bar button:disabled svg .f{fill-opacity:.3}\n']:
    assert l in s, l; s=s.replace(l,'',1)
a=s.index('/* ===== Iconos 3D glossy ===== */'); b=s.index('/* ===== Barra de scroll fina',a)
s=s[:a]+css+'\n'.join(keep)+('\n' if keep else '')+s[b:]
open('index.html','w').write(s)
rest=len(re.findall(r'class="(?:g|h|t|w|k)[ "]',s))
print('svgs con clases viejas restantes:',rest)
