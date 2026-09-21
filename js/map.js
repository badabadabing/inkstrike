'use strict';
/* ============ INK STRIKE · map "PAPER TOWN 纸镇": geometry, collision, navigation ============ */
const MAP = {
  solids: [], W: 128, H: 112, ox: -64, oz: -56, buckets: [], BW: 18, BH: 16,
  spawn: { red: { x1: -16, x2: 16, z1: 41, z2: 50 }, blue: { x1: -16, x2: 16, z1: -50, z2: -41 } },
  points: [
    { n: 'A', x: 44, z: -29, red: 3, blue: 3 }, { n: 'ALONG', x: 48, z: 12, red: 2, blue: 1.5 }, { n: 'B', x: -40, z: -29, red: 3, blue: 3 },
    { n: 'BLANE', x: -48, z: 12, red: 2, blue: 1.5 }, { n: 'MID', x: 0, z: -4, red: 2, blue: 2 }, { n: 'MIDN', x: 0, z: -32, red: 2, blue: 1 },
    { n: 'MIDS', x: 0, z: 30, red: 1, blue: 2 }, { n: 'MARKET', x: -24, z: 2, red: 1.5, blue: 1.5 }, { n: 'SHORT', x: 16, z: 0, red: 1.5, blue: 1.5 },
    { n: 'NE', x: 30, z: -45, red: 2, blue: .5 }, { n: 'NW', x: -30, z: -45, red: 2, blue: .5 }, { n: 'SE', x: 30, z: 45, red: .5, blue: 2 },
    { n: 'SW', x: -30, z: 45, red: .5, blue: 2 }, { n: 'NEST', x: -39.5, z: 27, red: .6, blue: .8 }, { n: 'PIT', x: 57, z: 7, red: .6, blue: .8 },
    { n: 'NALLEY', x: 20, z: -17, red: 1, blue: 1 }, { n: 'SALLEY', x: -18, z: 17, red: 1, blue: 1 }
  ],
  zones: [
    [32, -38, 54, -20, 'A 点 · 高台'], [-54, -38, -30, -20, 'B 点 · 货棚'], [-42, -14, -7, 14, '市集大厅'], [14, -14, 18, 14, '窄巷'],
    [-7, -38, 7, -26, '中门'], [-7, -26, 7, 38, '中路'], [42, -20, 54, 38, 'A 大道'], [54, 2, 60, 12, '死角'], [-54, -20, -42, 38, 'B 长廊'],
    [-44, 20, -37, 38, '狙击台'], [-26, 20, -22, 38, '西隧道'], [22, 20, 26, 38, '东隧道'], [-42, 14, 42, 20, '南巷'], [-42, -20, 42, -14, '北巷'],
    [-60, 38, 60, 52, '红方街区'], [-60, -52, 60, -38, '蓝方街区']
  ]
};

