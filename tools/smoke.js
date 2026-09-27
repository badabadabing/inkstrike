#!/usr/bin/env node
/* Headless smoke test: boots the game, fast-forwards comp / dm / range, checks round flow + console errors.
   Usage:  node tools/smoke.js            (starts its own static server on a free port)
   Needs playwright (or playwright-core with a Chromium). Set PLAYWRIGHT=/path/to/playwright-core if it is not resolvable. */
const path = require('path'), http = require('http'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
function loadPW() { for (const p of [process.env.PLAYWRIGHT, 'playwright', 'playwright-core', '/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'].filter(Boolean)) { try { return require(p); } catch (e) { } } console.error('playwright not found: npm i -D playwright && npx playwright install chromium   (or set PLAYWRIGHT=...)'); process.exit(2); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(ok => server.listen(0, ok)); const url = `http://localhost:${server.address().port}/?auto`;
  const { chromium } = loadPW(), browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/pointer lock|Pointer Lock/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url); await page.waitForFunction(() => document.getElementById('menu').classList.contains('on'), null, { timeout: 60000 });
  const res = await page.evaluate(() => {
    const out = {}, ends = [], _er = window.endRound; window.endRound = (w, r) => { if (G.state === 'live') ends.push(`R${G.round} ${w} | ${r || ''}`); return _er(w, r); };
    const run = (n, ms) => { const t0 = performance.now(); for (let i = 0; i < n && G.state !== 'matchEnd' && performance.now() - t0 < ms; i++) frame(1 / 30); };
    G.mode = 'comp'; G.diff = 1; G.team = 'blue'; startMatch(); run(12000, 25000); out.comp = { rounds: G.round, score: { ...G.score }, ends: ends.slice() };
    G.mode = 'dm'; startMatch(); run(1800, 8000); out.dm = { score: { ...G.score } };
    G.mode = 'range'; startMatch(); run(300, 3000); out.range = { dummies: G.bots.length, weapon: G.player.cur };
    const r = []; for (const p of MAP.points) if (!MAP.reach[navIdx(p.x, p.z)]) r.push(p.n); out.unreachable = r;
    return out;
  });
  await browser.close(); server.close();
  const fails = [];
  if (errors.length) fails.push('console/page errors:\n  ' + [...new Set(errors)].slice(0, 10).join('\n  '));
  if (res.comp.ends.length < 2) fails.push('competitive: fewer than 2 rounds resolved');
  if (res.dm.score.red + res.dm.score.blue < 3) fails.push('deathmatch: almost no kills');
  if (res.range.dummies !== 5) fails.push('range: dummies missing');
  if (res.unreachable.some(n => n !== 'PIT')) fails.push('nav: unreachable points ' + res.unreachable);
  console.log(JSON.stringify(res, null, 2));
  if (fails.length) { console.error('\nSMOKE FAIL\n- ' + fails.join('\n- ')); process.exit(1); } console.log('\nSMOKE OK');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
