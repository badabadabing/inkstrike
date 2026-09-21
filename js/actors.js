'use strict';
/* ============ INK STRIKE · actors: soldier models, hitboxes, bot AI ============ */
const DIFFS = [{ n: '新兵', react: .58, err: 2.0, turn: .8, head: .08 }, { n: '老兵', react: .38, err: 1.25, turn: 1, head: .22 }, { n: '精英', react: .24, err: .8, turn: 1.35, head: .42 }];
const BOT_NAMES = ['墨鸦', '砚台', '宣纸', '狼毫', '朱砂', '飞白', '留白', '皴法', '勾线', '泼墨', '篆刻', '淡彩', '枯笔', '浓墨', '拓片', '镇纸', '印泥', '走笔'];
let ACTOR_LM = null; const _skGeo = {};

function makeEnt(team, name, isPlayer) {
  return { team, name, isPlayer: !!isPlayer, pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, hp: 100, armor: 0, helmet: false, alive: false, hw: .32, hgt: 1.8, onGround: true, stepSmooth: 0, crouchAmt: 0,
    money: 800, kills: 0, deaths: 0, weapon: 'p9', mag: 12, spottedT: -9, stepAcc: 0, hitWall: false, landed: 0 };
}
const eyeY = e => 1.62 - .47 * e.crouchAmt;

