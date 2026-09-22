'use strict';
/* ============ INK STRIKE · objective: ink-core (bomb) plant/defuse, smoke & flash utility, ladders, surfaces ============ */
const SITES = { A: { x1: 32.5, z1: -37.5, x2: 53.5, z2: -22.5, y: 1, name: 'A 点' }, B: { x1: -53.5, z1: -37.5, x2: -30.5, z2: -20.5, y: 0, name: 'B 点' } };
const PLANT_T = 3.2, DEFUSE_T = 6, BOMB_T = 40;
const BOMB = { state: 'none', carrier: null, pos: new V3(), t: 0, mesh: null, light: null, beepT: 0, site: null, defuser: null };
const siteAt = p => { for (const k in SITES) { const s = SITES[k]; if (p.x > s.x1 && p.x < s.x2 && p.z > s.z1 && p.z < s.z2 && Math.abs(p.y - s.y) < .5) return k; } return null; };

function bombInit(scene) {
  const s = new Sk('under'); s.box(.36, .1, .26, 0, .05, 0, { tone: .33 }); for (let i = 0; i < 3; i++) s.cyl(.045, .045, .3, 8, -.1 + i * .1, .15, 0, { ax: 'x', tone: 1, r: [0, Math.PI / 2, 0] });
  s.box(.12, .06, .08, .1, .21, 0); s.line([-.1, .2, .05, 0, .26, .08, 0, .26, .08, .08, .24, .03, -.1, .2, -.05, .02, .27, -.07, .02, .27, -.07, .1, .24, -.03]);
  const g = BOMB.mesh = s.bake(fillMat({ objSpace: true, freq: 60 }), lineMat({ width: 1.6 })); g.scale.setScalar(1.25);
  BOMB.light = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: AMBER })); BOMB.light.position.set(.1, .26, 0); g.add(BOMB.light); g.visible = false; scene.add(g);
}
function bombReset() {
  BOMB.state = 'none'; BOMB.carrier = null; BOMB.defuser = null; BOMB.site = null; if (BOMB.mesh) BOMB.mesh.visible = false; for (const e of G.ents) e.act = null;
  if (G.mode !== 'comp') return; const reds = G.ents.filter(e => e.team === 'red'); BOMB.carrier = reds.find(e => e.isPlayer && Math.random() < .4) || pick(reds.filter(e => !e.isPlayer)); BOMB.state = 'carried';
  G.plan = { site: Math.random() < .5 ? 'A' : 'B' }; G.intel = { red: null, blue: null };
  const hs = ['A', 'B', 'A', 'B', 'MID'].sort(() => Math.random() - .5); let i = 0; for (const b of G.bots) { b.rot = Math.random(); b.holdYaw = null; if (b.team === 'blue') b.holdSite = hs[i++ % 5]; }
}
const canPlant = e => BOMB.state === 'carried' && BOMB.carrier === e && e.onGround && G.state === 'live' && siteAt(e.pos);
const canDefuse = e => BOMB.state === 'planted' && e.team === 'blue' && G.state === 'live' && e.pos.distanceTo(BOMB.pos) < 1.9;
function entInteract(e, want, dt) {
  const type = canPlant(e) ? 'plant' : canDefuse(e) ? 'defuse' : null;
  if (!want || !type) { if (e.act) { if (BOMB.defuser === e) BOMB.defuser = null; e.act = null; } return; }
  if (!e.act || e.act.type !== type) { if (type === 'defuse' && BOMB.defuser && BOMB.defuser !== e && BOMB.defuser.alive && BOMB.defuser.act) return; e.act = { type, t: 0 }; if (type === 'defuse') BOMB.defuser = e; SFX.click(1300, .4); }
  e.act.t += dt; e.vel.x *= .6; e.vel.z *= .6; if (((e.act.t * 3) | 0) !== (((e.act.t - dt) * 3) | 0)) SFX.tick(e.isPlayer ? null : e.pos);
  if (e.act.t >= (type === 'plant' ? PLANT_T : DEFUSE_T)) { e.act = null; type === 'plant' ? bombPlant(e) : bombDefuse(e); }
}
function bombPlant(e) {
  const fx = e.pos.x - Math.sin(e.yaw) * .45, fz = e.pos.z - Math.cos(e.yaw) * .45; BOMB.state = 'planted'; BOMB.site = siteAt(e.pos); BOMB.pos.set(fx, e.pos.y, fz); BOMB.t = BOMB_T; BOMB.carrier = null; BOMB.beepT = 0;
  BOMB.mesh.position.copy(BOMB.pos); BOMB.mesh.rotation.y = e.yaw; BOMB.mesh.visible = true; e.money = Math.min(16000, e.money + 300); PROG.rstat(e).plant = 1;
  banner('墨核已安放', `${SITES[BOMB.site].name} · ${BOMB_T} 秒后引爆`, G.team === 'red' ? 'go' : 'lose'); SFX.plant(); for (const b of G.bots) { b.path = null; b.waitT = 0; b.holdYaw = null; }
}
function bombDefuse(e) { BOMB.state = 'defused'; BOMB.defuser = null; e.money = Math.min(16000, e.money + 300); PROG.rstat(e).defuse = 1; BOMB.light.visible = false; endRound('blue', `${e.name} 拆除了墨核`); }
function bombUpdate(dt) {
  if (G.mode !== 'comp' || BOMB.state === 'none') return;
  if (BOMB.state === 'carried' && BOMB.carrier && !BOMB.carrier.alive) { const c = BOMB.carrier; BOMB.state = 'dropped'; BOMB.carrier = null; BOMB.pos.set(c.pos.x, MAP.floorAt(c.pos.x, c.pos.z), c.pos.z); BOMB.mesh.position.copy(BOMB.pos); BOMB.mesh.visible = true; if (G.team === 'red') banner('墨核掉落', '捡起它继续进攻', 'lose'); }
  if (BOMB.state === 'dropped' && G.state !== 'roundEnd') for (const e of G.ents) if (e.alive && e.team === 'red' && Math.hypot(e.pos.x - BOMB.pos.x, e.pos.z - BOMB.pos.z) < 1.1) { BOMB.state = 'carried'; BOMB.carrier = e; BOMB.mesh.visible = false; if (e.isPlayer) { banner('已拾取墨核', '带到 A 点或 B 点 · 按住 E 安放', 'go'); SFX.buy(); } break; }
  if (BOMB.state === 'planted') { BOMB.t -= dt; BOMB.beepT -= dt; if (BOMB.beepT <= 0) { BOMB.beepT = clamp(.12 + BOMB.t / BOMB_T * .95, .12, 1.1); SFX.beep(BOMB.pos, BOMB.t < 8); BOMB.blink = .09; } BOMB.blink = (BOMB.blink || 0) - dt; BOMB.light.visible = BOMB.blink > 0;
    if (BOMB.t <= 0) { BOMB.state = 'exploded'; BOMB.mesh.visible = false; const p = BOMB.pos; for (const [ox, oz] of [[0, 0], [3, 1], [-2, 3], [1, -3.5], [-3.5, -2]]) FX.explode(p.x + ox, p.y, p.z + oz); SFX.boom(p); SFX.boom(p); G.shake += clamp(2.2 - G.player.pos.distanceTo(p) / 25, 0, 2);
      endRound('red', '墨核引爆');
      for (const e of G.ents) { if (!e.alive) continue; const d = e.pos.distanceTo(p); if (d < 17) hurt(e, 420 * Math.pow(1 - d / 17, 1.4), null, null, 'chest', { x: (e.pos.x - p.x) / (d || 1), y: .4, z: (e.pos.z - p.z) / (d || 1) }, { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }); } } }
  for (const e of G.ents) if (e.alive && e.isPlayer) entInteract(e, !!G.keys.KeyE, dt);
}

