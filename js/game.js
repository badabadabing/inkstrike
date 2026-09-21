'use strict';
/* ============ INK STRIKE · game: player, combat, rounds, HUD, loop ============ */
const $ = id => document.getElementById(id);
const G = { state: 'menu', mode: 'comp', diff: 1, team: 'blue', ents: [], bots: [], player: null, now: 0, timescale: 1, score: { red: 0, blue: 0 }, round: 0, timer: 0, huntAll: false, paused: false,
  keys: {}, fire: false, alt: false, altEdge: false, fireEdge: false, mdx: 0, mdy: 0, buyOpen: false, shake: 0, nades: [], feed: [], dmgDirs: [], hitT: 0, hitKill: false, splats: [], lossStreak: { red: 0, blue: 0 },
  set: Object.assign({ sens: 1, fov: 84, vol: .7 }, JSON.parse(localStorage.getItem('inkstrike') || '{}')), noLock: location.search.includes('auto') };
const WIN_ROUNDS = 7, ROUND_TIME = 110, FREEZE = 6, DM_TIME = 480, DM_KILLS = 40;
let renderer, scene, camera, fxc, fxg, radar, rg;

function boot() {
  THREE.ColorManagement.enabled = false;
  renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' }); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = false; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(PAPER);
  scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(PAPER, FOG_D); camera = new THREE.PerspectiveCamera(G.set.fov, 1, .06, 1400); camera.rotation.order = 'YXZ';
  fxc = $('fx'); fxg = fxc.getContext('2d'); radar = $('radar'); rg = radar.getContext('2d');
  buildMap(scene); FX.init(scene); VM.init(1); bindInput(); bindUI(); if ((('ontouchstart' in window || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches) || location.search.includes('touch')) initTouch();
  makeIcons(); onResize(); addEventListener('resize', onResize);
  camera.position.set(-20, 26, 62); camera.lookAt(6, 0, -6);
  $('loading').style.display = 'none'; $('menu').classList.add('on');
  let last = performance.now(); const loop = t => { requestAnimationFrame(loop); const dt = Math.min(.05, (t - last) / 1000); last = t; frame(dt); }; requestAnimationFrame(loop);
}
function onResize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = VM.cam.aspect = w / h; camera.updateProjectionMatrix(); VM.cam.updateProjectionMatrix(); fxc.width = w; fxc.height = h; for (const m of LINE_MATS) m.resolution.set(w, h); }
function makeIcons() {
  const s = new THREE.Scene(), cam = new THREE.OrthographicCamera(-.66, .66, .24, -.24, .1, 20), fm = fillMat({ objSpace: true, freq: 75, fog: 0, hatch: .8, hw: .13 }), lm = lineMat({ width: 1.6, fog: false }); cam.position.set(5, 0, 0); cam.lookAt(0, 0, 0);
  renderer.setPixelRatio(1); renderer.setSize(330, 120, false); lm.resolution.set(330, 120); G.icons = {};
  for (const k in GUNS) { const g = worldGun(k, fm, lm); g.traverse(o => o.frustumCulled = false); const bb = new THREE.Box3().setFromObject(g.children[0]), c = bb.getCenter(new V3()), hw = Math.max(.2, (bb.max.z - bb.min.z) / 2 * 1.12, (bb.max.y - bb.min.y) / 2 * 1.12 * 2.75);
    g.position.set(0, -c.y, -c.z); cam.left = -hw; cam.right = hw; cam.top = hw / 2.75; cam.bottom = -hw / 2.75; cam.updateProjectionMatrix();
    s.add(g); renderer.setClearColor(PAPER, 0); renderer.clear(); renderer.render(s, cam); G.icons[k] = renderer.domElement.toDataURL(); s.remove(g); }
  renderer.setClearColor(PAPER, 1); renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH.on ? 1.5 : 2));
}

/* ---------------- input ---------------- */
function bindInput() {
  addEventListener('keydown', e => { if (e.code === 'Escape' && G.noLock && G.state !== 'menu' && G.state !== 'matchEnd') setPause(!G.paused); if (e.code === 'Tab' || (G.state !== 'menu' && ['Space', 'ControlLeft', 'KeyF'].includes(e.code))) e.preventDefault(); if (e.repeat) return; G.keys[e.code] = true; onKey(e.code); });
  addEventListener('keyup', e => { G.keys[e.code] = false; if (e.code === 'Tab') $('board').classList.remove('on'); });
  addEventListener('mousemove', e => { if (!locked()) return; const pl = G.player; if (!pl) return; const k = .0021 * G.set.sens * (camera.fov / G.set.fov); pl.yaw -= e.movementX * k; pl.pitch = clamp(pl.pitch - e.movementY * k, -1.54, 1.54); G.mdx += e.movementX; G.mdy += e.movementY; });
  addEventListener('mousedown', e => { if (!locked()) { if (e.target === renderer.domElement && G.state !== 'menu' && !G.paused) lock(); return; } if (e.button === 0) { G.fire = true; G.fireEdge = true; } if (e.button === 2) { G.alt = true; G.altEdge = true; } });
  addEventListener('mouseup', e => { if (e.button === 0) G.fire = false; if (e.button === 2) G.alt = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => { if (!locked() || !G.player || !G.player.alive) return; const pl = G.player, order = [pl.inv[1], pl.inv[2], 'knife', pl.nadeN > 0 ? 'he' : null].filter(Boolean), i = order.indexOf(pl.cur); switchTo(order[(i + (e.deltaY > 0 ? 1 : order.length - 1)) % order.length]); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.state !== 'menu' && G.state !== 'matchEnd' && !G.noLock) setPause(true); });
}
const locked = () => G.noLock || document.pointerLockElement === renderer.domElement;
function lock() { if (G.noLock) return; const el = renderer.domElement, fail = () => { G.noLock = true; banner('鼠标未锁定', '当前环境不支持指针锁定 · 建议用 Chrome / Safari 直接打开以获得完整操控', 'lose'); };
  try { const p = el.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => { try { const q = el.requestPointerLock(); if (q && q.catch) q.catch(fail); } catch (e) { fail(); } }); } catch (e) { fail(); } }