function soldierParts(team) {
  if (_skGeo[team]) return _skGeo[team];
  const col = team === 'red' ? RED : BLUE, U = new Sk('sun'), Hd = new Sk('sun'), Lg = new Sk('sun');
  U.box(.36, .18, .22, 0, .05, 0, { tone: .33 }); U.box(.4, .44, .24, 0, .36, 0); U.box(.43, .34, .275, 0, .38, 0, { tone: 1 });
  for (let i = 0; i < 3; i++) U.box(.1, .12, .05, -.12 + i * .12, .28, -.16); U.box(.3, .3, .14, 0, .4, .2, { tone: .33 }); U.box(.25, .07, .25, 0, .61, 0, { tint: col, tone: 0 });
  U.box(.1, .12, .06, -.13, .45, -.16, { tone: .33 }); U.box(.14, .07, .15, .27, .56, 0, { tint: col, tone: 0 }); U.box(.14, .07, .15, -.27, .56, 0, { tint: col, tone: 0 });
  U.limb([.25, .52, 0], [.3, .28, -.14], .1, .11); U.limb([.3, .28, -.14], [.14, .33, -.38], .09, .095, { tone: .33 }); U.box(.09, .09, .1, .13, .34, -.4, { tone: 1 });
  U.limb([-.25, .52, 0], [-.27, .27, -.26], .1, .11); U.limb([-.27, .27, -.26], [.08, .37, -.66], .09, .095, { tone: .33 }); U.box(.09, .08, .1, .1, .38, -.68, { tone: 1 });
  Hd.box(.2, .23, .22, 0, .13, 0, team === 'red' ? { tone: .66 } : {});
  if (team === 'blue') { Hd.box(.25, .13, .27, 0, .23, .0, { tone: 1 }); Hd.box(.26, .025, .3, 0, .17, -.01, { tone: 1 }); Hd.box(.21, .065, .04, 0, .125, -.115, { tint: col, tone: 0 }); Hd.line([.1, .17, .05, .1, .02, .0, -.1, .17, .05, -.1, .02, 0]); }
  else { Hd.cyl(.15, .135, .06, 8, .02, .27, 0, { tone: 1, r: [0, 0, -.18] }); Hd.box(.17, .045, .02, 0, .15, -.112, { tint: PAPER, tone: 0 }); Hd.box(.21, .06, .23, 0, .235, 0, { tint: col, tone: 0 }); Hd.line([.105, .235, .1, .2, .1, .16, .105, .2, .1, .17, .05, .19]); }
  Lg.box(.17, .44, .2, 0, -.22, 0); Lg.box(.14, .1, .04, 0, -.45, -.11, { tone: 1 }); Lg.box(.15, .42, .17, 0, -.64, 0, { tone: .33 }); Lg.box(.17, .1, .3, 0, -.85, -.04, { tone: 1 }); Lg.box(.1, .14, .06, .09, -.2, 0, { tone: .33 });
  return _skGeo[team] = { U, Hd, Lg };
}
function buildSoldier(team) {
  if (!ACTOR_LM) ACTOR_LM = lineMat({ width: 1.5 });
  const src = soldierParts(team), fm = fillMat({ objSpace: true, freq: 24, hatch: .7, hw: .12 }), key = '_b' + team;
  if (!src[key]) src[key] = { U: src.U.bake(fm, ACTOR_LM), Hd: src.Hd.bake(fm, ACTOR_LM), Lg: src.Lg.bake(fm, ACTOR_LM) };
  const inst = b => { const g = new THREE.Group(); g.add(new THREE.Mesh(b.fill.geometry, fm)); g.add(new LineSegments2(b.ink.geometry, ACTOR_LM)); return g; };
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const upper = inst(src[key].U), head = inst(src[key].Hd), legL = inst(src[key].Lg), legR = inst(src[key].Lg), gun = new THREE.Group();
  upper.position.y = .9; head.position.y = .62; upper.add(head); gun.position.set(.13, .42, -.38); upper.add(gun);
  legL.position.set(-.11, .9, 0); legR.position.set(.11, .9, 0); legR.scale.x = -1; root.add(upper, legL, legR);
  const mark = new THREE.Mesh(new THREE.ConeGeometry(.11, .2, 3), new THREE.MeshBasicMaterial({ color: BLUE, depthTest: false, transparent: true, opacity: .85 })); mark.rotation.x = Math.PI; mark.position.y = 2.2; mark.renderOrder = 4; mark.visible = false; root.add(mark);
  return { root, upper, head, legL, legR, gun, fm, mark, phase: rand(6) };
}
function setEntWeapon(e, key) { e.weapon = key; const w = WEAPONS[key]; e.mag = w.mag || 0; e.reloadT = 0; if (e.model) { const g = e.model.gun; while (g.children.length) g.remove(g.children[0]); g.add(worldGun(key, e.model.fm, ACTOR_LM)); } }
function animSoldier(e, dt) {
  const m = e.model, c = e.crouchAmt; m.root.position.copy(e.pos); m.root.rotation.y = e.yaw;
  if (!e.alive) { m.fm.uniforms.uFlash.value = damp(m.fm.uniforms.uFlash.value, 0, 14, dt); e.deathT += dt; const k = 1 - Math.pow(1 - Math.min(1, e.deathT / .55), 2); m.root.rotation.x = k * 1.5 * e.fallDir; m.root.position.y = e.pos.y + k * .13; m.legL.rotation.x = k * .25; m.legR.rotation.x = -k * .3; m.upper.rotation.x = 0; if (e.deathT > 14) m.root.visible = false; return; }
  const sp = Math.hypot(e.vel.x, e.vel.z); m.phase += sp * dt * 2.4; const sw = Math.sin(m.phase) * Math.min(1, sp / 3) * .75, sc = 1 - .45 * c;
  m.legL.rotation.x = sw - c * .5; m.legR.rotation.x = -sw + c * .3; m.legL.scale.y = m.legR.scale.y = sc; m.legL.position.y = m.legR.position.y = .9 * sc;
  m.upper.position.y = .9 * sc + Math.abs(Math.cos(m.phase)) * .025 * Math.min(1, sp / 3); m.upper.rotation.x = e.pitch * .7 + (e.flinch || 0) * .3; m.head.rotation.x = e.pitch * .25; if (e.flinch) e.flinch = damp(e.flinch, 0, 10, dt);
  m.fm.uniforms.uFlash.value = damp(m.fm.uniforms.uFlash.value, 0, 14, dt);
}

