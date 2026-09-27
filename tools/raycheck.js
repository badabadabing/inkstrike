#!/usr/bin/env node
/* Fixed ray equivalence + timing: buckets against the original linear slab query. No network assets. */
const path = require('path'), http = require('http'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
function loadPW() { for (const p of [process.env.PLAYWRIGHT, 'playwright', 'playwright-core', '/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'].filter(Boolean)) { try { return require(p); } catch (e) {} } throw Error('playwright not found; set PLAYWRIGHT=/path/to/playwright-core'); }
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
(async () => {
  let browser; try {
    await new Promise(ok => server.listen(0, ok)); browser = await loadPW().chromium.launch({ headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto(`http://localhost:${server.address().port}/?auto`); await page.waitForFunction(() => document.getElementById('menu').classList.contains('on'), null, { timeout: 60000 });
    const result = await page.evaluate(() => {
      const refHit = {}, solids = MAP.solids;
      function reference(ox, oy, oz, dx, dy, dz, maxT) {
        let best = maxT, bs = null, bn = 0, btx = 0; const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
        for (let i = 0; i < solids.length; i++) { const s = solids[i]; let t1 = (s.x1 - ox) * ix, t2 = (s.x2 - ox) * ix, tn, tf, ax = 0; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = t1; tf = t2;
          t1 = (s.y1 - oy) * iy; t2 = (s.y2 - oy) * iy; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 1; } if (t2 < tf) tf = t2; if (tn > tf) continue;
          t1 = (s.z1 - oz) * iz; t2 = (s.z2 - oz) * iz; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 2; } if (t2 < tf) tf = t2;
          if (tn > tf || tn < 0 || tn >= best) continue; best = tn; bs = s; bn = ax; btx = tf; }
        if (dy < 0) { const t = -oy / dy; if (t < best) return Object.assign(refHit, { t, tx: t + 99, nx: 0, ny: 1, nz: 0, s: null }); }
        if (!bs) return null; return Object.assign(refHit, { t: best, tx: btx, nx: bn === 0 ? -Math.sign(dx) : 0, ny: bn === 1 ? -Math.sign(dy) : 0, nz: bn === 2 ? -Math.sign(dz) : 0, s: bs });
      }
      let seed = 9762026; const R = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }, rr = (a, b) => a + R() * (b - a), cells = [];
      for (let c = 0; c < MAP.reach.length; c++) if (MAP.reach[c]) cells.push(c);
      const rays = [], game = [], add = (ox, oy, oz, tx, ty, tz, limit) => { const d = Math.hypot(tx, ty, tz); if (d > 0) rays.push([ox, oy, oz, tx / d, ty / d, tz / d, limit]); };
      for (let i = 0; i < 8000; i++) { const a = navPos(cells[(R() * cells.length) | 0]), b = navPos(cells[(R() * cells.length) | 0]), dy = b.y + rr(.8, 1.75) - a.y - 1.6, d = Math.hypot(b.x - a.x, dy, b.z - a.z); add(a.x, a.y + 1.6, a.z, b.x - a.x, dy, b.z - a.z, i % 3 ? Math.max(.01, d - .05) : 260); game.push(rays[rays.length - 1]); }
      for (let i = 0; i < 4000; i++) add(rr(-200, 200), rr(.01, 90), rr(-200, 200), rr(-1, 1), rr(-1, 1), rr(-1, 1), rr(.02, 600));
      for (const s of solids) { const x = (s.x1 + s.x2) / 2, y = (s.y1 + s.y2) / 2, z = (s.z1 + s.z2) / 2; for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1e-9, 1, 1e-9], [1e-9, -1, 1e-9]]) add(x - d[0] * 30, y - d[1] * 30, z - d[2] * 30, ...d, 100); }
      for (const x of [-72, -64, -8, 0, 8, 64, 72]) for (const z of [-64, -56, -8, 0, 8, 56, 64]) for (const d of [[1, -.02, 1], [-1, .02, -1], [1e-9, -1, 1e-9], [0, -1, 0]]) add(x, 40, z, ...d, 500);
      const baseCount = rays.length;
      for (let i = 0; i < baseCount; i += 7) { const ray = rays[i], h = reference(...ray); if (!h || !Number.isFinite(h.t)) continue; rays.push([...ray.slice(0, 6), h.t]); if (h.s && Number.isFinite(h.tx)) { const t = h.tx + .02; rays.push([ray[0] + ray[3] * t, ray[1] + ray[4] * t, ray[2] + ray[5] * t, ...ray.slice(3)]); } }
      const same = (a, b) => a === b || (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) < 1e-8;
      const mismatch = [];
      for (let i = 0; i < rays.length; i++) { const a = reference(...rays[i]), b = rayWorld(...rays[i]); if (!!a !== !!b || (a && (a.s !== b.s || !['t', 'tx', 'nx', 'ny', 'nz'].every(k => same(a[k], b[k]))))) { mismatch.push({ i, ray: rays[i], expected: a ? { ...a, s: solids.indexOf(a.s) } : null, actual: b ? { ...b, s: solids.indexOf(b.s) } : null }); if (mismatch.length >= 5) break; } }
      let sink = 0; const time = (fn, list, count) => { const t = performance.now(); for (let r = 0; r < count; r++) for (const ray of list) { const h = fn(...ray); if (h) sink += h.t || 0; } return performance.now() - t; };
      time(rayWorldLinear, game, 2); time(rayWorld, game, 2); const samples = [];
      for (let i = 0; i < 3; i++) { let linearMs, bucketsMs; if (i % 2) { bucketsMs = time(rayWorld, game, 20); linearMs = time(rayWorldLinear, game, 20); } else { linearMs = time(rayWorldLinear, game, 20); bucketsMs = time(rayWorld, game, 20); } samples.push({ linearMs, bucketsMs, speedup: linearMs / bucketsMs }); }
      return { rays: rays.length, gameplayRaysPerSample: game.length * 20, mismatches: mismatch, samples, sinkFinite: Number.isFinite(sink) };
    });
    console.log(JSON.stringify({ ...result, errors }, null, 2)); if (result.mismatches.length || errors.length) throw Error('RAYCHECK FAIL'); console.log('RAYCHECK OK');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
