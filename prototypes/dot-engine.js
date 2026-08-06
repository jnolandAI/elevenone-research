/* ============================================================================
   Eleven One Research — dot imagery engine

   Single source of truth for subjects, roles and the halftone screen. Both the
   tuning foundry and the headless renderer are built from this file, so they
   cannot drift apart. To add a subject you edit SUBJECTS, buildScene and CAM,
   and nothing else.

   Requires THREE on window.
   ========================================================================= */
(function (global) {

/* ---------------------------------------------------------------- constants
   Brand values. Changing one of these changes every image that is rendered
   after it, which is why they live here and not in a slider. */
const CONST = {
  gamma: 1.00,       /* curve from luminance to dot area */
  angle: 15,         /* screen angle in degrees, the classic halftone rotation */
  fade: 0.16,        /* fraction of the frame over which the field thins out */
  dot: '#131312',    /* the interface ink exactly; a cooler dot read as a
                        different black next to type on the same page */
  field: '#FCFCFB',
  version: '1.1',    /* bump when a constant changes; published work keeps its own */
};

/* ------------------------------------------------------------------- roles
   Output size and pitch are declared together. Pitch is expressed in final
   pixels and chosen so that a hero and a figure show the same perceived dot
   size once each is displayed at its intended width. */
const ROLES = {
  hero:   { w: 2880, h: 1200, pitch: 12, dist: 1.00,
            label: 'Full-bleed header at the top of a brief' },
  figure: { w: 1440, h:  920, pitch: 12, dist: 1.00,
            label: 'Inside the body of a brief or report' },
  card:   { w:  920, h:  600, pitch: 12, dist: 1.00,
            label: 'Index listing and brief cards' },
  social: { w: 1200, h:  630, pitch:  6, dist: 1.00,
            label: 'Open Graph and link previews' },
  cover:  { w: 1600, h: 2000, pitch:  9, dist: 1.42,
            label: 'Report PDF cover, portrait' },
};

const MODES = ['dot', 'hatch', 'contour', 'ascii'];

/* ---------------------------------------------------------------- subjects */
const SUBJECTS = [
  { id:'port',       name:'Container port',     d:'Logistics, trade, supply chain, freight rates, port congestion.' },
  { id:'datacenter', name:'Data centre',        d:'Compute demand, colocation, power draw, AI infrastructure.' },
  { id:'wind',       name:'Wind generation',    d:'Renewables, interconnection queues, capacity build, PPAs.' },
  { id:'robotics',   name:'Industrial robotics',d:'Automation, factory capex, labour substitution, throughput.' },
  { id:'grid',       name:'Transmission grid',  d:'Utilities, grid constraint, siting, transmission build.' },
  { id:'urban',      name:'Urban density',      d:'Real estate, site selection, market entry, catchment.' },
];

/* camera as [camX, camY, camZ, lookX, lookY, lookZ]; vertical FOV is fixed, so a
   wider role naturally shows more landscape rather than cropping the subject */
const CAM = {
  port:       [6, 40, 96, 0, 7, 2],
  datacenter: [26, 20, 34, 0, 4, 0],
  wind:       [0, 26, 62, 0, 8, 0],
  robotics:   [4, 26, 74, 0, 9, 0],
  grid:       [0, 20, 64, 0, 10, 0],
  urban:      [0, 34, 62, 0, 5, 0],
};

/* One camera cannot serve a 2.4:1 header and a 1.5:1 card. Where a role needs its
   own framing, it says so here as "<subject>:<role>"; everything else falls back
   to CAM. Keeping this sparse is deliberate, so most subjects stay single-camera. */
const CAM_ROLE = {
  'port:hero':       [8, 22, 56, 0, 10, 4],
  'urban:hero':      [0, 26, 50, 0, 8, 0],
  'wind:hero':       [0, 17, 48, 0, 9, 0],
  'grid:hero':       [0, 15, 52, 0, 11, 0],
  'robotics:hero':   [4, 17, 56, 0, 10, 0],
  'datacenter:hero': [22, 15, 28, 0, 4, 0],
  'port:cover':      [8, 30, 78, 0, 9, 4],
  'urban:cover':     [0, 30, 60, 0, 7, 0],
};
const camFor = (id, role) => CAM_ROLE[id + ':' + role] || CAM[id];

function buildScene(id){
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xffffff);
  const mat  = new THREE.MeshStandardMaterial({ color:0xB8B8B6, roughness:.78, metalness:.04 });
  const dark = new THREE.MeshStandardMaterial({ color:0x8A8A88, roughness:.85, metalness:.02 });
  const rnd = (seed => () => (seed = (seed*1103515245+12345)&0x7fffffff) / 0x7fffffff)(id.length*977 + 13);
  const g = new THREE.Group();
  const box = (w,h,d2,x,y,z,m) => { const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d2), m||mat);
    b.position.set(x,y,z); b.castShadow=b.receiveShadow=true; g.add(b); return b; };
  const cyl = (rt,rb,h,x,y,z,m,seg) => { const c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||14), m||mat);
    c.position.set(x,y,z); c.castShadow=c.receiveShadow=true; g.add(c); return c; };

  if (id === 'port'){
    for (let i=0;i<26;i++){
      if (i%5===4) continue;                                   /* haulage lane */
      for (let j=0;j<11;j++){
        const n = Math.floor(rnd()*5);
        for (let k=0;k<n;k++)
          box(2.9,1.25,1.4, -34+i*2.75, .63+k*1.32, -12+j*1.6, rnd()>.55?dark:mat);
      }
    }
    for (let c=0;c<4;c++){
      const x = -24 + c*16;
      for (const z of [12.5,-4.5]){
        box(.55,21,.55, x-5.5, 10.5, z, dark);
        box(.55,21,.55, x+5.5, 10.5, z, dark);
        box(12,.7,.7,  x, 21, z, dark);
      }
      box(.8,.7,19, x-5.5, 21, 4, dark);
      box(.8,.7,19, x+5.5, 21, 4, dark);
      box(13,.9,.9, x, 24.4, 4, dark);
      box(1.1,3.4,1.1, x, 22.6, 4, dark);
    }
    for (let i=0;i<22;i++){
      const t2 = i/21, w = 2.9 * (t2 > .82 ? (1-t2)/.18 : 1);
      box(2.6, 5.0, w*2.6, -26+i*2.6, 2.5, 24, dark);
    }
    for (let i=0;i<18;i++) for (let k=0;k<3;k++)
      box(2.6,1.25,1.4, -24+i*2.6, 5.6+k*1.32, 24+(rnd()-.5)*2.6, rnd()>.5?dark:mat);
    box(96,.4,54, 0,-.2,4, mat);
  }

  if (id === 'datacenter'){
    for (let row=0; row<7; row++) for (let i=0;i<16;i++){
      const z = -14 + row*4.6, x = -18 + i*2.4;
      box(1.9,6.4,2.0, x, 3.2, z, rnd()>.7?dark:mat);
      box(1.9,.28,2.0, x, 6.5, z, dark);
    }
    box(60,.4,50, 0,-.2,0, mat);
  }

  if (id === 'wind'){
    const terr = new THREE.PlaneGeometry(90,64,50,40); terr.rotateX(-Math.PI/2);
    const p = terr.attributes.position;
    for (let i=0;i<p.count;i++){
      const x=p.getX(i), z=p.getZ(i);
      p.setY(i, Math.sin(x*.13)*1.5 + Math.cos(z*.16)*1.2 + Math.sin((x+z)*.07)*1.8);
    }
    terr.computeVertexNormals();
    const t = new THREE.Mesh(terr, mat); t.receiveShadow = true; g.add(t);
    for (let i=0;i<14;i++){
      const x = -34 + (i%5)*17 + (rnd()-.5)*6, z = -22 + Math.floor(i/5)*16 + (rnd()-.5)*6;
      const yb = Math.sin(x*.13)*1.5 + Math.cos(z*.16)*1.2 + Math.sin((x+z)*.07)*1.8;
      cyl(.28,.5,15, x, yb+7.5, z, dark);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(.62,14,14), dark);
      hub.position.set(x, yb+15, z); g.add(hub);
      const spin = rnd()*Math.PI*2;
      for (let b=0;b<3;b++){
        const bl = new THREE.Mesh(new THREE.BoxGeometry(.34,9.5,.12), dark);
        bl.position.set(x, yb+15, z);
        bl.rotation.z = spin + b*Math.PI*2/3;
        bl.translateY(4.75); g.add(bl);
      }
    }
  }

  if (id === 'robotics'){
    box(58,.4,40, 0,-.2,0, mat);
    /* a segment pivots at its own base and hands back a group at its tip, which
       is the only way an articulated silhouette reads as a robot rather than a post */
    const limb = (parent, len, w, angle) => {
      const piv = new THREE.Group(); piv.rotation.z = angle; parent.add(piv);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, len, w*.92), dark);
      seg.position.y = len/2; seg.castShadow = true; piv.add(seg);
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(w*.62, 14, 14), dark);
      knuckle.castShadow = true; piv.add(knuckle);
      const tip = new THREE.Group(); tip.position.y = len; piv.add(tip);
      return tip;
    };
    for (let i=0;i<3;i++){
      const x = -17 + i*17, z = (i%2)*6 - 3;
      box(13,1.8,7.5, x, .9, z, mat);
      cyl(2.4,3.0,2.6, x, 3.1, z, dark, 20);
      const yaw = new THREE.Group();
      yaw.position.set(x, 4.4, z);
      yaw.rotation.y = (rnd()-.5)*.9;
      g.add(yaw);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(3.0,3.2,3.0), dark);
      sh.position.set(0,1.6,0); sh.castShadow = true; yaw.add(sh);
      const base = new THREE.Group(); base.position.y = 3.0; yaw.add(base);
      let t2 = limb(base, 8.4, 1.9, -0.62 - rnd()*.22);
      t2 = limb(t2, 6.8, 1.5,  1.55 + rnd()*.3);
      t2 = limb(t2, 2.4, 1.0,  0.55);
      const gA = new THREE.Mesh(new THREE.BoxGeometry(.42,1.9,.42), dark);
      const gB = gA.clone();
      gA.position.set(-.62,.95,0); gB.position.set(.62,.95,0);
      gA.castShadow = gB.castShadow = true; t2.add(gA); t2.add(gB);
    }
  }

  if (id === 'grid'){
    box(90,.4,50, 0,-.2,0, mat);
    const tops = [];
    for (let i=0;i<5;i++){
      const x = -34 + i*17, base = 0;
      for (const s2 of [-1,1]) for (const s3 of [-1,1]){
        const legs = 9;
        for (let k=0;k<legs;k++){
          const t2 = k/legs, w = 3.2*(1-t2*.72);
          box(.28,2.2,.28, x + s2*w, base+1.1+k*2.2, s3*w, dark);
        }
      }
      for (let k=0;k<9;k++){
        const t2=k/9, w=3.2*(1-t2*.72);
        box(w*2,.2,.2, x, base+k*2.2, -w, dark);
        box(w*2,.2,.2, x, base+k*2.2,  w, dark);
        box(.2,.2,w*2, x-w, base+k*2.2, 0, dark);
        box(.2,.2,w*2, x+w, base+k*2.2, 0, dark);
      }
      for (const yy of [15.5,18.2,20.6]) box(13,.34,.34, x, yy, 0, dark);
      tops.push(x);
    }
    for (let i=0;i<tops.length-1;i++){
      const x0=tops[i], x1=tops[i+1];
      for (const off of [-5.6,-2.6,2.6,5.6]) for (const yy of [15.5,18.2,20.6]){
        const pts=[];
        for (let k=0;k<=18;k++){ const t2=k/18, x=x0+(x1-x0)*t2;
          pts.push(new THREE.Vector3(x, yy - Math.sin(t2*Math.PI)*2.1, off)); }
        const cv = new THREE.CatmullRomCurve3(pts);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cv,20,.075,6,false), dark));
      }
    }
  }

  if (id === 'urban'){
    for (let i=0;i<17;i++) for (let j=0;j<13;j++){
      if ((i%5===2)||(j%4===2)) continue;
      const cx = -30+i*3.7, cz = -22+j*3.7;
      const dist = Math.hypot(cx*.6, cz*.9)/26;
      const h = Math.max(1.2, (1-dist)*rnd()*26 + rnd()*3);
      box(2.7,h,2.7, cx, h/2, cz, rnd()>.72?dark:mat);
    }
    box(80,.4,60, 0,-.2,0, mat);
  }

  s.add(g);
  s.add(new THREE.HemisphereLight(0xffffff, 0x9a9a98, .62));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-40,54,34); key.castShadow = true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.near=1; key.shadow.camera.far=220;
  key.shadow.camera.left=-60; key.shadow.camera.right=60;
  key.shadow.camera.top=60; key.shadow.camera.bottom=-60;
  key.shadow.bias=-.0012; key.shadow.radius=3;
  s.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, .42);
  fill.position.set(46,20,44); s.add(fill);
  return s;
}