function setPause(v) { G.paused = v; $('pause').classList.toggle('on', v); if (!v) lock(); G.fire = G.alt = false; G.keys = {}; }
function onKey(c) {
  const pl = G.player; if (G.state === 'menu' || !pl || G.paused) return;
  if (c === 'Tab') { drawBoard(); $('board').classList.add('on'); return; }
  if (c === 'KeyB') { toggleBuy(); return; }
  if (G.buyOpen) { const n = +c.replace('Digit', ''); if (n >= 1 && n <= 8) buy(BUY_LIST[n - 1]); return; }
  if (!pl.alive) return;
  if (c === 'Digit1' && pl.inv[1]) switchTo(pl.inv[1]); else if (c === 'Digit2' && pl.inv[2]) switchTo(pl.inv[2]); else if (c === 'Digit3') switchTo('knife'); else if (c === 'Digit4' && pl.nadeN > 0) switchTo('he');
  else if (c === 'KeyQ' && pl.last && hasWeapon(pl.last)) switchTo(pl.last); else if (c === 'KeyR') startReload(); else if (c === 'KeyF' && pl.reloadEnd < 0) VM.insp = 0;
}
const hasWeapon = k => { const pl = G.player; return k === 'knife' || pl.inv[1] === k || pl.inv[2] === k || (k === 'he' && pl.nadeN > 0); };

/* ---------------- player ---------------- */
function makePlayer(team) { const p = makeEnt(team, '你', true); Object.assign(p, { inv: { 1: null, 2: 'p9' }, ammo: {}, cur: 'p9', last: 'knife', nadeN: 0, nextFire: 0, reloadEnd: -1, reloadStart: 0, drawEnd: 0, shots: 0, lastShot: -9, recP: 0, recY: 0, recTP: 0, recTY: 0, punch: 0, roll: 0, scoped: 0, bobPhase: 0, pending: null, deathT: 0 }); return p; }
function giveWeapon(pl, k) { const w = WEAPONS[k]; if (w.nade) { pl.nadeN = 1; return; } pl.inv[w.slot] = k; pl.ammo[k] = { mag: w.mag, res: w.res }; }
function switchTo(k) { const pl = G.player; if (!k || k === pl.cur && VM.key === k) return; if (k !== pl.cur) pl.last = pl.cur; pl.cur = k; pl.weapon = k; VM.show(k); pl.drawEnd = G.now + WEAPONS[k].draw; pl.reloadEnd = -1; pl.scoped = 0; pl.shots = 0; pl.pending = null; SFX.click(700, .25); }
function startReload() { const pl = G.player, w = WEAPONS[pl.cur], a = pl.ammo[pl.cur]; if (!a || pl.reloadEnd >= 0 || a.mag >= w.mag || a.res <= 0 || G.now < pl.drawEnd) return; pl.reloadStart = G.now; pl.reloadEnd = G.now + w.reload; pl.scoped = 0; VM.insp = 1; if (w.pump) { for (let i = 0; i < 5; i++) SFX.shellIn(w.reload * (.12 + i * .16)); SFX.pump(w.reload * .9); } else SFX.reload(w.snd, w.reload); }
function updatePlayer(dt) {
  const pl = G.player, now = G.now, k = G.keys, w = WEAPONS[pl.cur], frozen = G.state === 'freeze';
  const wantC = (k.KeyC || k.ControlLeft) ? 1 : 0; let tc = wantC; if (!wantC && pl.crouchAmt > .05) { const h = pl.hgt; pl.hgt = 1.8; if (entOverlap(pl, pl.pos.x, pl.pos.y, pl.pos.z, MAP.near(pl.pos.x, pl.pos.z))) tc = 1; pl.hgt = h; }
  pl.crouchAmt = damp(pl.crouchAmt, tc, 13, dt); pl.hgt = 1.8 - .45 * pl.crouchAmt;
  let f = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), an = 1; if (TOUCH.on && (TOUCH.move.x || TOUCH.move.y)) { f = -TOUCH.move.y; s = TOUCH.move.x; an = clamp((Math.hypot(f, s) - .12) / .78, 0, 1); } if (frozen) f = s = 0;
  let wx = -Math.sin(pl.yaw) * f + Math.cos(pl.yaw) * s, wz = -Math.cos(pl.yaw) * f - Math.sin(pl.yaw) * s; const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  const walking = k.ShiftLeft || k.ShiftRight || an < .62, sp = 5.1 * an * w.speed * (pl.crouchAmt > .5 ? .45 : (k.ShiftLeft || k.ShiftRight) ? .52 : 1) * (pl.scoped ? .55 : 1);
  if (k.Space && pl.onGround && !frozen) { pl.vel.y = 5.95; pl.onGround = false; SFX.step(null, .2); }
  groundMove(pl, wx, wz, wl ? sp : 0, dt, 14, 9);
  const hs = Math.hypot(pl.vel.x, pl.vel.z), cap = 5.1 * 1.55; if (hs > cap) { pl.vel.x *= cap / hs; pl.vel.z *= cap / hs; }
  const px = pl.pos.x, pz = pl.pos.z; moveEntity(pl, dt);
  if (pl.landed > 4) { VM.dip = Math.min(.06, pl.landed * .005); pl.punch += pl.landed * .004; SFX.land(null); if (pl.landed > 12.5) hurt(pl, Math.round((pl.landed - 12.5) * 9), null, null, 'legs', null); botHear(pl.pos, pl.team, 14); }
  pl.stepSmooth = clamp(pl.stepSmooth, -.6, .6); pl.stepSmooth = damp(pl.stepSmooth, 0, 13, dt);
  const moved = Math.hypot(pl.pos.x - px, pl.pos.z - pz); if (pl.onGround) { pl.bobPhase += moved * 2.0; if (hs > 3 && !walking) { pl.stepAcc += moved; if (pl.stepAcc > 2.1) { pl.stepAcc = 0; SFX.step(null, .22); botHear(pl.pos, pl.team, 11); } } }
  // ---- weapon ----
  if (pl.reloadEnd >= 0) { VM.reloadT = clamp((now - pl.reloadStart) / w.reload, 0, 1); if (now >= pl.reloadEnd) { const a = pl.ammo[pl.cur], n = Math.min(w.mag - a.mag, a.res); a.mag += n; a.res -= n; pl.reloadEnd = -1; VM.reloadT = -1; } } else VM.reloadT = -1;
  if (now - pl.lastShot > .32) pl.shots = 0;
  if (now - pl.lastShot > .1) { pl.recTP = damp(pl.recTP, 0, 7, dt); pl.recTY = damp(pl.recTY, 0, 7, dt); }
  pl.recP = damp(pl.recP, pl.recTP, 30, dt); pl.recY = damp(pl.recY, pl.recTY, 30, dt); pl.punch = damp(pl.punch, 0, 9, dt); pl.roll = damp(pl.roll, -s * .012, 8, dt);
  const ready = now >= pl.drawEnd && pl.reloadEnd < 0 && !frozen && !G.buyOpen;
  if (pl.pending && now >= pl.pending.t) { pl.pending.fn(); pl.pending = null; }
  if (w.scope && G.altEdge && ready) { pl.scoped = (pl.scoped + 1) % 3; SFX.click(1200, .2); }
  if (ready && now >= pl.nextFire) {
    if (w.melee) { if (G.fire || G.alt) { const heavy = !G.fire; pl.nextFire = now + (heavy ? w.rate2 : w.rate); VM.atk = 0; VM.atkKind = heavy ? 1 : 0; SFX.swish(); pl.pending = { t: now + (heavy ? .16 : .09), fn: () => melee(pl, heavy ? w.dmg2 : w.dmg) }; } }
    else if (w.nade) { if (G.fireEdge && pl.nadeN > 0) { pl.nextFire = now + 1; VM.atk = 0; SFX.swish(); pl.pending = { t: now + .2, fn: () => { throwNade(pl); pl.nadeN--; if (pl.nadeN <= 0) switchTo(pl.inv[1] || pl.inv[2]); } }; } }
    else if ((w.auto ? G.fire : G.fireEdge)) { const a = pl.ammo[pl.cur]; if (a.mag > 0) playerFire(pl, w, a); else { if (G.fireEdge) SFX.click(1600, .25); if (a.res > 0) startReload(); } }
  }
  if (pl.ammo[pl.cur] && pl.ammo[pl.cur].mag === 0 && pl.ammo[pl.cur].res > 0 && pl.reloadEnd < 0 && now > pl.nextFire && ready) startReload();
  pl.spread = curSpread(pl, w);
}
function curSpread(pl, w) { if (w.melee || w.nade) return .004; const sf = Math.hypot(pl.vel.x, pl.vel.z) / (5.1 * w.speed); let s = w.spread + (w.scope && !pl.scoped ? w.noScope : 0) + (sf > .36 ? sf * sf * w.moveSp : 0) + (pl.onGround ? 0 : .08) + Math.min(pl.shots, 14) * w.sprayInc; if (pl.crouchAmt > .5) s *= .78; return s; }
const _cq = new THREE.Quaternion(), _ce = new THREE.Euler(0, 0, 0, 'YXZ'), _cv = new V3();
function playerFire(pl, w, a) {
  const now = G.now; a.mag--; pl.nextFire = now + w.rate; pl.lastShot = now; const ey = pl.pos.y + eyeY(pl) + pl.stepSmooth, sp = curSpread(pl, w), py = pl.pitch + pl.recP, yw = pl.yaw + pl.recY;
  _ce.set(py, yw, 0); _cq.setFromEuler(_ce); const mz = _cv.set(.12, -.09, -.75).applyQuaternion(_cq); const mx = pl.pos.x + mz.x, my = ey + mz.y, mzz = pl.pos.z + mz.z;
  for (let i = 0; i < (w.pellets || 1); i++) { const r = Math.abs(gauss()) * sp * .7, an = rand(6.2832), p2 = py + Math.sin(an) * r, y2 = yw + Math.cos(an) * r, cp = Math.cos(p2); fireBullet(pl, pl.pos.x, ey, pl.pos.z, -Math.sin(y2) * cp, Math.sin(p2), -Math.cos(y2) * cp, w, mx, my, mzz, pl.scoped > 0); }
  const n = ++pl.shots, c = pl.crouchAmt > .5 ? .8 : 1; pl.recTP += w.up * (n < 10 ? 1 : .3) * c; pl.recTY += (Math.sin(n * .55 + 1.1) * (n > 3 ? 1 : .25) + gauss() * .25) * w.side * c; pl.recTP = Math.min(pl.recTP, .2);
  VM.fire(w); G.shake = Math.min(1, G.shake + w.vm * 1.6); SFX.shot(w.snd, null, isIndoor(pl)); if (w.scope) pl.scoped = 0; if (w.bolt) SFX.bolt(.32); else if (w.pump) SFX.pump(.28); if (!w.bolt && !w.pellets && (!w.auto || Math.random() < .35)) SFX.shellDrop(1);
  _cv.set(1.6 + rand(.8), 1.6 + rand(.8), -.3).applyQuaternion(_cq); if (!w.bolt) FX.shell(mx - mz.x * .5, my, mzz - mz.z * .5, _cv.x + pl.vel.x, _cv.y, _cv.z + pl.vel.z);
  botHear(pl.pos, pl.team, w.snd === 'm4' ? 22 : 55);
}
function melee(pl, dmg) { const cp = Math.cos(pl.pitch), dx = -Math.sin(pl.yaw) * cp, dy = Math.sin(pl.pitch), dz = -Math.cos(pl.yaw) * cp, ey = pl.pos.y + eyeY(pl); let best = null, be = null;
  for (const e of G.ents) if (e.alive && e.team !== pl.team) { const r = rayEnt(pl.pos.x, ey, pl.pos.z, dx, dy, dz, e); if (r && r.t < 2.1 && (!best || r.t < best.t)) { best = r; be = e; } }
  const h = rayWorld(pl.pos.x, ey, pl.pos.z, dx, dy, dz, 2.0); if (be && (!h || h.t > best.t)) { const back = (-Math.sin(be.yaw) * dx - Math.cos(be.yaw) * dz) > .5; hurt(be, dmg * (back ? 2.4 : 1), pl, 'knife', 'chest', { x: dx, y: dy, z: dz }, { x: pl.pos.x + dx * best.t, y: ey + dy * best.t, z: pl.pos.z + dz * best.t }); G.shake += .15; }
  else if (h) { FX.decal(pl.pos.x + dx * h.t, ey + dy * h.t, pl.pos.z + dz * h.t, h.nx, h.ny, h.nz, .12, INK); SFX.impact(null); } }
