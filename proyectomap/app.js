
const DATA = window.CAMPUS_DATA;

/* ---------- projection (local meters: x east, y south) ---------- */
const LAT0 = DATA.bound.reduce((s,p)=>s+p[0],0)/4, LON0 = DATA.bound.reduce((s,p)=>s+p[1],0)/4;
const KY = 110950, KX = 111320*Math.cos(LAT0*Math.PI/180);
const xy = ([la,lo]) => [(lo-LON0)*KX, -(la-LAT0)*KY];
const norm = s => (s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const code = s => norm(s).replace(/[\s\-_.]/g,'');
const fmtM = m => m < 1000 ? Math.round(m/5)*5 + ' m' : (m/1000).toFixed(1).replace('.',',') + ' km';

const POLY = {}; DATA.polys.forEach(p => { p.xy = p.c.map(xy); POLY[p.id] = p; });
DATA.cart.forEach(c => { c.xy = xy(c.ll); if (c.box) c.bxy = c.box.map(xy); });
const BOUND = DATA.bound.map(xy);
const CAMPUS = DATA.campus.map(xy);
const OSM = {}; for (const k in DATA.osm) if (k!=='bh') OSM[k] = DATA.osm[k].map(r => r.map(xy));
const HERE = xy(DATA.here);
const GATES = Object.fromEntries(Object.entries(DATA.gates).map(([k,v]) => [k, xy(v)]));

function pip(pt, poly){ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const a=poly[i],b=poly[j]; if(((a[1]>pt[1])!==(b[1]>pt[1])) && pt[0] < (b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0]) c=!c; } return c; }

/* ---------- walk grid ---------- */
const CELL = 3;
const obstacles = OSM.bld;
let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
[...BOUND, ...CAMPUS, ...obstacles.flat()].forEach(([x,y])=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);});
minX-=60;minY-=60;maxX+=60;maxY+=60;
const GW = Math.ceil((maxX-minX)/CELL), GH = Math.ceil((maxY-minY)/CELL);
const blocked = new Uint8Array(GW*GH), outside = new Uint8Array(GW*GH), onPath = new Uint8Array(GW*GH);
const cx = i => minX + (i+.5)*CELL, cy = j => minY + (j+.5)*CELL;
const toCell = ([x,y]) => [Math.max(0,Math.min(GW-1,Math.floor((x-minX)/CELL))), Math.max(0,Math.min(GH-1,Math.floor((y-minY)/CELL)))];
for (const poly of obstacles){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; poly.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);});
  const [i0,j0]=toCell([x0,y0]),[i1,j1]=toCell([x1,y1]);
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++) if(pip([cx(i),cy(j)],poly)) blocked[j*GW+i]=1;
}
for(let j=0;j<GH;j++) for(let i=0;i<GW;i++) if(!pip([cx(i),cy(j)],CAMPUS)) outside[j*GW+i]=1;
// footways and service lanes: preferred, and they open passages that run through buildings
// plazas and patios are walkable almost like paths
const plaza = new Uint8Array(GW*GH);
for (const p of DATA.polys.filter(p=>p.kind==='yard'||p.kind==='park')){ let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; p.xy.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);});
  const [i0,j0]=toCell([x0,y0]),[i1,j1]=toCell([x1,y1]); for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++) if(!blocked[j*GW+i] && pip([cx(i),cy(j)],p.xy)) plaza[j*GW+i]=1; }
for (const line of [...OSM.foot, ...OSM.svc]) for (let s=0;s<line.length-1;s++){ const a=line[s], b=line[s+1], L=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(1,Math.ceil(L/1));
  for(let t=0;t<=n;t++){ const [i,j]=toCell([a[0]+(b[0]-a[0])*t/n, a[1]+(b[1]-a[1])*t/n]); const k=j*GW+i; onPath[k]=1; blocked[k]=0; } }

function nearestFree(k){ // BFS from a blocked cell to the free cells that border its block
  if(!blocked[k]) return [k];
  const seen=new Uint8Array(GW*GH), q=[k], out=[]; seen[k]=1; let h=0;
  while(h<q.length && h<40000){ const c=q[h++], i=c%GW, j=(c/GW)|0;
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const ni=i+di,nj=j+dj; if(ni<0||nj<0||ni>=GW||nj>=GH) continue; const n=nj*GW+ni; if(seen[n]) continue; seen[n]=1;
      if(blocked[n]) q.push(n); else out.push(n); } }
  return out;
}
function astar(from, to){
  const s0=toCell(from), t0=toCell(to);
  let starts=nearestFree(s0[1]*GW+s0[0]);
  if(starts.length>1){ starts.sort((a,b)=>Math.hypot(cx(a%GW)-from[0],cy((a/GW)|0)-from[1])-Math.hypot(cx(b%GW)-from[0],cy((b/GW)|0)-from[1])); starts=[starts[0]]; }
  const goals=new Set(nearestFree(t0[1]*GW+t0[0]));
  const ti=t0[0], tj=t0[1];
  const g=new Float32Array(GW*GH).fill(Infinity), came=new Int32Array(GW*GH).fill(-1), closed=new Uint8Array(GW*GH);
  const heap=[]; const push=(k,f)=>{heap.push([f,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  const hfun=k=>{const dx=Math.abs(k%GW-ti),dy=Math.abs(((k/GW)|0)-tj);return (Math.max(dx,dy)+0.4142*Math.min(dx,dy))*0.8;};
  const s=starts[0]; g[s]=0; push(s,hfun(s)); let end=-1;
  while(heap.length){ const [,k]=pop(); if(closed[k]) continue; closed[k]=1; if(goals.has(k)){end=k;break;}
    const i=k%GW, j=(k/GW)|0;
    for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ if(!di&&!dj) continue; const ni=i+di,nj=j+dj; if(ni<0||nj<0||ni>=GW||nj>=GH) continue; const n=nj*GW+ni; if(blocked[n]||closed[n]) continue;
      if(di&&dj&&(blocked[j*GW+ni]||blocked[nj*GW+i])) continue;
      const cost=(di&&dj?1.4142:1)*(onPath[n]?1:plaza[n]?1.12:1.9)*(outside[n]?1.6:1); const ng=g[k]+cost; if(ng<g[n]){g[n]=ng;came[n]=k;push(n,ng+hfun(n));} } }
  if(end<0) return null;
  const cells=[]; for(let k=end;k!==-1;k=came[k]) cells.push(k); cells.reverse();
  return cells;
}
function los(a,b){ const [x0,y0]=a,[x1,y1]=b; const d=Math.hypot(x1-x0,y1-y0), n=Math.ceil(d/(CELL*.5));
  for(let s=1;s<n;s++){ const p=[x0+(x1-x0)*s/n,y0+(y1-y0)*s/n], c=toCell(p), k=c[1]*GW+c[0]; if(blocked[k]) return false; if(!onPath[k] && d>18) return false; } return true; }
function route(from,to){
  const cells=astar(from,to); if(!cells) return null;
  const pts=[from, ...cells.map(k=>[cx(k%GW),cy((k/GW)|0)])];
  const out=[pts[0]]; let a=0;
  while(a<pts.length-1){ let b=pts.length-1; b=Math.min(b,a+40); while(b>a+1 && !los(pts[a],pts[b])) b--; out.push(pts[b]); a=b; }
  const walk=out; const lastOut=walk[walk.length-1];
  const indoor = Math.hypot(lastOut[0]-to[0], lastOut[1]-to[1]) > 3 ? [lastOut, to] : null;
  let len=0; for(let i=1;i<walk.length;i++) len+=Math.hypot(walk[i][0]-walk[i-1][0],walk[i][1]-walk[i-1][1]);
  return {walk, indoor, len, total: len + (indoor?Math.hypot(indoor[1][0]-indoor[0][0],indoor[1][1]-indoor[0][1]):0)};
}

/* ---------- search index ---------- */
const PARENT_NAME = {SJ:'Espacio abierto del campus'}; DATA.polys.forEach(p=>PARENT_NAME[p.id]=p.short);
const CARTNUM = {}; DATA.cart.forEach(c=>{ if(c.poly) CARTNUM[c.poly]=c.n; });
const CATS = [
  {k:'bath', l:'Baños'}, {k:'food_lunch', l:'Comer'}, {k:'studyroom', l:'Estudiar'}, {k:'water', l:'Agua'},
  {k:'biblioteca', l:'Bibliotecas'}, {k:'print', l:'Imprimir'}, {k:'financial', l:'Cajeros'}, {k:'park_bicycle', l:'Bicicletas'}, {k:'trash', l:'Reciclaje'}
];
const CATNAME = {library:'Biblioteca',studyroom:'Sala de estudio',laboratory:'Laboratorio',water:'Agua',financial:'Cajero',sports_place:'Deportes',parking:'Estacionamiento',offices:'Oficinas',faculty:'Facultad',building:'Edificio',crisol:'Crisol',yard:'Patio',classroom:'Sala',bath:'Baño',lab:'Laboratorio',trash:'Reciclaje',other:'Lugar',photocopy:'Fotocopias',computers:'Computadores',food_lunch:'Comida',park_bicycle:'Bicicletero',printer:'Impresora',cash_machine:'Cajero',study:'Sala de estudio',bank:'Banco',shop:'Tienda',auditorium:'Auditorio'};
const items = [];
DATA.places.forEach(([name,desc,cat,floor,parent,la,lo])=>{
  const pn = PARENT_NAME[parent]||parent; const num = CARTNUM[parent];
  const d1=(desc||'').split(/\n/)[0].replace(/https?:\S+/g,'').trim();
  const fl = floor===-1||floor==='-1' ? 'S' : floor;
  items.push({kind:'place', name, title:name, cat,
    sub:[d1 && d1!==name ? d1 : null, pn + (num?` · edificio ${num}`:'')].filter(Boolean).join(' · '),
    floor:fl, xy:xy([la,lo]), badge: cat==='classroom'||cat==='laboratory'?name:(CATNAME[cat]||'·'), key:code(name), text:norm(name+' '+desc+' '+pn)});
});
DATA.cart.forEach(c=>{
  const isLib=c.n.startsWith('L');
  items.push({kind:'bldg', n:c.n, real:!!c.real, name:c.name, title:c.name, cat: isLib?'biblioteca':'building', tags:c.tags,
    sub: isLib ? 'Biblioteca' : (c.salas.length?`Salas ${c.salas.join(', ')}`:'Edificio') + (c.box?' · posición estimada':''),
    xy:c.xy, est:!!c.box, badge: isLib?'Bib':c.n, key:code(c.n), text:norm(c.name+' edificio '+c.n+' '+c.salas.join(' '))});
});
function search(q){
  const nq=norm(q).trim(), cq=code(q); if(!nq) return [];
  const scored=[];
  for(const it of items){ let s=0;
    if(it.kind==='place' && it.key===cq) s=100; else if(it.kind==='bldg' && it.key===cq) s=95;
    else if(it.kind==='place' && cq.length>=2 && it.key.startsWith(cq)) s=80-it.key.length*.1;
    else if(it.text.includes(nq)) s=it.kind==='bldg'?55:40;
    if(s) scored.push([s,it]); }
  const o=(typeof S!=='undefined'&&S.originXY)||[0,0]; scored.sort((a,b)=>b[0]-a[0] || Math.hypot(a[1].xy[0]-o[0],a[1].xy[1]-o[1])-Math.hypot(b[1].xy[0]-o[0],b[1].xy[1]-o[1]));
  let res=scored.slice(0,8).map(x=>x[1]);
  // room code fallback using the sign's sala letters (e.g. K203 → edificio 36)
  const m=cq.match(/^([a-z]+\d?)[-]?(\d{1,4}[a-z]?)?$/);
  if(m && !(scored[0]&&scored[0][0]>=70)){
    const letters=m[1].toUpperCase(), digits=m[2]||'';
    const hits=DATA.cart.filter(c=>c.salas.some(s=>s===letters || (letters.startsWith(s) && /^\d/.test(letters.slice(s.length)))));
    const fb=hits.map(c=>({kind:'code', name:(q.trim().toUpperCase()), title:`Sala ${q.trim().toUpperCase()}`, cat:'classroom',
      sub:`${c.name} · edificio ${c.n}`, floor: digits.length>=3 ? digits[0] : '', floorGuess:true, xy:c.xy, est:!!c.box, badge:q.trim().toUpperCase(), n:c.n}));
    res=[...fb, ...res].slice(0,8);
  }
  return res;
}

/* ---------- state ---------- */
const S = { origin:'cartel', originXY:HERE, gps:null, dest:null, route:null, cat:null, catHits:[] };
const ORIGINS = { cartel:{l:'Cartel (Helen Lee Lassen)', xy:HERE}, metro:{l:'Entrada metro (P/1)', xy:GATES.P1}, gps:{l:'Mi ubicación'} };

/* ---------- map ---------- */
const svg = document.getElementById('map'); const NS='http://www.w3.org/2000/svg';
const el=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;};
const P = pts => pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const gBase=el('g',{},svg), gBld=el('g',{},svg), gRoute=el('g',{},svg), gLbl=el('g',{},svg), gMk=el('g',{},svg);
el('polygon',{points:P(CAMPUS),class:'campus'},gBase);
const lay=(list,cls,tag='polygon')=>list.forEach(r=>el(tag,{points:P(r),class:cls},gBase));
lay(OSM.grass,'grass'); lay(OSM.pitch,'pitch'); lay(OSM.water,'water');
lay(OSM.road,'road','polyline'); lay(OSM.svc,'svc','polyline'); lay(OSM.foot,'foot','polyline');
const streetLabels=[[BOUND[0],BOUND[3],'Av. Vicuña Mackenna',-1],[BOUND[0],BOUND[1],'Mons. Carlos Casanueva',-1],[BOUND[1],BOUND[2],'Marathon',1],[BOUND[3],BOUND[2],'Benito Rebolledo',1]];
const streetEls = streetLabels.map(([a,b,t,side])=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2; let ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI; if(ang>90)ang-=180; if(ang<-90)ang+=180;
  const nx=-(b[1]-a[1]),ny=(b[0]-a[0]);const nl=Math.hypot(nx,ny); const off=18*side; const tx=el('text',{class:'street','text-anchor':'middle',transform:`translate(${mx+nx/nl*off} ${my+ny/nl*off}) rotate(${ang})`},gBase); tx.textContent=t; return tx;});