/* --------------------------------------------------------------- rendering */
function renderSource(renderer, canvas, id, w, h, distMul, role){
  canvas.width = w; canvas.height = h;
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  const scene = buildScene(id);
  const c = camFor(id, role);
  const cam = new THREE.PerspectiveCamera(32, w/h, 0.1, 900);
  const d = distMul || 1;
  cam.position.set(c[0]*d, c[1]*d, c[2]*d);
  cam.lookAt(c[3], c[4], c[5]);
  renderer.render(scene, cam);
  return { w, h };
}

/* reduce to a luminance field, which is the point at which the source stops
   mattering and every image joins the same family */
function luminanceField(src, w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently:true });
  x.fillStyle = '#fff'; x.fillRect(0,0,w,h);
  x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0,0,w,h).data;
  const L = new Float32Array(w*h);
  for (let i=0,p=0;i<L.length;i++,p+=4)
    L[i] = (0.2126*d[p] + 0.7152*d[p+1] + 0.0722*d[p+2]) / 255;
  L.w = w; L.h = h;
  return L;
}
const sample = (L,x,y) => {
  x = Math.max(0,Math.min(L.w-1, x|0)); y = Math.max(0,Math.min(L.h-1, y|0));
  return L[y*L.w + x];
};

/* A halftone cell stands for the whole area it covers, not the single pixel at
   its centre. Point sampling loses anything thinner than the pitch, which is how
   gantry legs vanish and container stacks alias into a slab. */