function throwNade(e) { const cp = Math.cos(e.pitch), dx = -Math.sin(e.yaw) * cp, dy = Math.sin(e.pitch), dz = -Math.cos(e.yaw) * cp; if (!G.nadeFm) { G.nadeFm = fillMat({ objSpace: true, freq: 60 }); }
  const m = worldGun('he', G.nadeFm, ACTOR_LM); m.scale.setScalar(1.6); scene.add(m); G.nades.push({ owner: e, m, p: new V3(e.pos.x + dx * .5, e.pos.y + eyeY(e) - .05, e.pos.z + dz * .5), v: new V3(dx * 17 + e.vel.x * .6, dy * 17 + 3.2, dz * 17 + e.vel.z * .6), t: 1.7 }); }
function updateNades(dt) { for (let i = G.nades.length - 1; i >= 0; i--) { const n = G.nades[i]; n.t -= dt; n.v.y -= GRAV * dt; const sp = n.v.length(), d = sp * dt;
    if (sp > .01) { const h = rayWorld(n.p.x, n.p.y, n.p.z, n.v.x / sp || 1e-9, n.v.y / sp || 1e-9, n.v.z / sp || 1e-9, d + .08); if (h) { const dot = n.v.x * h.nx + n.v.y * h.ny + n.v.z * h.nz; n.v.x -= 2 * dot * h.nx; n.v.y -= 2 * dot * h.ny; n.v.z -= 2 * dot * h.nz; n.v.multiplyScalar(.42); if (sp > 2) SFX.impact(n.p); if (h.ny > .5 && Math.abs(n.v.y) < 1) { n.v.y = 0; n.v.x *= .8; n.v.z *= .8; } } else n.p.addScaledVector(n.v, dt); }
    if (n.p.y < .08) { n.p.y = .08; if (n.v.y < 0) n.v.y = 0; } n.m.position.copy(n.p); n.m.rotation.x += dt * sp; n.m.rotation.z += dt * sp * .7;
    if (n.t <= 0) { scene.remove(n.m); G.nades.splice(i, 1); FX.explode(n.p.x, n.p.y, n.p.z); SFX.boom(n.p); const pd = G.player.pos.distanceTo(n.p); G.shake += clamp(1.4 - pd / 14, 0, 1.2);
      for (const e of G.ents) { if (!e.alive || (e.team === n.owner.team && e !== n.owner)) continue; const dd = Math.hypot(e.pos.x - n.p.x, e.pos.y + .9 - n.p.y, e.pos.z - n.p.z); if (dd > 7.5 || !segClear(n.p.x, n.p.y + .3, n.p.z, e.pos.x, e.pos.y + 1, e.pos.z)) continue;
        const dir = { x: (e.pos.x - n.p.x) / (dd || 1), y: .3, z: (e.pos.z - n.p.z) / (dd || 1) }; hurt(e, Math.round(105 * Math.pow(1 - dd / 7.5, 1.3)) * (e.armor > 0 ? .6 : 1), n.owner, 'he', 'chest', dir, { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }); } } } }

