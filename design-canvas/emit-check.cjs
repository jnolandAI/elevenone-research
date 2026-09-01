const fs=require('fs');
eval(fs.readFileSync('grid.js','utf8'));
eval(fs.readFileSync('_dark.js','utf8'));
const hex=a=>'#'+a.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const lum=a=>0.2126*lin(a[0])+0.7152*lin(a[1])+0.0722*lin(a[2]);
const cr=(a,b)=>{const l1=Math.max(lum(a),lum(b)),l2=Math.min(lum(a),lum(b));return (l1+0.05)/(l2+0.05);};
console.log('emission ramp:');
let prev=-1, mono=true, mg=1;
for(let i=0;i<=10;i++){const t=i/10,c=emit(t,1),y=lum(c);
  if(i>0){ if(y<=prev) mono=false; mg=Math.min(mg,y-prev); }
  prev=y;
  console.log('  t='+t.toFixed(1), hex(c), 'Y='+y.toFixed(4), 'vs #131312 '+cr(c,[19,19,18]).toFixed(2)+':1');}
console.log('strictly increasing lightness:', mono, '| min step', mg.toFixed(4));
// hue arc
function hueOf(c){const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
 const r=f(c[0]),g=f(c[1]),b=f(c[2]);
 const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);
 const m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);
 const s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
 const A=1.9779984951*l-2.4285922050*m+0.4505937099*s, B=0.0259040371*l+0.7827717662*m-0.8086757660*s;
 let H=Math.atan2(B,A)*180/Math.PI; if(H<0)H+=360; return {H,C:Math.hypot(A,B)};}
const hs=[]; for(let i=0;i<=40;i++){const c=emit(i/40,1);const {H,C}=hueOf(c); if(C>0.012) hs.push(H);}
const s2=hs.slice().sort((a,b)=>a-b); let gap=360-(s2[s2.length-1]-s2[0]);
for(let i=1;i<s2.length;i++) gap=Math.max(gap,s2[i]-s2[i-1]);
console.log('hue arc travelled:', (360-gap).toFixed(0), 'deg');
// terrain sanity
console.log('\ngrid:', GROWS, 'rows x', GCOLS, 'cols, max', GMAX);
console.log('peak cell value', GRID[GPEAK.row][GPEAK.col], 'at col', GPEAK.col, 'row', GPEAK.row);
console.log('ridge cell value', GRID[GRIDGE.row][GRIDGE.col], 'at col', GRIDGE.col, 'row', GRIDGE.row);
// are there really two local maxima along the margin axis at the peak column?
const colv=[]; for(let r=0;r<GROWS;r++) colv.push(GRID[r][GPEAK.col]);
const maxima=[]; for(let r=2;r<GROWS-2;r++) if(colv[r]>colv[r-1]&&colv[r]>colv[r+1]&&colv[r]>0.25) maxima.push(r+':'+colv[r].toFixed(2));
console.log('local maxima down the peak column:', maxima.join('  '));
