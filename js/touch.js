'use strict';
/* ============ INK STRIKE · touch: twin-thumb controls, aim friction, auto-fire ============ */
const TOUCH = { on: false, move: { x: 0, y: 0 }, joy: null, looks: new Map(), btns: new Map(), aimOn: false, aimT: 0, aimCheck: 0, crouch: false, auto: false };
function touchHeld(k) { for (const b of TOUCH.btns.values()) if (b.dataset.b === k) return true; return false; }
function touchReset() { TOUCH.btns.clear(); TOUCH.looks.clear(); TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; TOUCH.crouch = TOUCH.aimOn = TOUCH.auto = false; TOUCH.aimT = TOUCH.aimCheck = 0; G.fire = G.alt = G.fireEdge = G.altEdge = false; G.keys.Space = G.keys.KeyE = G.keys.KeyC = false; document.querySelectorAll('#touch .dn, #touch .lock').forEach(b => b.classList.remove('dn', 'lock')); if ($('joyBase')) $('joyBase').style.display = 'none'; }

function initTouch() {
  TOUCH.on = true; G.noLock = true; document.body.classList.add('touch');
  if (G.set.autoFire === undefined) G.set.autoFire = true; if (G.set.tsens === undefined) G.set.tsens = 1; if (G.set.touchAccel === undefined) G.set.touchAccel = false;
  const L = $('touch'), knob = $('joyKnob'), base = $('joyBase'), R = 58;
  const btnOf = el => el && el.closest ? el.closest('[data-b]') : null;
  const press = (b, down) => {
    const k = b.dataset.b, held = down || touchHeld(k); if (k !== 'crouch') b.classList.toggle('dn', down || [...TOUCH.btns.values()].includes(b));
    if (k === 'fire') { G.fire = held || TOUCH.auto; if (down) G.fireEdge = true; }
    else if (k === 'alt') { G.alt = held; if (down) G.altEdge = true; }
    else if (k === 'jump') G.keys.Space = held;
    else if (k === 'use') G.keys.KeyE = held;
    else if (!down) return;
    else if (k === 'crouch') { TOUCH.crouch = !TOUCH.crouch; G.keys.KeyC = TOUCH.crouch; b.classList.toggle('dn', TOUCH.crouch); }
    else if (k === 'reload') onKey('KeyR');
    else if (k === 'swap') { const pl = G.player; if (pl && pl.alive) { const order = weaponOrder(pl); switchTo(order[(order.indexOf(pl.cur) + 1) % order.length]); } }
    else if (k === 'buy') toggleBuy();
    else if (k === 'map') toggleMap();
    else if (k === 'pause') setPause(true);
    else if (k === 'board') { const on = !$('board').classList.contains('on'); if (on) drawBoard(); $('board').classList.toggle('on', on); }
  };
  L.addEventListener('touchstart', e => { e.preventDefault(); if (TOUCH.edit || G.paused || G.buyOpen || G.mapOpen || G.state === 'menu' || G.state === 'matchEnd') return; SFX.init();
    for (const t of e.changedTouches) { const b = btnOf(t.target);
      if (b) { TOUCH.btns.set(t.identifier, b); press(b, true); if (b.dataset.b === 'fire' || b.dataset.b === 'alt') TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); }
      else if (t.clientX < innerWidth * .42 && !TOUCH.joy) { TOUCH.joy = { id: t.identifier, x: t.clientX, y: t.clientY }; base.style.display = 'block'; base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      else TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); } }, { passive: false });
  L.addEventListener('touchmove', e => { e.preventDefault(); if (TOUCH.edit || G.paused || G.buyOpen || G.mapOpen) { touchReset(); return; } const pl = G.player;
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { let dx = t.clientX - TOUCH.joy.x, dy = t.clientY - TOUCH.joy.y; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } TOUCH.move.x = d < R * .12 ? 0 : dx / R; TOUCH.move.y = d < R * .12 ? 0 : dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
      const lk = TOUCH.looks.get(t.identifier);
      if (lk && pl && !G.paused) { const dx = t.clientX - lk.x, dy = t.clientY - lk.y; lk.x = t.clientX; lk.y = t.clientY; const sp = Math.hypot(dx, dy), acc = G.set.touchAccel ? 1 + Math.min(1.2, sp * .035) : 1, k = .0046 * G.set.tsens * (camera.fov / G.set.fov) * acc * (TOUCH.aimOn ? .5 : 1);
        pl.yaw -= dx * k; pl.pitch = clamp(pl.pitch - dy * k * .8, -1.54, 1.54); G.mdx += dx * 2; G.mdy += dy * 2; } } }, { passive: false });
  const end = e => { e.preventDefault(); for (const t of e.changedTouches) { const b = TOUCH.btns.get(t.identifier); if (b) { TOUCH.btns.delete(t.identifier); press(b, false); }
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; base.style.display = 'none'; } TOUCH.looks.delete(t.identifier); } };
  L.addEventListener('touchend', end, { passive: false }); L.addEventListener('touchcancel', e => { e.preventDefault(); touchReset(); }, { passive: false });
  $('board').onclick = () => $('board').classList.remove('on');
  const af = $('sAuto'); af.checked = G.set.autoFire; af.onchange = () => { G.set.autoFire = af.checked; if (!af.checked && TOUCH.auto) { TOUCH.auto = false; G.fire = touchHeld('fire'); } localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  const ac = $('sAccel'); if (ac) { ac.checked = G.set.touchAccel; ac.onchange = () => { G.set.touchAccel = ac.checked; localStorage.setItem('inkstrike', JSON.stringify(G.set)); }; }
  const ts = $('sTs'), tl = $('sTsV'); ts.value = G.set.tsens; tl.textContent = G.set.tsens; ts.oninput = () => { G.set.tsens = +ts.value; tl.textContent = ts.value; localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  layoutApply(); $('layoutBtn').onclick = () => layoutEdit(true); $('layoutDone').onclick = () => layoutEdit(false); $('layoutReset').onclick = () => { delete G.set.layout; G.set.btnScale = 1; localStorage.setItem('inkstrike', JSON.stringify(G.set)); layoutApply(); };
  const bs = $('sBtn'), bl = $('sBtnV'); bs.value = G.set.btnScale || 1; bl.textContent = bs.value; bs.oninput = () => { G.set.btnScale = +bs.value; bl.textContent = bs.value; localStorage.setItem('inkstrike', JSON.stringify(G.set)); layoutApply(); };
  const rot = () => { touchReset(); layoutApply(); $('rotate').classList.toggle('on', innerHeight > innerWidth * 1.05); }; addEventListener('resize', rot); rot();
  const suspend = () => { touchReset(); if (G.state !== 'menu' && G.state !== 'matchEnd') setPause(true); }; addEventListener('blur', suspend); document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
}
function touchStartMatch() { const el = document.documentElement; try { const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { })).catch(() => { }); } catch (e) { } }

