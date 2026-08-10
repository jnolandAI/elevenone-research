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
  fogNear: 0.55,     /* fog start, as a multiple of camera-to-subject distance */
  fogFar: 1.90,      /* fog full, same units. Far geometry lifts to the field
                        and drops out of the screen instead of competing with
                        the subject, which is what makes a scene read as space
                        rather than as a flat elevation drawing. */
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
            label: 'Full-bleed header at the top of a brief',
            fade: { top: 0, right: .18, bottom: 0, left: .18 } },
  figure: { w: 1440, h:  920, pitch: 12, dist: 1.00,
            label: 'Inside the body of a brief or report',
            fade: { top: 0, right: .18, bottom: 0, left: .18 } },
  card:   { w:  920, h:  600, pitch: 12, dist: 1.00,
            label: 'Index listing and brief cards',
            fade: { top: 0, right: .18, bottom: 0, left: .18 } },
  social: { w: 1200, h:  630, pitch:  6, dist: 1.00,
            label: 'Open Graph and link previews',
            fade: { top: 0, right: .18, bottom: 0, left: .18 } },
  cover:  { w: 1600, h: 2000, pitch:  9, dist: 1.42,
            label: 'Report PDF cover, portrait',
            fade: { top: 0, right: .18, bottom: 0, left: .18 } },
};

/* Sparse, exactly like CAM_ROLE. A role default that needs an exception for one
   subject says so here; everything else falls through. If this table grows past
   a handful of entries the role defaults are wrong, not the subjects. */
const EDGE_ROLE = {};
const fadeFor = (id, role) =>
  EDGE_ROLE[id + ':' + role] || (ROLES[role] && ROLES[role].fade) || CONST.fade;

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
  datacenter: [34, 25, 44, 0, 4, 0],
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
  'datacenter:hero': [29, 18, 36, 0, 4, 0],
  'port:cover':      [8, 30, 78, 0, 9, 4],
  'urban:cover':     [0, 30, 60, 0, 7, 0],
};
const camFor = (id, role) => CAM_ROLE[id + ':' + role] || CAM[id];

/* Five steps, lightest to darkest. The two materials this replaces sat 46
   levels apart out of 255, which is why a tower leg, a tower body and the
   conductor it carries all reached the screen at one of two densities. Widening
   the span to 128 is the change that makes depth possible at all; fog and
   ground forms then have something to work with. */
const TONES = ['#D6D6D4', '#B8B8B6', '#9C9C9A', '#7A7A78', '#565654'];

/* Radial placement for the scatter field, pulled out of ground() so it can be
   tested without THREE. The annulus runs from flat+6 (just past the subject's
   own footprint) out to d/2-2 (just inside the ground's far edge). A small or
   aggressively-cut d can push that far bound inside the near one — clamping
   the span at 0 collapses the annulus to its near edge instead of inverting,
   which keeps every scatter box outside flat and the result monotonic in t
   no matter how tight d gets. */
function scatterRadius(flat, d, t){
  const span = Math.max(0, d/2 - flat - 8);
  return flat + 6 + t * span;
}

/* One ground for every subject, so five hand-rolled slabs cannot drift into
   five different landscapes. Three parts: a displaced plane, a ridge silhouette
   at the far edge, and a sparse scatter between the two. All primitives, all
   driven by the subject's seeded rnd, so scenes stay deterministic. */