function buildMap(scene) {
  const R = rng(20260921), sk = new Sk('sun'), sh = new Sk('none'), far = new Sk('none'), S = MAP.solids, BLD = [];
  const KX = SUN.x / -SUN.y, KZ = SUN.z / -SUN.y;
  const rr = (a, b) => a + R() * (b - a);

  function hull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  function shadow(x1, z1, x2, z2, y0, y1) {
    const pts = []; for (const y of [y0, y1]) for (const x of [x1, x2]) for (const z of [z1, z2]) pts.push([x + KX * y, z + KZ * y]);
    const h = hull(pts); for (let i = 1; i < h.length - 1; i++) sh.tri([h[0][0], .012, h[0][1]], [h[i][0], .012, h[i][1]], [h[i + 1][0], .012, h[i + 1][1]], 0.33);
  }
  function solid(x1, z1, x2, z2, y0, y1, o = {}) {
    const s = { x1, y1: y0, z1, x2, y2: y1, z2, thin: !!o.thin }; S.push(s);
    if (o.vis !== false) sk.bx(x1, y0, z1, x2, y1, z2, o);
    if (o.shadow !== false && y1 > 0.4) shadow(x1, z1, x2, z2, y0, y1);
    return s;
  }
  const inSolid = (x, y, z) => { for (const s of S) if (x > s.x1 && x < s.x2 && z > s.z1 && z < s.z2 && y > s.y1 && y < s.y2) return true; return false; };
  const faces = (x1, z1, x2, z2) => [
    { px: x1, pz: z2, ux: 1, uz: 0, nx: 0, nz: 1, len: x2 - x1 }, { px: x2, pz: z1, ux: -1, uz: 0, nx: 0, nz: -1, len: x2 - x1 },
    { px: x2, pz: z2, ux: 0, uz: -1, nx: 1, nz: 0, len: z2 - z1 }, { px: x1, pz: z1, ux: 0, uz: 1, nx: -1, nz: 0, len: z2 - z1 }];
  const faceM = (f, y = 0) => new THREE.Matrix4().makeBasis(new V3(f.ux, 0, f.uz), new V3(0, 1, 0), new V3(f.nx, 0, f.nz)).setPosition(f.px, y, f.pz);
  const fpt = (f, t, out) => [f.px + f.ux * t + f.nx * out, f.pz + f.uz * t + f.nz * out];

  /* ---------- facade vocabulary ---------- */
  function windowAt(M, t, y, w, h, kind) {
    sk.box(w, h, .05, t + w / 2, y + h / 2, .01, { m: M, tint: GLASS, tone: 0 });
    sk.box(w + .3, .08, .2, t + w / 2, y - .04, .08, { m: M });
    sk.line([t + w / 2, y, .045, t + w / 2, y + h, .045, t, y + h * .6, .045, t + w, y + h * .6, .045,
      t + w * .12, y + h * .3, .046, t + w * .34, y + h * .52, .046, t + w * .2, y + h * .22, .046, t + w * .42, y + h * .44, .046], M);
    if (kind === 1) { for (const sx of [t - .5, t + w]) { sk.box(.5, h, .05, sx + .25, y + h / 2, .03, { m: M, tone: .33 }); } }
    else if (kind === 2) { sk.box(w + .5, .06, .7, t + w / 2, y + h + .3, .33, { m: M, r: [.5, 0, 0], tint: AMBER, tone: 0 }); }
    else if (kind === 3) { sk.box(w + .7, .1, .6, t + w / 2, y - .2, .3, { m: M }); const a = []; for (let i = 0; i <= 5; i++) { const x = t - .3 + (w + .6) * i / 5; a.push(x, y - .15, .58, x, y + .55, .58); } a.push(t - .3, y + .55, .58, t + w + .3, y + .55, .58); sk.line(a, M); }
    else if (kind === 4) { sk.box(.7, .45, .4, t + w / 2, y - .5, .2, { m: M, tone: .33 }); }
  }
  function doorAt(M, t) {
    sk.box(1.3, 2.3, .08, t + .65, 1.15, .02, { m: M, tone: .33 }); sk.box(1.7, .16, .22, t + .65, 2.42, .08, { m: M }); sk.box(1.7, .12, .5, t + .65, .06, .25, { m: M });
    sk.line([t + .2, .3, .07, t + .2, 2.0, .07, t + .2, 2.0, .07, t + 1.1, 2.0, .07, t + 1.1, 2.0, .07, t + 1.1, .3, .07, t + 1.1, .3, .07, t + .2, .3, .07, t + 1.0, 1.1, .08, t + 1.08, 1.1, .08], M);
  }
  function decorate(b) {
    faces(b.x1, b.z1, b.x2, b.z2).forEach(f => {
      let open = 0; for (const k of [.25, .5, .75]) { const [x, z] = fpt(f, f.len * k, 1.2); if (!inSolid(x, 2.2, z) && Math.abs(x) < 61 && Math.abs(z) < 53) open++; }
      if (!open) return;
      const M = faceM(f), h = b.h, L = f.len, free = (t, y) => { const [x, z] = fpt(f, t, .5), [x2, z2] = fpt(f, t, 1.4); return !inSolid(x, y, z) && !inSolid(x2, y, z2); };
      sk.line([0, .45, .02, L, .45, .02, 0, h - .4, .02, L, h - .4, .02], M);
      if (!b.o.bare) { let t = rr(1, 2.2); while (t < L - 2.4) { const r = R(); if (free(t + .6, 1.5)) { if (r < .2 && !b.o.noDoor) doorAt(M, t); else if (r < .85) windowAt(M, t, 1.15, 1.1, 1.4, r < .4 ? 1 : r < .5 ? 4 : 0); } t += rr(3.2, 5.5); } }
      for (let y = 4.2; y + 1.9 < h; y += 3.1) { let t = rr(.8, 2); while (t < L - 2) { const r = R(); if (free(t + .6, y + .7) && r < .85) windowAt(M, t, y, 1.1, 1.5, r < .25 ? 1 : r < .38 ? 2 : r < .5 ? 3 : 0); t += rr(2.6, 4.2); } }
      for (let i = 0; i < L / 5; i++) { const t = rr(.5, L - 1.5), y = rr(.7, h - 1), a = []; for (let k = 0; k < 5; k++) { const ox = rr(0, 1.2), oy = k * .16; a.push(t + ox, y + oy, .02, t + ox + rr(.25, .5), y + oy, .02); } sk.line(a, M); }
      if (R() < .5) { const t = rr(.4, L - .4); sk.line([t, 0, .08, t, h, .08, t + .1, 0, .08, t + .1, h, .08], M); }
    });
  }
  function roof(x1, z1, x2, z2, h) {
    const o = { shadow: false }; sk.bx(x1, h, z1, x2, h + .45, z1 + .25); sk.bx(x1, h, z2 - .25, x2, h + .45, z2); sk.bx(x1, h, z1, x1 + .25, h + .45, z2); sk.bx(x2 - .25, h, z1, x2, h + .45, z2);
    const cx = rr(x1 + 1.5, x2 - 1.5), cz = rr(z1 + 1.5, z2 - 1.5), r = R();
    if (r < .3) { sk.cyl(.9, .9, 1.4, 10, cx, h + 1.9, cz, { tone: -1 }); for (const [dx, dz] of [[-.6, -.6], [.6, -.6], [.6, .6], [-.6, .6]]) sk.line([cx + dx, h, cz + dz, cx + dx, h + 1.2, cz + dz]); sk.cone(1, .5, 10, cx, h + 2.85, cz); }
    else if (r < .55) { sk.line([cx, h, cz, cx, h + 3.2, cz, cx - .5, h + 2.6, cz, cx + .5, h + 2.6, cz, cx - .35, h + 2.2, cz, cx + .35, h + 2.2, cz, cx, h + 3.0, cz - .3, cx, h + 3.0, cz + .3]); }
    else if (r < .75) { sk.box(1.8, 2, 1.8, cx, h + 1, cz); }
    else if (r < .9) { sk.box(1.1, .6, .8, cx, h + .3, cz, { tone: .33 }); }
  }
  function building(x1, z1, x2, z2, h, o = {}) { solid(x1, z1, x2, z2, 0, h, o); BLD.push({ x1, z1, x2, z2, h, o }); if (!o.noRoof) roof(x1, z1, x2, z2, h); }
  function block(x1, z1, x2, z2, hmin, hmax, o = {}) {
    const alongX = (x2 - x1) >= (z2 - z1); let a = alongX ? x1 : z1; const end = alongX ? x2 : z2;
    while (a < end) { let len = Math.round(rr(8, 13)); if (end - (a + len) < 6) len = end - a; const b = a + len;
      alongX ? building(a, z1, b, z2, Math.round(rr(hmin, hmax) * 2) / 2, o) : building(x1, a, x2, b, Math.round(rr(hmin, hmax) * 2) / 2, o); a = b; }
  }

  /* ---------- props ---------- */
  function crate(x, z, s = 1.2, y0 = 0, tint) {
    solid(x - s / 2, z - s / 2, x + s / 2, z + s / 2, y0, y0 + s, { tint: tint ?? (R() < .4 ? WOOD : PAPER) });
    faces(x - s / 2, z - s / 2, x + s / 2, z + s / 2).forEach((f, i) => { const M = faceM(f, y0), k = .13 * s, e = .015;
      sk.line([k, k, e, s - k, k, e, s - k, k, e, s - k, s - k, e, s - k, s - k, e, k, s - k, e, k, s - k, e, k, k, e, k, i % 2 ? k : s - k, e, s - k, i % 2 ? s - k : k, e], M); });
    const t = y0 + s + .012; sk.line([x - s / 2 + .13, t, z - s / 2 + .13, x + s / 2 - .13, t, z + s / 2 - .13, x - s / 2, t, z, x + s / 2, t, z]);
  }
  function barrel(x, z, tint) { solid(x - .33, z - .33, x + .33, z + .33, 0, 1.05, { vis: false }); sk.cyl(.36, .36, 1.05, 10, x, .525, z, { tint: tint ?? PAPER });
    for (const y of [.3, .75]) { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; p.push([x + Math.cos(a) * .375, y, z + Math.sin(a) * .375]); } sk.poly(p, true); } }
  function sandbags(x1, z1, x2, z2, h = .95) {
    solid(x1, z1, x2, z2, 0, h, { vis: false }); const ax = (x2 - x1) > (z2 - z1), L = ax ? x2 - x1 : z2 - z1, Wd = ax ? z2 - z1 : x2 - x1, rows = Math.round(h / .24);
    for (let r = 0; r < rows; r++) { const n = Math.floor(L / .62), off = r % 2 ? .31 : 0;
      for (let i = 0; i < n; i++) { const c = (ax ? x1 : z1) + off + .31 + i * .62; if (c + .3 > (ax ? x2 : z2) + .05) continue; const y = .12 + r * .24;
        ax ? sk.box(.6, .23, Wd, c, y, (z1 + z2) / 2, { tone: r % 2 ? .33 : 0, tint: WOOD }) : sk.box(Wd, .23, .6, (x1 + x2) / 2, y, c, { tone: r % 2 ? .33 : 0, tint: WOOD }); } }
  }
  const PM = (x, z, rot) => new THREE.Matrix4().makeRotationY(rot * Math.PI / 2).setPosition(x, 0, z);
  function car(x, z, rot = 0) {
    const M = PM(x, z, rot), hx = rot % 2 ? .9 : 2.1, hz = rot % 2 ? 2.1 : .9; solid(x - hx, z - hz, x + hx, z + hz, 0, 1.35, { vis: false });
    sk.box(4.2, .62, 1.75, 0, .6, 0, { m: M }); sk.box(2.1, .55, 1.6, -.2, 1.18, 0, { m: M, tint: GLASS, tone: 0 }); sk.box(2.2, .05, 1.64, -.2, 1.47, 0, { m: M, tone: .33 });
    for (const wx of [-1.35, 1.35]) for (const wz of [-.82, .82]) sk.cyl(.34, .34, .22, 10, wx, .34, wz, { m: M, ax: 'z', tone: .66 });
    sk.line([-.2, .3, .885, -.2, .9, .885, .85, .3, .885, .85, .9, .885, 2.11, .7, -.6, 2.11, .7, -.3, 2.11, .7, .3, 2.11, .7, .6, -2.11, .72, -.7, -2.11, .72, .7], M);
  }
  function truck(x, z, rot = 0, tint = PAPER) {
    const M = PM(x, z, rot), hx = rot % 2 ? 1.25 : 3.3, hz = rot % 2 ? 3.3 : 1.25; solid(x - hx, z - hz, x + hx, z + hz, 0, 2.9, { vis: false });
    sk.box(4.4, 2.2, 2.4, -1.05, 1.8, 0, { m: M, tint }); sk.box(1.9, 1.7, 2.3, 2.3, 1.45, 0, { m: M }); sk.box(1.0, .7, 2.1, 2.6, 1.85, 0, { m: M, tint: GLASS, tone: 0 }); sk.box(6.4, .25, 2.2, 0, .62, 0, { m: M, tone: .66 });
    for (const wx of [-2.2, -1.2, 2.2]) for (const wz of [-1.1, 1.1]) sk.cyl(.48, .48, .3, 10, wx, .48, wz, { m: M, ax: 'z', tone: .66 });
    const a = []; for (let i = 0; i < 6; i++) { const px = -3.1 + i * .8; a.push(px, .75, 1.21, px, 2.88, 1.21, px, .75, -1.21, px, 2.88, -1.21); } sk.line(a, M);
  }
  function bus(x, z) {
    solid(x - 1.3, z - 5, x + 1.3, z + 5, 0, 3, { vis: false }); sk.box(2.6, 2.5, 10, x, 1.7, z); sk.box(2.64, .8, 9, x, 2.2, z, { tint: GLASS, tone: 0 }); sk.box(2.66, .22, 10.02, x, 1.2, z, { tint: AMBER, tone: 0 });
    for (const wz of [-3.4, 3.4]) for (const wx of [-1.25, 1.25]) sk.cyl(.5, .5, .3, 10, x + wx, .5, z + wz, { ax: 'x', tone: .66 });
    const a = []; for (let i = -4; i <= 4; i++) a.push(x + 1.33, 1.8, z + i * 1.0, x + 1.33, 2.6, z + i * 1.0, x - 1.33, 1.8, z + i, x - 1.33, 2.6, z + i); sk.line(a);
  }
  function palm(x, z) {
    solid(x - .22, z - .22, x + .22, z + .22, 0, 6, { vis: false, shadow: false }); const H = rr(6, 8.5), lean = rr(-.6, .6), lz = rr(-.5, .5); let px = x, pz = z;
    for (let i = 0; i < 6; i++) { const t = (i + .5) / 6; px = x + lean * t * t; pz = z + lz * t * t; sk.cyl(.17 - i * .012, .2 - i * .012, H / 6, 7, px, H * t, pz, { ea: 50 }); }
    const n = 9; for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + rr(0, .4), len = rr(2.6, 3.6), pts = [], lf = [];
      for (let j = 0; j <= 7; j++) { const u = j / 7, r = len * u, y = H + .2 + Math.sin(u * 2.2) * 1.0 - u * u * 2.0; pts.push([px + Math.cos(a) * r, y, pz + Math.sin(a) * r]);
        if (j > 1) { const q = pts[j]; lf.push(q[0], q[1], q[2], q[0] - Math.sin(a) * .35, q[1] - .5, q[2] + Math.cos(a) * .35, q[0], q[1], q[2], q[0] + Math.sin(a) * .35, q[1] - .5, q[2] - Math.cos(a) * .35); } }
      sk.poly(pts); sk.line(lf); }
    const sp = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, r = i % 2 ? 1.2 : 2.9; sp.push([x + KX * H + Math.cos(a) * r, z + KZ * H + Math.sin(a) * r]); }
    for (let i = 0; i < 12; i++) sh.tri([x + KX * H, .012, z + KZ * H], [sp[i][0], .012, sp[i][1]], [sp[(i + 1) % 12][0], .012, sp[(i + 1) % 12][1]], .33);
  }
  function lamp(x, z, dx, dz) { sk.cyl(.06, .09, 4.6, 6, x, 2.3, z, { ea: 50 }); sk.line([x, 4.6, z, x + dx * .9, 4.9, z + dz * .9]); sk.box(.34, .4, .34, x + dx * .9, 4.65, z + dz * .9, { tint: AMBER, tone: 0 }); sk.cone(.3, .2, 4, x + dx * .9, 4.95, z + dz * .9); }
  function stall(x, z, rot = 0) {
    const M = PM(x, z, rot), hx = rot % 2 ? .5 : 1.6, hz = rot % 2 ? 1.6 : .5; solid(x - hx, z - hz, x + hx, z + hz, 0, 1.0, { vis: false });
    sk.box(3.2, 1.0, 1.0, 0, .5, 0, { m: M, tint: WOOD }); for (const px of [-1.6, 1.6]) for (const pz of [-.9, .9]) sk.line([px, 0, pz, px, pz < 0 ? 2.9 : 2.3, pz], M);
    for (let i = 0; i < 8; i++) sk.box(.43, .05, 2.1, -1.5 + i * .43, 2.6, 0, { m: M, r: [.29, 0, 0], tint: i % 2 ? PAPER : AMBER, tone: 0 });
    for (let i = 0; i < 5; i++) sk.sph(.13, -1.1 + i * .5 + rr(-.1, .1), 1.12, rr(-.25, .25), { m: M, tint: i % 2 ? RED : AMBER, tone: 0, ws: 6, hs: 4 });
  }
  function bunting(x1, y1, z1, x2, y2, z2) {
    const n = 16, pts = [], cols = [AMBER, PAPER, BLUE, PAPER, RED, PAPER]; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x1, x2, u), lerp(y1, y2, u) - Math.sin(u * Math.PI) * 1.1, lerp(z1, z2, u)]); }
    sk.poly(pts); for (let i = 0; i < n; i++) { const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - .5, (a[2] + b[2]) / 2], q = [lerp(a[0], b[0], .8), lerp(a[1], b[1], .8), lerp(a[2], b[2], .8)];
      sk.tri(a, q, m, 0, cols[i % 6]); sk.line([a[0], a[1], a[2], m[0], m[1], m[2], m[0], m[1], m[2], q[0], q[1], q[2]]); }
  }
  function archLines(x1, x2, z, y, axisZ) { for (const off of [-.52, .52]) { const pts = [], c = (x1 + x2) / 2, r = (x2 - x1) / 2; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; const u = c - Math.cos(a) * r, v = y - .02 + Math.sin(a) * .0; pts.push(axisZ ? [z + off, y - 1 + Math.sin(a) * 1.0, u] : [u, y - 1 + Math.sin(a) * 1.0, z + off]); } sk.poly(pts); } }
  function stairs(x1, z1, x2, z2, dir, n, y0 = 0) { // dir: '+x','-x','+z','-z' = direction of ascent
    for (let i = 0; i < n; i++) { const top = y0 + .25 * (i + 1), d = .5;
      if (dir === '+x') solid(x1 + i * d, z1, x1 + (i + 1) * d, z2, y0, top, { shadow: false }); else if (dir === '-x') solid(x2 - (i + 1) * d, z1, x2 - i * d, z2, y0, top, { shadow: false });
      else if (dir === '+z') solid(x1, z1 + i * d, x2, z1 + (i + 1) * d, y0, top, { shadow: false }); else solid(x1, z2 - (i + 1) * d, x2, z2 - i * d, y0, top, { shadow: false }); }
  }
  function sign(text, x, y, z, ry, w, h, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(text, o), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(x, y, z); if (o.flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry; scene.add(m);
  }

  /* ================= LAYOUT ================= */
  sk.quad([-400, 0, -400], [-400, 0, 400], [400, 0, 400], [400, 0, -400], 0, PAPER);
  // perimeter
  block(-64, -38, -54, 38, 6, 10); block(54, -38, 64, 2, 6, 10); block(54, 12, 64, 38, 6, 10); building(60, 2, 64, 12, 7);
  block(-64, 52, 64, 56, 6, 9, { bare: true }); block(-64, -56, 64, -52, 6, 9, { bare: true });
  building(-64, 38, -60, 52, 8); building(60, 38, 64, 52, 7); building(-64, -52, -60, -38, 7); building(60, -52, 64, -38, 8);
  // WS block: sniper nest + west tunnel
  solid(-42, 20, -37, 38, 0, 3); BLD.push({ x1: -42, z1: 20, x2: -37, z2: 38, h: 3, o: { bare: true } });
  solid(-42, 20, -41.7, 28, 3, 3.95); solid(-42, 31, -41.7, 38, 3, 3.95); solid(-42, 20, -37, 20.3, 3, 3.95); solid(-42, 37.7, -37, 38, 3, 3.95);
  stairs(-44, 31, -42, 37, '-z', 12); solid(-44, 28, -42, 31, 0, 3);
  sk.line([-44, 1.0, 37, -44, 4.0, 31, -44, 4.0, 31, -44, 4.0, 28, -44, 0, 37, -44, 1.0, 37, -44, 3, 31, -44, 4, 31, -44, 3, 28, -44, 4, 28, -44, 2.5, 34, -44, 1.5, 34]);
  building(-37, 20, -26, 38, 7.5); building(-22, 20, -7, 38, 6.5); solid(-26, 20, -22, 38, 3.4, 7); archLines(-26, -22, 38, 3.4); archLines(-26, -22, 20, 3.4);
  // ES block + east tunnel
  building(7, 20, 22, 38, 7); building(26, 20, 42, 38, 8); solid(22, 20, 26, 38, 3.4, 6.5); archLines(22, 26, 38, 3.4); archLines(22, 26, 20, 3.4);
  // Market hall (hollow)
  const mh = 6, wall = (x1, z1, x2, z2, y0 = 0, y1 = mh) => { solid(x1, z1, x2, z2, y0, y1); if (!y0) BLD.push({ x1, z1, x2, z2, h: y1, o: { noDoor: true } }); };
  wall(-42, -14, -41, -2); wall(-42, 2, -41, 14); wall(-42, -2, -41, 2, 3, mh); wall(-8, -14, -7, -3); wall(-8, 3, -7, 14); wall(-8, -3, -7, 3, 3.2, mh);
  wall(-41, 13, -26, 14); wall(-22, 13, -8, 14); wall(-26, 13, -22, 14, 3, mh); wall(-41, -14, -18, -13); wall(-14, -14, -8, -13); wall(-18, -14, -14, -13, 3, mh);
  solid(-42, -14, -7, 14, mh, mh + .5); roof(-42, -14, -7, 14, mh + .5);
  for (const px of [-30, -18]) for (const pz of [-6, 6]) { solid(px - .5, pz - .5, px + .5, pz + .5, 0, mh); sk.box(1.4, .3, 1.4, px, mh - .15, pz); sk.box(1.3, .25, 1.3, px, .125, pz); }
  solid(-37, -10.5, -31, -9.5, 0, 1.05, { tint: WOOD }); solid(-20, 8.5, -13, 9.5, 0, 1.05, { tint: WOOD }); crate(-11, -10.5, 1.3); crate(-11, -9.1, 1.0); crate(-38.5, 10.5, 1.4); crate(-24, -5, 1.2); crate(-24.1, -5, .8, 1.2);
  // EC block with narrow alley
  building(7, -14, 14, 14, 7.5); building(18, -14, 42, 0, 8.5); building(18, 0, 42, 14, 6.5); solid(14, -14, 18, -13, 3.5, 5.5); solid(14, 13, 18, 14, 3.5, 5.5); archLines(14, 18, 13.5, 3.5); archLines(14, 18, -13.5, 3.5); crate(14.6, 3, 1.0);
  // north blocks
  block(-30, -38, -7, -20, 6, 9); block(7, -38, 28, -20, 6, 9);
  // Site B: cargo shed
  for (const [px, pz] of [[-41.5, -35.5], [-30.5, -35.5], [-41.5, -22.5]]) { solid(px - .4, pz - .4, px + .4, pz + .4, 0, 4.5); sk.box(1.1, .25, 1.1, px, 4.37, pz); }
  solid(-42.4, -36.4, -30, -21.6, 4.5, 4.9); const rl = []; for (let i = 0; i <= 12; i++) rl.push(-42.4 + i * 1.03, 4.92, -36.4, -42.4 + i * 1.03, 4.92, -21.6); sk.line(rl);
  sh.quad([-42, .013, -36], [-42, .013, -22], [-30, .013, -22], [-30, .013, -36], .33);
  crate(-36, -30, 1.4); crate(-36, -28.5, 1.0); crate(-35.9, -30, .9, 1.4); crate(-47, -24, 1.3); crate(-33, -34.5, 1.2); barrel(-44.5, -34, RED); barrel(-45.3, -34.4); truck(-50.8, -32, 1);
  // Site A: raised platform
  solid(32, -38, 54, -22, 0, 1); stairs(42, -22, 54, -20, '-z', 4); stairs(30, -34, 32, -26, '+x', 4); stairs(38, -40, 48, -38, '+z', 4);
  solid(32, -22.35, 42, -22, 1, 1.95); solid(32, -38, 32.35, -34, 1, 1.95); solid(32, -26, 32.35, -22, 1, 1.95); solid(32, -38, 38, -37.65, 1, 1.95); solid(48, -38, 54, -37.65, 1, 1.95);
  crate(40, -30, 1.4, 1); crate(41.4, -30.2, 1.0, 1); crate(40.1, -30, .9, 2.4); crate(50, -34, 1.4, 1); crate(46, -25, 1.2, 1); barrel(35, -35.5, AMBER); barrel(35.8, -35.2);
  { const a = []; for (let x = 34; x <= 52; x += 2) a.push(x, 1.014, -37.6, x, 1.014, -22); for (let z = -36; z <= -24; z += 2) a.push(32.4, 1.014, z, 54, 1.014, z); sk.line(a); }
  // Mid
  solid(-7, -26.5, -2, -25.5, 0, 4.2); solid(2, -26.5, 7, -25.5, 0, 4.2); solid(-2, -26.5, 2, -25.5, 3, 4.2); solid(-2, -26.15, -1, -25.95, 0, 3, { thin: true, tint: WOOD, tone: .33 }); solid(1.8, -27.5, 2, -26.5, 0, 3, { thin: true, tint: WOOD, tone: .33 });
  solid(-2, 2, 2, 6, 0, .75, { vis: false }); sk.cyl(2.3, 2.5, .75, 8, 0, .375, 4); sk.cyl(1.9, 1.9, .1, 8, 0, .62, 4, { tint: GLASS, tone: 0 }); sk.cyl(.3, .45, 1.7, 8, 0, .85, 4); sk.cyl(.9, .2, .25, 8, 0, 1.8, 4);
  { const a = []; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.2832; a.push(Math.cos(an) * .8, 1.9, 4 + Math.sin(an) * .8, Math.cos(an) * 1.4, .7, 4 + Math.sin(an) * 1.4); } sk.line(a); }
  crate(-5.6, -9, 1.4); crate(-5.7, -7.6, 1.0); crate(5.8, 22, 1.3); sandbags(1, -15.6, 5.4, -14.8); sandbags(-5.4, 25, -1, 25.8); barrel(6.2, -3, BLUE); barrel(6.3, -3.9);
  // A long (east lane)
  solid(42, 23.5, 46, 24.5, 0, 5); solid(50, 23.5, 54, 24.5, 0, 5); solid(46, 23.5, 50, 24.5, 3.5, 5); archLines(46, 50, 24, 3.5); bus(44.4, 9);
  crate(52.6, -6, 1.6); crate(52.9, -4.4, 1.0); crate(43, -14.5, 1.3); crate(52.8, 30, 1.3); crate(51.5, 30.2, 1.0); barrel(58.8, 3, RED); barrel(59, 10.8); crate(58.6, 7, 1.4); sandbags(47, -2.4, 50.5, -1.6);
  // B lane (west)
  solid(-54, 7.5, -50, 8.5, 0, 5); solid(-46, 7.5, -42, 8.5, 0, 5); solid(-50, 7.5, -46, 8.5, 3.5, 5); archLines(-50, -46, 8, 3.5);
  crate(-52.9, -3, 1.5); crate(-52.9, -1.5, 1.0); crate(-43, 17, 1.3); solid(-43.6, -12, -42.2, -9.6, 0, 1.3, { tone: .33 }); sk.box(1.5, .08, 2.5, -42.9, 1.36, -10.8, { r: [0, 0, .12] }); sandbags(-53.5, 20, -50, 20.8); crate(-47, -12, 1.2);
  // alleys
  crate(-30, 15, 1.3); crate(-31.3, 14.8, 1.0); solid(27, 18.4, 29.6, 19.8, 0, 1.3, { tone: .33 }); crate(30, -15, 1.3); crate(-16, -19.2, 1.2); crate(-15, -19.3, .8); crate(34, 15, 1.2);
  // spawn streets
  truck(-26, 49.5, 0, WOOD); crate(10, 39.6, 1.4); crate(11.5, 39.4, 1.0); sandbags(-7, 39.6, -2.6, 40.4); stall(30, 50.4, 0); stall(-44, 50.4, 0); car(33, 40, 0); crate(-57, 45, 1.5); crate(57, 47, 1.5); barrel(56, 40);
  truck(24, -49.5, 0, WOOD); crate(-10, -39.6, 1.4); crate(-11.5, -39.4, 1.0); sandbags(2.6, -40.4, 7, -39.6); stall(-32, -50.4, 0); stall(18, -39.2, 0); car(-36, -40.3, 0); crate(57, -45, 1.5); crate(-57, -47, 1.5); barrel(-56, -40);
  for (const x of [-52, -36, -12, 14, 40, 56]) { palm(x, 51); palm(x + 5, -51); }
  palm(-53, -19); palm(53, 37); palm(6, 37);
  for (const [x, z, dx, dz] of [[-20, 38.4, 0, 1], [20, 38.4, 0, 1], [-20, -38.4, 0, -1], [20, -38.4, 0, -1], [-7.3, 0, 1, 0], [7.3, -20, -1, 0], [41.7, 0, 1, 0], [-41.7, -17, -1, 0], [54.3, -12, -1, 0], [-54.3, 28, 1, 0]]) lamp(x, z, dx, dz);
  bunting(-7, 5.6, 10, 7, 5.2, 10); bunting(-7, 5.2, -10, 7, 5.8, -10); bunting(-20, 5.5, 14, -20, 5.2, 20); bunting(30, 5.5, 14, 30, 5.8, 20); bunting(42, 5.6, 0, 54, 5.4, 0); bunting(-54, 5.4, -4, -42, 5.2, -4); bunting(-10, 5.4, -20, -10, 5.6, -14); bunting(-60, 6, 45, -30, 6.5, 38); bunting(30, 6, -38, 60, 6.5, -45);
  // signs & painted marks
  sign('A', 28.06, 3.6, -29, Math.PI / 2, 2.6, 2.6, { w: 256, h: 256, color: '#e9a520', stencil: 40 }); sign('B', -30.06, 2.9, -29, -Math.PI / 2, 2.4, 2.4, { w: 256, h: 256, color: '#e9a520', stencil: 40 });
  sign('A', 45, 1.03, -30, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 }); sign('B', -37, .03, -26, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 });
  sign('市集 MARKET', -6.94, 4.3, 0, Math.PI / 2, 5.2, 1.0, { border: 6, bg: '#f5f2ea' }); sign('← A', 6.94, 2.6, -22, -Math.PI / 2, 1.6, .6, { w: 256, h: 96, color: '#e9a520' });
  sign('PAPER TOWN', 0, 3.6, -25.44, 0, 3.6, .7, { border: 6, bg: '#f5f2ea' }); sign('B →', -6.94, 2.6, -22, Math.PI / 2, 1.6, .6, { w: 256, h: 96, color: '#e9a520' });
  { const a = []; for (let x = -58; x < 58; x += 5) { a.push(x, .015, 45, x + 2, .015, 45, x, .015, -45, x + 2, .015, -45); } for (const [cx, cz, y, r] of [[45, -30, 1.016, 3.4], [-37, -26, .016, 3.4]]) for (let i = 0; i < 24; i++) { const p = i / 24 * 6.2832, q = (i + .6) / 24 * 6.2832; a.push(cx + Math.cos(p) * r, y, cz + Math.sin(p) * r, cx + Math.cos(q) * r, y, cz + Math.sin(q) * r); }
    for (let i = 0; i < 700; i++) { const x = rr(-60, 60), z = rr(-52, 52); if (inSolid(x, .2, z)) continue; const an = rr(0, 6.28), l = rr(.06, .3); a.push(x, .015, z, x + Math.cos(an) * l, .015, z + Math.sin(an) * l); if (R() < .15) a.push(x, .015, z, x + rr(-.8, .8), .015, z + rr(-.8, .8)); } sk.line(a); }
  BLD.forEach(decorate);
  // skyline beyond the walls
  for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832 + rr(0, .1), r = rr(82, 135), w = rr(8, 16), h = rr(9, 24), x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r; sk.box(w, h, w, x, h / 2, z);
    const wl = []; for (let y = 3; y < h - 1; y += 3) for (let k = -w / 2 + 1; k < w / 2 - 1; k += 2.2) { const s = Math.abs(x) > Math.abs(z); const fx = s ? x - Math.sign(x) * (w / 2 + .05) : x + k, fz = s ? z + k : z - Math.sign(z) * (w / 2 + .05); wl.push(fx, y, fz, fx, y + 1.2, fz); } sk.line(wl); }
  for (const [x, z, h] of [[-74, -66, 30], [78, 60, 26]]) { sk.cyl(2.2, 2.8, h, 8, x, h / 2, z); sk.cyl(3.2, 3.2, .5, 8, x, h * .78, z); sk.cyl(1.6, 1.6, 4, 8, x, h + 2, z); sk.sph(2, x, h + 4.5, z, { ws: 8, hs: 4 }); sk.line([x, h + 6.4, z, x, h + 9, z]); }
  { const x = 80, z = -70; sk.line([x, 0, z, x, 38, z, x + 1.5, 0, z, x + 1.5, 38, z, x - 9, 38, z, x + 30, 38, z, x - 9, 38, z, x, 42, z, x, 42, z, x + 30, 38, z, x + 24, 38, z, x + 24, 22, z]); const a = []; for (let y = 0; y < 38; y += 3) a.push(x, y, z, x + 1.5, y + 3, z, x + 1.5, y, z, x, y + 3, z); sk.line(a); sk.box(1.6, 1.6, 1.6, x + 24, 21, z, { tone: .66 }); }
  // far scenery: mountains, clouds, sun
  for (const [rad, hmul, seed] of [[360, 1, 3], [470, 1.7, 9]]) { const Q = rng(seed), pts = []; let h = 30; for (let i = 0; i <= 90; i++) { h = clamp(h + (Q() - .5) * 38, 12, 95); pts.push([Math.cos(i / 90 * 6.2832) * rad, i === 90 ? pts[0][1] : h * hmul, Math.sin(i / 90 * 6.2832) * rad]); }
    far.poly(pts); const a = []; pts.forEach((p, i) => { if (i % 2 === 0 && p[1] > 40) a.push(p[0], p[1], p[2], p[0] * .995 + 6, p[1] * .45, p[2] * .995, p[0], p[1], p[2], p[0] * .99 - 9, p[1] * .6, p[2] * .99); }); far.line(a); }
  for (let i = 0; i < 14; i++) { const a = rr(0, 6.28), r = rr(250, 420), y = rr(110, 190), cx = Math.cos(a) * r, cz = Math.sin(a) * r, w = rr(30, 70), pts = [], tx = -Math.sin(a), tz = Math.cos(a);
    for (let k = 0; k <= 5; k++) for (let j = 0; j <= 6; j++) { const u = (k + j / 6) / 5.0 - .5; pts.push([cx + tx * u * w, y + Math.sin(j / 6 * Math.PI) * w * .07 * (1 + (k % 2) * .6), cz + tz * u * w]); } pts.push([cx - tx * w * .5, y, cz - tz * w * .5]); far.poly(pts); }
  { const c = SUN.clone().multiplyScalar(-600), M = new THREE.Matrix4().lookAt(c, new V3(), new V3(0, 1, 0)).setPosition(c), pts = [], a = []; for (let i = 0; i < 32; i++) { const an = i / 32 * 6.2832; pts.push([Math.cos(an) * 38, Math.sin(an) * 38, 0]); if (i % 2 === 0) a.push(Math.cos(an) * 48, Math.sin(an) * 48, 0, Math.cos(an) * (i % 4 ? 60 : 74), Math.sin(an) * (i % 4 ? 60 : 74), 0); } far.poly(pts, true, M); far.line(a, M); }

  scene.add(sk.bake(fillMat(), lineMat({ width: 1.45 })));
  scene.add(sh.bake(fillMat({ offset: 0 }), lineMat()));
  const fg = far.bake(null, lineMat({ color: GREY, width: 1.1, fog: false })); fg.traverse(o => o.frustumCulled = false); scene.add(fg);

  buildBuckets(); buildNav(); drawMini();
}