/* per-frame: aim friction probe + auto-fire */
function updateTouch(dt) {
  const pl = G.player; if (!pl || G.paused || G.buyOpen || G.mapOpen || TOUCH.edit) { touchReset(); return; } if (!pl.alive) { if (TOUCH.wasAlive !== false) touchReset(); TOUCH.wasAlive = false; return; } TOUCH.wasAlive = true;
  TOUCH.aimCheck -= dt;
  if (TOUCH.aimCheck <= 0) { TOUCH.aimCheck = .05; const py = pl.pitch + pl.recP, yw = pl.yaw + pl.recY, cp = Math.cos(py), dx = -Math.sin(yw) * cp || 1e-9, dy = Math.sin(py) || 1e-9, dz = -Math.cos(yw) * cp || 1e-9, ey = pl.pos.y + eyeY(pl); let bt = 1e9;
    for (const e of G.ents) if (e.alive && e.team !== pl.team) { const r = rayEnt(pl.pos.x, ey, pl.pos.z, dx, dy, dz, e); if (r && r.t < bt) bt = r.t; }
    const w = bt < 1e9 ? rayWorld(pl.pos.x, ey, pl.pos.z, dx, dy, dz, bt) : null; TOUCH.aimOn = bt < 1e9 && !w && !(G.flashT > .15) && !smokeBlocks(pl.pos.x, ey, pl.pos.z, pl.pos.x + dx * bt, ey + dy * bt, pl.pos.z + dz * bt); }
  TOUCH.aimT = TOUCH.aimOn ? TOUCH.aimT + dt : 0;
  const w = WEAPONS[pl.cur], manual = touchHeld('fire'), wasAuto = TOUCH.auto;
  TOUCH.auto = !!(G.set.autoFire && !manual && !w.nade && !w.melee && TOUCH.aimT > (w.scope ? .25 : .1) && (!w.scope || pl.scoped > 0) && G.state === 'live');
  if (TOUCH.auto) { G.fire = true; if (G.now >= pl.nextFire) G.fireEdge = true; } else if (wasAuto && !manual) G.fire = G.fireEdge = false;
  $('tFire').classList.toggle('lock', TOUCH.aimOn); $('tUse').style.display = (canPlant(pl) || canDefuse(pl)) ? 'flex' : 'none';
}