function ground(g, TONE, rnd, o){
  const amp = o.amp != null ? o.amp : 1.0;
  const flat = o.flat != null ? o.flat : 26;
  if (o.plane !== false){
    const geo = new THREE.PlaneGeometry(o.w, o.d, 60, 44);
    geo.rotateX(-Math.PI/2);
    const p = geo.attributes.position;
    for (let i=0;i<p.count;i++){
      const x = p.getX(i), z = p.getZ(i);
      /* Displacement is held at zero across the subject's footprint and ramps
         in beyond it. Without this, a container yard sitting at y = 0 sinks
         into a trough or floats over a crest and the scene reads as broken. */
      const k = Math.min(1, Math.max(0, (Math.hypot(x, z) - flat) / 14));
      const n = Math.sin(x*.09)*0.9 + Math.cos(z*.11)*0.7 + Math.sin((x+z)*.05)*1.1;
      p.setY(i, n * amp * k);
    }
    geo.computeVertexNormals();
    const plane = new THREE.Mesh(geo, TONE[1]);
    plane.position.y = -0.2;
    plane.receiveShadow = true;
    g.add(plane);
  }

  if (o.ridge){
    /* far used to derive from -o.d/2 + 4, which tied how distant the horizon
       reads to how large the ground plane happened to be. That coupling is
       what let five subjects' ridges drift past fogFar and render as pure
       white: shrinking d to save one subject's ridge silently broke another's
       scatter span. ridgeDist is solved per subject against that subject's
       own camera and fog band, so it is required outright — a fallback here
       is exactly the silent behaviour that produced the dead ridges. */
    if (o.ridgeDist == null){
      throw new Error(
        'ground(): ridge is set (' + o.ridge + ') but ridgeDist is missing. ' +
        'Solve ridgeDist against this subject\'s camera and fog band ' +
        '(target fog fraction roughly 0.55–0.70) rather than deriving it from d.'
      );
    }
    /* The far horizon, in the lightest tone so it reads as distance rather than
       as a second subject. Fog thins it further at render time. */
    const far = -o.ridgeDist;
    for (let i=0;i<26;i++){
      const w = o.w/26;
      const h = o.ridge * (0.45 + rnd()*0.55);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w*1.35, h, 6), TONE[0]);
      m.position.set(-o.w/2 + i*w + w/2, h/2 - 1, far + (rnd()-.5)*5);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
  }

  for (let i=0;i<(o.scatter||0);i++){
    const a = rnd()*Math.PI*2;
    const r = scatterRadius(flat, o.d, rnd());
    const h = 1.2 + rnd()*3.4;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.6+rnd()*2.2, h, 1.6+rnd()*2.2), TONE[0]);
    m.position.set(Math.cos(a)*r, h/2, Math.sin(a)*r - o.d*0.12);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
}