const isIndoor = e => !!rayWorld(e.pos.x, e.pos.y + 1.7, e.pos.z, 1e-9, 1, 1e-9, 9);
/* ---------------- combat ---------------- */
function fireBullet(sh, ox, oy, oz, dx, dy, dz, w, mx, my, mz, noTracer) {
  dx = dx || 1e-9; dy = dy || 1e-9; dz = dz || 1e-9; let best = null, be = null;
  for (const e of G.ents) { if (!e.alive || e.team === sh.team) continue; const r = rayEnt(ox, oy, oz, dx, dy, dz, e); if (r && (!best || r.t < best.t)) { best = r; be = e; } }
  let t0 = 0, mul = 1, endT = 260, hitEnt = false;
  for (let pen = 0; pen < 2; pen++) { const h = rayWorld(ox + dx * t0, oy + dy * t0, oz + dz * t0, dx, dy, dz, 260); const wt = h ? t0 + h.t : 260;
    if (best && best.t < wt && best.t >= t0) { hitEnt = true; endT = best.t; break; } endT = wt; if (!h) break;
    const ix = ox + dx * wt, iy = oy + dy * wt, iz = oz + dz * wt, nx = h.nx, ny = h.ny, nz = h.nz, thin = h.s && (h.tx - h.t) < .5, ex = t0 + h.tx;
    FX.decal(ix, iy, iz, nx, ny, nz, rand(.13, .24) * (w.dmg > 50 ? 1.5 : 1), INK); FX.burst(ix, iy, iz, nx, ny, nz, 4, INK, 2.5, .018); if (sh.isPlayer || Math.random() < .4) SFX.impact({ x: ix, y: iy, z: iz });
    if (thin && pen === 0) { mul = .55; t0 = ex + .02; FX.decal(ox + dx * ex, oy + dy * ex, oz + dz * ex, -nx, -ny, -nz, .2, INK); FX.burst(ox + dx * ex, oy + dy * ex, oz + dz * ex, dx, dy, dz, 5, INK, 3, .02); continue; } break; }
  if (!noTracer || !sh.isPlayer) FX.tracer(mx, my, mz, ox + dx * endT, oy + dy * endT, oz + dz * endT);
  if (hitEnt) { const dmg = w.dmg * best.mul * mul * Math.pow(w.fall, best.t / 28); hurt(be, dmg, sh, sh.weapon, best.part, { x: dx, y: dy, z: dz }, { x: ox + dx * best.t, y: oy + dy * best.t, z: oz + dz * best.t }); }
}
function hurt(e, dmg, by, wkey, part, dir, pt) {
  if (!e.alive || G.state === 'roundEnd' && G.mode === 'comp' && false) return; const w = wkey ? WEAPONS[wkey] : null, head = part === 'head';
  if (w && e.armor > 0 && part !== 'legs' && (!head || e.helmet)) { const d2 = dmg * (w.arm || .6); e.armor = Math.max(0, e.armor - (dmg - d2) * .5); dmg = d2; }
  dmg = Math.max(1, Math.round(dmg)); e.hp -= dmg;
  if (pt && dir) { FX.burst(pt.x, pt.y, pt.z, dir.x, dir.y, dir.z, 6 + Math.min(16, dmg / 5 | 0), RED, 4.5, .03, true); FX.burst(pt.x, pt.y, pt.z, -dir.x, .3, -dir.z, 3, RED, 2, .025, true); SFX.flesh(e.isPlayer ? null : pt);
    const h = rayWorld(pt.x + dir.x * .4, pt.y + dir.y * .4, pt.z + dir.z * .4, dir.x + rand(-.15, .15) || 1e-9, dir.y - .12, dir.z + rand(-.15, .15) || 1e-9, 4.5); if (h) FX.decal(pt.x + dir.x * (.4 + h.t), pt.y + (dir.y - .12) * (.4 + h.t), pt.z + dir.z * (.4 + h.t), h.nx, h.ny, h.nz, rand(.35, .8) * (head ? 1.4 : 1), RED); }
  if (e.isPlayer) { SFX.hurt(); e.punch += .035 + dmg * .0012; G.shake += .25; if (by) G.dmgDirs.push({ x: by.pos.x, z: by.pos.z, t: 1.2 }); G.splats.push({ x: rand(.1, .9), y: rand(.1, .9), s: rand(60, 160) * (1 + dmg / 60), t: 1.6, r: rand(6) }); if (G.splats.length > 8) G.splats.shift(); }
  else { e.flinch = 1; e.model.fm.uniforms.uFlash.value = .85; if (by) { e.alertT = G.now + 4; e.alertYaw = Math.atan2(-(by.pos.x - e.pos.x), -(by.pos.z - e.pos.z)); if (!e.target) { e.lookYaw = e.alertYaw; e.path = null; e.waitT = G.now + 1.2; } } }
  if (by && by.isPlayer && e !== by) { G.hitT = .22; G.hitKill = e.hp <= 0; head ? SFX.head() : SFX.hit(); if (pt) FX.num(pt, dmg, head); }
  if (e.hp <= 0) kill(e, by, wkey, head, dir);
}
function kill(e, by, wkey, head, dir) {
  e.alive = false; e.hp = 0; e.deaths++; e.deathT = 0; e.respawnT = G.now + 3; const fl = MAP.floorAt(e.pos.x, e.pos.z);
  if (by && by !== e) { by.kills++; if (G.mode === 'comp') by.money = Math.min(16000, by.money + (WEAPONS[wkey] ? WEAPONS[wkey].reward : 300)); if (G.mode === 'dm') G.score[by.team]++; }
  FX.decal(e.pos.x + rand(-.3, .3), Math.abs(e.pos.y - fl) < .4 ? fl : e.pos.y, e.pos.z + rand(-.3, .3), 0, 1, 0, rand(1.3, 2.1), RED, true); FX.burst(e.pos.x, e.pos.y + 1.2, e.pos.z, 0, 1, 0, 14, INK, 3.5, .03);
  addFeed(by, e, wkey, head);
  if (e.isPlayer) { e.scoped = 0; G.deathCam = { t: 0, yaw: e.yaw, by }; $('dead').classList.add('on'); $('deadBy').textContent = by && by !== e ? `被 ${by.name} 用 ${WEAPONS[wkey] ? WEAPONS[wkey].name : '环境'} 击倒` : '你倒下了'; if (G.mode === 'comp') { e.inv[1] = null; e.inv[2] = 'p9'; e.nadeN = 0; e.armor = 0; e.helmet = false; } closeBuy(); }
  else { const f = dir ? (-Math.sin(e.yaw) * dir.x - Math.cos(e.yaw) * dir.z) : -1; e.fallDir = f > 0 ? -1 : 1; e.target = null; e.model.mark.visible = false; }
  if (by && by.isPlayer && e !== by) { SFX.kill(); banner(head ? '爆头击倒' : '击倒', `${e.name}  +$${G.mode === 'comp' ? WEAPONS[wkey].reward : 0}`); }
  if (G.mode === 'comp' && G.state === 'live') checkRoundEnd();
  if (G.mode === 'dm' && G.state === 'live' && Math.max(G.score.red, G.score.blue) >= DM_KILLS) endMatch(G.score.red > G.score.blue ? 'red' : 'blue');
}
G.botShoot = (b, dx, dy, dz) => { const w = WEAPONS[b.weapon], ey = b.pos.y + eyeY(b), mx = b.pos.x + dx * .8 + Math.cos(b.yaw) * .13, my = ey - .12, mz = b.pos.z + dz * .8 - Math.sin(b.yaw) * .13;
  for (let i = 0; i < (w.pellets || 1); i++) { const s = w.pellets ? w.spread * .6 : 0; fireBullet(b, b.pos.x, ey, b.pos.z, dx + gauss() * s, dy + gauss() * s, dz + gauss() * s, w, mx, my, mz); }
  FX.flash(mx, my, mz, .22); SFX.shot(w.snd, b.pos, isIndoor(b)); botHear(b.pos, b.team, 45); };