function boxAvg(L, cx, cy, half){
  if (half < 1) return sample(L, cx, cy);
  const step = Math.max(1, Math.round(half / 2.5));
  let s = 0, n = 0;
  for (let y = cy - half; y <= cy + half; y += step)
    for (let x = cx - half; x <= cx + half; x += step){ s += sample(L, x, y); n++; }
  return n ? s / n : sample(L, cx, cy);
}
function edge(u,v,f){
  if (f <= 0) return 1;
  return Math.min(1, Math.min(u,1-u)/f) * Math.min(1, Math.min(v,1-v)/(f*0.9));
}

const ASCII = ' .·:;=+*#%@';

function screen(L, out, mode, pitch, opts){
  opts = opts || {};
  const gamma = opts.gamma != null ? opts.gamma : CONST.gamma;
  const angle = opts.angle != null ? opts.angle : CONST.angle;
  const fade  = opts.fade  != null ? opts.fade  : CONST.fade;
  const ctx = out.getContext('2d');
  const W = out.width, H = out.height;
  ctx.fillStyle = CONST.field; ctx.fillRect(0,0,W,H);
  const th = angle*Math.PI/180, cos = Math.cos(th), sin = Math.sin(th);
  const diag = Math.hypot(W,H);
  const rows = Math.ceil(diag/(pitch*0.866))+2, cols = Math.ceil(diag/pitch)+2;
  ctx.fillStyle = CONST.dot; ctx.strokeStyle = CONST.dot;

  /* the luminance field may be supersampled relative to the output, so a cell
     covers pitch * ss source pixels and is averaged across all of them */
  const ss = L.w / W;
  const half = Math.max(1, Math.round(pitch * ss * 0.5));

  if (mode === 'dot' || mode === 'hatch'){
    for (let r=-rows; r<rows; r++) for (let c=-cols; c<cols; c++){
      const gx = (c + (r%2 ? .5 : 0)) * pitch, gy = r * pitch * 0.866;
      const x = gx*cos - gy*sin + W/2, y = gx*sin + gy*cos + H/2;
      if (x < -pitch || y < -pitch || x > W+pitch || y > H+pitch) continue;
      const u = x/W, v = y/H;
      const t = Math.pow(1 - boxAvg(L, u*L.w, v*L.h, half), gamma) * edge(u, v, fade);
      if (t < 0.015) continue;
      if (mode === 'dot'){
        const rad = t * pitch * 0.62;
        if (rad < 0.18) continue;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      } else {
        const hh = t * pitch * 1.25;
        ctx.lineWidth = Math.max(0.4, pitch*0.16);
        ctx.beginPath(); ctx.moveTo(x, y-hh/2); ctx.lineTo(x, y+hh/2); ctx.stroke();
      }
    }
  }

  if (mode === 'contour'){
    const sx = W/L.w, sy = H/L.h;
    ctx.lineWidth = Math.max(0.55, pitch*0.13);
    const step = Math.max(2, Math.round(pitch*0.55));
    for (let lv=1; lv<=14; lv++){
      const thr = 1 - Math.pow(lv/14, 1.35);
      ctx.strokeStyle = `rgba(23,23,26,${(0.24 + lv/14*0.62).toFixed(2)})`;
      ctx.beginPath();
      for (let py=0; py<L.h-step; py+=step) for (let px=0; px<L.w-step; px+=step){
        const a=sample(L,px,py), b=sample(L,px+step,py),
              c2=sample(L,px+step,py+step), d2=sample(L,px,py+step);
        const ab = n => n < thr;
        const idx = (ab(a)?8:0)|(ab(b)?4:0)|(ab(c2)?2:0)|(ab(d2)?1:0);
        if (idx===0||idx===15) continue;
        const X0=px*sx, X1=(px+step)*sx, Y0=py*sy, Y1=(py+step)*sy;
        const mid = (p,q,P0,P1)=>P0+(P1-P0)*((thr-p)/(q-p||1e-6));
        const Tp=[mid(a,b,X0,X1),Y0], Bp=[mid(d2,c2,X0,X1),Y1],
              Lp=[X0,mid(a,d2,Y0,Y1)], Rp=[X1,mid(b,c2,Y0,Y1)];
        const seg=(p,q)=>{ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);};
        switch(idx){case 1:seg(Lp,Bp);break;case 2:seg(Bp,Rp);break;case 3:seg(Lp,Rp);break;
          case 4:seg(Tp,Rp);break;case 5:seg(Tp,Lp);seg(Bp,Rp);break;case 6:seg(Tp,Bp);break;
          case 7:seg(Lp,Tp);break;case 8:seg(Tp,Lp);break;case 9:seg(Tp,Bp);break;
          case 10:seg(Tp,Rp);seg(Lp,Bp);break;case 11:seg(Tp,Rp);break;case 12:seg(Lp,Rp);break;
          case 13:seg(Bp,Rp);break;case 14:seg(Lp,Bp);break;}
      }
      ctx.stroke();
    }
  }
}

