const fs=require('fs');
eval(fs.readFileSync('grid.js','utf8'));
eval(fs.readFileSync('_dark.js','utf8'));
const O={ox:1520,oy:880,sx:1180,sy:520,hz:400}, W=2560, H=1440;
let bad=0;
for(let li=0;li<6;li++){
  const lift=0.05+li*0.18;
  const cs=[[0,0],[1,0],[1,1],[0,1]].map(p=>isoPoint(p[0],p[1],lift,O));
  const xs=cs.map(p=>p[0]), ys=cs.map(p=>p[1]);
  const clip = Math.min(...xs)<0||Math.max(...xs)>W||Math.min(...ys)<0||Math.max(...ys)>H;
  if(clip) bad++;
  console.log('plane',li,'lift',lift.toFixed(2),
    'x',Math.min(...xs).toFixed(0)+'..'+Math.max(...xs).toFixed(0),
    'y',Math.min(...ys).toFixed(0)+'..'+Math.max(...ys).toFixed(0),
    clip?'  CLIPS':'');
}
console.log(bad?bad+' planes clip':'all six planes fit');
const gap = 0.18*O.hz;
console.log('vertical gap between planes:', gap, 'canvas px =', gap/2, 'css px');