function buildScene(id){
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xffffff);
  const TONE = TONES.map((hex, i) => new THREE.MeshStandardMaterial({
    color: parseInt(hex.slice(1), 16),
    roughness: 0.78 + i * 0.02,
    metalness: 0.04 - i * 0.005,
  }));
  const rnd = (seed => () => (seed = (seed*1103515245+12345)&0x7fffffff) / 0x7fffffff)(id.length*977 + 13);
  const g = new THREE.Group();
  const box = (w,h,d2,x,y,z,m) => { const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d2), m||TONE[1]);
    b.position.set(x,y,z); b.castShadow=b.receiveShadow=true; g.add(b); return b; };
  const cyl = (rt,rb,h,x,y,z,m,seg) => { const c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||14), m||TONE[1]);
    c.position.set(x,y,z); c.castShadow=c.receiveShadow=true; g.add(c); return c; };

  if (id === 'port'){
    for (let i=0;i<26;i++){
      if (i%5===4) continue;                                   /* haulage lane */
      for (let j=0;j<11;j++){
        const n = Math.floor(rnd()*5);
        for (let k=0;k<n;k++)
          box(2.9,1.25,1.4, -34+i*2.75, .63+k*1.32, -12+j*1.6, rnd()>.55?TONE[2]:TONE[1]);
      }
    }
    for (let c=0;c<4;c++){
      const x = -24 + c*16;
      for (const z of [12.5,-4.5]){
        box(.55,21,.55, x-5.5, 10.5, z, TONE[3]);
        box(.55,21,.55, x+5.5, 10.5, z, TONE[3]);
        box(12,.7,.7,  x, 21, z, TONE[4]);
      }
      box(.8,.7,19, x-5.5, 21, 4, TONE[3]);
      box(.8,.7,19, x+5.5, 21, 4, TONE[3]);
      box(13,.9,.9, x, 24.4, 4, TONE[4]);
      box(1.1,3.4,1.1, x, 22.6, 4, TONE[4]);
    }
    for (let i=0;i<22;i++){
      const t2 = i/21, w = 2.9 * (t2 > .82 ? (1-t2)/.18 : 1);
      box(2.6, 5.0, w*2.6, -26+i*2.6, 2.5, 24, TONE[3]);
    }
    for (let i=0;i<18;i++) for (let k=0;k<3;k++)
      box(2.6,1.25,1.4, -24+i*2.6, 5.6+k*1.32, 24+(rnd()-.5)*2.6, rnd()>.5?TONE[2]:TONE[1]);
    ground(g, TONE, rnd, { w: 150, d: 120, amp: 1.0, flat: 44, ridge: 5.5, ridgeDist: 22, scatter: 22 });
  }

  if (id === 'datacenter'){
    for (let row=0; row<7; row++) for (let i=0;i<16;i++){
      const z = -14 + row*4.6, x = -18 + i*2.4;
      box(1.9,6.4,2.0, x, 3.2, z, rnd()>.7?TONE[2]:TONE[1]);
      box(1.9,.28,2.0, x, 6.5, z, TONE[4]);
    }
    ground(g, TONE, rnd, { w: 120, d: 110, amp: 0.8, flat: 30, ridge: 4.0, ridgeDist: 24, scatter: 16 });
  }

  if (id === 'wind'){
    const terr = new THREE.PlaneGeometry(90,64,50,40); terr.rotateX(-Math.PI/2);
    const p = terr.attributes.position;
    for (let i=0;i<p.count;i++){
      const x=p.getX(i), z=p.getZ(i);
      p.setY(i, Math.sin(x*.13)*1.5 + Math.cos(z*.16)*1.2 + Math.sin((x+z)*.07)*1.8);
    }
    terr.computeVertexNormals();
    const t = new THREE.Mesh(terr, TONE[1]); t.receiveShadow = true; g.add(t);
    for (let i=0;i<14;i++){
      const x = -34 + (i%5)*17 + (rnd()-.5)*6, z = -22 + Math.floor(i/5)*16 + (rnd()-.5)*6;
      const yb = Math.sin(x*.13)*1.5 + Math.cos(z*.16)*1.2 + Math.sin((x+z)*.07)*1.8;
      cyl(.28,.5,15, x, yb+7.5, z, TONE[2]);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(.62,14,14), TONE[4]);
      hub.position.set(x, yb+15, z); g.add(hub);
      const spin = rnd()*Math.PI*2;
      for (let b=0;b<3;b++){
        const bl = new THREE.Mesh(new THREE.BoxGeometry(.34,9.5,.12), TONE[3]);
        bl.position.set(x, yb+15, z);
        bl.rotation.z = spin + b*Math.PI*2/3;
        bl.translateY(4.75); g.add(bl);
      }
    }
    ground(g, TONE, rnd, { w: 160, d: 130, plane: false, ridge: 6.0, ridgeDist: 21, scatter: 20 });
  }

  if (id === 'robotics'){
    ground(g, TONE, rnd, { w: 90, d: 80, amp: 0.5, flat: 32, ridge: 0, scatter: 0 });
    /* a segment pivots at its own base and hands back a group at its tip, which
       is the only way an articulated silhouette reads as a robot rather than a post */
    const limb = (parent, len, w, angle) => {
      const piv = new THREE.Group(); piv.rotation.z = angle; parent.add(piv);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, len, w*.92), TONE[3]);
      seg.position.y = len/2; seg.castShadow = true; piv.add(seg);
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(w*.62, 14, 14), TONE[4]);
      knuckle.castShadow = true; piv.add(knuckle);
      const tip = new THREE.Group(); tip.position.y = len; piv.add(tip);
      return tip;
    };
    for (let i=0;i<3;i++){
      const x = -17 + i*17, z = (i%2)*6 - 3;
      box(13,1.8,7.5, x, .9, z, TONE[1]);
      cyl(2.4,3.0,2.6, x, 3.1, z, TONE[2], 20);
      const yaw = new THREE.Group();
      yaw.position.set(x, 4.4, z);
      yaw.rotation.y = (rnd()-.5)*.9;
      g.add(yaw);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(3.0,3.2,3.0), TONE[3]);
      sh.position.set(0,1.6,0); sh.castShadow = true; yaw.add(sh);
      const base = new THREE.Group(); base.position.y = 3.0; yaw.add(base);
      let t2 = limb(base, 8.4, 1.9, -0.62 - rnd()*.22);
      t2 = limb(t2, 6.8, 1.5,  1.55 + rnd()*.3);
      t2 = limb(t2, 2.4, 1.0,  0.55);
      const gA = new THREE.Mesh(new THREE.BoxGeometry(.42,1.9,.42), TONE[4]);
      const gB = gA.clone();
      gA.position.set(-.62,.95,0); gB.position.set(.62,.95,0);
      gA.castShadow = gB.castShadow = true; t2.add(gA); t2.add(gB);
    }
  }

  if (id === 'grid'){
    ground(g, TONE, rnd, { w: 190, d: 150, amp: 1.2, flat: 12, ridge: 7.0, ridgeDist: 21, scatter: 30 });
    const tops = [];
    for (let i=0;i<5;i++){
      const x = -34 + i*17, base = 0;
      for (const s2 of [-1,1]) for (const s3 of [-1,1]){
        const legs = 9;
        for (let k=0;k<legs;k++){
          const t2 = k/legs, w = 3.2*(1-t2*.72);
          box(.28,2.2,.28, x + s2*w, base+1.1+k*2.2, s3*w, TONE[3]);
        }
      }
      for (let k=0;k<9;k++){
        const t2=k/9, w=3.2*(1-t2*.72);
        box(w*2,.2,.2, x, base+k*2.2, -w, TONE[2]);
        box(w*2,.2,.2, x, base+k*2.2,  w, TONE[2]);
        box(.2,.2,w*2, x-w, base+k*2.2, 0, TONE[2]);
        box(.2,.2,w*2, x+w, base+k*2.2, 0, TONE[2]);
      }
      for (const yy of [15.5,18.2,20.6]) box(13,.34,.34, x, yy, 0, TONE[3]);
      tops.push(x);
    }
    for (let i=0;i<tops.length-1;i++){
      const x0=tops[i], x1=tops[i+1];
      for (const off of [-5.6,-2.6,2.6,5.6]) for (const yy of [15.5,18.2,20.6]){
        const pts=[];
        for (let k=0;k<=18;k++){ const t2=k/18, x=x0+(x1-x0)*t2;
          pts.push(new THREE.Vector3(x, yy - Math.sin(t2*Math.PI)*2.1, off)); }
        const cv = new THREE.CatmullRomCurve3(pts);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cv,20,.075,6,false), TONE[4]));
      }
    }
  }

  if (id === 'urban'){
    for (let i=0;i<17;i++) for (let j=0;j<13;j++){
      if ((i%5===2)||(j%4===2)) continue;
      const cx = -30+i*3.7, cz = -22+j*3.7;
      const dist = Math.hypot(cx*.6, cz*.9)/26;
      const h = Math.max(1.2, (1-dist)*rnd()*26 + rnd()*3);
      const tone = cz < -8 ? 0 : cz < 2 ? 1 : (rnd() > .6 ? 3 : 2);
      box(2.7,h,2.7, cx, h/2, cz, TONE[tone]);
    }
    ground(g, TONE, rnd, { w: 140, d: 120, amp: 0.9, flat: 36, ridge: 5.0, ridgeDist: 23, scatter: 18 });
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
  /* Derived from the camera rather than declared per subject, so a role that
     pulls the camera back gets a correspondingly deeper fog with nobody
     maintaining a table. The fog colour is the scene background, so far
     geometry lifts to white and the screen simply stops drawing dots for it. */
  const dist = Math.hypot(cam.position.x - c[3], cam.position.y - c[4], cam.position.z - c[5]);
  scene.fog = new THREE.Fog(0xffffff, dist * CONST.fogNear, dist * CONST.fogFar);
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
/* Per-edge dissolve. A frame's four sides rarely want the same answer: the
   left and right of a wide crop cut a scene off mid-subject, while the bottom
   holds the ground the scene stands on and fading it makes the scene float. */
function fadeSet(v){
  if (v == null) v = CONST.fade;
  if (typeof v === 'number') return { top: v*0.9, right: v, bottom: v*0.9, left: v };
  return { top: v.top||0, right: v.right||0, bottom: v.bottom||0, left: v.left||0 };
}
/* Smoothstep, not a linear ramp. A linear ramp begins abruptly at the fraction
   boundary and that onset reads as an edge of its own, which is the thing the
   dissolve exists to remove. */
const smooth = t => t*t*(3-2*t);
function edge(u,v,f){
  const s = fadeSet(f);
  const side = (p, frac) => frac > 0 ? smooth(Math.min(1, Math.max(0, p/frac))) : 1;
  return side(u, s.left) * side(1-u, s.right) * side(v, s.top) * side(1-v, s.bottom);
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
  /* screen() and asciiOf() know the pitch and the mode but not the subject, so
     the per-subject resolution has to happen here and travel down in overrides.
     An explicit overrides.fade still wins: that is the foundry's tuning path. */
  const o = Object.assign({}, overrides);
  if (o.fade == null) o.fade = fadeFor(id, role);
  overrides = o;
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
  CONST, ROLES, MODES, SUBJECTS, CAM, EDGE_ROLE, TONES,
  buildScene, renderSource, luminanceField, sample, boxAvg, edge, fadeSet, screen, asciiOf,
  renderRole, camFor, CAM_ROLE, fadeFor, ground, scatterRadius,
};
})(window);
