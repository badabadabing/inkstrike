#!/usr/bin/env node
/* Independent fixed-camera review. node tools/visual-review.js --root=/path/to/snapshot --out=outputs/revision-03/baseline
   Each shot gets a new page, seeded RNG, disabled RAF, 90 exact settle frames, and identical viewport/DPR. */
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const arg = name => process.argv.find(v => v.startsWith('--' + name + '='))?.split('=').slice(1).join('='), ROOT = path.resolve(arg('root') || path.join(__dirname, '..')), OUT = path.resolve(arg('out') || path.join(__dirname, '../outputs/revision-03/candidate'));
function loadPW() { for (const p of [process.env.PLAYWRIGHT, 'playwright', 'playwright-core', '/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'].filter(Boolean)) { try { return require(p); } catch (_) {} } throw Error('Set PLAYWRIGHT to an installed playwright-core package'); }
const shots = [
  { name: 'menu', menu: true },
  { name: 'site-a', pos: [45, 1, -25], aim: [54, 10, -32] },
  { name: 'site-b', pos: [-48, 0, -18], aim: [-30, 6, -29] },
  { name: 'mid', pos: [0, 0, -8], aim: [0, 3, -26] },
  { name: 'rifle', weapon: 'ak' }, { name: 'pistol', weapon: 'p9' },
  { name: 'reload', weapon: 'ak', reload: .48 }, { name: 'scope', weapon: 'awp', scope: 1 },
  { name: 'actors-near', actorDistance: 4 }, { name: 'actors-mid', actorDistance: 15 }, { name: 'actors-far', actorDistance: 32 },
  { name: 'actors-crouch', actorDistance: 4, crouch: true }, { name: 'actors-jump', actorDistance: 4, jump: true },
  { name: 'mobile-menu', menu: true, mobile: true }, { name: 'mobile-game', mobile: true, weapon: 'ak' },
  { name: 'mobile-map-range', mobile: true, map: true }, { name: 'mobile-map-comp', mobile: true, map: true, mode: 'comp' },
  { name: 'training-active', train: true }, { name: 'mobile-training-active', mobile: true, train: true }
].filter(s => !arg('shots') || arg('shots').split(',').includes(s.name));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.setHeader('Content-Type', mime[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
const sourceHashes = () => Object.fromEntries(['index.html', ...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).sort().map(f => 'js/' + f)].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex')]));
let browser; const results = [], errors = [], sourceBefore = sourceHashes();
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  browser = await loadPW().chromium.launch({ headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: shot.mobile ? { width: 844, height: 390 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: !!shot.mobile, hasTouch: !!shot.mobile });
    page.on('pageerror', e => errors.push(shot.name + ': ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/pointer lock|Pointer Lock/i.test(m.text())) errors.push(shot.name + ': ' + m.text()); });
    await page.addInitScript(() => { let s = 20260927; Math.random = () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; window.requestAnimationFrame = () => 0; Element.prototype.requestFullscreen = () => Promise.reject(); });
    await page.goto(`http://127.0.0.1:${server.address().port}/?auto${shot.mobile ? '&touch' : ''}`); await page.waitForFunction(() => document.getElementById('menu').classList.contains('on'), null, { timeout: 60000 }); await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(shot => {
      G.now = 0; G.manualStep = true; G.set.motion = 0; G.set.quality = 'balanced'; G.set.fov = 84; applyQuality();
      if (shot.menu) { frame(0); return { state: 'menu', camera: camera.position.toArray(), fov: camera.fov }; }
      G.mode = shot.mode || 'range'; startMatch(); G.set.autoFire = false; G.set.aimAssist = false; const pl = G.player;
      for (let i = 0; i < 90; i++) frame(1 / 60); G.paused = true; clearTimeout(G._bt); $('banner').className = ''; $('report').classList.remove('on');
      for (const b of G.bots) b.model.root.visible = false; if (typeof ACTOR_SHADOW !== 'undefined' && ACTOR_SHADOW) { ACTOR_SHADOW.alpha.array.fill(0); ACTOR_SHADOW.alpha.needsUpdate = true; }
      if (shot.weapon) { giveWeapon(pl, shot.weapon); switchTo(shot.weapon); }
      if (shot.pos) { pl.pos.fromArray(shot.pos); pl.yaw = Math.atan2(-(shot.aim[0] - shot.pos[0]), -(shot.aim[2] - shot.pos[2])); pl.pitch = Math.atan2(shot.aim[1] - (shot.pos[1] + eyeY(pl)), Math.hypot(shot.aim[0] - shot.pos[0], shot.aim[2] - shot.pos[2])); }
      if (shot.actorDistance) { pl.pos.set(-25, 0, 45); pl.yaw = -Math.PI / 2; pl.pitch = -.07; const old = G.bots; G.bots = []; G.ents = [pl]; for (const [i, team] of ['red', 'blue'].entries()) { const b = makeBot(team, team === 'red' ? '红方轮廓' : '蓝方轮廓', scene); b.alive = true; b.pos.set(-25 + shot.actorDistance, shot.jump ? 1 : 0, 45 + (i ? 1 : -1) * (shot.actorDistance < 10 ? 1 : 2)); b.onGround = !shot.jump; b.yaw = Math.PI / 2; b.crouchAmt = shot.crouch ? 1 : 0; b.model.root.visible = true; b.model.mark.visible = team === pl.team; setEntWeapon(b, team === 'red' ? 'ak' : 'm4'); animSoldier(b, 0); G.bots.push(b); G.ents.push(b); } old.forEach(b => b.model.root.visible = false); }
      pl.vel.set(0, 0, 0); pl.recP = pl.recY = pl.recTP = pl.recTY = pl.punch = pl.roll = pl.stepSmooth = 0; pl.scoped = shot.scope || 0; VM.drawT = 1; VM.reloadT = shot.reload ?? -1; VM.kick = VM.kickR = VM.dip = VM.swX = VM.swY = 0; VM.insp = VM.cyc = VM.atk = 1; updateCamera(1); VM.update(0, pl, WEAPONS[pl.cur], 0, 0); if (shot.actorDistance) VM.root.visible = false; if (shot.train && typeof TRAIN !== 'undefined') TRAIN.reset(true); camera.updateMatrixWorld(); _hudT = 0; updateHUD(0); if (shot.map) { G.paused = false; toggleMap(true); G.paused = true; } frame(0);
      return { camera: camera.position.toArray(), rotation: camera.rotation.toArray(), fov: camera.fov, weapon: pl.cur, scoped: pl.scoped, state: JSON.parse(render_game_to_text()), buffer: renderer.getDrawingBufferSize(new THREE.Vector2()).toArray(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    }, shot);
    await page.screenshot({ path: path.join(OUT, shot.name + '.png'), animations: 'disabled' }); results.push({ ...shot, seed: 20260927, settleFrames: 90, viewport: page.viewportSize(), dpr: 1, ...state }); await page.close(); console.log('CAPTURE ' + shot.name);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ root: ROOT, quality: 'balanced', sourceBefore, sourceAfter: sourceHashes(), errors, shots: results }, null, 2)); console.log(JSON.stringify({ output: OUT, shots: results.length, errors })); if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