/* ---------------- hitboxes ---------------- */
function rayBox(ox, oy, oz, dx, dy, dz, x1, y1, z1, x2, y2, z2) {
  let t1 = (x1 - ox) / dx, t2 = (x2 - ox) / dx, tn = Math.min(t1, t2), tf = Math.max(t1, t2); t1 = (y1 - oy) / dy; t2 = (y2 - oy) / dy; tn = Math.max(tn, Math.min(t1, t2)); tf = Math.min(tf, Math.max(t1, t2));
  t1 = (z1 - oz) / dz; t2 = (z2 - oz) / dz; tn = Math.max(tn, Math.min(t1, t2)); tf = Math.min(tf, Math.max(t1, t2)); return (tn <= tf && tf > 0) ? Math.max(tn, 0) : -1;
}
function rayEnt(ox, oy, oz, dx, dy, dz, e) {
  const p = e.pos, k = 1 - .27 * e.crouchAmt; let bt = 1e9, part = null;
  const hx = p.x - ox, hy = p.y + eyeY(e) + .03 - oy, hz = p.z - oz, b = hx * dx + hy * dy + hz * dz, c2 = hx * hx + hy * hy + hz * hz - .17 * .17, disc = b * b - c2;
  if (disc > 0 && b > 0) { const t = b - Math.sqrt(disc); if (t > 0) { bt = t; part = 'head'; } }
  const tests = [['legs', 0, .8 * k, .2, .75], ['stomach', .8 * k, 1.05 * k, .24, 1.25], ['chest', 1.05 * k, 1.47 * k, .27, 1]];
  for (const q of tests) { const t = rayBox(ox, oy, oz, dx, dy, dz, p.x - q[3], p.y + q[1], p.z - q[3], p.x + q[3], p.y + q[2], p.z + q[3]); if (t >= 0 && t < bt) { bt = t; part = q[0]; } }
  return part ? { t: bt, part, mul: part === 'head' ? 4 : part === 'legs' ? .75 : part === 'stomach' ? 1.25 : 1 } : null;
}

/* ---------------- bots ---------------- */
function makeBot(team, name, scene) {
  const b = makeEnt(team, name, false); b.model = buildSoldier(team); scene.add(b.model.root); b.model.root.visible = false;
  Object.assign(b, { target: null, targetVis: false, lastSeen: new V3(), lastSeenT: -9, reactT: 0, aimErr: .07, aimHead: false, nextThink: rand(.2), nextFire: 0, burstN: 0, burstLen: 4, burstPause: 0, strafeDir: 0, strafeT: 0,
    path: null, pi: 0, waitT: 0, alertT: -9, alertYaw: 0, stuckT: 0, reloadT: 0, deathT: 0, fallDir: 1, state: 'roam', repathT: 0, lookT: 0, lookYaw: 0, jumpT: 0 });
  return b;
}
function botGoal(b, now) {
  let gx, gz;
  if (G.huntAll || b.state === 'hunt') { let best = null, bd = 1e9; for (const e of G.ents) if (e.alive && e.team !== b.team) { const d = e.pos.distanceToSquared(b.pos); if (d < bd) { bd = d; best = e; } }
    if (b.state === 'hunt' && now - b.lastSeenT < 6) { gx = b.lastSeen.x; gz = b.lastSeen.z; } else if (best) { gx = best.pos.x + rand(-3, 3); gz = best.pos.z + rand(-3, 3); } b.state = 'roam'; }
  if (gx === undefined) { let tot = 0; for (const p of MAP.points) tot += G.mode === 'dm' ? 1 : p[b.team]; let r = Math.random() * tot, sel = MAP.points[0]; for (const p of MAP.points) { r -= G.mode === 'dm' ? 1 : p[b.team]; if (r <= 0) { sel = p; break; } } gx = sel.x + rand(-3, 3); gz = sel.z + rand(-3, 3); }
  b.path = navPath(b.pos.x, b.pos.z, gx, gz); b.pi = 1; b.repathT = now + 12; if (!b.path) b.waitT = now + .5;
}
function botSee(b, e) { const ey = b.pos.y + eyeY(b); return segClear(b.pos.x, ey, b.pos.z, e.pos.x, e.pos.y + eyeY(e), e.pos.z) || segClear(b.pos.x, ey, b.pos.z, e.pos.x, e.pos.y + .9, e.pos.z); }
function botThink(b, now) {
  let best = null, bs = 1e9; const D = DIFFS[G.diff];
  for (const e of G.ents) { if (!e.alive || e.team === b.team) continue; const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z, d = Math.hypot(dx, dz); if (d > 95) continue;
    const ang = Math.abs(angDiff(Math.atan2(-dx, -dz), b.yaw)); if (!(d < 3.5 || ang < 1.0 || (now < b.alertT && ang < 1.9) || e === b.target)) continue;
    if (!botSee(b, e)) continue; e.spottedT = now; const s = d * (e === b.target ? .6 : 1); if (s < bs) { bs = s; best = e; } }
  if (best) { if (b.target !== best) { b.target = best; b.reactT = now + D.react * rand(.8, 1.3) * (WEAPONS[b.weapon].scope ? 1.3 : 1); b.aimErr = .075; b.aimHead = Math.random() < D.head; b.burstN = 0; }
    b.targetVis = true; b.lastSeen.copy(best.pos); b.lastSeenT = now; b.path = null; }
  else if (b.target) { b.targetVis = false; if (now - b.lastSeenT > .5 || !b.target.alive) { const alive = b.target.alive; b.target = null; if (alive) { b.state = 'hunt'; botGoal(b, now); } } }
}
function botHear(pos, team, radius) { const now = G.now; for (const b of G.bots) { if (!b.alive || b.team === team || b.target) continue; const d = b.pos.distanceTo(pos); if (d > radius) continue;
  b.alertT = now + 3.5; b.alertYaw = Math.atan2(-(pos.x - b.pos.x), -(pos.z - b.pos.z)); if (Math.random() < .35 && d < radius * .7) { b.lastSeen.copy(pos); b.lastSeenT = now; b.state = 'hunt'; b.path = null; b.waitT = 0; } } }
