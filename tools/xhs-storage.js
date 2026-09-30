'use strict';
/* Small-tool storage only. Keep the website's inkstrike / inkstrike_prog records untouched. */
(function (win) {
  const keys = ['inkstrike_xhs', 'inkstrike_xhs_prog'], cache = Object.create(null), revisions = Object.create(null), pending = Object.create(null), failed = Object.create(null), shown = Object.create(null);
  const recovery = [], notices = [], state = { ready: false, mode: 'pending', migrated: [] }; let initPromise = null, native = null;
  win.xhsStorageRecovery = recovery; win.xhsStorageNotices = notices; win.xhsStorageState = state;
  function notice(text) { if (shown[text]) return; shown[text] = true; if (win.console && win.console.warn) win.console.warn('[小工具存储] ' + text); if (typeof win.xhsNotice === 'function') { try { win.xhsNotice(text); return; } catch (error) { if (win.console && win.console.warn) win.console.warn('[小工具存储] 提示显示失败'); } } notices.push(text); }
  win.xhsStorageNotice = notice;
  function supported(key) { return keys.indexOf(key) !== -1; }
  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function safeKey(key) { return key !== '__proto__' && key !== 'constructor' && key !== 'prototype'; }
  function stash(key, raw, reason) { if (!recovery.some(item => item.key === key && item.raw === raw)) recovery.push({ key: key, raw: raw, reason: reason }); notice((key === keys[0] ? '部分设置' : '部分熟练度记录') + '格式异常，已隔离异常内容并恢复可用数据；原始内容保留在本次会话中。'); }
  function clean(key, raw) {
    let value; try { if (typeof raw !== 'string') throw new Error('not a JSON string'); value = JSON.parse(raw); if (!record(value)) throw new Error('not a record'); } catch (error) { stash(key, raw, 'invalid JSON record'); return { value: {}, valid: false }; }
    const out = {}; let damaged = false;
    if (key === keys[1]) {
      for (const field of ['kills', 'skin']) { out[field] = {}; if (value[field] === undefined) continue; if (!record(value[field])) { damaged = true; continue; } for (const name of Object.keys(value[field])) { const n = value[field][name]; if (safeKey(name) && /^[a-z][a-z0-9_]{0,31}$/.test(name) && finite(n) && n >= 0 && n <= (field === 'skin' ? 3 : Number.MAX_SAFE_INTEGER) && Math.floor(n) === n) out[field][name] = n; else damaged = true; } }
      out.mvp = 0; if (value.mvp !== undefined) { if (finite(value.mvp) && value.mvp >= 0 && value.mvp <= Number.MAX_SAFE_INTEGER && Math.floor(value.mvp) === value.mvp) out.mvp = value.mvp; else damaged = true; }
      if (Object.keys(value).some(name => ['kills', 'skin', 'mvp'].indexOf(name) === -1)) damaged = true;
    } else {
      const ranges = { sens: [.2, 3], fov: [60, 105], vol: [0, 1], xhSize: [.6, 2], motion: [0, 1], inkFx: [0, 1], tsens: [.3, 2.5], btnScale: [.7, 1.6], joyScale: [.65, 1.6] };
      const enums = { xh: ['ink', 'red', 'blue', 'amber', 'green'], quality: ['low', 'balanced', 'high'], battleSize: ['auto', '5', '8', '12'], aimMode: ['mouse', 'trackpad'] };
      for (const field of Object.keys(value)) {
        const v = value[field]; if (!safeKey(field)) { damaged = true; continue; }
        if (ranges[field]) { if (finite(v) && v >= ranges[field][0] && v <= ranges[field][1]) out[field] = v; else damaged = true; }
        else if (enums[field]) { if (enums[field].indexOf(v) !== -1) out[field] = v; else damaged = true; }
        else if (field === 'autoFire' || field === 'touchAccel') { if (typeof v === 'boolean') out[field] = v; else damaged = true; }
        else if (field === 'xhStatic') { if (v === 0 || v === 1 || typeof v === 'boolean') out[field] = v ? 1 : 0; else damaged = true; }
        else if (field === 'autoTeamSize') { if (v === null || [5, 8, 12].indexOf(v) !== -1) out[field] = v; else damaged = true; }
        else if (field === 'map' || field === 'actorStyle') { if (typeof v === 'string' && /^[a-z][a-z0-9_-]{0,31}$/.test(v) && safeKey(v)) out[field] = v; else damaged = true; }
        else if (field === 'lastBuy') { if (Array.isArray(v)) { out[field] = v.filter(item => typeof item === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(item) && safeKey(item)).slice(0, 20); if (out[field].length !== v.length) damaged = true; } else damaged = true; }
        else if (field === 'joyPos') { if (Array.isArray(v) && v.length === 2 && v.every(n => finite(n) && n >= 0 && n <= 1)) out[field] = v.slice(); else damaged = true; }
        else if (field === 'layout' || field === 'btnSizes') { if (!record(v)) { damaged = true; continue; } out[field] = {}; for (const id of Object.keys(v)) { const item = v[id], validId = /^t[A-Za-z0-9]+$/.test(id); if (validId && (field === 'layout' ? Array.isArray(item) && item.length === 2 && item.every(n => finite(n) && n >= 0 && n <= 1) : finite(item) && item >= .6 && item <= 1.8)) out[field][id] = field === 'layout' ? item.slice() : item; else damaged = true; } }
        else damaged = true;
      }
    }
    if (damaged) stash(key, raw, 'invalid record fields'); return { value: out, valid: !damaged };
  }
  function temporary(key) { failed[key] = true; notice('本地保存暂时不可用；设置和熟练度仅保留在本次会话，关闭后可能丢失。'); }
  function localRead(key) { try { return { ok: true, raw: win.localStorage.getItem(key) }; } catch (error) { return { ok: false, raw: null }; } }
  function bounded(call) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('storage timeout')), 3000); Promise.resolve().then(call).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); }); }); }
  function buildOf(options) { const env = options && options.miniToolEnv, n = Number(env && env.buildVersion); return Number.isFinite(n) && n > 0 ? n : 0; }
  async function chooseBackend() {
    const xhs = win.xhs, mini = xhs && xhs.miniTool; let build = buildOf(xhs && xhs.launchOptions);
    if (!build && mini && typeof mini.getLaunchOptions === 'function') { try { build = buildOf(await bounded(() => mini.getLaunchOptions())); } catch (error) { notice('未能确认客户端缓存能力，将尝试兼容存储；本地数据不保证永久保留。'); } }
    native = Math.floor(build / 1000) >= 9460 && mini && typeof mini.getStorage === 'function' && typeof mini.setStorage === 'function' ? mini : null; state.mode = native ? 'native' : 'local';
  }
  async function nativeWrite(key, raw) { const result = await bounded(() => native.setStorage({ key: key, data: raw })); if (result && result.errMsg && result.errMsg !== 'setStorage:ok') throw new Error('invalid storage response'); }
  async function load(key) {
    const revision = revisions[key] || 0; let raw = null;
    if (native) {
      try { const result = await bounded(() => native.getStorage({ key: key })); if (!result || !Object.prototype.hasOwnProperty.call(result, 'data') || (result.errMsg && result.errMsg !== 'getStorage:ok')) throw new Error('invalid storage response'); raw = result.data; }
      catch (error) { temporary(key); return; }
      if (raw === null) {
        const old = localRead(key); if (old.ok && old.raw !== null) { const parsed = clean(key, old.raw); if (parsed.valid) { raw = JSON.stringify(parsed.value); if ((revisions[key] || 0) === revision) { try { await nativeWrite(key, raw); state.migrated.push(key); } catch (error) { temporary(key); } } } else if ((revisions[key] || 0) === revision) cache[key] = JSON.stringify(parsed.value); }
      }
    } else { const item = localRead(key); if (!item.ok) { temporary(key); return; } raw = item.raw; }
    if (raw !== null && (revisions[key] || 0) === revision) cache[key] = JSON.stringify(clean(key, raw).value);
  }
  win.xhsStorageInit = function () { if (!initPromise) initPromise = (async function () { try { await chooseBackend(); await Promise.all(keys.map(load)); } catch (error) { keys.forEach(temporary); } state.ready = true; })(); return initPromise; };
  win.xhsStorageRead = function (key, fallback) { if (!supported(key) || !state.ready || !Object.prototype.hasOwnProperty.call(cache, key)) return record(fallback) ? fallback : {}; return JSON.parse(cache[key]); };
  win.xhsStorageWrite = function (key, raw) {
    if (!supported(key)) { notice('存储键无效，本次保存未执行。'); return Promise.resolve(false); }
    const parsed = clean(key, raw); if (!parsed.valid) { notice('待保存数据格式异常，未覆盖已有存档。'); return Promise.resolve(false); }
    const serialized = JSON.stringify(parsed.value); cache[key] = serialized; revisions[key] = (revisions[key] || 0) + 1;
    const task = (pending[key] || Promise.resolve()).then(async function () { await win.xhsStorageInit(); if (failed[key]) return false; try { if (native) await nativeWrite(key, serialized); else win.localStorage.setItem(key, serialized); return true; } catch (error) { temporary(key); return false; } });
    pending[key] = task; return task;
  };
})(window);