/* ---------------- match flow ---------------- */
function startMatch() {
  for (const b of G.bots) scene.remove(b.model.root); for (const n of G.nades) scene.remove(n.m); G.nades = []; G.ents = []; G.bots = []; G.score = { red: 0, blue: 0 }; G.round = 0; G.lossStreak = { red: 0, blue: 0 }; G.feed = [];
  const pl = G.player = makePlayer(G.team); pl.money = G.mode === 'dm' ? 16000 : 800; G.ents.push(pl); giveWeapon(pl, 'p9');
  const names = BOT_NAMES.slice().sort(() => Math.random() - .5); let ni = 0;
  for (const team of ['blue', 'red']) for (let i = 0; i < (team === G.team ? 4 : 5); i++) { const b = makeBot(team, names[ni++], scene); b.money = 800; G.ents.push(b); G.bots.push(b); }
  $('menu').classList.remove('on'); $('end').classList.remove('on'); $('hud').classList.add('on'); SFX.init(); SFX.setVol(G.set.vol); if (TOUCH.on) touchStartMatch(); lock(); startRound();
}
function spawnEnt(e) {
  let p; if (G.mode === 'dm' && G.round > 0 && G.state === 'live') { let bd = -1; for (let i = 0; i < 10; i++) { const q = navRandomIn({ x1: -58, x2: 58, z1: -50, z2: 50 }); let md = 1e9; for (const o of G.ents) if (o.alive && o.team !== e.team) md = Math.min(md, Math.hypot(o.pos.x - q.x, o.pos.z - q.z)); if (md > bd) { bd = md; p = q; } } }
  else p = navRandomIn(MAP.spawn[e.team]);
  for (const o of G.ents) if (o !== e && o.alive && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 1.2) { p.x += rand(-1.5, 1.5); p.z += rand(-1.5, 1.5); }
  e.pos.set(p.x, p.y, p.z); e.vel.set(0, 0, 0); e.yaw = e.team === 'red' ? 0 : Math.PI; if (G.mode === 'dm') e.yaw = Math.atan2(p.x, p.z); e.pitch = 0; e.hp = 100; e.alive = true; e.onGround = true; e.crouchAmt = 0; e.hgt = 1.8; e.stepSmooth = 0;
  if (e.isPlayer) { $('dead').classList.remove('on'); G.deathCam = null; e.recP = e.recY = e.recTP = e.recTY = 0; for (const k in e.ammo) { const w = WEAPONS[k]; e.ammo[k] = { mag: w.mag, res: w.res }; } if (G.mode === 'dm') { e.armor = 100; e.helmet = true; } VM.key = null; switchTo(e.inv[1] || e.inv[2]); }
  else { const m = e.model; m.root.visible = true; m.root.rotation.x = 0; m.legL.rotation.x = m.legR.rotation.x = 0; m.mark.visible = e.team === G.team; e.target = null; e.path = null; e.waitT = 0; e.state = 'roam'; e.lookYaw = e.yaw; botBuy(e); }
}
function botBuy(b) {
  let k = b.keep && b.weaponKeep ? b.weaponKeep : 'p9';
  if (G.mode === 'dm') { k = pick(['ak', 'm4', 'viper', 'ak', 'm4', 'nova', 'awp']); b.armor = 100; b.helmet = true; }
  else { if (!b.keep || k === 'p9' || k === 'deagle') { const m = b.money, rifle = b.team === 'red' ? 'ak' : 'm4'; let pickK = null; if (m >= 5200 && Math.random() < .18) pickK = 'awp'; else if (m >= WEAPONS[rifle].price + 300) pickK = rifle; else if (m >= 2000) pickK = Math.random() < .7 ? 'viper' : 'nova'; else if (m >= 900 && Math.random() < .5) pickK = 'deagle';
      if (pickK) { b.money -= WEAPONS[pickK].price; k = pickK; } } if (b.armor < 50 && b.money >= 1000) { b.money -= 1000; b.armor = 100; b.helmet = true; } }
  setEntWeapon(b, k); b.keep = false;
}
function startRound() {
  G.round++; G.state = G.mode === 'dm' ? 'live' : 'freeze'; G.timer = G.mode === 'dm' ? DM_TIME : FREEZE; G.huntAll = false; G.timescale = 1; for (const n of G.nades) scene.remove(n.m); G.nades = [];
  for (const e of G.ents) { e.alive = false; } for (const e of G.ents) spawnEnt(e);
  if (G.mode === 'comp') { banner(`第 ${G.round} 回合`, TOUCH.on ? '准备阶段 · 点右上角「采购」' : '准备阶段 · 按 B 采购装备'); } else banner('死斗模式', `率先 ${DM_KILLS} 次击倒的队伍获胜 · 随时可采购换装`); SFX.ui(660);
}
function checkRoundEnd() { const a = { red: 0, blue: 0 }; for (const e of G.ents) if (e.alive) a[e.team]++; if (!a.red) endRound('blue'); else if (!a.blue) endRound('red'); }
function endRound(win) {
  if (G.state !== 'live') return; G.state = 'roundEnd'; G.timer = 5; G.score[win]++; G.timescale = .3; setTimeout(() => G.timescale = 1, 900); const lose = win === 'red' ? 'blue' : 'red'; G.lossStreak[win] = 0; G.lossStreak[lose]++;
  for (const e of G.ents) { e.money = Math.min(16000, e.money + (e.team === win ? 3250 : 1400 + Math.min(4, G.lossStreak[lose]) * 500)); if (e.alive && !e.isPlayer) { e.keep = true; e.weaponKeep = e.weapon; } }
  const mine = win === G.team; banner(mine ? '回合胜利' : '回合失利', `${win === 'blue' ? '蓝方 · 靛青' : '红方 · 朱砂'} 拿下本回合`, mine ? 'win' : 'lose'); SFX.bell(mine); closeBuy();
}
function endMatch(win) { G.state = 'matchEnd'; const mine = win === G.team; $('endTitle').textContent = mine ? '胜 利' : '落 败'; $('endSub').textContent = `${G.score.blue} : ${G.score.red} · 击倒 ${G.player.kills} · 阵亡 ${G.player.deaths}`; $('end').classList.add('on'); $('dead').classList.remove('on'); SFX.bell(mine); if (document.exitPointerLock) document.exitPointerLock(); }
function updateFlow(dt) {
  if (G.state === 'menu' || G.state === 'matchEnd') return; G.timer -= dt;
  if (G.state === 'freeze' && G.timer <= 0) { G.state = 'live'; G.timer = ROUND_TIME; banner('行动开始', '', 'go'); SFX.ui(990); }
  else if (G.state === 'live') { if (G.mode === 'comp') { if (G.timer < ROUND_TIME - 50) G.huntAll = true; if (G.timer <= 0) endRound('blue'); }
    else { if (G.timer <= 0) endMatch(G.score.red > G.score.blue ? 'red' : 'blue'); for (const e of G.ents) if (!e.alive && G.now >= e.respawnT) spawnEnt(e); } }
  else if (G.state === 'roundEnd' && G.timer <= 0) { if (Math.max(G.score.red, G.score.blue) >= WIN_ROUNDS) endMatch(G.score.red > G.score.blue ? 'red' : 'blue'); else startRound(); }
}