/* ---------------- collision ---------------- */
function buildBuckets() {
  const B = MAP.buckets = []; for (let i = 0; i < MAP.BW * MAP.BH; i++) B.push([]);
  for (const s of MAP.solids) { const i1 = clamp(Math.floor((s.x1 - 1.5 + 72) / 8), 0, MAP.BW - 1), i2 = clamp(Math.floor((s.x2 + 1.5 + 72) / 8), 0, MAP.BW - 1), j1 = clamp(Math.floor((s.z1 - 1.5 + 64) / 8), 0, MAP.BH - 1), j2 = clamp(Math.floor((s.z2 + 1.5 + 64) / 8), 0, MAP.BH - 1);
    for (let i = i1; i <= i2; i++) for (let j = j1; j <= j2; j++) B[j * MAP.BW + i].push(s); }
}
MAP.near = (x, z) => MAP.buckets[clamp(Math.floor((z + 64) / 8), 0, MAP.BH - 1) * MAP.BW + clamp(Math.floor((x + 72) / 8), 0, MAP.BW - 1)];
function entOverlap(e, x, y, z, list) { const w = e.hw; for (let i = 0; i < list.length; i++) { const s = list[i]; if (x + w > s.x1 && x - w < s.x2 && z + w > s.z1 && z - w < s.z2 && y + e.hgt > s.y1 && y < s.y2) return s; } return null; }
function supportY(e, list) { const p = e.pos, w = e.hw; let y = 0; for (let i = 0; i < list.length; i++) { const s = list[i]; if (p.x + w > s.x1 && p.x - w < s.x2 && p.z + w > s.z1 && p.z - w < s.z2 && s.y2 <= p.y + .02 && s.y2 > y) y = s.y2; } return y; }
const GRAV = 17;
function moveEntity(e, dt) {
  const p = e.pos, v = e.vel, near = MAP.near(p.x, p.z); e.hitWall = false; e.landed = 0;
  for (const ax of ['x', 'z']) {
    const d = v[ax] * dt; if (!d) continue; const old = p[ax]; p[ax] += d;
    for (let k = 0; k < 3; k++) {
      const s = entOverlap(e, p.x, p.y, p.z, near); if (!s) break;
      const up = s.y2 - p.y;
      if (e.onGround && up > 0 && up <= .56 && !entOverlap(e, p.x, s.y2 + .001, p.z, near)) { e.stepSmooth -= up; p.y = s.y2 + .001; break; }
      p[ax] = d > 0 ? s[ax + '1'] - e.hw - .001 : s[ax + '2'] + e.hw + .001; v[ax] = 0; e.hitWall = true;
      if (k === 2 && entOverlap(e, p.x, p.y, p.z, near)) p[ax] = old;
    }
  }
  p.x = clamp(p.x, -63, 63); p.z = clamp(p.z, -55, 55);
  const sup = supportY(e, near);
  if (e.onGround && v.y <= 0 && p.y - sup <= .31) { e.stepSmooth += p.y - sup; p.y = sup; v.y = 0; }
  else {
    v.y -= GRAV * dt; const ny = p.y + v.y * dt;
    if (v.y <= 0 && ny <= sup) { e.landed = -v.y; p.y = sup; v.y = 0; e.onGround = true; }
    else { p.y = ny; e.onGround = false; if (v.y > 0) { const s = entOverlap(e, p.x, p.y, p.z, near); if (s) { p.y = s.y1 - e.hgt - .001; v.y = 0; } } }
  }
}
/* ray vs world. returns hit record (shared) or null */
const _hit = { t: 0, tx: 0, nx: 0, ny: 0, nz: 0, s: null };
function rayWorld(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, bs = null, bn = 0, btx = 0; const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz, S = MAP.solids;
  for (let i = 0; i < S.length; i++) { const s = S[i];
    let t1 = (s.x1 - ox) * ix, t2 = (s.x2 - ox) * ix, tn, tf, ax = 0; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = t1; tf = t2;
    t1 = (s.y1 - oy) * iy; t2 = (s.y2 - oy) * iy; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 1; } if (t2 < tf) tf = t2; if (tn > tf) continue;
    t1 = (s.z1 - oz) * iz; t2 = (s.z2 - oz) * iz; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 2; } if (t2 < tf) tf = t2;
    if (tn > tf || tn < 0 || tn >= best) continue; best = tn; bs = s; bn = ax; btx = tf; }
  if (dy < 0) { const t = -oy / dy; if (t < best) { _hit.t = t; _hit.tx = t + 99; _hit.nx = 0; _hit.ny = 1; _hit.nz = 0; _hit.s = null; return _hit; } }
  if (!bs) return null;
  _hit.t = best; _hit.tx = btx; _hit.s = bs; _hit.nx = bn === 0 ? -Math.sign(dx) : 0; _hit.ny = bn === 1 ? -Math.sign(dy) : 0; _hit.nz = bn === 2 ? -Math.sign(dz) : 0; return _hit;
}
function segClear(ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < .01) return true; return !rayWorld(ax, ay, az, dx / d || 1e-9, dy / d || 1e-9, dz / d || 1e-9, d - .05); }