/* ---------------- bot objective brain (comp mode) ---------------- */
function randIn(r, tries = 40) { for (let k = 0; k < tries; k++) { const x = rand(r.x1, r.x2), z = rand(r.z1, r.z2), c = navIdx(x, z); if (MAP.reach[c] && (r.y === undefined || Math.abs(MAP.fh[c] - r.y) < .3)) return { x, z, cover: MAP.pen[c] }; } return { x: (r.x1 + r.x2) / 2, z: (r.z1 + r.z2) / 2 }; }
function botObjective(b, now) {
  if (G.mode !== 'comp' || BOMB.state === 'none') return null; const planted = BOMB.state === 'planted';
  if (b.team === 'red') {
    if (BOMB.state === 'dropped') { let best = null, bd = 1e9; for (const o of G.bots) if (o.alive && o.team === 'red') { const d = o.pos.distanceTo(BOMB.pos); if (d < bd) { bd = d; best = o; } } if (best === b) return { x: BOMB.pos.x, z: BOMB.pos.z }; }
    if (planted) { const p = BOMB.pos; let best = null; for (let k = 0; k < 6; k++) { const c = randIn({ x1: p.x - 13, x2: p.x + 13, z1: p.z - 13, z2: p.z + 13 }); const d = Math.hypot(c.x - p.x, c.z - p.z); if (d > 4 && (!best || (c.cover || 0) > (best.cover || 0))) best = c; } return best && { ...best, hold: true, face: p }; }
    if (BOMB.carrier === b || Math.random() < .72 || G.timer < 45) { const c = randIn(SITES[G.plan.site]); return { ...c, hold: BOMB.carrier !== b }; }
    return null;
  }
  if (planted) return { x: BOMB.pos.x, z: BOMB.pos.z };
  const mine = G.ents.filter(e => e.alive && e.team === 'blue').length, foes = G.ents.filter(e => e.alive && e.team === 'red').length;
  if (mine === 1 && foes >= 3 && G.timer < 45 && !b.isPlayer) { b.saving = true; return navRandomIn(MAP.spawn.blue); }
  const it = G.intel && G.intel.blue; if (it && now - it.t < 4 && b.rot < .5 && Math.hypot(it.x - b.pos.x, it.z - b.pos.z) > 18) return { x: it.x + rand(-3, 3), z: it.z + rand(-3, 3) };
  if (b.holdSite === 'MID') return { x: rand(-4, 4), z: rand(-36, -28), hold: true };
  let best = null; for (let k = 0; k < 5; k++) { const c = randIn(SITES[b.holdSite]); if (!best || (c.cover || 0) > (best.cover || 0)) best = c; } return { ...best, hold: true };
}
function botHoldYaw(b, face) {          // pre-aim: look down the route the enemy is most likely to arrive from
  if (face) return Math.atan2(-(face.x - b.pos.x), -(face.z - b.pos.z)); const s = MAP.spawn[b.team === 'red' ? 'blue' : 'red'], p = navPath(b.pos.x, b.pos.z, (s.x1 + s.x2) / 2, (s.z1 + s.z2) / 2); if (!p || p.length < 2) return b.yaw;
  let acc = 0, i = 1; for (; i < p.length - 1; i++) { acc += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z); if (acc > 9) break; } return Math.atan2(-(p[i].x - b.pos.x), -(p[i].z - b.pos.z));
}

