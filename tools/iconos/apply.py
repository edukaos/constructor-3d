import re,base64,io,glob,os
from PIL import Image
S=os.path.dirname(os.path.abspath(__file__))
def P(d,c,x=''): return f'<path class="g {c}" d="{d}"{x}/><path class="h" d="{d}"/>'
def C(cx,cy,r,c,x=''): return P(f'M{cx-r} {cy}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0z',c,x)
def T(d,c,w=3): return f'<path class="t {c}" d="{d}" style="stroke-width:{w}"/>'
def W(d,x=''): return f'<path class="w" d="{d}"{x}/>'
def K(d): return f'<path class="k" d="{d}"/>'
TOP='M12 2.5l8 4.5-8 4.5-8-4.5z'; LEFT='M4 7l8 4.5v10L4 17z'; RIGHT='M20 7l-8 4.5v10l8-4.5z'
def cube(top='Vt',left='V',right='Vd'): return P(LEFT,left)+P(RIGHT,right)+P(TOP,top)
I={}
I['id=pnew']=P('M6 2.5h8.5L20 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z','B')+P('M14.5 2.5V8H20z','Wt')+W('M12.5 12.5v6M9.5 15.5h6')
I['id=psave']=P('M4 5a1.5 1.5 0 0 1 1.5-1.5h10.8L20.5 7.7V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z','B')+P('M7.5 3.5h8v5h-8z','Wt')+P('M7 13h10v7.5H7z','Kd')
I['id=popen']=P('M3 6.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V10H3z','Ad')+P('M3 9.5h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','A')
I['id=imp']=P('M12 2.5l6 6.8h-3.8V16h-4.4V9.3H6z','T')+P('M3.5 14.5h17v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z','S')
I['id=stl']=P('M3.5 14.5h17v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z','S')+P('M12 15.5l6-6.8h-3.8V2.5H9.8v6.2H6z','G')
I['id=chk']=P('M12 2.5l8 3v6c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5v-6z','G')+W('M8.5 12l2.5 2.5 4.5-5')
I['id=undo']=T('M8.5 6l-4 4.5 4 4.5M4.5 10.5H14a5 5 0 0 1 0 10h-3','sV',2.8)
I['id=redo']=T('M15.5 6l4 4.5-4 4.5M19.5 10.5H10a5 5 0 0 0 0 10h3','sV',2.8)
I['id=listbtn']=P('M4 3.5h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z','B')+W('M7 8.5h10M7 12h10M7 15.5h6')
I['id=ghost']='<g opacity=".6">'+cube()+'</g>'+W('M4 7l8 4.5 8-4.5M12 11.5v10','stroke-dasharray="2 2" style="stroke-opacity:.9"')
I['id=bedbtn']=P('M2.5 12.5v3.5l9.5 5v-4z','S')+P('M21.5 12.5v3.5l-9.5 5v-4z','Sd')+P('M2.5 12.5l9.5-5 9.5 5-9.5 5z','St')
I['id=lookbtn']=T('M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6','sA',2.2)+C(12,12,4.8,'A')
I['data-view=front']=P(RIGHT,'Vd')+P(TOP,'Vt')+P(LEFT,'A')
I['data-view=top']=P(LEFT,'V')+P(RIGHT,'Vd')+P(TOP,'At')
I['data-view=right']=P(LEFT,'V')+P(TOP,'Vt')+P(RIGHT,'Ad')
I['data-view=iso']=cube()
I['id=vfit']=T('M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15','sT',2.4)+P('M9.5 9.5h5v5h-5z','V')
I['id=vhelp']=P('M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','S')+W('M7 9h.01M10 9h.01M13 9h.01M16 9h.01M7.5 13h9','style="stroke-width:2"')
I['data-mode=translate']=T('M12 3.5v17M3.5 12h17','sV',2.6)+T('M9 6.5l3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3','sV',2.4)+C(12,12,3,'Wt')
I['data-mode=rotate']=T('M19.5 12a7.5 7.5 0 1 1-2.4-5.5','sV',2.8)+T('M19.5 3.5V8H15','sV',2.8)+C(12,12,2.8,'A')
I['data-mode=scale']=T('M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5l-6 6M4.5 19.5l6-6','sV',2.6)+P('M9.5 9.5h5v5h-5z','T')
I['id=snap']=P('M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z','T')+W('M3.5 12h17M12 3.5v17')
I['id=multi']=P('M3.5 3.5h10v10h-10z','V')+P('M10.5 10.5h10v10h-10z','T')
I['data-op=union']=C(9,12,6,'V')+C(15,12,6,'T','style="opacity:.92"')
I['data-op=subtract']=C(9.5,12,6.5,'V')+'<circle cx="15.5" cy="12" r="6" class="t sT" style="stroke-width:1.8;stroke-dasharray:2.4 2"/>'
I['data-op=intersect']='<circle cx="9" cy="12" r="6" class="t sV" style="stroke-width:1.8"/><circle cx="15" cy="12" r="6" class="t sT" style="stroke-width:1.8"/>'+P('M12 7.2a6 6 0 0 1 0 9.6 6 6 0 0 1 0-9.6z','G')
I['id=hole']=P('M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z','S')+C(12,12,5,'Kd')
I['id=shellbtn']=cube()+P('M12 8.5l4 2.3v4.6l-4 2.3-4-2.3v-4.6z','Kd')
I['id=fuzzbtn']=P('M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z','V')+W('M6.5 8.5q1.4-2 2.8 0t2.8 0 2.8 0M6.5 12.5q1.4-2 2.8 0t2.8 0 2.8 0M6.5 16.5q1.4-2 2.8 0t2.8 0 2.8 0')
I['id=rndbtn']=P('M4.5 20.5v-10a6 6 0 0 1 6-6h9v16z','V')
I['id=fitbtn']=T('M7.5 15.5L20 4M7.5 8.5L20 20','sS',2.4)+C(6,7.5,3,'R')+C(6,16.5,3,'R')
I['id=dividir']=P('M3.5 5.5A1.5 1.5 0 0 1 5 4h5.5v16H5a1.5 1.5 0 0 1-1.5-1.5z','V')+P('M13.5 4H19a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20h-5.5z','T')
I['id=alinear']=T('M4 3.5v17','sS',2.2)+P('M7 5.5h12a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H7z','B')+P('M7 13h8a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H7z','V')
I['id=ground']=P('M2.5 19h19v2.2a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8z','S')+P('M7 3.5h10a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z','V')
I['id=face']=P(RIGHT,'Vd')+P(TOP,'Vt')+P(LEFT,'A')
I['id=pattern']=''.join(C(x,y,2.3,'V') for y in (5.5,12,18.5) for x in (5.5,12,18.5))
I['id=measure']=P('M3 17L17 3l4 4L7 21z','A')+K('M7 13.5l2 2M10 10.5l1.5 1.5M13.5 7l2 2')
I['id=dup']=P('M8.5 8.5h12v12h-12z','V')+P('M3.5 3.5h12v12h-12z','B')
I['id=del']=P('M5.5 8h13l-1 12.2a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z','R')+P('M4 5h16v2.5H4z','Rd')+T('M9.5 5V3.5h5V5','sR',1.8)+W('M10 11.5v6M14 11.5v6')
I['id=shpbtn']=P('M3.5 3.5h7.5v7.5H3.5z','B')+C(16.5,7.2,3.9,'T')+P('M7.2 13l4.1 7.5H3.1z','A')+P('M13 13h7.5v7.5H13z','V')
I['id=textbtn']=P('M4.5 4h15v4h-5.5v12h-4V8H4.5z','V')
I['id=svgbtn']=P('M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z','A')
I['id=exbtn']=P('M9 16.5h6v-2.2c2.2-1.3 3.7-3.3 3.7-5.8a6.7 6.7 0 0 0-13.4 0c0 2.5 1.5 4.5 3.7 5.8z','A')+P('M9.5 18.8h5v2.2a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z','S')
# primitivas 3D como imagen (webp)
def img(name):
    im=Image.open(f'{S}/{name}.png').convert('RGBA'); bb=im.getbbox(); im=im.crop(bb); w,h=im.size; m=max(w,h)
    sq=Image.new('RGBA',(m,m),(0,0,0,0)); sq.paste(im,((m-w)//2,(m-h)//2)); sq=sq.resize((120,120),Image.LANCZOS)
    b=io.BytesIO(); sq.save(b,'WEBP',quality=88,method=6); return '<image href="data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()+'" x="1" y="1" width="22" height="22"/>'
for k in ['box','sphere','cylinder','cone','torus','tube','hemi','pyramid','hex','wedge']: I['data-add='+k]=img(k)

s=open('index.html').read(); miss=[]
for key,inner in I.items():
    a,v=key.split('=')
    pat=re.compile(r'(<button[^>]*\b'+a+r'="'+re.escape(v)+r'"[^>]*>\s*<svg[^>]*>)(.*?)(</svg>)',re.S)
    s,n=pat.subn(lambda m:m.group(1)+inner+m.group(3),s,count=1)
    if n!=1: miss.append(key)
print('missing',miss)
# defs
G={'V':('#b3a8ff','#5a45e8'),'Vt':('#e1dcff','#a99cff'),'Vd':('#7a68f5','#3a2bb8'),'B':('#86b9ff','#2f66e4'),'T':('#7ff3f0','#14a1b6'),'R':('#ff9d9d','#dc3347'),'Rd':('#ff7c86','#b8243a'),
 'A':('#ffd878','#f08a1c'),'Ad':('#f7b24a','#c9680f'),'At':('#ffe9a6','#ffc04d'),'G':('#84eeaa','#1da362'),'S':('#d3d8ee','#6a7298'),'St':('#eef0fb','#b3bad6'),'Sd':('#8a92b6','#4a5178'),'Kd':('#4b5078','#14172e'),'Wt':('#ffffff','#d5dbf7')}
d='<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
for k,(a,b) in G.items(): d+=f'<linearGradient id="g{k}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'
for k,(a,b) in G.items():
    if k in('V','B','T','R','A','G','S'): d+=f'<linearGradient id="s{k}" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'
d+='<linearGradient id="gHL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>\n'
s=re.sub(r'<svg width="0" height="0"[^>]*><defs>.*?</defs></svg>\n',d,s,count=1,flags=re.S)
# css
edge={'V':'#2a1f99','Vt':'#6a5de0','Vd':'#241a8a','B':'#17418f','T':'#0a6577','R':'#8f1d2e','Rd':'#7a1526','A':'#9a560a','Ad':'#7d450a','At':'#b7761a','G':'#0f6a3d','S':'#3e4569','St':'#7d85a8','Sd':'#2c3252','Kd':'#0b0d1f','Wt':'#8e96c6'}
css='/* ===== Iconos 3D glossy ===== */\nbutton svg .g{stroke-width:.9;stroke-linejoin:round;stroke-opacity:.55}\nbutton svg .h{fill:url(#gHL);stroke:none;pointer-events:none}\nbutton svg .t{fill:none;stroke-linecap:round;stroke-linejoin:round}\nbutton svg .w{fill:none;stroke:#fff;stroke-opacity:.95;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\nbutton svg .k{fill:none;stroke:#1b1e38;stroke-opacity:.6;stroke-width:1.2;stroke-linecap:round}\n'
for k in G: css+=f'button svg .g.{k}{{fill:url(#g{k});stroke:{edge[k]}}}\n'
for k in ('V','B','T','R','A','G','S'): css+=f'button svg .t.s{k}{{stroke:url(#s{k})}}\n'
css+='''@media (pointer:fine) and (min-width:761px){button svg{filter:drop-shadow(0 1.5px 1.5px rgba(5,5,30,.4))}}
.bar button.on,.bar button.on:hover:not(:disabled){background:rgba(124,108,255,.3)!important;color:var(--tx)!important;border-color:rgba(170,160,255,.65)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)!important}
.bar button:disabled svg{filter:grayscale(1) opacity(.5)}
'''
s=re.sub(r'/\* ===== Iconos 3D glossy ===== \*/.*?(?=</style>)','',s,flags=re.S)
i=s.rindex('</style>'); s=s[:i]+css+s[i:]
open('index.html','w').write(s)