const bldEls={};
const osmBld = OSM.bld.map((r,i)=>{ const e=el('polygon',{points:P(r),class:'bl'},gBld); bldEls['o'+i]=e; return e; });
const labelEls=[];
DATA.cart.forEach(c=>{
  if(/^8[a-j]$/.test(c.n)) return;
  const lib=c.n.startsWith('L'), fac=!lib && /^\d+$/.test(c.n) && +c.n<=19;
  const g=el('g',{class:'badge'},gLbl); const w=c.n.length>1?22:16;
  el('rect',{x:-w/2,y:-8,width:w,height:16,rx:2,fill:lib?'var(--sign)':fac?'var(--uc)':'var(--surface)',stroke:lib||fac?'none':'var(--bldg-line)'},g);
  const t=el('text',{y:4.5,'text-anchor':'middle','font-family':'Fira Sans Condensed, Arial Narrow, sans-serif','font-weight':700,'font-size':11.5,fill:lib?'var(--sign-ink)':fac?'var(--uc-ink)':'var(--ink)'},g);
  t.textContent=lib?c.n.slice(1):c.n; labelEls.push({g,xy:c.xy,lib}); g.addEventListener('click',e=>{e.stopPropagation(); choose(items.find(i=>i.kind==='bldg'&&i.n===c.n));});
  g.style.cursor='pointer';
});
let vb={x:0,y:0,w:100,h:100};
function setVB(){ svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`); const k=vb.w/svg.clientWidth||1;
  labelEls.forEach(l=>l.g.setAttribute('transform',`translate(${l.xy[0]} ${l.xy[1]}) scale(${k})`));
  gMk.querySelectorAll('[data-pin]').forEach(m=>{const [x,y]=m.dataset.pin.split(',');m.setAttribute('transform',`translate(${x} ${y}) scale(${k})`);});
  streetEls.forEach(t=>t.setAttribute('font-size',12*k)); }
function fit(pts,pad=40){ let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; pts.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);});
  const W=svg.clientWidth||400,H=svg.clientHeight||400; let w=x1-x0+pad*2,h=y1-y0+pad*2; if(w/h<W/H) w=h*W/H; else h=w*H/W;
  vb={x:(x0+x1)/2-w/2,y:(y0+y1)/2-h/2,w,h}; setVB(); }
function zoom(f,cxp=.5,cyp=.5){ const nx=vb.x+vb.w*cxp*(1-f), ny=vb.y+vb.h*cyp*(1-f); vb={x:nx,y:ny,w:vb.w*f,h:vb.h*f}; vb.w=Math.max(60,Math.min(2400,vb.w)); vb.h=vb.w*(svg.clientHeight/svg.clientWidth); setVB(); }
// pan + pinch
const ptrs=new Map(); let last=null;
svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);svg.classList.add('drag');});
svg.addEventListener('pointermove',e=>{ if(!ptrs.has(e.pointerId)) return; const prev=ptrs.get(e.pointerId); ptrs.set(e.pointerId,[e.clientX,e.clientY]); const k=vb.w/svg.clientWidth;
  if(ptrs.size===1){ vb.x-=(e.clientX-prev[0])*k; vb.y-=(e.clientY-prev[1])*k; setVB(); }
  else if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); if(last){ const r=svg.getBoundingClientRect(); zoom(last/d,((a[0]+b[0])/2-r.left)/r.width,((a[1]+b[1])/2-r.top)/r.height);} last=d; } });
const up=e=>{ptrs.delete(e.pointerId); if(ptrs.size<2) last=null; if(!ptrs.size) svg.classList.remove('drag');};
svg.addEventListener('pointerup',up); svg.addEventListener('pointercancel',up);
svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoom(e.deltaY>0?1.15:1/1.15,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);},{passive:false});

function pin(xy,color,label){ const g=el('g',{'data-pin':xy[0]+','+xy[1]},gMk);
  el('path',{d:'M0 0c-2-6-9-10-9-17a9 9 0 0 1 18 0c0 7-7 11-9 17Z',fill:color,stroke:'#fff','stroke-width':1.6},g); el('circle',{cy:-17,r:3.4,fill:'#fff'},g);
  if(label){ const t=el('text',{y:-30,'text-anchor':'middle','font-size':11,'font-weight':700,'font-family':'Fira Sans Condensed, sans-serif',fill:'var(--ink)',stroke:'var(--paper)','stroke-width':3,'paint-order':'stroke'},g); t.textContent=label; } return g; }
function drawRoute(){
  gRoute.innerHTML=''; gMk.innerHTML='';
  Object.values(bldEls).forEach(e=>e.classList.remove('hit'));
  S.catHits.forEach(h=>{ const g=el('g',{'data-pin':h.xy[0]+','+h.xy[1]},gMk); el('circle',{r:5,fill:'var(--uc)',stroke:'#fff','stroke-width':1.5},g); g.style.cursor='pointer'; g.addEventListener('click',ev=>{ev.stopPropagation();choose(h);}); });
  if(S.route){ const r=S.route;
    el('polyline',{points:P(r.walk),fill:'none',stroke:'var(--surface)','stroke-width':9,'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},gRoute);
    const line=el('polyline',{points:P(r.walk),fill:'none',stroke:'var(--uc)','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},gRoute);
    if(r.indoor) el('polyline',{points:P(r.indoor),fill:'none',stroke:'var(--uc)','stroke-width':3,'stroke-dasharray':'2 5','stroke-linecap':'round','vector-effect':'non-scaling-stroke'},gRoute);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){ line.setAttribute('stroke-dasharray','14 10'); line.animate([{strokeDashoffset:24},{strokeDashoffset:0}],{duration:900,iterations:Infinity}); }
  }
  if(S.originXY){ const g=el('g',{'data-pin':S.originXY[0]+','+S.originXY[1]},gMk); el('circle',{r:9,fill:'var(--pin)','fill-opacity':.2},g); el('circle',{r:5.5,fill:'var(--pin)',stroke:'#fff','stroke-width':2},g); }
  if(S.dest){ const hb=OSM.bld.findIndex(r=>pip(S.dest.xy,r)); if(hb>=0) osmBld[hb].classList.add('hit');
    pin(S.dest.xy,'var(--uc)',S.dest.badge && S.dest.badge.length<9?S.dest.badge:''); }
  setVB();
}

/* ---------- UI ---------- */
const $=id=>document.getElementById(id);
const qEl=$('q'), resEl=$('results'), sheet=$('sheet'), sbody=$('sheetBody');
const esc=s=>(s||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dist2=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const floorTxt=f=>f===''||f==null?'':(f==='S'?'Subterráneo':'Piso '+f);
const SRC=`Salas: ${esc(DATA.src)}, Open Source UC (AGPL-3.0). Mapa: © colaboradores de OpenStreetMap (ODbL). Alturas: fuentes UC y estimaciones.`;

/* layout bookkeeping: the map controls sit under the search bar; toasts and hints sit above the sheet */
function measure(){ const r=$('cats').getBoundingClientRect(), a=$('top').parentElement.getBoundingClientRect();
  document.documentElement.style.setProperty('--top-h',(r.bottom-a.top+4)+'px'); document.documentElement.style.setProperty('--sheet-h',sheet.offsetHeight+'px'); }
new ResizeObserver(measure).observe(sheet); new ResizeObserver(measure).observe($('top')); addEventListener('resize',measure);

/* recent destinations (this browser only) */
const RKEY='guiaar.recent.v1'; let recents=[]; try{ recents=JSON.parse(localStorage.getItem(RKEY)||'[]'); }catch(e){ recents=[]; }
function remember(it){ const r={kind:it.kind,title:it.title,sub:it.sub,badge:it.badge,floor:it.floor||'',floorGuess:!!it.floorGuess,xy:it.xy,cat:it.cat,n:it.n||'',est:!!it.est,name:it.name||''};
  recents=[r,...recents.filter(x=>!(x.title===r.title&&dist2(x.xy,r.xy)<3))].slice(0,6); try{ localStorage.setItem(RKEY,JSON.stringify(recents)); }catch(e){} }

/* quick "nearest" chips */
const CAT_ICON={"bath": "<path d=\"M7 3h3v7H7zM5 10h14v1.5a7 7 0 0 1-14 0zM9.5 18 9 21h6l-.5-3\"/>", "food_lunch": "<path d=\"M7 3v8M5 3v4.5a2 2 0 0 0 4 0V3M7 11.5V21M17 3c-2.2 2-2.2 6.5 0 8.5V21\"/>", "studyroom": "<path d=\"M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5v-15\"/>", "water": "<path d=\"M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z\"/>", "biblioteca": "<path d=\"M5 4v16M9.5 4v16M14 5.5l4.2 14.5M3 20.5h18\"/>", "print": "<path d=\"M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z\"/>", "financial": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2.5\"/><path d=\"M3 10.5h18M7 15h3\"/>", "park_bicycle": "<circle cx=\"6\" cy=\"16\" r=\"3.5\"/><circle cx=\"18\" cy=\"16\" r=\"3.5\"/><path d=\"M6 16l4-8h5l3 8M10 8 8.5 5H6.5\"/>", "trash": "<path d=\"M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13\"/>"};
$('cats').innerHTML=CATS.map(c=>`<button type="button" class="chip" data-k="${c.k}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_ICON[c.k]||''}</svg>${c.l}</button>`).join('');
$('cats').addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; const k=b.dataset.k;
  if(S.cat===k){ S.cat=null; S.catHits=[]; S.dest=null; S.route=null; drawRoute(); renderSheet(); }
  else { S.cat=k; S.info=null;
    S.catHits = items.filter(it=> k==='print' ? (it.cat==='printer'||it.cat==='photocopy'||it.cat==='computers') : k==='studyroom' ? (it.cat==='studyroom' || (it.kind==='bldg' && it.tags.includes('estudio'))) : k==='biblioteca' ? (it.cat==='library' || (it.cat==='biblioteca' && !it.real)) : it.cat===k);
    nearest(); }
  $('cats').querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.k===S.cat)); });
