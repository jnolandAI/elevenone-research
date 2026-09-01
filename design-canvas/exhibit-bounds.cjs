const fs=require('fs');
eval(fs.readFileSync('kde.js','utf8'));
const SPREAD=[72.2,67.9,60.1,59.1,55.4,52.7], MEDIANS=[40.8,35.8,44.1,39.8,36.6,29.2];
const W=2320,H=900;
let peak=0; for(const a of KDE) for(const v of a) if(v>peak) peak=v;
function chk(name, pts){
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const ok = x0>=0 && x1<=W && y0>=0 && y1<=H;
  console.log(name.padEnd(12), 'x '+x0.toFixed(0)+'..'+x1.toFixed(0), ' y '+y0.toFixed(0)+'..'+y1.toFixed(0), ok?'  fits':'  OVERFLOWS');
  return ok;
}
let all=true;
{ // Stack
  const x0=300,w=1500,base0=700,dz=74,dx=46,hgt=210, pts=[];
  for(let i=0;i<6;i++){ const bx=x0+i*dx, by=base0-i*dz;
    for(let j=0;j<=200;j++){ const m=j/200; let d=0;
      const p=(m+0.05)/1.05*(KDE[i].length-1); const k0=Math.floor(p),f=p-k0;
      d = p<=0?KDE[i][0] : p>=KDE[i].length-1?KDE[i][KDE[i].length-1] : KDE[i][k0]*(1-f)+KDE[i][k0+1]*f;
      pts.push([bx+m*w, by-(d/peak)*hgt]); }
    pts.push([bx,by]); pts.push([bx+w,by]); }
  pts.push([x0,base0+34+19]);
  all = chk('Stack', pts) && all;
}
{ // Terrain
  const x0=380,w=1500,base0=700,dz=66,hgt=250, pts=[];
  for(let i=0;i<6;i++){ const by=base0-i*dz;
    for(let j=0;j<=200;j++){ const m=j/200;
      const p=(m+0.05)/1.05*(KDE[i].length-1); const k0=Math.floor(p),f=p-k0;
      const d = p<=0?KDE[i][0] : p>=KDE[i].length-1?KDE[i][KDE[i].length-1] : KDE[i][k0]*(1-f)+KDE[i][k0+1]*f;
      pts.push([x0+m*w, by-(d/peak)*hgt]); }
    pts.push([x0,by]); }
  pts.push([x0,base0+34+19]);
  all = chk('Terrain', pts) && all;
}
{ // Instrument
  const x0=300,w=1400,base=620,hgt=400, pts=[];
  for(let i=0;i<6;i++) for(let j=0;j<=200;j++){ const m=j/200;
    const p=(m+0.05)/1.05*(KDE[i].length-1); const k0=Math.floor(p),f=p-k0;
    const d = p<=0?KDE[i][0] : p>=KDE[i].length-1?KDE[i][KDE[i].length-1] : KDE[i][k0]*(1-f)+KDE[i][k0+1]*f;
    pts.push([x0+m*w, base-(d/peak)*hgt]); }
  const bx=x0+w+54, bw=190;
  for(let i=0;i<6;i++){ const yy=150+i*66, frac=(SPREAD[i]-45)/30;
    pts.push([bx, yy-9]); pts.push([bx+bw*frac+70, yy+9]); }
  pts.push([x0,base+2+19]);
  all = chk('Instrument', pts) && all;
}
console.log(all? '\nall three exhibits fit the 2320x900 canvas' : '\nSOMETHING OVERFLOWS');
console.log('\nspread frac range:', ((Math.min(...SPREAD)-45)/30).toFixed(3), '..', ((Math.max(...SPREAD)-45)/30).toFixed(3), '(must stay in 0..1)');
