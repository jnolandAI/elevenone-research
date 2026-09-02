const fs=require('fs');
eval(fs.readFileSync('../grid.js','utf8'));
eval(fs.readFileSync('_dark.js','utf8'));
const O={ox:1500,oy:900,sx:1280,sy:820,hz:400}, W=2560, H=1440;
let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9, off=0, tot=0;
for(let r=0;r<GROWS;r++)for(let c=0;c<GCOLS;c++){
  const h=GRID[r][c]/GMAX;
  const p=isoPoint(c/(GCOLS-1), r/(GROWS-1), h, O);
  x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);
  tot++; if(p[0]<0||p[0]>W||p[1]<0||p[1]>H) off++;
}
console.log('surface bounds  x', x0.toFixed(0),'..',x1.toFixed(0), ' (canvas 0..'+W+')');
console.log('surface bounds  y', y0.toFixed(0),'..',y1.toFixed(0), ' (canvas 0..'+H+')');
console.log('points off canvas:', off, 'of', tot, '=', (100*off/tot).toFixed(1)+'%');
// where does the type sit? left column is 0..(60+470)=530 css = 1060 canvas
let bright=0, n=0;
for(let r=0;r<GROWS;r++)for(let c=0;c<GCOLS;c++){
  const h=GRID[r][c]/GMAX;
  const p=isoPoint(c/(GCOLS-1), r/(GROWS-1), h, O);
  if(p[0]<1060 && p[1]>560 && p[1]<1120){ n++; if(h>0.35) bright++; }
}
console.log('\nmarks landing under the title block:', n, 'of which bright (h>0.35):', bright);
// base plane extent for the Planes option (lift up to 0.16+5*0.30=1.66)
const lifts=[0.16,1.66];
for(const L of lifts){
  const cs=[[0,0],[1,0],[1,1],[0,1]].map(p=>isoPoint(p[0],p[1],L,O));
  console.log('plane lift',L.toFixed(2),'y', Math.min(...cs.map(p=>p[1])).toFixed(0),'..',Math.max(...cs.map(p=>p[1])).toFixed(0),
    ' x', Math.min(...cs.map(p=>p[0])).toFixed(0),'..',Math.max(...cs.map(p=>p[0])).toFixed(0));
}