function nearest(){ // the closest by real walking distance, checked among the 8 closest in a straight line
  const o=S.originXY; const cand=[...S.catHits].sort((a,b)=>dist2(a.xy,o)-dist2(b.xy,o)).slice(0,8);
  let best=null; cand.forEach(c=>{const r=route(o,c.xy); if(r&&(!best||r.total<best.r.total)) best={c,r};});
  if(best) choose(best.c,best.r,true,true); else toast('No encontré un camino a ninguno.');
}

/* search box + results */
let selIdx=-1;
function resRow(it,i){ const d=S.originXY?dist2(it.xy,S.originXY)*1.25:0;
  return `<button type="button" class="res" data-i="${i}" role="option" id="opt${i}" aria-selected="${i===selIdx}">
    <span class="code ${it.kind==='bldg'?'b':(it.cat==='classroom'||it.kind==='code'?'':'o')}">${esc(it.badge)}</span>
    <span class="t"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></span>
    <span class="fl">${d?'≈ '+fmtM(d):''}${it.floor?'<br>'+floorTxt(it.floor):''}</span></button>`; }
function renderResults(){
  const q=qEl.value.trim(); let list, head='';
  if(!q){ if(document.activeElement!==qEl || !recents.length){ resEl.hidden=true; qEl.setAttribute('aria-expanded','false'); return; } list=recents; head='<div class="rhead">Recientes</div>'; }
  else list=search(q);
  resEl._list=list; resEl.hidden=false; qEl.setAttribute('aria-expanded','true');
  if(!list.length){ resEl.innerHTML=`<div class="empty">No encontré “${esc(q)}”. Prueba con el código de la sala (B14, AL1, K203) o el número del edificio del cartel.</div>`; return; }
  resEl.innerHTML=head+list.map(resRow).join('');
}
qEl.addEventListener('input',()=>{ $('clr').hidden=!qEl.value; selIdx=-1; renderResults(); });
qEl.addEventListener('focus',()=>{ selIdx=-1; renderResults(); });
qEl.addEventListener('keydown',e=>{ const l=resEl._list||[];
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!l.length) return; selIdx=(selIdx+(e.key==='ArrowDown'?1:-1)+l.length)%l.length; renderResults(); qEl.setAttribute('aria-activedescendant','opt'+selIdx); $('opt'+selIdx)?.scrollIntoView({block:'nearest'}); }
  else if(e.key==='Enter'){ const it=l[selIdx>=0?selIdx:0]; if(it) choose(it); }
  else if(e.key==='Escape'){ resEl.hidden=true; qEl.blur(); } });
$('clr').onclick=()=>{ qEl.value=''; $('clr').hidden=true; selIdx=-1; qEl.focus(); renderResults(); };
resEl.addEventListener('pointerdown',e=>e.preventDefault()); // keep focus so a tap lands on the row
resEl.addEventListener('click',e=>{ const b=e.target.closest('.res'); if(b) choose(resEl._list[+b.dataset.i]); });
document.addEventListener('pointerdown',e=>{ if(!e.target.closest('.top')){ resEl.hidden=true; qEl.setAttribute('aria-expanded','false'); } });

/* bottom sheet: tap or swipe the handle (or the summary) to expand / collapse */
function setSheet(state){ sheet.dataset.state=state; $('grab').setAttribute('aria-label',state==='full'?'Contraer detalles':'Expandir detalles'); }
(()=>{ let y0=null, t0=0;
  const down=e=>{ if(e.target.closest('button:not(.grab),a,input')) return; y0=e.clientY; t0=performance.now(); };
  const up=e=>{ if(y0==null) return; const dy=e.clientY-y0; y0=null; if(innerWidth>=860) return;
    if(dy<-28) setSheet('full'); else if(dy>28) setSheet('peek'); else if(e.target.closest('.grab') && performance.now()-t0<400) setSheet(sheet.dataset.state==='full'?'peek':'full'); };
  $('grab').addEventListener('pointerdown',down); sbody.addEventListener('pointerdown',e=>{ if(sheet.dataset.state==='peek') down(e); });
  addEventListener('pointerup',up); })();