/* ---------------- navigation grid + A* ---------------- */
function buildNav() {
  const W = MAP.W, H = MAP.H, fh = MAP.fh = new Float32Array(W * H), ok = MAP.ok = new Uint8Array(W * H), S = MAP.solids;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = MAP.ox + i + .5, z = MAP.oz + j + .5; let h = 0;
    for (const s of S) if (x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2 && s.y2 <= 3.2 && s.y2 > h) h = s.y2;
    let blocked = Math.abs(x) > 60.4 || Math.abs(z) > 52.4;
    if (!blocked) for (const s of S) if (x + .42 > s.x1 && x - .42 < s.x2 && z + .42 > s.z1 && z - .42 < s.z2 && h + 1.75 > s.y1 && h + .6 < s.y2) { blocked = true; break; }
    fh[j * W + i] = h; ok[j * W + i] = blocked ? 0 : 1; }
  // reachability flood from red spawn
  const reach = MAP.reach = new Uint8Array(W * H), st = [navIdx(0, 45)]; reach[st[0]] = 1;
  while (st.length) { const c = st.pop(), ci = c % W, cj = (c / W) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni; if (!ok[n] || reach[n] || Math.abs(fh[n] - fh[c]) > .56) continue; reach[n] = 1; st.push(n); } }
  const pen = MAP.pen = new Float32Array(W * H);
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { let c = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!reach[(j + b) * W + i + a]) c++; pen[j * W + i] = c * .45; }
}
function navIdx(x, z) { return clamp(Math.floor(z - MAP.oz), 0, MAP.H - 1) * MAP.W + clamp(Math.floor(x - MAP.ox), 0, MAP.W - 1); }
MAP.floorAt = (x, z) => MAP.fh[navIdx(x, z)];
function navSnap(x, z) { const W = MAP.W; let c = navIdx(x, z); if (MAP.reach[c]) return c; const ci = c % W, cj = (c / W) | 0;
  for (let r = 1; r < 14; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue; const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= W || j >= MAP.H) continue; if (MAP.reach[j * W + i]) return j * W + i; } return c; }
