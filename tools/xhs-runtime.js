'use strict';
var xhsRAF = 0, xhsLastFrame = 0, xhsRenderingBlocked = false;
function xhsLoopStop() { if (xhsRAF) cancelAnimationFrame(xhsRAF); xhsRAF = 0; }
function xhsLoopStart() { if (xhsRAF || document.hidden || xhsRenderingBlocked) return; xhsLastFrame = performance.now(); xhsPerformanceReset(); xhsRAF = requestAnimationFrame(xhsTick); }
function xhsTick(time) {
  xhsRAF = 0; if (document.hidden || xhsRenderingBlocked) return;
  var elapsed = time - xhsLastFrame; xhsLastFrame = time;
  try { var at = performance.now(); if (!G.manualStep) frame(Math.min(.05, elapsed / 1000)); var cpu = performance.now() - at; samplePerformance(elapsed, cpu); xhsPerformanceSample(elapsed, cpu); } catch (error) { xhsError(error); return; }
  if (!xhsRenderingBlocked && !document.hidden) xhsRAF = requestAnimationFrame(xhsTick);
}
function xhsSuspend() { clearInput(); if (G.state !== 'menu' && G.state !== 'matchEnd') setPause(true); xhsLoopStop(); if (SFX.ctx && SFX.ctx.state === 'running') SFX.ctx.suspend().catch(function () {}); }
function xhsPerformanceBoot() {
  renderer.info.autoReset = false;
  xhsPerformanceInit({ renderer: renderer, beforeQuality: xhsBeforeQuality, getQuality: function () { return G.set.quality; }, setQuality: function (quality) { G.set.quality = quality; $('sQuality').value = quality; }, notify: function (event) { if (event.type === 'quality' && event.reason !== 'initial-budget') xhsNotice('已切换流畅画质，减轻设备负担。'); }, fallback: function () { xhsSuspend(); xhsError('当前设备持续运行吃力，请关闭其他应用后重试。'); } });
}
function xhsChangeMap(id) {
  if (G.state !== 'menu' || !MAP_CATALOG[id]) return;
  try {
    clearInput(); clearCombatFeedback(); PROG.resetStreak();
    for (var i = 0; i < G.bots.length; i++) disposeBotModel(G.bots[i]);
    for (var n = 0; n < G.nades.length; n++) scene.remove(G.nades[n].m);
    G.bots = []; G.ents = []; G.nades = []; G.player = G.spec = null; G.order = null;
    smokeClear(); FX.clearDecals(); FX.parts.length = FX.tracers.length = FX.nums.length = 0;
    FX.pm.count = 0; FX.tg.setDrawRange(0, 0);
    for (var f = 0; f < FX.flashes.length; f++) FX.flashes[f].visible = false;
    for (var r = 0; r < FX.rings.length; r++) FX.rings[r].visible = false;
    BOMB.state = 'none'; BOMB.carrier = BOMB.defuser = BOMB.site = null; if (BOMB.mesh) BOMB.mesh.visible = false;
    buildMap(scene, id); G.set.map = MAP.id; applyQuality(); updateBrief();
    xhsStorageWrite('inkstrike_xhs', JSON.stringify(G.set));
  } catch (error) { xhsError(error); console.error(error); }
}
async function xhsBoot() {
  try {
    await xhsStorageInit(); Object.assign(G.set, xhsStorageRead('inkstrike_xhs', {})); PROG.data = Object.assign({ kills: {}, skin: {}, mvp: 0 }, xhsStorageRead('inkstrike_xhs_prog', {}));
    if (G.set.quality !== 'low') G.set.quality = 'balanced';
    boot(); xhsBindQuality(); (window.xhsStorageNotices || []).splice(0).forEach(xhsNotice);
    var resumeAudio = function () { if (SFX.ctx && SFX.ctx.state === 'suspended' && !document.hidden) SFX.ctx.resume().catch(function () {}); };
    document.addEventListener('pointerdown', resumeAudio, true); document.addEventListener('touchstart', resumeAudio, { capture: true, passive: true }); document.addEventListener('keydown', resumeAudio, true);
    addEventListener('blur', xhsSuspend); addEventListener('pagehide', xhsSuspend); addEventListener('focus', xhsLoopStart); addEventListener('pageshow', xhsLoopStart);
    document.addEventListener('visibilitychange', function () { if (document.hidden) xhsSuspend(); else xhsLoopStart(); });
    $('c').addEventListener('webglcontextlost', function (event) { event.preventDefault(); xhsSuspend(); xhsError('画面暂时中断，正在等待系统恢复图形资源。也可点击下方按钮重新打开。'); });
    $('c').addEventListener('webglcontextrestored', function () { try { xhsRenderingBlocked = false; $('xhsError').hidden = true; xhsPerformanceSetQuality('low'); onResize(); clearInput(); xhsLoopStart(); xhsNotice('画面已恢复，请按页面提示继续游戏。'); } catch (error) { xhsError(error); } });
    var viewport = function () { xhsSize(); onResize(); touchReset(); layoutApply(); };
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', viewport); window.visualViewport.addEventListener('scroll', viewport); } viewport();
  } catch (error) { xhsError(error); console.error(error); }
}
xhsBoot();