function choose(it, r, keepCat, quiet){
  if(!it) return; S.dest=it; S.info=null; resEl.hidden=true; qEl.blur(); qEl.value=''; $('clr').hidden=true;
  if(!keepCat){ S.cat=null; S.catHits=[]; $('cats').querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed','false')); }
  S.route = r || route(S.originXY, it.xy); if(!quiet) remember(it);
  setSheet('peek'); drawRoute(); renderSheet();
  if(!V3.on){ if(S.route) fit([...S.route.walk, it.xy], 50); else fit([S.originXY,it.xy],60); }
}
/* tapping a building opens its card; routing starts from the card */
function buildingInfo(bi){
  const ring=OSM.bld[bi], pts=ringPts(ring), c=pts.reduce((s,p)=>[s[0]+p[0],s[1]+p[1]],[0,0]).map(v=>v/pts.length);
  const inside=items.filter(i=>i.kind==='bldg' && pip(i.xy,ring));
  let cart=inside.find(i=>!/^8[a-j]$/.test(i.n)&&i.cat!=='biblioteca') || inside[0];
  if(!cart){ let best=30; items.forEach(i=>{ if(i.kind!=='bldg') return; const d=dist2(i.xy,c); if(d<best){best=d;cart=i;} }); }
  const poly=DATA.polys.filter(p=>p.kind==='bldg'&&pip(c,p.xy)).sort((a,b)=>a.c.length-b.c.length)[0];
  const places=items.filter(i=>i.kind==='place' && pip(i.xy,ring));
  const h=V3.bh&&V3.bh[bi]!=null?V3.bh[bi]:DATA.osm.bh[bi][0]; const inCampus=pip(c,CAMPUS);
  const title = cart?cart.title : poly?poly.name : inCampus?'Edificio del campus':'Edificio fuera del campus';
  const depts=inside.filter(i=>/^8[a-j]$/.test(i.n)).map(i=>i.title);
  const libs=inside.filter(i=>i.cat==='biblioteca').map(i=>i.title);
  return {bi, ring, xy:cart&&pip(cart.xy,ring)?cart.xy:c, cart, title, badge:cart?cart.badge:'', n:cart?cart.n:'', poly, places, h, inCampus, depts, libs, est:cart&&cart.est};
}
function selectBuilding(bi){
  if(bi==null||bi<0) return; S.info=buildingInfo(bi); S.dest=null; S.route=null; S.cat=null; S.catHits=[];
  $('cats').querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed','false'));
  setSheet('peek'); drawRoute(); renderSheet();
}
function infoAsDest(inf){ return inf.cart ? {...inf.cart, xy:inf.xy} : {kind:'bldg', title:inf.title, sub:inf.poly?inf.poly.short:'Edificio', badge:'·', xy:inf.xy, n:''}; }

const STEP_SVG = {
  straight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5M6 10l6-6 6 6"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-7a3 3 0 0 0-3-3H5M9 6l-4 4 4 4"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20v-7a3 3 0 0 1 3-3h8M15 6l4 4-4 4"/></svg>',
  door:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M13 12h.01"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>'};
function steps(r,d){
  const pts=r.walk, out=[]; if(pts.length<2) return out;
  const card=b=>['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste'][Math.round(b/45)%8];
  out.push({ic:'straight',t:`Camina hacia el ${card(bearing(pts[0],pts[1]))}`,at:pts[0],d:0});
  for(let i=1;i<pts.length-1;i++){ out[out.length-1].d+=dist2(pts[i-1],pts[i]); const ang=wrap(bearing(pts[i],pts[i+1])-bearing(pts[i-1],pts[i]));
    if(Math.abs(ang)>35){ const turn={ic:ang>0?'right':'left',t:Math.abs(ang)>125?`Da la vuelta hacia la ${ang>0?'derecha':'izquierda'}`:`Gira a la ${ang>0?'derecha':'izquierda'}`,at:pts[i],d:0};
      if(out[out.length-1].d<7 && out.length>1) out[out.length-1]=turn; else out.push(turn); } }
  out[out.length-1].d+=dist2(pts[pts.length-2],pts[pts.length-1]);
  if(r.indoor) out.push({ic:'door',t:'Entra al edificio',s:d.floor?`Sube al ${floorTxt(d.floor).toLowerCase()}${d.floorGuess?' (según el número)':''}`:'',at:r.indoor[0],d:dist2(r.indoor[0],r.indoor[1])});
  out.push({ic:'pin',t:`Llegas a ${d.title}`,at:d.xy});
  return out;
}
const clock=min=>{ const t=new Date(Date.now()+min*60000); return String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'); };
const walkMin=m=>Math.max(1,Math.round(m/1.3/60));
function originBlock(){ return `<div class="sec-title">Desde</div><div class="from">${Object.entries(ORIGINS).map(([k,o])=>`<button type="button" class="chip" data-o="${k}" aria-pressed="${S.origin===k}">${o.l}</button>`).join('')}</div>`; }
const AR_ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M12 7l4 8h-8z"/></svg>';
const X_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ROUTE_ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/></svg>';

function renderSheet(){
  const d=S.dest, r=S.route, inf=S.info;
  if(inf){
    const floors=inf.h>=1?Math.max(1,Math.round(inf.h/4)):0;
    const rr=route(S.originXY,inf.xy); inf.r=rr;
    const counts={}; inf.places.forEach(p=>{ const k=p.cat; counts[k]=(counts[k]||0)+1; });
    const rooms=inf.places.filter(p=>p.cat==='classroom'||p.cat==='laboratory'||p.cat==='auditorium').sort((a,b)=>a.title.localeCompare(b.title,'es',{numeric:true}));
    const other=Object.entries(counts).filter(([k])=>!['classroom','laboratory','auditorium'].includes(k)).map(([k,n])=>`${n} ${(CATNAME[k]||k).toLowerCase()}${n>1&&!/s$/.test(CATNAME[k]||'')?'s':''}`);
    const facts=[inf.cart&&inf.cart.sub&&inf.cart.kind==='bldg'&&/Salas/.test(inf.cart.sub)?inf.cart.sub.split(' · ')[0]:'', floors&&inf.h>1.5?`${floors} ${floors>1?'pisos':'piso'} · ≈${Math.round(inf.h)} m`:inf.h<=1.5?'Bajo tierra, con techo verde':''].filter(Boolean).join(' · ');
    sbody.innerHTML=`
      <div class="summary"><span class="big${inf.badge?'':' none'}">${esc(inf.badge||'—')}</span>
        <div class="mw0"><h2>${esc(inf.title)}</h2><p>${esc(facts||(inf.inCampus?'Campus San Joaquín':'Fuera del campus'))}</p></div>
        ${rr?`<div class="time"><b>${walkMin(rr.total)} min</b><small>a pie</small></div>`:''}</div>
      <div class="cta"><button type="button" class="btn pri" id="goRoute" ${rr?'':'disabled'}>${ROUTE_ICON}Cómo llegar</button><button type="button" class="btn sec" id="closeInfo" aria-label="Cerrar">${X_ICON}</button></div>
      <div class="more">
        ${inf.depts.length||inf.libs.length?`<div class="sec-title">En este edificio</div><p class="plain">${esc([...inf.libs,...inf.depts].join(' · '))}</p>`:''}
        ${rooms.length?`<div class="sec-title">Salas (${rooms.length}) · toca una para ir</div><div class="recents wrap">${rooms.slice(0,40).map((p,i)=>`<button type="button" class="chip" data-room="${i}"><code>${esc(p.title)}</code>${p.floor?`<small class="mut">${esc(floorTxt(p.floor))}</small>`:''}</button>`).join('')}</div>`:''}
        ${other.length?`<div class="sec-title">También hay</div><p class="plain">${esc(other.join(' · '))}</p>`:''}
        ${!rooms.length&&!other.length&&inf.inCampus?`<p class="warn">UbiCate no tiene salas ni servicios registrados en este edificio.</p>`:''}
        ${inf.est?`<p class="warn">Su posición viene del cartel del campus (±30 m).</p>`:''}
        ${originBlock()}<small class="src">${SRC}</small></div>`;
    sbody._rooms=rooms;
    $('goRoute').onclick=()=>{ const it=infoAsDest(inf); choose(it,inf.r); };
    $('closeInfo').onclick=()=>{ S.info=null; drawRoute(); renderSheet(); };
    sbody.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>choose(sbody._rooms[+b.dataset.room]));
    measure(); return;
  }
  if(!d){
    sbody.innerHTML=`<div class="idle"><h2>¿A dónde vas?<span class="tag">Prototipo</span></h2><p>Busca una sala o toca un edificio para ver qué hay adentro.</p>
      ${recents.length?`<div class="recents">${recents.map((x,i)=>`<button type="button" class="chip" data-rec="${i}"><code>${esc(x.badge)}</code>${x.badge!==x.title?esc(x.title.length>22?x.title.slice(0,21)+'…':x.title):''}</button>`).join('')}</div>`:''}</div>
      <div class="more">${originBlock()}<small class="src">${SRC}</small></div>`;
    sbody.querySelectorAll('[data-rec]').forEach(b=>b.onclick=()=>choose(recents[+b.dataset.rec]));
    measure(); return;
  }
  const min=r?walkMin(r.total):0, fl=floorTxt(d.floor);
  const st=r?steps(r,d):[];
  sbody.innerHTML=`
    <div class="summary"><span class="big">${esc(d.badge||'·')}</span>
      <div class="mw0"><h2>${esc(d.title)}</h2><p>${esc(d.sub)}${fl?' · '+fl:''}</p></div>
      ${r?`<div class="time"><b>${min} min</b><small>llegas ${clock(min)}</small></div>`:''}</div>
    ${r?'':'<p class="warn">No encontré un camino desde aquí. Prueba otro punto de partida.</p>'}
    <div class="cta"><button type="button" class="btn pri" id="goAR" ${r?'':'disabled'}>${AR_ICON}Guiarme en AR</button><button type="button" class="btn sec" id="stepsBtn">Pasos</button><button type="button" class="btn sec" id="clearDest" aria-label="Terminar ruta">${X_ICON}</button></div>
    <div class="more">
      ${r?`<div class="best">● Ruta más rápida a pie, por senderos</div>
      <div class="stats"><div><b>${fmtM(r.total)}</b><small>Distancia</small></div><div><b>${min} min</b><small>A pie</small></div><div><b>${clock(min)}</b><small>Llegada</small></div>${r.indoor?`<div><b>${fmtM(dist2(r.indoor[0],r.indoor[1]))}</b><small>Adentro</small></div>`:''}</div>
      <div class="sec-title">Pasos · toca uno para verlo</div>
      <ol class="steps">${st.map((s,i)=>`<li><button type="button" data-step="${i}"><span class="ic">${STEP_SVG[s.ic]}</span><span><b>${esc(s.t)}</b>${s.s?`<small>${esc(s.s)}</small>`:''}</span><span class="d">${s.d>=5?fmtM(s.d):''}</span></button></li>`).join('')}</ol>`:''}
      ${d.est||d.kind==='code'?`<p class="warn">${d.kind==='code'?'Esta sala no está en UbiCate; te llevo al edificio que el cartel asigna a esas salas.':'Este edificio no está en UbiCate; su posición viene del cartel del campus (±30 m).'}</p>`:''}
      ${originBlock()}<small class="src">${SRC}</small></div>`;
  sbody._steps=st;
  $('goAR') && ($('goAR').onclick=startAR);
  $('stepsBtn').onclick=()=>setSheet(sheet.dataset.state==='full'?'peek':'full');
  $('clearDest').onclick=()=>{ S.dest=null; S.route=null; S.cat=null; S.catHits=[]; $('cats').querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed','false')); setSheet('peek'); drawRoute(); renderSheet(); };
  sbody.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{ const s=sbody._steps[+b.dataset.step]; if(V3.on){ setSheet('peek'); setTimeout(()=>frame([s.at],{minDist:170,dur:800}),60); } });
  measure();
}
sheet.addEventListener('click',e=>{ const b=e.target.closest('[data-o]'); if(!b) return; setOrigin(b.dataset.o); });

/* origin: the sign, the metro entrance, or live GPS (the route is recomputed as you move) */
let gpsWatch=null;
function setOrigin(k){
  if(k==='gps'){
    if(!navigator.geolocation){ toast('Este navegador no entrega tu ubicación.'); return; }
    let first=true;
    const ok=p=>{ const v=xy([p.coords.latitude,p.coords.longitude]);
      if(!pip(v,CAMPUS) && Math.hypot(v[0],v[1])>900){ if(first) toast('Estás fuera del campus. Sigo usando el cartel como punto de partida.'); first=false; return; }
      const moved=!S.originXY||S.origin!=='gps'||dist2(v,S.originXY)>8; S.origin='gps'; S.originXY=v; $('locBtn').setAttribute('aria-pressed','true');
      if(first){ first=false; refresh(); if(V3.on&&!S.route) frame([v],{minDist:260}); } else if(moved) refresh(true); };
    const err=()=>{ toast('No pude leer tu ubicación aquí. Funciona al abrir la app en tu propio dominio con HTTPS.'); if(gpsWatch!=null) navigator.geolocation.clearWatch(gpsWatch); gpsWatch=null; };
    try{ if(gpsWatch!=null) navigator.geolocation.clearWatch(gpsWatch); gpsWatch=navigator.geolocation.watchPosition(ok,err,{enableHighAccuracy:true,maximumAge:2000,timeout:10000}); }catch(e){ err(); }
    return; }
  if(gpsWatch!=null){ navigator.geolocation.clearWatch(gpsWatch); gpsWatch=null; } $('locBtn').setAttribute('aria-pressed','false');
  S.origin=k; S.originXY=ORIGINS[k].xy; refresh();
}
function refresh(silent){ // recompute the best route from the current origin
  if(S.cat) nearest();
  else if(S.dest){ S.route=route(S.originXY,S.dest.xy); drawRoute(!!silent); renderSheet(); }
  else { drawRoute(); renderSheet(); }
}
let toastT=0; function toast(t){ const n=$('toast'); n.textContent=t; n.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>n.hidden=true,4500); }

/* first-visit hint for rotating */
function hideCoach(){ const c=$('coach'); if(!c.hidden){ c.style.opacity=0; setTimeout(()=>c.hidden=true,400); try{ localStorage.setItem('guiaar.coach','1'); }catch(e){} } }
function showCoach(){ let seen=false; try{ seen=!!localStorage.getItem('guiaar.coach'); }catch(e){} if(seen||!matchMedia('(pointer:coarse)').matches) return; const c=$('coach'); c.hidden=false; c.style.opacity=1; setTimeout(hideCoach,6000); }

/* map buttons */
$('compass').onclick=()=>{ if(V3.on) camTo({az:0},650); };
$('tiltBtn').onclick=()=>{ if(!V3.on) return; if(CAM.tilt<.1) camTo({tilt:CAM.tilt3d||.9},650); else { CAM.tilt3d=CAM.tilt; camTo({tilt:0},650); } };
$('rotL').onclick=()=>{ if(V3.on) camTo({az:CAM.az-Math.PI/4},450); };
$('rotR').onclick=()=>{ if(V3.on) camTo({az:CAM.az+Math.PI/4},450); };
$('locBtn').onclick=()=>{ if(S.origin==='gps' && S.originXY && V3.on) frame([S.originXY],{minDist:220}); else setOrigin('gps'); };
$('zin').onclick=()=>V3.on?camTo({dist:CAM.dist*.6},350):zoom(1/1.4);
$('zout').onclick=()=>V3.on?camTo({dist:CAM.dist*1.6},350):zoom(1.4);
$('zfit').onclick=()=>V3.on?frame(CAMPUS):fit(CAMPUS,30);

/* ---------- AR ---------- */
const AR={on:false,real:false,stream:null,watch:null,heading:0,pos:null,demoT:0,raf:0,last:0,wake:null};
const bearing=(a,b)=>((Math.atan2(b[0]-a[0],-(b[1]-a[1]))*180/Math.PI)+360)%360;
const wrap=d=>((d+540)%360)-180;
function poly(){ return S.route.indoor ? [...S.route.walk, S.route.indoor[1]] : S.route.walk; }
function project(pts,p){ let best={d:Infinity}; let acc=0;
  for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1e-6; let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(L*L); t=Math.max(0,Math.min(1,t));
    const q=[a[0]+dx*t,a[1]+dy*t], d=Math.hypot(p[0]-q[0],p[1]-q[1]); if(d<best.d) best={d,i,t,q,along:acc+L*t}; acc+=L; }
  best.total=acc; return best; }