const navPos = c => ({ x: MAP.ox + (c % MAP.W) + .5, z: MAP.oz + ((c / MAP.W) | 0) + .5, y: MAP.fh[c] });
function navLine(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / .4); let ph = MAP.fh[navIdx(x0, z0)];
  for (let i = 1; i <= n; i++) { const c = navIdx(lerp(x0, x1, i / n), lerp(z0, z1, i / n)); if (!MAP.reach[c] || MAP.pen[c] > 1.3 || Math.abs(MAP.fh[c] - ph) > .56) return false; ph = MAP.fh[c]; } return true; }
const _nav = { g: null, from: null, stamp: null, n: 0 };
function navPath(x0, z0, x1, z1) {
  const W = MAP.W, H = MAP.H, N = W * H; if (!_nav.g) { _nav.g = new Float32Array(N); _nav.from = new Int32Array(N); _nav.stamp = new Uint32Array(N); }
  const g = _nav.g, from = _nav.from, stamp = _nav.stamp, id = ++_nav.n, s = navSnap(x0, z0), t = navSnap(x1, z1), ti = t % W, tj = (t / W) | 0;
  const heap = [], hk = []; const push = (c, f) => { let i = heap.length; heap.push(c); hk.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= f) break; heap[i] = heap[p]; hk[i] = hk[p]; heap[p] = c; hk[p] = f; i = p; } };
  const pop = () => { const top = heap[0], lc = heap.pop(), lf = hk.pop(); if (heap.length) { let i = 0; heap[0] = lc; hk[0] = lf; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && hk[l] < hk[m]) m = l; if (r < heap.length && hk[r] < hk[m]) m = r; if (m === i) break; const c = heap[i], f = hk[i]; heap[i] = heap[m]; hk[i] = hk[m]; heap[m] = c; hk[m] = f; i = m; } } return top; };
  g[s] = 0; stamp[s] = id; from[s] = -1; push(s, 0); let found = false, iter = 0;
  while (heap.length && iter++ < 20000) { const c = pop(); if (c === t) { found = true; break; } const ci = c % W, cj = (c / W) | 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const ni = ci + a, nj = cj + b; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni;
      if (!MAP.reach[n] || Math.abs(MAP.fh[n] - MAP.fh[c]) > .56) continue; if (a && b && (!MAP.reach[cj * W + ni] || !MAP.reach[nj * W + ci] || MAP.fh[cj * W + ni] !== MAP.fh[c] || MAP.fh[nj * W + ci] !== MAP.fh[c])) continue;
      const ng = g[c] + (a && b ? 1.414 : 1) + MAP.pen[n]; if (stamp[n] === id && g[n] <= ng) continue; g[n] = ng; stamp[n] = id; from[n] = c; push(n, ng + Math.hypot(ni - ti, nj - tj)); } }
  if (!found) return null; const out = []; for (let c = t; c !== -1; c = from[c]) out.push(navPos(c)); out.reverse();
  // string-pull
  const sm = [out[0]]; let i = 0; while (i < out.length - 1) { let j = Math.min(out.length - 1, i + 10); while (j > i + 1 && !navLine(out[i].x, out[i].z, out[j].x, out[j].z)) j--; sm.push(out[j]); i = j; } return sm;
}
function navRandomIn(r) { for (let k = 0; k < 60; k++) { const x = rand(r.x1, r.x2), z = rand(r.z1, r.z2), c = navIdx(x, z); if (MAP.reach[c] && MAP.pen[c] < .5) return navPos(c); } return navPos(navSnap((r.x1 + r.x2) / 2, (r.z1 + r.z2) / 2)); }
MAP.zoneAt = (x, z) => { for (const q of MAP.zones) if (x >= q[0] && x <= q[2] && z >= q[1] && z <= q[3]) return q[4]; return ''; };

/* ---------------- minimap base ---------------- */
function drawMini() {
  const k = 4, c = MAP.mini = document.createElement('canvas'); c.width = 128 * k; c.height = 112 * k; const g = c.getContext('2d');
  g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, c.width, c.height); g.lineWidth = 1;
  const S = MAP.solids.slice().sort((a, b) => a.y2 - b.y2);
  for (const s of S) { if (s.y2 < .7 || s.y1 > 2.5) continue; const x = (s.x1 + 64) * k, y = (s.z1 + 56) * k, w = (s.x2 - s.x1) * k, h = (s.z2 - s.z1) * k;
    g.fillStyle = s.y2 > 3.3 ? '#cfcabd' : '#e6e2d6'; g.fillRect(x, y, w, h); g.strokeStyle = '#16161c'; g.strokeRect(x + .5, y + .5, w, h); }
  g.fillStyle = '#e9a520'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText('A', (45 + 64) * k, (-27 + 56) * k); g.fillText('B', (-37 + 64) * k, (-25 + 56) * k);
}