function asciiOf(L, pitch, opts){
  opts = opts || {};
  const gamma = opts.gamma != null ? opts.gamma : CONST.gamma;
  const fade  = opts.fade  != null ? opts.fade  : CONST.fade;
  const cols = Math.round(L.w / (pitch*1.55)), rows = Math.round(L.h / (pitch*2.9));
  let out = '';
  for (let r=0;r<rows;r++){
    let line = '';
    for (let c=0;c<cols;c++){
      const u=(c+.5)/cols, v=(r+.5)/rows;
      const t = Math.pow(1 - boxAvg(L, u*L.w, v*L.h, Math.max(1, Math.round(pitch*0.5))), gamma) * edge(u,v,fade);
      line += ASCII[Math.max(0,Math.min(ASCII.length-1, Math.round(t*(ASCII.length-1))))];
    }
    out += line + '\n';
  }
  return out;
}

/* one call: subject plus role in, finished canvas out */
/* Supersample the 3D pass so each halftone cell has real detail to average.
   Capped because very wide framebuffers fail on some GPUs and in software GL. */
const MAX_SOURCE = 4000;
function supersample(w, h){
  return Math.max(1, Math.min(2, MAX_SOURCE / Math.max(w, h)));
}

function renderRole(renderer, stage, id, role, mode, overrides){
  const R = ROLES[role];
  if (!R) throw new Error('unknown role: ' + role);
  const ss = supersample(R.w, R.h);
  const sw = Math.round(R.w * ss), sh = Math.round(R.h * ss);
  renderSource(renderer, stage, id, sw, sh, R.dist, role);
  const L = luminanceField(stage, sw, sh);
  const out = document.createElement('canvas');
  out.width = R.w; out.height = R.h;
  if (mode === 'ascii') return { canvas: null, text: asciiOf(L, R.pitch * ss, overrides), L, ss };
  screen(L, out, mode, R.pitch, overrides);
  return { canvas: out, text: null, L, ss };
}

global.DotFoundry = {
  CONST, ROLES, MODES, SUBJECTS, CAM,
  buildScene, renderSource, luminanceField, sample, boxAvg, edge, screen, asciiOf,
  renderRole, camFor, CAM_ROLE,
};
})(window);