function pointAt(pts,s){ let acc=0; for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(acc+L>=s){ const t=(s-acc)/L; return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; } acc+=L; } return pts[pts.length-1]; }
async function startAR(){
  if(!S.route) return;
  const ar=$('ar'); ar.hidden=false; AR.on=true; $('arrived').hidden=true;
  $('arDest').textContent = `${S.dest.title} · ${S.dest.sub}`;
  $('ptagL').innerHTML = `${esc(S.dest.badge||'')}<small>${esc(S.dest.kind==='bldg'?'':'edificio '+(S.dest.n||CARTNUM[(DATA.places.find(p=>p[0]===S.dest.name)||[])[4]]||''))}</small>`;
  let headingOK=false, gpsOK=false;
  try{ if(typeof DeviceOrientationEvent!=='undefined' && DeviceOrientationEvent.requestPermission){ headingOK = (await DeviceOrientationEvent.requestPermission())==='granted'; } }catch(e){}
  try{ AR.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}); const v=$('cam'); v.srcObject=AR.stream; v.hidden=false; $('fake').hidden=true; }catch(e){ $('cam').hidden=true; $('fake').hidden=false; }
  try{ AR.wake=await navigator.wakeLock?.request('screen'); }catch(e){}
  const onOri=e=>{ let h=null; if(e.webkitCompassHeading!=null) h=e.webkitCompassHeading; else if(e.absolute && e.alpha!=null) h=360-e.alpha; if(h!=null){ headingOK=true; AR.sensorHeading=h; } };
  AR.onOri=onOri; addEventListener('deviceorientationabsolute',onOri); addEventListener('deviceorientation',onOri);
  gpsOK = await new Promise(res=>{ if(!navigator.geolocation) return res(false); let done=false;
    try{ AR.watch=navigator.geolocation.watchPosition(p=>{ AR.gpsPos=xy([p.coords.latitude,p.coords.longitude]); AR.acc=p.coords.accuracy; if(!done){done=true;res(true);} }, ()=>{ if(!done){done=true;res(false);} }, {enableHighAccuracy:true,maximumAge:1000,timeout:9000}); }catch(e){ res(false); }
    setTimeout(()=>{ if(!done){done=true;res(false);} },6000); });
  if(!AR.on) return;
  AR.real = gpsOK && headingOK && AR.gpsPos && Math.hypot(...AR.gpsPos)<1200;
  $('arMode').hidden=false;
  $('arMode').textContent = AR.real ? `GPS ±${Math.round(AR.acc||0)} m` : (gpsOK? 'Demo · estás lejos del campus' : 'Demo · sin cámara ni GPS en esta vista');
  AR.demoT=0; AR.last=performance.now(); AR.raf=requestAnimationFrame(tick);
}
function stopAR(){ AR.on=false; cancelAnimationFrame(AR.raf); $('ar').hidden=true;
  AR.stream?.getTracks().forEach(t=>t.stop()); AR.stream=null; if(AR.watch!=null) navigator.geolocation.clearWatch(AR.watch); AR.watch=null;
  removeEventListener('deviceorientationabsolute',AR.onOri); removeEventListener('deviceorientation',AR.onOri); try{AR.wake?.release();}catch(e){} }
