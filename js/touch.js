'use strict';
/* ============ INK STRIKE · touch: twin-thumb controls, aim friction, auto-fire ============ */
const TOUCH = { on: false, move: { x: 0, y: 0 }, joy: null, looks: new Map(), btns: new Map(), aimOn: false, aimT: 0, aimCheck: 0, crouch: false };

function initTouch() {
  TOUCH.on = true; G.noLock = true; document.body.classList.add('touch');
  if (G.set.autoFire === undefined) G.set.autoFire = true; if (G.set.tsens === undefined) G.set.tsens = 1;
  const L = $('touch'), knob = $('joyKnob'), base = $('joyBase'), R = 58;
  const btnOf = el => el && el.closest ? el.closest('[data-b]') : null;
  const press = (b, down) => {
    const k = b.dataset.b; b.classList.toggle('dn', down && k !== 'crouch');
    if (k === 'fire') { G.fire = down; if (down) G.fireEdge = true; }
    else if (k === 'alt') { G.alt = down; if (down) G.altEdge = true; }
    else if (k === 'jump') G.keys.Space = down;
    else if (!down) return;
    else if (k === 'crouch') { TOUCH.crouch = !TOUCH.crouch; G.keys.KeyC = TOUCH.crouch; b.classList.toggle('dn', TOUCH.crouch); }
    else if (k === 'reload') onKey('KeyR');
    else if (k === 'swap') { const pl = G.player; if (pl && pl.alive) { const order = [pl.inv[1], pl.inv[2], 'knife', pl.nadeN > 0 ? 'he' : null].filter(Boolean); switchTo(order[(order.indexOf(pl.cur) + 1) % order.length]); } }
    else if (k === 'buy') toggleBuy();
    else if (k === 'pause') setPause(true);
    else if (k === 'board') { const on = !$('board').classList.contains('on'); if (on) drawBoard(); $('board').classList.toggle('on', on); }
  };
  L.addEventListener('touchstart', e => { e.preventDefault(); SFX.init();
    for (const t of e.changedTouches) { const b = btnOf(t.target);
      if (b) { TOUCH.btns.set(t.identifier, b); press(b, true); if (b.dataset.b === 'fire' || b.dataset.b === 'alt') TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); }
      else if (t.clientX < innerWidth * .42 && !TOUCH.joy) { TOUCH.joy = { id: t.identifier, x: t.clientX, y: t.clientY }; base.style.display = 'block'; base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      else TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); } }, { passive: false });
  L.addEventListener('touchmove', e => { e.preventDefault(); const pl = G.player;
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { let dx = t.clientX - TOUCH.joy.x, dy = t.clientY - TOUCH.joy.y; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } TOUCH.move.x = dx / R; TOUCH.move.y = dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
      const lk = TOUCH.looks.get(t.identifier);
      if (lk && pl && !G.paused) { const dx = t.clientX - lk.x, dy = t.clientY - lk.y; lk.x = t.clientX; lk.y = t.clientY; const sp = Math.hypot(dx, dy), acc = 1 + Math.min(1.2, sp * .035), k = .0046 * G.set.tsens * (camera.fov / G.set.fov) * acc * (TOUCH.aimOn ? .5 : 1);
        pl.yaw -= dx * k; pl.pitch = clamp(pl.pitch - dy * k * .8, -1.54, 1.54); G.mdx += dx * 2; G.mdy += dy * 2; } } }, { passive: false });
  const end = e => { e.preventDefault(); for (const t of e.changedTouches) { const b = TOUCH.btns.get(t.identifier); if (b) { press(b, false); TOUCH.btns.delete(t.identifier); }
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; base.style.display = 'none'; } TOUCH.looks.delete(t.identifier); } };
  L.addEventListener('touchend', end, { passive: false }); L.addEventListener('touchcancel', end, { passive: false });
  $('buyGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) buy(c.dataset.k); }); $('buyClose').onclick = () => closeBuy(); $('board').onclick = () => $('board').classList.remove('on');
  const af = $('sAuto'); af.checked = G.set.autoFire; af.onchange = () => { G.set.autoFire = af.checked; localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  const ts = $('sTs'), tl = $('sTsV'); ts.value = G.set.tsens; tl.textContent = G.set.tsens; ts.oninput = () => { G.set.tsens = +ts.value; tl.textContent = ts.value; localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  const rot = () => $('rotate').classList.toggle('on', innerHeight > innerWidth * 1.05); addEventListener('resize', rot); rot();
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state !== 'menu' && G.state !== 'matchEnd') setPause(true); });
}
function touchStartMatch() { const el = document.documentElement; try { const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { })).catch(() => { }); } catch (e) { } }

/* per-frame: aim friction probe + auto-fire */
function updateTouch(dt) {
  const pl = G.player; if (!pl || !pl.alive) { TOUCH.aimOn = false; return; }
  TOUCH.aimCheck -= dt;
  if (TOUCH.aimCheck <= 0) { TOUCH.aimCheck = .05; const py = pl.pitch + pl.recP, yw = pl.yaw + pl.recY, cp = Math.cos(py), dx = -Math.sin(yw) * cp || 1e-9, dy = Math.sin(py) || 1e-9, dz = -Math.cos(yw) * cp || 1e-9, ey = pl.pos.y + eyeY(pl); let bt = 1e9;
    for (const e of G.ents) if (e.alive && e.team !== pl.team) { const r = rayEnt(pl.pos.x, ey, pl.pos.z, dx, dy, dz, e); if (r && r.t < bt) bt = r.t; }
    const w = bt < 1e9 ? rayWorld(pl.pos.x, ey, pl.pos.z, dx, dy, dz, bt) : null; TOUCH.aimOn = bt < 1e9 && !w; }
  TOUCH.aimT = TOUCH.aimOn ? TOUCH.aimT + dt : 0;
  const w = WEAPONS[pl.cur], manual = [...TOUCH.btns.values()].some(b => b.dataset.b === 'fire');
  if (G.set.autoFire && !manual && !w.nade) { const ok = TOUCH.aimT > (w.scope ? .25 : .1) && (!w.scope || pl.scoped > 0) && (!w.melee || false) && G.state === 'live';
    if (ok) { G.fire = true; if (G.now >= pl.nextFire) G.fireEdge = true; } else G.fire = false; }
  $('tFire').classList.toggle('lock', TOUCH.aimOn);
}
