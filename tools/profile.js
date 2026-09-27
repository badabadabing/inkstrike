#!/usr/bin/env node
/* Local real-RAF profile. Start python3 -m http.server 8765 first. PROFILE_FRAMES defaults to 360. */
const fs = require('fs'), path = require('path');
let pw; for (const p of [process.env.PLAYWRIGHT, 'playwright', 'playwright-core', '/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'].filter(Boolean)) { try { pw = require(p); break; } catch (e) { } }
if (!pw) throw Error('Set PLAYWRIGHT to an installed Playwright package.');
(async () => {
  const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  try {
    const results = [], frames = Number(process.env.PROFILE_FRAMES || 360);
    for (let run = 0; run < 3; run++) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.URL || 'http://localhost:8765/?auto'); await page.waitForFunction(() => document.getElementById('menu').classList.contains('on'));
      await page.evaluate(() => { G.set.battleSize = '12'; G.mode = 'dm'; startMatch(); giveWeapon(G.player, 'ak'); switchTo('ak'); G.player.hp = 100000; G.player.pos.set(0, 0, -18); G.player.yaw = Math.PI; });
      const result = await page.evaluate(frames => new Promise(resolve => {
        let n = 0, last = 0, maxCalls = 0, maxTriangles = 0, startPrograms = 0; const times = [], costs = [], old = window.frame;
        window.frame = dt => { const stamp = performance.now(); G.fire = true; G.keys.KeyA = n % 120 < 60; G.keys.KeyD = n % 120 >= 60; G.player.yaw = Math.PI + Math.sin(n * .012) * .25; renderer.info.autoReset = false; renderer.info.reset(); old(dt); const cost = performance.now() - stamp; n++;
          if (n === 120) startPrograms = renderer.info.programs.length;
          if (n > 120) { times.push(stamp - last); costs.push(cost); maxCalls = Math.max(maxCalls, renderer.info.render.calls); maxTriangles = Math.max(maxTriangles, renderer.info.render.triangles); }
          last = stamp;
          if (n >= frames + 120) { window.frame = old; const stats = a => { a.sort((a, b) => a - b); return { p50: +a[Math.floor(a.length * .5)].toFixed(2), p95: +a[Math.floor(a.length * .95)].toFixed(2), p99: +a[Math.floor(a.length * .99)].toFixed(2), max: +a[a.length - 1].toFixed(2) }; }; const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); resolve({ teamSize: G.teamSize, bots: G.bots.length, frames: times.length, frameMs: stats(times), cpuMs: stats(costs), maxCalls, maxTriangles, programGrowth: renderer.info.programs.length - startPrograms, score: G.score, quality: G.set.quality, pixelRatio: renderer.getPixelRatio(), gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) }); }
        };
      }), frames);
      result.errors = errors; results.push(result); console.log(JSON.stringify({ run: run + 1, ...result })); await page.close();
    }
    const output = process.env.PROFILE_OUT || 'outputs/revision-02/performance.json'; fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify({ viewport: [1440, 900], requestedDPR: 2, conditions: 'Headless Chromium, Metal, balanced, 12v12 DM, moving/shooting invulnerable player; 120 warmup frames, three independent pages. CPU means JS submission time, frame intervals include rendering. Local machine only.', runs: results }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