/* ---------------- buy ---------------- */
function canBuy() { const pl = G.player; if (!pl || !pl.alive) return false; if (G.mode === 'dm') return true; const r = MAP.spawn[pl.team]; const inZone = pl.pos.x > r.x1 - 6 && pl.pos.x < r.x2 + 6 && pl.pos.z > r.z1 - 4 && pl.pos.z < r.z2 + 4; return G.state === 'freeze' || (G.state === 'live' && G.timer > ROUND_TIME - 20 && inZone); }
function toggleBuy() { if (G.buyOpen) return closeBuy(); if (!canBuy()) { banner('无法采购', '仅限准备阶段或开局 20 秒内在出生区', 'lose'); SFX.deny(); return; } G.buyOpen = true; drawBuy(); $('buy').classList.add('on'); SFX.ui(); }
function closeBuy() { G.buyOpen = false; $('buy').classList.remove('on'); }
function drawBuy() { const pl = G.player; $('buyMoney').textContent = '$' + pl.money; $('buyGrid').innerHTML = BUY_LIST.map((k, i) => { const armor = k === 'armor', w = armor ? { name: '护甲 + 头盔', en: 'PLATE & HELM', price: 1000 } : WEAPONS[k], own = armor ? pl.armor >= 100 : (k === 'he' ? pl.nadeN > 0 : pl.inv[w.slot] === k), poor = pl.money < w.price;
    return `<div data-k="${k}" class="card ${own ? 'own' : poor ? 'poor' : ''}"><b>${i + 1}</b>${armor ? '<div class="ico armor">⛨</div>' : `<img class="ico" src="${G.icons[k]}">`}<div class="nm">${w.name}</div><div class="en">${w.en}</div><div class="pr">${own ? '已装备' : '$' + w.price}</div></div>`; }).join(''); }
function buy(k) { const pl = G.player; if (!canBuy()) return closeBuy(); const armor = k === 'armor', price = armor ? 1000 : WEAPONS[k].price; if (armor ? pl.armor >= 100 : (k === 'he' ? pl.nadeN > 0 : pl.inv[WEAPONS[k].slot] === k)) return SFX.deny(); if (pl.money < price) return SFX.deny();
  if (G.mode === 'comp') pl.money -= price; if (armor) { pl.armor = 100; pl.helmet = true; } else { giveWeapon(pl, k); if (!WEAPONS[k].nade) switchTo(k); } SFX.buy(); drawBuy(); }

/* ---------------- HUD ---------------- */
function banner(t, s, cls) { const b = $('banner'); b.className = 'on ' + (cls ? 'b-' + cls : ''); $('bannerT').textContent = t; $('bannerS').textContent = s || ''; clearTimeout(G._bt); G._bt = setTimeout(() => b.className = '', 2300); }
function addFeed(by, e, wkey, head) { G.feed.push({ t: G.now, html: `<span class="${by ? by.team : ''}">${by && by !== e ? by.name : ''}</span> <i>${WEAPONS[wkey] ? WEAPONS[wkey].name.split(' ')[0] : '坠落'}${head ? ' ◎' : ''}</i> <span class="${e.team}">${e.name}</span>`, me: (by && by.isPlayer) || e.isPlayer }); if (G.feed.length > 5) G.feed.shift(); drawFeed(); }
function drawFeed() { $('feed').innerHTML = G.feed.map(f => `<div class="${f.me ? 'me' : ''}">${f.html}</div>`).join(''); }
function drawBoard() { const row = e => `<tr class="${e.isPlayer ? 'me' : ''} ${e.alive ? '' : 'out'}"><td>${e.name}</td><td>${e.kills}</td><td>${e.deaths}</td><td>${G.mode === 'comp' && e.team === G.team ? '$' + e.money : ''}</td></tr>`;
  $('boardIn').innerHTML = ['blue', 'red'].map(t => `<table class="${t}"><caption>${t === 'blue' ? '蓝方 · 靛青' : '红方 · 朱砂'}　${G.score[t]}</caption><tr><th>代号</th><th>击倒</th><th>阵亡</th><th>资金</th></tr>${G.ents.filter(e => e.team === t).sort((a, b) => b.kills - a.kills).map(row).join('')}</table>`).join(''); }
