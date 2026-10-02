#!/usr/bin/env node
'use strict';
// Export the current working tree; the website and its saved data remain independent.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const crypto = require('crypto');
const REPO = path.resolve(__dirname, '..'); let OUT = path.join(REPO, 'outputs/inkstrike-xhs-v1.0.5'), ROOT = REPO, snapshot = null, version = '1.0.5';
const { compatCSS } = require('./xhs-css-build');
const { eventBindings } = require('./xhs-event-build');
const helpers = ['xhs-errors.js', 'xhs-viewport.js', 'xhs-storage.js', 'xhs-input.js', 'xhs-performance.js', 'xhs-quality.js', 'xhs-runtime.js'];
const target = ['es2017', 'chrome61'];
function bundler() { for (const name of [process.env.ESBUILD, 'esbuild', '/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/vercel/node_modules/esbuild'].filter(Boolean)) { try { return require(name); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } } throw Error('Use an installed esbuild via ESBUILD; no runtime dependency is needed.'); }
function replace(s, from, to) { if (s.split(from).length !== 2) throw Error('Expected one source anchor: ' + from.slice(0, 100)); return s.replace(from, () => to); }
function replacePattern(s, pattern, to) { if ([...s.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))].length !== 1) throw Error('Expected one source pattern: ' + pattern); return s.replace(pattern, () => to); }
async function main() {
  const outIndex = process.argv.indexOf('--out'), verIndex = process.argv.indexOf('--version'); if (outIndex >= 0) OUT = path.resolve(REPO, process.argv[outIndex + 1]); if (verIndex >= 0) version = process.argv[verIndex + 1]; if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid version');
  const refIndex = process.argv.indexOf('--source-ref'), ref = refIndex < 0 ? null : process.argv[refIndex + 1]; if (refIndex >= 0 && !ref) throw Error('--source-ref needs a Git commit');
  if (ref) { snapshot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkstrike-xhs-source-')); const archive = execFileSync('git', ['archive', ref, 'index.html', 'js', 'vendor'], { cwd: REPO, maxBuffer: 20 * 1024 * 1024 }); execFileSync('tar', ['-xf', '-', '-C', snapshot], { input: archive }); ROOT = snapshot; }
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = JSON.parse(html.match(/const files = (\[[^;]+\]);/)[1].replace(/'/g, '"'));
  const sources = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8')]));
  let game = sources.game;
  game = replace(game, "noLock: location.search.includes('auto')", 'noLock: true');
  game = replacePattern(game, /^  document\.addEventListener\('pointerlockchange'.*\n/m, '');
  game = replace(game, '(G.noLock || document.pointerLockElement === renderer.domElement)', 'G.noLock');
  const lockStart = game.indexOf('function lock('), lockEnd = game.indexOf('function clearInput()', lockStart);
  if (lockStart < 0 || lockEnd < 0) throw Error('Missing input anchors');
  game = game.slice(0, lockStart) + 'function lock() { G.noLock = true; }\n' + game.slice(lockEnd);
  game = replace(game, "function unlockUI() { if (document.pointerLockElement) { G.uiUnlock = true; document.exitPointerLock(); setTimeout(() => G.uiUnlock = false, 100); } clearInput(); }", 'function unlockUI() { clearInput(); }');
  game = replace(game, 'if (document.exitPointerLock) document.exitPointerLock();', 'clearInput();');
  game = replace(game, "if (TOUCH.on || !locked() || !pl || !pl.alive || G.keys.KeyH", "if (TOUCH.on || !e.buttons || e.target !== renderer.domElement || !locked() || !pl || !pl.alive || G.keys.KeyH");
  game = replace(game, "if (e.target.closest && e.target.closest('button,input,select,.ov')) return;", "if (TOUCH.on || (e.target.closest && e.target.closest('button,input,select,.ov'))) return;");
  game = replace(game, 'buildMap(scene, G.set.map); FX.init(scene);', "if (matchMedia('(prefers-reduced-motion: reduce)').matches) G.set.motion = 0; buildMap(scene, G.set.map); FX.init(scene);");
  game = replacePattern(game, /if \(\(\('ontouchstart' in window[^\n]+initTouch\(\);/, 'initTouch(); xhsPerformanceBoot();');
  game = replacePattern(game, /^  let last = performance\.now\(\); const loop = .*$/m, '  xhsLoopStart();');
  game = replacePattern(game, /^function applyQuality\(\).*$/m, "function applyQuality() { xhsPerformanceSetQuality(G.set.quality); if (camera && VM.cam) onResize(); }");
  game = replace(game, 'renderer.setSize(w, h);', 'xhsPerformanceResize(w, h);');
  game = replace(game, 'function startMatch() {', 'function startMatch() { xhsPrepareMatch();');
  game = replace(game, "if (G.set.battleSize !== 'auto') return;", "if (G.set.battleSize !== 'auto' || G.set.quality === 'low') return;");
  game = replace(game, "'手动固定人数 · 若帧率下降可选择自动'", "'流畅档支持 5v5 · 8v8 / 12v12 使用均衡档'");
  game = game.replaceAll('Math.min(devicePixelRatio, 2)', 'Math.min(devicePixelRatio, 1.5)');
  game = replace(game, "renderer.outputColorSpace = THREE.LinearSRGBColorSpace;", "renderer.outputColorSpace = THREE.LinearSRGBColorSpace; if (renderer.capabilities.maxTextureSize < 1024 || !renderer.capabilities.isWebGL2 && !renderer.extensions.has('ANGLE_instanced_arrays')) throw Error('当前设备缺少游戏所需的图形能力。请在其他设备打开。'); window.xhsHasDerivatives = renderer.capabilities.isWebGL2 || renderer.extensions.has('OES_standard_derivatives'); renderer.debug.onShaderError = () => { throw Error('当前设备无法绘制游戏画面，请重新打开后再试。'); };");
  game = game.replaceAll('renderer.clear(); renderer.render(scene, camera);', 'xhsPerformancePrepare(scene, VM.scene); renderer.info.reset(); renderer.clear(); renderer.render(scene, camera);');
  sources.core = replace(sources.core, 'return new THREE.ShaderMaterial({', 'return new THREE.ShaderMaterial({ extensions: { derivatives: !!window.xhsHasDerivatives }, defines: { XHS_DERIVATIVES: window.xhsHasDerivatives ? 1 : 0 },');
  sources.core = replace(sources.core, 'float w=fwidth(v)*2.0;', 'float w=1.0;\n#if XHS_DERIVATIVES\n        w=fwidth(v)*2.0;\n#endif\n');
  sources.objective = replace(sources.objective, '{ ws: 7, hs: 5,', '{ ws: 5, hs: 4,');
  game = replace(game, "if (G.mode === 'comp' && pl.money < price) return SFX.deny();", "if (G.mode === 'comp' && pl.money < price) { xhsNotice('资金不足，还差 $' + (price - pl.money) + '。'); return SFX.deny(); }");
  game = replace(game, "if (armor ? pl.armor >= 100 && pl.helmet : (WEAPONS[k].nade ? pl.nades[k] > 0 : pl.inv[WEAPONS[k].slot] === k)) return SFX.deny();", "if (armor ? pl.armor >= 100 && pl.helmet : (WEAPONS[k].nade ? pl.nades[k] > 0 : pl.inv[WEAPONS[k].slot] === k)) { xhsNotice('已拥有这件装备。'); return SFX.deny(); }");
  game = replace(game, "if (!b.cost || G.mode === 'comp' && b.cost > pl.money) return SFX.deny();", "if (!b.cost || G.mode === 'comp' && b.cost > pl.money) { xhsNotice(!b.cost ? '当前配置已齐备，无需补购。' : '资金不足，暂时不能补齐配置。'); return SFX.deny(); }");
  sources.progress = replace(sources.progress, "this.data.skin[k] = (this.skin(k) + 1) % (t + 1); this.save(); this.drawArmory(); SFX.init(); SFX.ui();", "const selected = e.target.closest('.sk span'), i = selected ? Array.from(selected.parentNode.children).indexOf(selected) : -1; if (i > t) { xhsNotice('「' + SKINS[i].n + '」需该武器累计 ' + SKINS[i].need + ' 次击倒解锁，靶场不计入。'); return; } this.data.skin[k] = i >= 0 ? i : (this.skin(k) + 1) % (t + 1); this.save(); this.drawArmory(); xhsNotice('已装备「' + SKINS[this.skin(k)].n + '」笔触。'); SFX.init(); SFX.ui();");
  game = replacePattern(game, /\$\('sMap'\)\.onchange = \(\) => \{[^\n]*?location\.href = url\.href; \};/, "$('sMap').onchange = () => xhsChangeMap($('sMap').value);");
  sources.game = game;
  sources.touch = replacePattern(sources.touch, /^function touchStartMatch\(\).*$/m, 'function touchStartMatch() { touchReset(); }');
  sources.touch = replace(sources.touch, "$('rotate').classList.toggle('on', portrait);", "$('rotate').classList.remove('on');");
  sources.touch = replace(sources.touch, "$('board').onclick = () => $('board').classList.remove('on');", "$('boardClose').addEventListener('click', () => $('board').classList.remove('on'));");
  sources.touch = replace(sources.touch, 'mx = (sc - 1) * w / 2, my = (sc - 1) * h / 2, xmin = Math.max(0, (8 + mx) / innerWidth), ymin = Math.max(0, (8 + my) / innerHeight); x = clamp(x, xmin, Math.max(xmin, 1 - (8 + w + mx) / innerWidth)); y = clamp(y, ymin, Math.max(ymin, 1 - (8 + h + my) / innerHeight));', 'mx = (sc - 1) * w / 2, my = (sc - 1) * h / 2, safe = xhsInsets(), xmin = Math.max(0, (safe.left + 8 + mx) / innerWidth), ymin = Math.max(0, (safe.top + 8 + my) / innerHeight); x = clamp(x, xmin, Math.max(xmin, 1 - (safe.right + 8 + w + mx) / innerWidth)); y = clamp(y, ymin, Math.max(ymin, 1 - (safe.bottom + 8 + h + my) / innerHeight));');
  sources.touch = replace(sources.touch, 'if (r.width && (r.left < 8 || r.top < 8 || r.right > innerWidth - 8 || r.bottom > innerHeight - 8))', 'if (r.width)');
  sources.touch = sources.touch.replace(/(L|document)\.addEventListener\('(touchstart|touchmove|touchend|touchcancel)',/g, "xhsListen($1, '$2',");
  sources.touch = sources.touch.replace(/t\.client([XY])/g, (_, axis) => 'xhsPoint(t.clientX,t.clientY).' + axis.toLowerCase()).replaceAll('b.getBoundingClientRect()', 'xhsRect(b)').replaceAll('e.preventDefault();', 'if (e.cancelable) e.preventDefault();');
  sources.game = sources.game.replace(/e\.movement([XY])/g, (_, axis) => 'xhsDelta(e.movementX,e.movementY).' + axis.toLowerCase());
  for (const f of files) sources[f] = sources[f].replace(/(['"])inkstrike(_prog)?\1/g, (_, q, suffix) => q + 'inkstrike_xhs' + (suffix || '') + q).replace(/\binnerWidth\b/g, 'xhsView.width').replace(/\binnerHeight\b/g, 'xhsView.height');
  for (const f of files) { for (const key of ['inkstrike_xhs', 'inkstrike_xhs_prog']) sources[f] = sources[f].replaceAll("JSON.parse(localStorage.getItem('" + key + "') || '{}')", "xhsStorageRead('" + key + "', {})"); sources[f] = sources[f].replaceAll('localStorage.setItem(', 'xhsStorageWrite('); }
  const helperSources = Object.fromEntries(helpers.map(f => [f, fs.readFileSync(path.join(__dirname, f), 'utf8')]));
  const names = [...new Set(Object.values(sources).concat(Object.values(helperSources)).join('\n').match(/\bTHREE\.([A-Za-z_$][\w$]*)/g).map(n => n.slice(6)))].sort();
  fs.mkdirSync(path.join(OUT, 'js'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'vendor/fonts'), { recursive: true });
  const entry = `import { ${names.join(', ')} } from 'three';\n` + ['LineSegments2', 'LineSegmentsGeometry', 'LineMaterial'].map(n => `import { ${n} } from ${JSON.stringify(path.join(ROOT, 'vendor/addons/lines', n + '.js'))};`).join('\n') + `\nObject.assign(window, { THREE: { ${names.join(', ')} }, LineSegments2, LineSegmentsGeometry, LineMaterial });`;
  await bundler().build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'xhs-three-entry.js' }, alias: { three: path.join(ROOT, 'vendor/three.module.min.js') }, bundle: true, format: 'iife', target, minify: true, legalComments: 'none', outfile: path.join(OUT, 'vendor/three-local.js'), banner: { js: '/*\n' + fs.readFileSync(path.join(ROOT, 'vendor/THREE-LICENSE.txt'), 'utf8') + '\n*/' }, plugins: [{ name: 'offline-renderer', setup(build) { build.onLoad({ filter: /three\.module\.min\.js$/ }, args => { let lib = fs.readFileSync(args.path, 'utf8'); lib = replace(lib, 'document.createElementNS("http://www.w3.org/1999/xhtml",t)', 'document.createElement(t)').replaceAll('https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733.', 'the bundled three.js r160 lighting guide.'); lib = replacePattern(lib, /class ql extends Hn\{[\s\S]*?(?=function Yl\()/, 'class ql extends Hn{constructor(){super();this.enabled=false;this.isPresenting=false;this.cameraAutoUpdate=false;}getEnvironmentBlendMode(){return undefined;}setAnimationLoop(){}dispose(){}setSession(){throw Error("XR is unavailable in this offline build");}getCamera(){throw Error("XR is unavailable in this offline build");}updateCamera(){throw Error("XR is unavailable in this offline build");}}'); return { contents: lib, loader: 'js' }; }); } }] });
  for (const f of files) fs.writeFileSync(path.join(OUT, 'js', f + '.js'), (await bundler().transform(eventBindings(sources[f]), { target, loader: 'js', legalComments: 'none' })).code);
  fs.cpSync(path.join(ROOT, 'vendor/fonts'), path.join(OUT, 'vendor/fonts'), { recursive: true });
  const js = ['xhs-errors.js', 'xhs-viewport.js', 'xhs-storage.js', 'xhs-input.js', 'vendor/three-local.js', 'xhs-performance.js', 'xhs-quality.js', ...files.map(f => 'js/' + f + '.js'), 'xhs-runtime.js'];
  html = replacePattern(html, /<script type="importmap">[\s\S]*?<\/script>\s*<script type="module">[\s\S]*?<\/script>/, js.map(f => `<script src="./${f}" defer></script>`).join('\n'));
  html = replace(html, 'initial-scale=1,', 'initial-scale=1.0,');
  html = html.replace(/^\.grain\{.*$/m, '.grain{position:fixed;inset:0;pointer-events:none;opacity:.035;background-image:repeating-linear-gradient(33deg,transparent 0 3px,rgba(22,22,28,.12) 3px 4px)}');
  html = replace(html, '</head>', '<link rel="stylesheet" href="./xhs.css">\n<link rel="icon" href="./icon.png">\n</head>');
  html = replacePattern(html, /<div class="edition">[^<]*<\/div>/, '<div class="edition">INK BATTLEGROUNDS / 小工具 ' + version + '</div>');
  html = replace(html, '<div class="keys">', '<p id="xhsHint">离线 Bot 对战 · 游戏自动横向显示<br>手机：左侧移动 / 右侧滑动瞄准<br>电脑：WASD 移动 / 右侧拖动瞄准 / 点击开火<br>进度仅存本机，清理缓存可能丢失</p>\n    <div class="keys">');
  html = replace(html, '<div id="loading">', '<div id="xhsSafeProbe" aria-hidden="true"></div><div id="xhsError" role="alert" hidden></div><div id="xhsNotice" role="status" hidden></div>\n<div id="loading">');
  html = html.replace('<option value="high">精细 · 较高分辨率</option>', '');
  html = replace(html, '流畅 · 较低分辨率', '流畅 · 5v5 / 靶场');
  html = replace(html, '<div id="loading">', '<div id="xhsQualityPrompt" class="ov" hidden role="dialog" aria-modal="true" aria-labelledby="xhsQualityTitle"><div class="panel"><h3 id="xhsQualityTitle">切换到 5v5 流畅对局？</h3><p>流畅档支持 5v5。重新开局会重置本场比分，累计熟练度保留。8v8 和 12v12 可继续使用均衡档。</p><button id="xhsQualityRestart" type="button">5v5 重新开局</button><button id="xhsQualityKeep" type="button">保持当前人数</button></div></div>\n<div id="loading">');
  html = replace(html, '<div id="board" class="ov"><div id="boardIn" class="panel"></div></div>', '<div id="board" class="ov"><button id="boardClose" type="button">关闭战绩</button><div id="boardIn" class="panel"></div></div>');
  html = html.replace(/<style>([\s\S]*?)<\/style>/, (_, css) => '<style>' + compatCSS(css) + '</style>');
  html = replace(html, '<body>', '<body><div id="xhsFrame"><div id="xhsApp">'); html = replace(html, '</body>', '</div></div></body>');
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  fs.writeFileSync(path.join(OUT, 'xhs.css'), compatCSS(fs.readFileSync(path.join(__dirname, 'xhs.css'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'xhs-feedback.css'), 'utf8')) + '\n' + fs.readFileSync(path.join(__dirname, 'xhs-safe.css'), 'utf8'));
  for (const name of helpers) fs.writeFileSync(path.join(OUT, name), (await bundler().transform(helperSources[name], { target, loader: 'js', legalComments: 'none' })).code);
  fs.copyFileSync(path.join(__dirname, 'xhs-icon.png'), path.join(OUT, 'icon.png'));
  fs.writeFileSync(OUT + '-source.json', JSON.stringify({ version, target, source: ref ? execFileSync('git', ['rev-parse', ref], { cwd: REPO, encoding: 'utf8' }).trim() : 'working-tree', builtAt: new Date().toISOString(), modules: files, sourceFiles: Object.fromEntries(['index.html', ...files.map(f => 'js/' + f + '.js'), ...helpers.map(f => 'tools/' + f), 'tools/build-xhs.js', 'tools/xhs-css-build.js', 'tools/xhs-event-build.js', 'tools/xhs.css', 'tools/xhs-feedback.css', 'tools/xhs-safe.css'].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.startsWith('tools/') ? REPO : ROOT, f))).digest('hex')])) }, null, 2));
  console.log('XHS build: ' + OUT + '\nSource modules: ' + files.join(', ') + '\nTHREE exports: ' + names.length);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { if (snapshot) fs.rmSync(snapshot, { recursive: true, force: true }); });