/* ---------------- utility grenades ---------------- */
const SMOKES = []; let _smokeFm = null, _smokeLm = null;
function smokeSpawn(x, y, z) {
  if (!_smokeFm) { _smokeFm = fillMat({ freq: 3.2, hatch: .55, hw: .12 }); _smokeLm = lineMat({ width: 1.1, color: 0x55534e }); }
  const s = new Sk('sun'); for (let i = 0; i < 20; i++) { const a = rand(6.28), r = Math.sqrt(Math.random()) * 3.3, h = rand(.5, 3.4); s.sph(rand(1.3, 2.3) * (1 - h / 9), Math.cos(a) * r, h, Math.sin(a) * r, { ws: 7, hs: 5, r: [rand(3), rand(3), 0], ea: 38 }); }
  const g = s.bake(_smokeFm, _smokeLm); g.position.set(x, y, z); g.scale.setScalar(.05); g.traverse(o => o.frustumCulled = false); scene.add(g); SMOKES.push({ p: new V3(x, y + 1.6, z), r: 4.7, t: 16, g, age: 0 }); SFX.hiss({ x, y, z });
}
function smokeUpdate(dt) { for (let i = SMOKES.length - 1; i >= 0; i--) { const s = SMOKES[i]; s.t -= dt; s.age += dt; const k = Math.min(1, s.age / 1.1) * Math.min(1, s.t / 1.8); s.g.scale.setScalar(Math.max(.02, k)); s.g.rotation.y += dt * .07; s.live = k > .75; if (s.t <= 0) { scene.remove(s.g); s.g.traverse(o => o.geometry && o.geometry.dispose()); SMOKES.splice(i, 1); } } }
function smokeClear() { for (const s of SMOKES) scene.remove(s.g); SMOKES.length = 0; }
function smokeBlocks(ax, ay, az, bx, by, bz) { for (const s of SMOKES) { if (!s.live) continue; const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz || 1, t = clamp(((s.p.x - ax) * dx + (s.p.y - ay) * dy + (s.p.z - az) * dz) / l2, 0, 1), qx = ax + dx * t - s.p.x, qy = (ay + dy * t - s.p.y) * .8, qz = az + dz * t - s.p.z; if (qx * qx + qy * qy + qz * qz < s.r * s.r * .8) return true; } return false; }
const inSmoke = p => { for (const s of SMOKES) if (s.live) { const d = Math.hypot(p.x - s.p.x, (p.y - s.p.y) * .8, p.z - s.p.z); if (d < s.r) return clamp((s.r - d) / 1.2, 0, 1); } return 0; };
function flashBang(x, y, z) {
  FX.flash(x, y, z, 3.2); FX.burst(x, y, z, 0, 1, 0, 26, AMBER, 8, .04); SFX.bang({ x, y, z });
  for (const e of G.ents) { if (!e.alive) continue; const ey = e.pos.y + eyeY(e), d = Math.hypot(e.pos.x - x, ey - y, e.pos.z - z); if (d > 32 || !segClear(x, y, z, e.pos.x, ey, e.pos.z) || smokeBlocks(x, y, z, e.pos.x, ey, e.pos.z)) continue;
    const cp = Math.cos(e.pitch), fx = -Math.sin(e.yaw) * cp, fy = Math.sin(e.pitch), fz = -Math.cos(e.yaw) * cp, dot = ((x - e.pos.x) * fx + (y - ey) * fy + (z - e.pos.z) * fz) / (d || 1), f = clamp((dot + .35) / 1.2, .12, 1), dur = (3.4 * (1 - d / 32) + .5) * f;
    if (e.isPlayer) { G.flashT = Math.max(G.flashT || 0, dur); G.flashMax = Math.max(1.1, G.flashT); SFX.ring(dur); } else { e.blindT = G.now + dur * .9; e.target = null; } }
}
/* ---------------- ladders & surfaces ---------------- */
function ladderAt(p) { for (const l of MAP.ladders) if (p.x > l.x1 && p.x < l.x2 && p.z > l.z1 && p.z < l.z2 && p.y < l.y2 + .05 && p.y > l.y1 - .1) return l; return null; }
function surfaceAt(p) { const x = p.x, y = p.y, z = p.z; if (y > 4.5 && x > -42.4 && x < -30 && z > -36.4 && z < -21.6) return 'metal'; if (y < .3 && x > -41 && x < -8 && z > -13 && z < 13) return 'tile'; if (y > .2 && x > -44 && x < -37 && z > 20 && z < 38) return 'wood'; if (y > .7 && y < 1.3 && x > 32 && x < 54 && z > -38 && z < -22) return 'stone'; if (y > .15) return 'wood'; return 'concrete'; }