let _hudT = 0;
function updateHUD(dt) {
  const pl = G.player; _hudT -= dt; if (_hudT <= 0) { _hudT = .1; const a = pl.ammo[pl.cur], w = WEAPONS[pl.cur], al = { red: 0, blue: 0 }; for (const e of G.ents) if (e.alive) al[e.team]++;
    $('hp').textContent = Math.max(0, Math.ceil(pl.hp)); $('hpBar').style.width = clamp(pl.hp, 0, 100) + '%'; $('hpBox').classList.toggle('low', pl.hp <= 30); $('ar').textContent = Math.ceil(pl.armor); $('arBar').style.width = pl.armor + '%';
    $('mag').textContent = a ? a.mag : (w.nade ? pl.nadeN : '—'); $('res').textContent = a ? a.res : ''; $('wname').textContent = w.name; $('wen').textContent = w.en; $('money').textContent = G.mode === 'comp' ? '$' + pl.money : '';
    const t = Math.max(0, Math.ceil(G.timer)); $('timer').textContent = `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`; $('timer').classList.toggle('warn', G.state === 'live' && t <= 10); $('sB').textContent = G.score.blue; $('sR').textContent = G.score.red;
    $('aB').textContent = G.mode === 'comp' ? '●'.repeat(al.blue) + '○'.repeat(5 - al.blue) : ''; $('aR').textContent = G.mode === 'comp' ? '●'.repeat(al.red) + '○'.repeat(5 - al.red) : ''; $('zone').textContent = MAP.zoneAt(pl.pos.x, pl.pos.z); $('phase').textContent = G.state === 'freeze' ? '准备' : G.mode === 'dm' ? '死斗' : `R${G.round}`;
    $('slots').innerHTML = [[1, pl.inv[1]], [2, pl.inv[2]], [3, 'knife'], [4, pl.nadeN > 0 ? 'he' : null]].map(([n, k]) => k ? `<span class="${k === pl.cur ? 'cur' : ''}">${n} ${WEAPONS[k].name.split(' ')[0]}</span>` : '').join('');
    const now = G.now; if (G.feed.length && now - G.feed[0].t > 6) { G.feed.shift(); drawFeed(); } $('scope').classList.toggle('on', pl.scoped > 0 && pl.alive); if (G.buyOpen) $('buyMoney').textContent = '$' + pl.money; }
  drawFx(dt); drawRadar();
}
function drawFx(dt) {
  const g = fxg, W = fxc.width, H = fxc.height, pl = G.player, cx = W / 2, cy = H / 2; g.clearRect(0, 0, W, H);
  for (let i = G.splats.length - 1; i >= 0; i--) { const s = G.splats[i]; s.t -= dt; if (s.t <= 0) { G.splats.splice(i, 1); continue; } g.globalAlpha = Math.min(1, s.t) * .8; g.fillStyle = '#d42a2a'; const ex = s.x < .5 ? s.x * .3 : 1 - (1 - s.x) * .3, ey = s.y; g.save(); g.translate(ex * W, ey * H); g.rotate(s.r); g.beginPath(); for (let k = 0; k <= 18; k++) { const a = k / 18 * 6.2832, r = s.s * (.6 + .4 * Math.sin(k * 2.7 + s.r * 5) + (k % 3 === 0 ? .5 : 0)); k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore(); }
  g.globalAlpha = 1; if (pl.alive && pl.hp <= 30) { const gr = g.createRadialGradient(cx, cy, H * .35, cx, cy, H * .8); gr.addColorStop(0, 'rgba(212,42,42,0)'); gr.addColorStop(1, `rgba(212,42,42,${.25 + .1 * Math.sin(G.now * 5)})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  for (let i = G.dmgDirs.length - 1; i >= 0; i--) { const d = G.dmgDirs[i]; d.t -= dt; if (d.t <= 0) { G.dmgDirs.splice(i, 1); continue; } const a = angDiff(Math.atan2(-(d.x - pl.pos.x), -(d.z - pl.pos.z)), pl.yaw); g.save(); g.translate(cx, cy); g.rotate(-a); g.globalAlpha = Math.min(1, d.t); g.strokeStyle = '#d42a2a'; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 120, -Math.PI / 2 - .32, -Math.PI / 2 + .32); g.stroke(); g.restore(); }
  g.globalAlpha = 1; g.font = 'bold 17px "IBM Plex Mono", monospace'; g.textAlign = 'center';
  for (const q of FX.nums) { _cv.set(q.x, q.y, q.z).project(camera); if (_cv.z > 1) continue; g.globalAlpha = 1 - q.t / .9; g.fillStyle = q.head ? '#d42a2a' : '#16161c'; g.fillText((q.head ? '◎ ' : '') + q.val, (_cv.x * .5 + .5) * W, (-_cv.y * .5 + .5) * H); }
  g.globalAlpha = 1; if (!pl.alive || G.state === 'menu') return;
  if (!pl.scoped && !WEAPONS[pl.cur].scope) { const gap = 4 + (pl.spread || 0) * 1300, L = 7; g.lineCap = 'butt'; for (const [c, lw] of [['#f5f2ea', 4], ['#16161c', 2]]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - gap - L, cy); g.lineTo(cx - gap, cy); g.moveTo(cx + gap, cy); g.lineTo(cx + gap + L, cy); g.moveTo(cx, cy - gap - L); g.lineTo(cx, cy - gap); g.moveTo(cx, cy + gap); g.lineTo(cx, cy + gap + L); g.stroke(); } g.fillStyle = '#16161c'; g.fillRect(cx - 1, cy - 1, 2, 2); }
  if (G.hitT > 0) { G.hitT -= dt; const k = G.hitT / .22, r0 = 7 + (1 - k) * 5, r1 = r0 + (G.hitKill ? 11 : 7); g.strokeStyle = G.hitKill ? '#d42a2a' : '#16161c'; g.lineWidth = G.hitKill ? 3 : 2; g.globalAlpha = k; g.beginPath(); for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.moveTo(cx + sx * r0, cy + sy * r0); g.lineTo(cx + sx * r1, cy + sy * r1); } g.stroke(); g.globalAlpha = 1; }
}
function drawRadar() {
  const g = rg, S = 176, pl = G.player, k = 2.3, ref = pl.alive ? pl : (G.spec || pl); g.clearRect(0, 0, S, S); g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 6.2832); g.clip(); g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2); g.rotate(ref.yaw); g.scale(k / 4, k / 4); g.drawImage(MAP.mini, -(ref.pos.x + 64) * 4, -(ref.pos.z + 56) * 4); g.scale(4 / k, 4 / k);
  for (const e of G.ents) { if (!e.alive || e === ref) continue; const mine = e.team === pl.team; if (!mine && G.now - e.spottedT > 1.5) continue; g.fillStyle = mine ? '#2d6cb3' : '#d42a2a'; if (pl.team === 'red') g.fillStyle = mine ? '#d42a2a' : '#2d6cb3'; g.beginPath(); g.arc((e.pos.x - ref.pos.x) * k, (e.pos.z - ref.pos.z) * k, 3.6, 0, 6.2832); g.fill(); }
  g.restore(); g.fillStyle = '#16161c'; g.beginPath(); g.moveTo(S / 2, S / 2 - 7); g.lineTo(S / 2 + 5, S / 2 + 5); g.lineTo(S / 2, S / 2 + 2); g.lineTo(S / 2 - 5, S / 2 + 5); g.fill(); g.strokeStyle = '#16161c'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 6.2832); g.stroke();
}

/* ---------------- UI wiring ---------------- */
function bindUI() {
  const seg = (id, key, cast) => $(id).querySelectorAll('button').forEach(b => b.onclick = () => { $(id).querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); G[key] = cast(b.dataset.v); SFX.init(); SFX.ui(); });
  seg('optMode', 'mode', String); seg('optDiff', 'diff', Number); seg('optTeam', 'team', String);
  $('start').onclick = () => startMatch(); $('resume').onclick = () => setPause(false); $('quit').onclick = $('again').onclick = () => { G.state = 'menu'; G.paused = false; for (const id of ['pause', 'end', 'hud', 'dead', 'buy']) $(id).classList.remove('on'); $('menu').classList.add('on'); G.buyOpen = false; };
  for (const [id, key, fn] of [['sSens', 'sens', v => v], ['sFov', 'fov', v => v], ['sVol', 'vol', v => { SFX.setVol(v); return v; }]]) { const el = $(id), lab = $(id + 'V'); el.value = G.set[key]; lab.textContent = G.set[key]; el.oninput = () => { G.set[key] = fn(+el.value); lab.textContent = el.value; localStorage.setItem('inkstrike', JSON.stringify(G.set)); }; }
}

/* ---------------- camera + frame ---------------- */
function updateCamera(dt) {
  const pl = G.player; let fov = G.set.fov; G.shake = damp(G.shake, 0, 9, dt);
  if (pl.alive) { G.spec = null; camera.position.set(pl.pos.x, pl.pos.y + eyeY(pl) + pl.stepSmooth, pl.pos.z); const sh = G.shake * .012; camera.rotation.set(pl.pitch + pl.recP + pl.punch * .5 + gauss() * sh, pl.yaw + pl.recY + gauss() * sh, pl.roll + pl.punch * .3); if (pl.scoped) fov = pl.scoped === 1 ? 38 : 13; }
  else if (G.deathCam) { const d = G.deathCam; d.t += dt; if (d.t < 2.6 || G.mode === 'dm') { const h = Math.min(3.2, .4 + d.t * 1.6), bx = pl.pos.x + Math.sin(d.yaw) * h * .8, bz = pl.pos.z + Math.cos(d.yaw) * h * .8; camera.position.set(bx, pl.pos.y + h, bz); camera.lookAt(pl.pos.x, pl.pos.y + .3, pl.pos.z); }
    else { if (!G.spec || !G.spec.alive || G.fireEdge) { const mates = G.ents.filter(e => e.alive && e.team === pl.team && e !== G.spec); G.spec = mates.length ? pick(mates) : (G.spec && G.spec.alive ? G.spec : null); if (G.spec) $('deadBy').textContent = `观战中 · ${G.spec.name}（点击切换）`; }
      if (G.spec) { const s = G.spec, bx = s.pos.x + Math.sin(s.yaw) * 2.6, bz = s.pos.z + Math.cos(s.yaw) * 2.6; _cv.set(bx, s.pos.y + 2.1, bz); const ok = segClear(s.pos.x, s.pos.y + 1.6, s.pos.z, bx, s.pos.y + 2.1, bz); if (!ok) _cv.set(s.pos.x, s.pos.y + 2.3, s.pos.z); camera.position.lerp(_cv, 1 - Math.exp(-8 * dt)); camera.rotation.set(damp(camera.rotation.x, s.pitch - .18, 8, dt), camera.rotation.y + angDiff(s.yaw, camera.rotation.y) * (1 - Math.exp(-8 * dt)), 0); } } }
  if (Math.abs(camera.fov - fov) > .05) { camera.fov = damp(camera.fov, fov, 22, dt); camera.updateProjectionMatrix(); }
  SFX.L.x = camera.position.x; SFX.L.z = camera.position.z; SFX.L.yaw = camera.rotation.y;
}
function frame(dt) {
  if (G.state === 'menu') { const t = performance.now() / 1000 * .05; camera.position.set(Math.sin(t) * 70, 30, Math.cos(t) * 70); camera.lookAt(0, 0, 0); renderer.clear(); renderer.render(scene, camera); return; }
  if (!G.paused && G.state !== 'matchEnd') { const sdt = dt * G.timescale; G.now += sdt; updateFlow(sdt); const pl = G.player;
    if (G.state !== 'matchEnd' && G.state !== 'menu') { if (TOUCH.on) updateTouch(sdt); if (pl.alive) updatePlayer(sdt); for (const b of G.bots) updateBot(b, sdt, G.now); updateNades(sdt); FX.update(sdt, camera); updateCamera(sdt); VM.update(sdt, pl, WEAPONS[pl.cur], G.mdx, G.mdy); updateHUD(dt);
      if (G.now - (G._spotT || 0) > .2) { G._spotT = G.now; if (pl.alive) for (const e of G.ents) if (e.alive && e.team !== pl.team && botSee(pl, e)) { const a = Math.abs(angDiff(Math.atan2(-(e.pos.x - pl.pos.x), -(e.pos.z - pl.pos.z)), pl.yaw)); if (a < 1) e.spottedT = G.now; } } }
    G.mdx = G.mdy = 0; G.fireEdge = G.altEdge = false; }
  renderer.clear(); renderer.render(scene, camera); if (G.player && G.player.alive) { renderer.clearDepth(); renderer.render(VM.scene, VM.cam); }
}