$('arClose').onclick=stopAR; $('arrOk').onclick=stopAR;
const TURN_SVG = {
  straight:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5M6 10l6-6 6 6"/></svg>',
  left:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-7a3 3 0 0 0-3-3H5M9 6l-4 4 4 4"/></svg>',
  right:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20v-7a3 3 0 0 1 3-3h8M15 6l4 4-4 4"/></svg>',
  door:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M13 12h.01"/></svg>'};
let lastTurnKey='';
function tick(now){
  if(!AR.on) return; const dt=Math.min(.1,(now-AR.last)/1000); AR.last=now;
  const pts=poly(); let pos, heading;
  if(AR.real){ pos=AR.gpsPos; heading=AR.sensorHeading;
    const pr=project(S.route.walk,pos); if(pr.d>28 && !AR.rerouting){ AR.rerouting=true; const r=route(pos,S.dest.xy); if(r){ S.route=r; drawRoute(); } setTimeout(()=>AR.rerouting=false,4000); } }
  else { AR.demoT+=dt*5.5; const total=project(pts,pts[0]).total; const s=Math.min(AR.demoT,total); pos=pointAt(pts,s);
    const ahead=pointAt(pts,Math.min(total,s+6)); heading=bearing(pos,ahead)+Math.sin(now/1300)*38+Math.sin(now/530)*6; if(s>=total) heading=bearing(pts[pts.length-2],pts[pts.length-1]); }
  AR.heading=heading;
  const pr=project(pts,pos), remain=Math.max(0,pr.total-pr.along);
  const target=pointAt(pts,Math.min(pr.total,pr.along+14));
  const rel=wrap(bearing(pos,target)-heading);
  $('arrow').style.transform=`rotateX(62deg) rotateZ(${rel.toFixed(1)}deg)`;
  // floating destination tag
  const rd=wrap(bearing(pos,S.dest.xy)-heading), FOV=34;
  if(Math.abs(rd)<=FOV){ $('ptag').hidden=false; $('edge').hidden=true; $('ptag').style.left=(50+rd/FOV*42)+'%'; }
  else { $('ptag').hidden=true; const e=$('edge'); e.hidden=false; e.textContent = rd>0 ? 'Destino a tu derecha ›' : '‹ Destino a tu izquierda'; e.style.left = rd>0?'auto':'max(12px, env(safe-area-inset-left,0px))'; e.style.right = rd>0?'max(12px, env(safe-area-inset-right,0px))':'auto'; }
  // next instruction
  let acc=0, turn=null; const walkEnd = S.route.indoor ? S.route.walk.length-1 : -1;
  for(let i=pr.i+1;i<pts.length-1;i++){ const a=pts[i-1],b=pts[i],c=pts[i+1]; const ang=wrap(bearing(b,c)-bearing(a,b)); const dist=project(pts,b).along-pr.along;
    if(i===walkEnd){ turn={type:'door',dist}; break; } if(Math.abs(ang)>32){ turn={type:ang>0?'right':'left',dist}; break; } }
  let T,Sb,ic;
  if(remain<12){ T='Llegaste'; Sb=S.dest.title; ic='door'; }
  else if(turn && turn.dist<90){ const dd=Math.max(0,Math.round(turn.dist/5)*5); ic=turn.type; T = turn.type==='door' ? (dd<8?'Entra al edificio':`Entrada en ${dd} m`) : (dd<8?`Gira a la ${turn.type==='left'?'izquierda':'derecha'}`:`En ${dd} m, a la ${turn.type==='left'?'izquierda':'derecha'}`); Sb = turn.type==='door'? (S.dest.floor?`Luego sube al piso ${S.dest.floor}`:'Tu destino está adentro') : 'Sigue la flecha'; }
  else { ic='straight'; T='Sigue derecho'; Sb=`por ${fmtM(turn?turn.dist:remain)}`; }
  if(ic+T!==lastTurnKey){ $('turnIc').innerHTML=TURN_SVG[ic]; $('instrT').textContent=T; lastTurnKey=ic+T; } $('instrS').textContent=Sb;
  $('arDist').textContent=fmtM(remain); $('arEta').textContent=`· ${Math.max(1,Math.ceil(remain/1.25/60))} min`;
  // fake camera floor
  if(!$('fake').hidden) $('floor').style.transform=`rotateX(72deg) rotateZ(${(-heading).toFixed(1)}deg) translateY(${(-(pr.along*12)%60).toFixed(1)}px)`;
  // minimap (heading-up)
  const k=.5; const m=$('mini'); m.innerHTML = `<g transform="rotate(${-heading})">`+
    `<polyline points="${pts.map(p=>((p[0]-pos[0])*k).toFixed(1)+','+((p[1]-pos[1])*k).toFixed(1)).join(' ')}" fill="none" stroke="#5B9AEB" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`+
    `<circle cx="${((S.dest.xy[0]-pos[0])*k).toFixed(1)}" cy="${((S.dest.xy[1]-pos[1])*k).toFixed(1)}" r="4" fill="#F2D10F"/></g><path d="M0 -9 7 7 0 3 -7 7Z" fill="#fff"/>`;
  if(remain<12 && $('arrived').hidden){ $('arrived').hidden=false; $('arrT').textContent='Llegaste a '+S.dest.title; $('arrS').textContent=[S.dest.sub, S.dest.floor?`Piso ${S.dest.floor}`:''].filter(Boolean).join(' · '); }
  AR.raf=requestAnimationFrame(tick);
}

/* ---------- 3D map (three.js) ---------- */
const V3 = { ok:false, on:false, t:0 };
const isDark = () => { const a=document.documentElement.getAttribute('data-theme'); return a ? a==='dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
const PAL = {
  light:{ bg:0xE8EAEB, ground:0xE4E6E7, campus:0xDEE1E2, grass:0xC4DBBE, pitch:0xD3E5CC, water:0x9CC2D6, road:0xF8F8F8, svc:0xF4F4F4, foot:0xFDFDFD,
    city:0xD6D4CF, bone:0xE6E1D6, concrete:0xC9C5BE, modern:0xDAD7D1, glass:0x9FB8C2, copper2:0xB98A68, wood:0xC2A37C, metal:0xCDD2D6, green:0x9BC48F, hi:0xF2D10F,
    neon:[0.0,0.72,1.0], hemi:.66, sun:.42, bloom:.45, bloomR:.25 },
  dark:{ bg:0x12161D, ground:0x161A21, campus:0x1A1F27, grass:0x1D3125, pitch:0x21382A, water:0x183243, road:0x2A303A, svc:0x252B34, foot:0x303742,
    city:0x262B33, bone:0x464B53, concrete:0x484B51, modern:0x4C5057, glass:0x3B5563, copper2:0x6B4733, wood:0x66533D, metal:0x4A5159, green:0x2D4A2A, hi:0xE8C60C,
    neon:[0.05,0.85,1.0], hemi:.5, sun:.32, bloom:1.15, bloomR:.5 }
};
const pal = () => PAL[isDark()?'dark':'light'];
const neonC = () => new THREE.Color().fromArray(pal().neon);

function mergeGeos(geos, withColor){
  let n=0; const parts=geos.map(g=>{ const ng=g.index?g.toNonIndexed():g; n+=ng.attributes.position.count; return ng; });
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3); let o=0;
  parts.forEach(g=>{ pos.set(g.attributes.position.array,o*3); if(g.attributes.normal) nor.set(g.attributes.normal.array,o*3); o+=g.attributes.position.count; g.dispose(); });
  const m=new THREE.BufferGeometry(); m.setAttribute('position',new THREE.BufferAttribute(pos,3)); m.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  if(withColor) m.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3),3));
  return m;
}
const ringPts = r => { const pts=r.slice(); const a=pts[0], b=pts[pts.length-1]; if(Math.hypot(a[0]-b[0],a[1]-b[1])<0.01) pts.pop(); return pts; };
const shapeOf = r => new THREE.Shape(ringPts(r).map(([x,y])=>new THREE.Vector2(x,-y)));
function flatGeo(rings){ const gs=[]; rings.forEach(r=>{ if(r.length<4) return; const g=new THREE.ShapeGeometry(shapeOf(r)); g.rotateX(-Math.PI/2); gs.push(g); }); return mergeGeos(gs); }
function ribbonGeo(lines,w){
  const pos=[]; const q=(a,b,c)=>pos.push(a[0],0,a[1],b[0],0,b[1],c[0],0,c[1]);
  for(const l of lines){ for(let i=0;i<l.length-1;i++){ const a=l[i],b=l[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L*w/2,ny=dx/L*w/2;
      const p1=[a[0]+nx,a[1]+ny],p2=[a[0]-nx,a[1]-ny],p3=[b[0]+nx,b[1]+ny],p4=[b[0]-nx,b[1]-ny]; q(p1,p3,p2); q(p3,p4,p2); }
    for(let i=1;i<l.length-1;i++){ const c=l[i]; for(let k=0;k<8;k++){ const a0=k/8*Math.PI*2,a1=(k+1)/8*Math.PI*2; q(c,[c[0]+Math.cos(a1)*w/2,c[1]+Math.sin(a1)*w/2],[c[0]+Math.cos(a0)*w/2,c[1]+Math.sin(a0)*w/2]); } } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const nor=new Float32Array(pos.length); for(let i=1;i<nor.length;i+=3) nor[i]=1; g.setAttribute('normal',new THREE.BufferAttribute(nor,3)); return g;
}
function obbHalves(r, gap){ // two boxes along the long axis of a footprint (for the split "Torres Siamesas")
  const pts=ringPts(r); let best=0,u=[1,0];
  for(let i=0;i<pts.length;i++){ const a=pts[i],b=pts[(i+1)%pts.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L>best){best=L;u=[(b[0]-a[0])/L,(b[1]-a[1])/L];} }
  const v=[-u[1],u[0]]; let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
  pts.forEach(p=>{const pu=p[0]*u[0]+p[1]*u[1],pv=p[0]*v[0]+p[1]*v[1];u0=Math.min(u0,pu);u1=Math.max(u1,pu);v0=Math.min(v0,pv);v1=Math.max(v1,pv);});
  const P=(a,b)=>[u[0]*a+v[0]*b,u[1]*a+v[1]*b], m=(u0+u1)/2, sh=(v1-v0)*.08;
  return [[P(u0,v0+sh),P(m-gap/2,v0+sh),P(m-gap/2,v1-sh),P(u0,v1-sh)],[P(m+gap/2,v0+sh),P(u1,v0+sh),P(u1,v1-sh),P(m+gap/2,v1-sh)]];
}
function badgeTexture(text, bg, fg, border){
  const s=4, pad=7*s, sh=4*s; const c=document.createElement('canvas'); const x0=c.getContext('2d');
  x0.font=`600 ${12*s}px "Fira Sans Condensed","Arial Narrow",sans-serif`; const tw=x0.measureText(text).width;
  const bw=Math.max(20*s, tw+pad*2), bh=20*s; c.width=bw+sh*2; c.height=bh+sh*2; const x=c.getContext('2d');
  x.shadowColor='rgba(15,25,40,.28)'; x.shadowBlur=3*s; x.shadowOffsetY=1*s;
  x.fillStyle=bg; x.beginPath(); x.roundRect ? x.roundRect(sh,sh,bw,bh,bh/2) : x.rect(sh,sh,bw,bh); x.fill();
  x.shadowColor='transparent'; if(border){ x.strokeStyle=border; x.lineWidth=s*.75; x.stroke(); }
  x.fillStyle=fg; x.font=`600 ${12*s}px "Fira Sans Condensed","Arial Narrow",sans-serif`; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,c.width/2,c.height/2+s*.6);
  const t=new THREE.CanvasTexture(c); t.anisotropy=4; t.minFilter=THREE.LinearFilter; return {t, aspect:c.width/c.height};
}
function sprite(text,bg,fg,border,size=.032){ const {t,aspect}=badgeTexture(text,bg,fg,border);
  const m=new THREE.SpriteMaterial({map:t,depthTest:false,depthWrite:false,sizeAttenuation:false,transparent:true}); m.color.setScalar(isDark()?.84:1); const s=new THREE.Sprite(m); s.scale.set(size*aspect,size,1); s.renderOrder=10; return s; }

/* camera: target on the ground, distance, azimuth (0 = looking north) and tilt (0 = straight down) */
const CAM = { tx:0, tz:60, dist:1050, az:.35, tilt:.9, tilt3d:.9, vx:0, vz:0, anim:null };
const TILT_MAX = 1.22, D_MIN = 45, D_MAX = 2000;
const wrapRad = a => Math.atan2(Math.sin(a),Math.cos(a));
function applyCam(){
  CAM.dist=Math.min(D_MAX,Math.max(D_MIN,CAM.dist)); CAM.tilt=Math.min(TILT_MAX,Math.max(.0015,CAM.tilt));
  const st=Math.sin(CAM.tilt), ct=Math.cos(CAM.tilt);
  V3.cam.position.set(CAM.tx+CAM.dist*st*Math.sin(CAM.az), CAM.dist*ct, CAM.tz+CAM.dist*st*Math.cos(CAM.az));
  V3.cam.up.set(0,1,0); if(CAM.tilt<.02) V3.cam.up.set(-Math.sin(CAM.az),0,-Math.cos(CAM.az));
  V3.cam.lookAt(CAM.tx,0,CAM.tz); V3.cam.updateMatrixWorld(); V3.dirty=true;
}
let _ray, _plane, _v;
function groundAt(px,py){ const r=V3.renderer.domElement.getBoundingClientRect(); _ray.setFromCamera({x:(px-r.left)/r.width*2-1,y:-(py-r.top)/r.height*2+1},V3.cam);
  return _ray.ray.intersectPlane(_plane,_v) ? _v.clone() : null; }
function camTo(to, dur=900){ // animate any of tx,tz,dist,az,tilt
  const from={tx:CAM.tx,tz:CAM.tz,dist:CAM.dist,az:CAM.az,tilt:CAM.tilt}; const goal={...from,...to}; goal.az=from.az+wrapRad(goal.az-from.az);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) dur=1;
  CAM.anim={t0:performance.now(),dur,from,goal}; CAM.vx=CAM.vz=0;
}
/* frame a set of ground points inside the part of the screen that is not covered by the search bar or the sheet */
function frame(pts, opts={}){
  if(!pts.length) return; let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity; pts.forEach(([x,z])=>{x0=Math.min(x0,x);z0=Math.min(z0,z);x1=Math.max(x1,x);z1=Math.max(z1,z);});
  const W=V3.host.clientWidth||400, H=V3.host.clientHeight||700, desk=W>=860;
  const topPx=desk?16:(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h'))||110), botPx=desk?16:(sheet.offsetHeight||180), leftPx=desk?432:0;
  const visW=W-leftPx-24-(desk?0:72), visH=Math.max(160,H-topPx-botPx-24);
  const tilt=opts.tilt!=null?opts.tilt:CAM.tilt, az=opts.az!=null?opts.az:CAM.az;
  const ca=Math.cos(az), sa=Math.sin(az); let w=0,h=0; [[x0,z0],[x1,z0],[x0,z1],[x1,z1]].forEach(([x,z])=>{ const cx=(x0+x1)/2,cz=(z0+z1)/2, u=(x-cx)*ca-(z-cz)*sa, v=(x-cx)*sa+(z-cz)*ca; w=Math.max(w,Math.abs(u)*2); h=Math.max(h,Math.abs(v)*2); });
  const fov=V3.cam.fov*Math.PI/180, vh=2*Math.tan(fov/2), tiltK=1+Math.sin(tilt)*.45;
  const need=Math.max(opts.min||0, (h*tiltK+30)/(vh*visH/H), (w*(1+.35*Math.sin(tilt))+50)/(vh*(visW/H)));
  const dist=Math.min(D_MAX,Math.max(opts.minDist||150,need));
  const mpp=dist*vh/H; const shiftPx=(botPx-topPx)/2 + (desk? 0:0), shiftX=desk?-(leftPx/2):36;
  const cx=(x0+x1)/2, cz=(z0+z1)/2;
  // screen-down is +(sin az, cos az) on the ground; screen-right is (cos az, -sin az)
  const tx=cx+Math.sin(az)*shiftPx*mpp*(1/Math.max(.35,Math.cos(tilt))) + Math.cos(az)*shiftX*mpp, tz=cz+Math.cos(az)*shiftPx*mpp*(1/Math.max(.35,Math.cos(tilt))) - Math.sin(az)*shiftX*mpp;
  camTo({tx,tz,dist,tilt,az},opts.dur||1000);
}

function init3D(){
  if(!window.THREE) return false;
  _ray=new THREE.Raycaster(); _plane=new THREE.Plane(new THREE.Vector3(0,1,0),0); _v=new THREE.Vector3();
  const host=$('map3d'); let renderer;
  try{ renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }catch(e){ return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(38,1,2,7000);
  Object.assign(V3,{renderer,scene,cam,host});
  V3.hemi=new THREE.HemisphereLight(0xffffff,0x8d939b,.6); scene.add(V3.hemi);
  const sun=new THREE.DirectionalLight(0xfff6ea,.45); sun.position.set(-240,560,-420); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-700,right:700,top:700,bottom:-700,near:40,far:1800}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.8;
  scene.add(sun,sun.target); V3.sun=sun;
  const layer=(geo,key,order)=>{ const m=new THREE.MeshLambertMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:-order,polygonOffsetUnits:-order*2,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,m); mesh.receiveShadow=true; mesh.userData.key=key; scene.add(mesh); (V3.layers=V3.layers||[]).push(mesh); return mesh; };
  const pg=new THREE.PlaneGeometry(6000,6000); pg.rotateX(-Math.PI/2); layer(pg,'ground',0);
  layer(flatGeo([CAMPUS]),'campus',1); layer(flatGeo(OSM.grass),'grass',2); layer(flatGeo(OSM.pitch),'pitch',3); layer(flatGeo(OSM.water),'water',4);
  layer(ribbonGeo(OSM.road,9),'road',5); layer(ribbonGeo(OSM.svc,4),'svc',6); layer(ribbonGeo(OSM.foot,1.8),'foot',7);
  const geos=[], keys=[], owner=[]; V3.bh=[];
  const addB=(ring,h,base,key,idx)=>{ if(ring.length<4||h<=0) return; const g=new THREE.ExtrudeGeometry(shapeOf(ring),{depth:h,bevelEnabled:false}); g.rotateX(-Math.PI/2); if(base) g.translate(0,base,0);
    const ng=g.index?g.toNonIndexed():g; if(ng!==g) g.dispose(); geos.push(ng); keys.push([key,ng.attributes.position.count]); owner.push([idx,ng.attributes.position.count]); };
  let luk=null;
  OSM.bld.forEach((r,i)=>{ const [h,key,sp]=DATA.osm.bh[i]; V3.bh[i]=h;
    if(sp==='siam'){ addB(r,26,0,key,i); obbHalves(r,3.2).forEach(q=>addB([...q,q[0]],10.6,26,key,i)); V3.bh[i]=36.6; }
    else addB(r,h,0,key,i);
    if(sp==='luksic' && !luk){ const pts=ringPts(r); luk=pts.reduce((s,p)=>[s[0]+p[0],s[1]+p[1]],[0,0]).map(v=>v/pts.length); } });
  const bg=mergeGeos(geos,true); V3.bKeys=keys; V3.owner=new Int32Array(bg.attributes.position.count); let o=0; owner.forEach(([idx,n])=>{V3.owner.fill(idx,o,o+n); o+=n;});
  V3.bMesh=new THREE.Mesh(bg,new THREE.MeshLambertMaterial({vertexColors:true})); V3.bMesh.castShadow=true; V3.bMesh.receiveShadow=true; scene.add(V3.bMesh);
  if(luk){ const cyl=new THREE.Mesh(new THREE.CylinderGeometry(7.5,7.5,10,48),new THREE.MeshLambertMaterial({color:0xB8734A})); cyl.position.set(luk[0],5,luk[1]); cyl.castShadow=true; scene.add(cyl); }
  // number badges from the campus sign; decluttered every few frames
  V3.labels=[];
  DATA.cart.forEach(c=>{ if(/^8[a-j]$/.test(c.n)) return; const lib=c.n.startsWith('L'), fac=!lib && /^\d+$/.test(c.n) && +c.n<=19;
    const s=sprite(lib?'Bib':c.n, lib?'#F5D428':fac?'#2F6FDE':'#FFFFFF', lib?'#1B1F12':fac?'#FFFFFF':'#2A3442', lib||fac?null:'#C9D1DB', .027);
    const bi=OSM.bld.findIndex(r=>pip(c.xy,r)); s.position.set(c.xy[0],(bi>=0?V3.bh[bi]:4)+5,c.xy[1]); s.userData={n:c.n,bi,prio:fac?3:lib?2:1}; scene.add(s); V3.labels.push(s); });
  V3.dyn=new THREE.Group(); scene.add(V3.dyn);
  try{ const rt=new THREE.WebGLRenderTarget(2,2,{type:THREE.HalfFloatType}); const comp=new THREE.EffectComposer(renderer,rt); comp.addPass(new THREE.RenderPass(scene,cam));
    V3.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),1,.55,.97); comp.addPass(V3.bloom); V3.composer=comp; }catch(e){ V3.composer=null; }
  applyTheme3D(false);
  new ResizeObserver(resize3D).observe(host); resize3D();
  bindGestures(renderer.domElement);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>applyTheme3D(true));
  new MutationObserver(()=>applyTheme3D(true)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  V3.ok=true; V3.on=true; applyCam(); requestAnimationFrame(loop3D); return true;
}