/* ---------------- movable button layout ---------------- */
function layoutPlace(b, x, y) { const sc = G.set.btnScale || 1, st = getComputedStyle(b), w = b.offsetWidth || parseFloat(st.width) || 62, h = b.offsetHeight || parseFloat(st.height) || 62, mx = (sc - 1) * w / 2, my = (sc - 1) * h / 2, xmin = Math.max(0, (8 + mx) / innerWidth), ymin = Math.max(0, (8 + my) / innerHeight); x = clamp(x, xmin, Math.max(xmin, 1 - (8 + w + mx) / innerWidth)); y = clamp(y, ymin, Math.max(ymin, 1 - (8 + h + my) / innerHeight)); b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%'; b.style.right = b.style.bottom = 'auto'; return [x, y]; }
function layoutApply() {
  const L = G.set.layout || {}, sc = G.set.btnScale || 1;
  document.querySelectorAll('#touch .tb[id]').forEach(b => { const p = L[b.id]; b.style.transform = `scale(${sc})`; if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) layoutPlace(b, p[0], p[1]); else { b.style.left = b.style.top = b.style.right = b.style.bottom = ''; const r = b.getBoundingClientRect(); if (r.width && (r.left < 8 || r.top < 8 || r.right > innerWidth - 8 || r.bottom > innerHeight - 8)) layoutPlace(b, (r.left + (r.width - b.offsetWidth) / 2) / innerWidth, (r.top + (r.height - b.offsetHeight) / 2) / innerHeight); } });
}
function layoutEdit(on) {
  touchReset(); TOUCH.edit = on; document.body.classList.toggle('layoutEdit', on); $('layoutBar').classList.toggle('on', on);
  if (on) { setPause(false); G.paused = true; $('pause').classList.remove('on'); $('hud').classList.add('on'); }
  else { $('pause').classList.add('on'); } layoutApply();
}
(() => {
  let drag = null;
  document.addEventListener('touchstart', e => { if (!TOUCH.edit || drag) return; const b = e.target.closest && e.target.closest('#touch .tb[id]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const r = b.getBoundingClientRect(), t = e.changedTouches[0]; drag = { b, id: t.identifier, dx: t.clientX - (r.left + r.width / 2), dy: t.clientY - (r.top + r.height / 2) }; }, { capture: true, passive: false });
  document.addEventListener('touchmove', e => { if (!drag || !TOUCH.edit) { drag = null; return; } e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) if (t.identifier === drag.id) { const x = (t.clientX - drag.dx - drag.b.offsetWidth / 2) / innerWidth, y = (t.clientY - drag.dy - drag.b.offsetHeight / 2) / innerHeight; (G.set.layout = G.set.layout || {})[drag.b.id] = layoutPlace(drag.b, x, y); } }, { capture: true, passive: false });
  const end = e => { if (!drag || ![...e.changedTouches].some(t => t.identifier === drag.id)) return; e.preventDefault(); e.stopPropagation(); drag = null; localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  document.addEventListener('touchend', end, { capture: true, passive: false }); document.addEventListener('touchcancel', end, { capture: true, passive: false });
})();