function groundMove(e, wx, wz, maxSp, dt, accel = 13, fric = 8.5) {
  const v = e.vel;
  if (e.onGround) { const sp = Math.hypot(v.x, v.z); if (sp > .001) { const drop = Math.max(sp, 1.6) * fric * dt, k = Math.max(0, sp - drop) / sp; v.x *= k; v.z *= k; }
    const cur = v.x * wx + v.z * wz, add = maxSp - cur; if (add > 0) { const a = Math.min(accel * maxSp * dt, add); v.x += wx * a; v.z += wz * a; } }
  else { const ws = Math.min(maxSp, .8), cur = v.x * wx + v.z * wz, add = ws - cur; if (add > 0) { const a = Math.min(14 * maxSp * dt, add); v.x += wx * a; v.z += wz * a; } }
}
function updateBot(b, dt, now) {
  if (!b.alive) { if (b.model.root.visible) animSoldier(b, dt); return; }
  if (now >= b.nextThink) { botThink(b, now); b.nextThink = now + .09 + Math.random() * .06; }
  const w = WEAPONS[b.weapon], D = DIFFS[G.diff], frozen = G.state === 'freeze'; let wx = 0, wz = 0, wantYaw = b.yaw, wantPitch = 0, sp = 4.4 * w.speed, wantCrouch = 0, dist = 0;
  const t = b.target;
  if (t && t.alive) {
    const ty = t.pos.y + (b.aimHead ? eyeY(t) : 1.12 * (1 - .27 * t.crouchAmt)), dx = t.pos.x - b.pos.x, dz = t.pos.z - b.pos.z, dy = ty - (b.pos.y + eyeY(b)); dist = Math.hypot(dx, dz);
    wantYaw = Math.atan2(-dx, -dz); wantPitch = Math.atan2(dy, dist); b.aimErr = damp(b.aimErr, .011, 2.4, dt);
    if (now > b.strafeT) { b.strafeT = now + rand(.35, 1.0); b.strafeDir = dist > 30 && Math.random() < .5 ? 0 : pick([-1, 1]); if (Math.random() < .15 && dist > 12) wantCrouch = 1; b.crouchHold = wantCrouch ? now + rand(.6, 1.4) : 0; }
    const rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw); let f = dist > 38 ? .7 : dist < 5 ? -.6 : 0; if (w.scope) f = dist < 14 ? -.7 : 0;
    wx = rx * b.strafeDir + fx * f; wz = rz * b.strafeDir + fz * f; if (now < b.burstPause - .05 || b.burstN > 0) { if (dist > 16 || w.scope) { wx *= .15; wz *= .15; } }
    if (now < (b.crouchHold || 0)) wantCrouch = 1;
    // fire control
    if (!frozen && b.targetVis && now > b.reactT && Math.abs(angDiff(wantYaw, b.yaw)) < .12 && b.reloadT <= 0) {
      if (b.mag <= 0) b.reloadT = w.reload;
      else if (now >= b.nextFire && now >= b.burstPause) {
        const sig = (b.aimErr + b.burstN * (w.auto ? .0035 : .002) + Math.hypot(t.vel.x, t.vel.z) * .0028 + Math.hypot(b.vel.x, b.vel.z) * .004) * D.err * (w.scope ? .45 : 1);
        const yw = wantYaw + gauss() * sig, pt = wantPitch + gauss() * sig * .8, cp = Math.cos(pt);
        G.botShoot(b, -Math.sin(yw) * cp, Math.sin(pt), -Math.cos(yw) * cp); b.mag--; b.nextFire = now + w.rate * (w.auto ? 1 : rand(1.4, 2.4)); b.burstN++;
        if (b.burstN >= b.burstLen) { b.burstN = 0; b.burstLen = w.auto ? (dist < 10 ? 12 : 3 + (Math.random() * 4 | 0)) : 1 + (Math.random() * 2 | 0); b.burstPause = now + rand(.22, .55) * clamp(dist / 22, .5, 1.6); }
      }
    }
  } else if (!frozen) {
    if (!b.path && now > b.waitT) botGoal(b, now);
    if (b.path) { let n = b.path[b.pi]; if (!n) { b.path = null; b.waitT = now + rand(.8, 3.5) * (G.huntAll ? .2 : 1); b.lookT = 0; }
      else { const dx = n.x - b.pos.x, dz = n.z - b.pos.z, d = Math.hypot(dx, dz); if (d < .55) b.pi++; else { wx = dx / d; wz = dz / d; wantYaw = Math.atan2(-dx, -dz); } if (now > b.repathT) b.path = null; } }
    else if (now > b.lookT) { b.lookT = now + rand(.7, 1.6); b.lookYaw = b.yaw + rand(-1.6, 1.6); }
    if (!b.path) wantYaw = b.lookYaw; if (now < b.alertT && !b.path) wantYaw = b.alertYaw;
    if (b.mag < (w.mag || 0) * .4 && b.reloadT <= 0 && !w.melee) b.reloadT = w.reload;
  }
  if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) b.mag = w.mag; }
  // separation
  for (const e of G.ents) { if (e === b || !e.alive) continue; const dx = b.pos.x - e.pos.x, dz = b.pos.z - e.pos.z, d2 = dx * dx + dz * dz; if (d2 < .8 && d2 > .0001) { const d = Math.sqrt(d2); wx += dx / d * .9; wz += dz / d * .9; } }
  const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; } if (frozen) { wx = wz = 0; }
  b.crouchAmt = damp(b.crouchAmt, wantCrouch, 10, dt); if (b.crouchAmt > .5) sp *= .45;
  b.yaw += clamp(angDiff(wantYaw, b.yaw), -7.5 * D.turn * dt, 7.5 * D.turn * dt); b.pitch = damp(b.pitch, wantPitch, 10, dt);
  groundMove(b, wx, wz, wl > .05 ? sp : 0, dt);
  const px = b.pos.x, pz = b.pos.z; moveEntity(b, dt);
  if (wl > .3 && Math.hypot(b.pos.x - px, b.pos.z - pz) < sp * dt * .25) { b.stuckT += dt; if (b.stuckT > .5 && b.onGround && now > b.jumpT) { b.vel.y = 5.9; b.onGround = false; b.jumpT = now + .8; } if (b.stuckT > 1.6) { b.stuckT = 0; b.path = null; b.strafeDir *= -1; } } else b.stuckT = Math.max(0, b.stuckT - dt * 2);
  if (b.onGround) { b.stepAcc += Math.hypot(b.pos.x - px, b.pos.z - pz); if (b.stepAcc > 2.3) { b.stepAcc = 0; SFX.step(b.pos, .2); } }
  animSoldier(b, dt);
}