/* gestures: one finger pans; two fingers pinch-zoom and twist to rotate, or slide up/down together to tilt.
   Mouse: drag pans, right-drag (or Shift/Ctrl + drag) rotates and tilts, wheel zooms toward the pointer. */
function bindGestures(el){
  const P=new Map(); let g=null, tap=null, lastMove=0;
  const pts=()=>[...P.values()];
  el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointerdown',e=>{ el.setPointerCapture(e.pointerId); P.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY}); CAM.anim=null; CAM.vx=CAM.vz=0; el.classList.add('drag'); hideCoach();
    const rot = e.pointerType==='mouse' && (e.button===2 || e.shiftKey || e.ctrlKey || e.metaKey);
    if(P.size===1){ g={mode:rot?'rotate':'pan'}; tap={x:e.clientX,y:e.clientY,t:performance.now()}; }
    else { tap=null; const [a,b]=pts(); g={mode:'two',pending:true,d:Math.hypot(a.x-b.x,a.y-b.y),ang:Math.atan2(b.y-a.y,b.x-a.x),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2}; } });
  el.addEventListener('pointermove',e=>{ const p=P.get(e.pointerId); if(!p||!g) return; const px=p.x,py=p.y; p.x=e.clientX; p.y=e.clientY;
    if(tap && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>7) tap=null;
    if(g.mode==='pan' && P.size===1){ const a=groundAt(px,py), b=groundAt(p.x,p.y); if(a&&b){ const now=performance.now(), dt=Math.max(8,now-lastMove); lastMove=now;
        CAM.tx+=a.x-b.x; CAM.tz+=a.z-b.z; CAM.vx=(a.x-b.x)/dt; CAM.vz=(a.z-b.z)/dt; applyCam(); } }
    else if(g.mode==='rotate' && P.size===1){ CAM.az-=(p.x-px)*.006; CAM.tilt-=(p.y-py)*.005; applyCam(); }
    else if(g.mode==='two' && P.size>=2){ const [a,b]=pts(), d=Math.hypot(a.x-b.x,a.y-b.y), ang=Math.atan2(b.y-a.y,b.x-a.x), cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
      if(g.pending){ const ady=(a.y-a.y0), bdy=(b.y-b.y0), adx=(a.x-a.x0), bdx=(b.x-b.x0);
        if(Math.max(Math.abs(ady),Math.abs(bdy),Math.abs(adx),Math.abs(bdx),Math.abs(d-g.d))>9){
          g.pending=false; g.tilt = Math.sign(ady)===Math.sign(bdy) && Math.abs(ady)>1.6*Math.abs(adx) && Math.abs(bdy)>1.6*Math.abs(bdx) && Math.abs(d-g.d)<.45*Math.min(Math.abs(ady),Math.abs(bdy))+6; } }
      if(!g.pending){
        if(g.tilt){ CAM.tilt-=(cy-g.cy)*.0065; applyCam(); }
        else { const before=groundAt(g.cx,g.cy); CAM.dist*=g.d/Math.max(1,d); CAM.az+=wrapRad(ang-g.ang); applyCam();
          const after=groundAt(cx,cy); if(before&&after){ CAM.tx+=before.x-after.x; CAM.tz+=before.z-after.z; applyCam(); } } }
      g.d=d; g.ang=ang; g.cx=cx; g.cy=cy; } });
  const end=e=>{ if(!P.has(e.pointerId)) return; P.delete(e.pointerId); if(!P.size) el.classList.remove('drag');
    if(P.size===1){ const [q]=pts(); g={mode:'pan'}; q.x0=q.x; q.y0=q.y; }
    if(!P.size){ if(performance.now()-lastMove>80){ CAM.vx=CAM.vz=0; } g=null;
      if(tap && e.type==='pointerup' && performance.now()-tap.t<450){ CAM.vx=CAM.vz=0; pick3D(e.clientX,e.clientY); } tap=null; } };
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end);
  el.addEventListener('wheel',e=>{ e.preventDefault(); CAM.anim=null; const before=groundAt(e.clientX,e.clientY); CAM.dist*=Math.exp(e.deltaY*.0016); applyCam();
    const after=groundAt(e.clientX,e.clientY); if(before&&after){ CAM.tx+=before.x-after.x; CAM.tz+=before.z-after.z; applyCam(); } },{passive:false});
  el.addEventListener('dblclick',e=>{ const p=groundAt(e.clientX,e.clientY); if(p) camTo({tx:p.x,tz:p.z,dist:CAM.dist*.5},500); });
}
function pick3D(x,y){
  const r=V3.renderer.domElement.getBoundingClientRect(); _ray.setFromCamera({x:(x-r.left)/r.width*2-1,y:-(y-r.top)/r.height*2+1},V3.cam);
  const vis=[...V3.labels.filter(s=>s.visible),...(V3.hitSprites||[])];
  const hl=_ray.intersectObjects(vis); if(hl.length){ const u=hl[0].object.userData; if(u.item) return choose(u.item); if(u.bi>=0) return selectBuilding(u.bi); return choose(items.find(i=>i.kind==='bldg'&&i.n===u.n)); }
  const hb=_ray.intersectObject(V3.bMesh); if(hb.length) return selectBuilding(V3.owner[hb[0].face.a]);
  if(S.info){ S.info=null; drawRoute(); renderSheet(); }
}
function applyTheme3D(resync){
  const p=pal(); V3.scene.background=new THREE.Color(p.bg); V3.scene.fog=new THREE.Fog(p.bg,1600,4400);
  V3.layers.forEach(m=>m.material.color.setHex(p[m.userData.key]));
  const col=V3.bMesh.geometry.attributes.color, pos=V3.bMesh.geometry.attributes.position, nor=V3.bMesh.geometry.attributes.normal; let o=0; const c=new THREE.Color();
  V3.bKeys.forEach(([key,n])=>{ c.setHex(p[key]); for(let i=o;i<o+n;i++){ const y=pos.getY(i), roof=nor.getY(i)>.5; const ao=roof?1.04:(.8+.2*Math.min(1,y/7)); col.setXYZ(i,Math.min(.97,c.r*ao),Math.min(.97,c.g*ao),Math.min(.97,c.b*ao)); } o+=n; });
  col.needsUpdate=true; V3.hemi.intensity=p.hemi; V3.sun.intensity=p.sun; if(V3.bloom){ V3.bloom.strength=p.bloom; V3.bloom.radius=p.bloomR; }
  V3.labels.forEach(l=>l.material.color.setScalar(isDark()?.84:1));
  if(resync) sync3D(true); V3.dirty=true;
}
function resize3D(){ const w=V3.host.clientWidth||1,h=V3.host.clientHeight||1; V3.renderer.setSize(w,h,false); V3.cam.aspect=w/h; V3.cam.updateProjectionMatrix();
  if(V3.composer){ V3.composer.setPixelRatio?.(Math.min(devicePixelRatio,2)); V3.composer.setSize(w,h); } V3.dirty=true; }

function extrudeOf(bi, extra=0){ const top=V3.bh[bi]||4; const g=new THREE.ExtrudeGeometry(shapeOf(OSM.bld[bi]),{depth:top+extra,bevelEnabled:false}); g.rotateX(-Math.PI/2); return g; }
function sync3D(noFly){
  if(!V3.ok) return; const p=pal();
  V3.dyn.children.slice().forEach(o=>{ V3.dyn.remove(o); o.geometry?.dispose(); });
  V3.neon=[]; V3.hitSprites=[]; V3.selBi=-1;
  S.catHits.forEach(h=>{ const s=sprite(h.badge&&h.badge.length<5?h.badge:'•','#2F6FDE','#FFFFFF',null,.024); const bi=OSM.bld.findIndex(r=>pip(h.xy,r)); s.position.set(h.xy[0],(bi>=0?V3.bh[bi]:0)+3,h.xy[1]); s.userData={item:h}; V3.dyn.add(s); V3.hitSprites.push(s); });
  if(S.originXY){ const gps=S.origin==='gps', colr=gps?0x2C8CFF:0xF0584C;
    const ring=new THREE.Mesh(new THREE.RingGeometry(4,5.4,48),new THREE.MeshBasicMaterial({color:colr,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2; ring.position.set(S.originXY[0],.6,S.originXY[1]); ring.userData.pulse=true; V3.dyn.add(ring);
    const dot=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.8,1.2,32),new THREE.MeshBasicMaterial({color:colr})); dot.position.set(S.originXY[0],.7,S.originXY[1]); V3.dyn.add(dot);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.6,1,32),new THREE.MeshBasicMaterial({color:0xffffff})); rim.position.set(S.originXY[0],.5,S.originXY[1]); V3.dyn.add(rim); }
  // selected building (info card): soft yellow outline volume
  if(S.info && S.info.bi>=0){ const m=new THREE.Mesh(extrudeOf(S.info.bi,.4),new THREE.MeshLambertMaterial({color:p.hi,transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4})); V3.dyn.add(m); V3.selBi=S.info.bi; }
  if(S.dest){ const bi=OSM.bld.findIndex(r=>pip(S.dest.xy,r)); const top=bi>=0?V3.bh[bi]:0; V3.selBi=bi;
    if(bi>=0){ const m=new THREE.Mesh(extrudeOf(bi,.05),new THREE.MeshLambertMaterial({color:p.hi,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4})); m.castShadow=true; V3.dyn.add(m); }
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,130,32,1,true),neonMat(BEAM_FS,{transparent:true,depthWrite:false,blending:isDark()?THREE.AdditiveBlending:THREE.NormalBlending,side:THREE.DoubleSide}));
    beam.position.set(S.dest.xy[0],65,S.dest.xy[1]); V3.dyn.add(beam); V3.neon.push(beam);
    const s=sprite(S.dest.badge||'•','#F5D428','#1B1F12',null,.034); s.position.set(S.dest.xy[0],top+16,S.dest.xy[1]); s.userData={item:S.dest,prio:9}; s.renderOrder=12; V3.dyn.add(s); V3.destSprite=s; }
  else V3.destSprite=null;
  if(S.route){ const pts=(S.route.indoor?[...S.route.walk,S.route.indoor[1]]:S.route.walk).map(q=>new THREE.Vector3(q[0],1.8,q[1]));
    const clean=[pts[0]]; pts.slice(1).forEach(v=>{ if(v.distanceTo(clean[clean.length-1])>.8) clean.push(v); });
    if(clean.length>1){ const curve=new THREE.CatmullRomCurve3(clean,false,'centripetal'); const L=curve.getLength(), seg=Math.min(900,Math.max(60,Math.round(L/1.5)));
      const core=new THREE.Mesh(new THREE.TubeGeometry(curve,seg,.7,10,false),neonMat(CORE_FS)); core.material.uniforms.uLen.value=L;
      const glow=new THREE.Mesh(new THREE.TubeGeometry(curve,seg,3.1,14,false),neonMat(GLOW_FS,{transparent:true,depthWrite:false,blending:isDark()?THREE.AdditiveBlending:THREE.NormalBlending})); glow.material.uniforms.uLen.value=L;
      const floorPts=curve.getSpacedPoints(seg).map(v=>[v.x,v.z]); const fl=new THREE.Mesh(ribbonGeo([floorPts],6),new THREE.MeshBasicMaterial({color:neonC().multiplyScalar(.9),transparent:true,opacity:isDark()?.22:.28,depthWrite:false,blending:isDark()?THREE.AdditiveBlending:THREE.NormalBlending,polygonOffset:true,polygonOffsetFactor:-9,polygonOffsetUnits:-18}));
      fl.position.y=.05; V3.dyn.add(fl,glow,core); V3.neon.push(core,glow); } }
  V3.declutterAt=0; V3.dirty=true;
  if(noFly) return;
  if(S.route) frame([...S.route.walk.map(q=>[q[0],q[1]]),S.dest.xy],{minDist:220});
  else if(S.info) frame(ringPts(OSM.bld[S.info.bi]),{minDist:330});
  else if(S.dest) frame([S.dest.xy],{minDist:200});
}
/* show fewer numbers when zoomed out and never let two badges overlap */
function declutter(){
  const H=V3.host.clientHeight||1, W=V3.host.clientWidth||1, kpx=H/(2*Math.tan(V3.cam.fov*Math.PI/360));
  const boxes=[]; const v=new THREE.Vector3();
  if(V3.destSprite){ v.copy(V3.destSprite.position).project(V3.cam); const hh=V3.destSprite.scale.y*kpx, ww=V3.destSprite.scale.x*kpx; boxes.push([(v.x+1)/2*W-ww/2,(1-v.y)/2*H-hh/2,ww,hh]); }
  const minPrio = CAM.dist>1300?3 : CAM.dist>650?2 : 1;
  const order=[...V3.labels].sort((a,b)=>b.userData.prio-a.userData.prio);
  order.forEach(s=>{ const u=s.userData; if(u.prio<minPrio || u.bi===V3.selBi){ s.visible=false; return; }
    v.copy(s.position).project(V3.cam); if(v.z>1||v.x<-1.1||v.x>1.1||v.y<-1.1||v.y>1.1){ s.visible=false; return; }
    const hh=s.scale.y*kpx+4, ww=s.scale.x*kpx+4, x=(v.x+1)/2*W-ww/2, y=(1-v.y)/2*H-hh/2;
    const hit=boxes.some(b=>x<b[0]+b[2]&&x+ww>b[0]&&y<b[1]+b[3]&&y+hh>b[1]); s.visible=!hit; if(!hit) boxes.push([x,y,ww,hh]); });
}
function loop3D(now){
  requestAnimationFrame(loop3D);
  if(!V3.on || AR.on || document.hidden) return;
  const dt=Math.min(50,now-(V3.last||now)); V3.last=now; V3.t=now/1000;
  if(CAM.anim){ const a=CAM.anim, k=Math.min(1,(now-a.t0)/a.dur), e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    for(const key of ['tx','tz','dist','az','tilt']) CAM[key]=a.from[key]+(a.goal[key]-a.from[key])*e; applyCam(); if(k>=1) CAM.anim=null; }
  else if(Math.abs(CAM.vx)+Math.abs(CAM.vz)>.0005){ CAM.tx+=CAM.vx*dt; CAM.tz+=CAM.vz*dt; const f=Math.pow(.92,dt/16); CAM.vx*=f; CAM.vz*=f; applyCam(); }
  (V3.neon||[]).forEach(m=>m.material.uniforms.uTime.value=V3.t);
  V3.dyn.children.forEach(o=>{ if(o.userData.pulse){ const ph=(V3.t*.8)%1, s=1+ph*1.6; o.scale.set(s,s,s); o.material.opacity=1-ph; } });
  if(now-(V3.declutterAt||0)>120 || V3.dirty){ declutter(); V3.declutterAt=now; }
  const cp=$('compass').firstElementChild; cp.style.transform=`rotate(${CAM.az}rad)`;
  const td=CAM.tilt<.1; const tb=$('tiltBtn'); const want=td?'3D':'2D'; if(tb.textContent!==want){ tb.textContent=want; tb.setAttribute('aria-label',td?'Ver el mapa en 3D':'Ver el mapa desde arriba'); }
  V3.dirty=false;
  V3.composer ? V3.composer.render() : V3.renderer.render(V3.scene,V3.cam);
}
const NEON_VS=`varying vec2 vUv; varying vec3 vN; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const CORE_FS=`uniform float uTime; uniform float uLen; uniform vec3 uColor; varying vec2 vUv;
 void main(){ float s=vUv.x*uLen; float p=fract((s-uTime*34.0)/28.0); float pulse=pow(p,6.0);
   float endFade=smoothstep(0.0,6.0,s)*1.0; vec3 c=mix(uColor,vec3(1.0),0.18+0.5*pulse)*(1.35+2.2*pulse)*endFade; gl_FragColor=vec4(c,1.0); }`;
const GLOW_FS=`uniform float uTime; uniform float uLen; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN;
 void main(){ float s=vUv.x*uLen; float p=pow(fract((s-uTime*34.0)/28.0),6.0); float rim=pow(1.0-abs(vN.z),1.6); gl_FragColor=vec4(uColor*(1.2+1.6*p),rim*(0.38+0.4*p)); }`;
const BEAM_FS=`uniform float uTime; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN;
 void main(){ float a=pow(1.0-vUv.y,1.3)*(0.7+0.2*sin(uTime*3.0)); float rim=0.35+0.65*pow(1.0-abs(vN.z),1.2); gl_FragColor=vec4(uColor*1.8,a*rim); }`;
const neonMat=(fs,extra={})=>new THREE.ShaderMaterial({vertexShader:NEON_VS,fragmentShader:fs,uniforms:{uTime:{value:0},uLen:{value:1},uColor:{value:neonC()}},...extra});

/* ---------- boot ---------- */
{ const drawRoute2D=drawRoute; drawRoute=function(noFly){ drawRoute2D(); if(V3.on) sync3D(noFly===true); }; }
requestAnimationFrame(()=>{ measure(); fit(CAMPUS,30); let ok=false; try{ ok=init3D(); }catch(e){ console.error(e); }
  if(ok){ $('map3d').hidden=false; svg.style.visibility='hidden'; } else { ['compass','tiltBtn','rotL','rotR'].forEach(id=>$(id).hidden=true); }
  renderSheet(); drawRoute();
  const ex=items.find(i=>i.kind==='place'&&i.name==='K203'); if(ex) choose(ex,null,false,true);
  showCoach();
});
addEventListener('resize',()=>{ vb.h=vb.w*(svg.clientHeight/svg.clientWidth); setVB(); });
