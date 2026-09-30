'use strict';
var xhsQualityForced = false, xhsQualityWasPaused = false;
function xhsSaveQuality() { $('sQuality').value = G.set.quality; document.querySelectorAll('#optSize button').forEach(function (button) { button.classList.toggle('sel', button.dataset.v === G.set.battleSize); }); updateBrief(); xhsStorageWrite('inkstrike_xhs', JSON.stringify(G.set)); }
function xhsBeforeQuality(next) {
  if (next === 'low' && !xhsQualityForced && G.mode !== 'range' && G.state !== 'menu' && G.teamSize > 5) {
    G.set.quality = 'balanced'; xhsSaveQuality(); xhsQualityWasPaused = G.paused; setPause(true); xhsLoopStop(); xhsRenderingBlocked = true;
    $('xhsQualityPrompt').hidden = false; $('xhsQualityPrompt').classList.add('on'); return false;
  }
  if (next === 'low') { G.perf.pending = null; G.set.autoTeamSize = 5; }
  return true;
}
function xhsPrepareMatch() {
  if (G.set.quality !== 'low') return;
  G.perf.pending = null; G.set.autoTeamSize = 5;
  if (G.mode !== 'range' && ['8', '12'].indexOf(G.set.battleSize) !== -1) { G.set.quality = 'balanced'; applyQuality(); xhsNotice(G.set.battleSize + 'v' + G.set.battleSize + ' 使用均衡画质；流畅画质支持 5v5。'); }
  xhsSaveQuality();
}
function xhsBindQuality() {
  $('xhsQualityKeep').addEventListener('click', function () { $('xhsQualityPrompt').hidden = true; $('xhsQualityPrompt').classList.remove('on'); xhsRenderingBlocked = false; setPause(xhsQualityWasPaused); xhsLoopStart(); });
  $('xhsQualityRestart').addEventListener('click', function () {
    $('xhsQualityPrompt').hidden = true; $('xhsQualityPrompt').classList.remove('on'); G.set.battleSize = '5'; G.set.quality = 'low'; xhsQualityForced = true;
    try { applyQuality(); startMatch(); xhsSaveQuality(); xhsRenderingBlocked = false; xhsLoopStart(); xhsNotice('已重新开始 5v5 流畅对局。累计熟练度继续保留。'); } catch (error) { xhsError(error); } finally { xhsQualityForced = false; }
  });
  $('optSize').addEventListener('click', function () { if (G.set.quality === 'low' && ['8', '12'].indexOf(G.set.battleSize) !== -1) { G.set.quality = 'balanced'; applyQuality(); xhsSaveQuality(); xhsNotice('已选择均衡画质，可进行 ' + G.set.battleSize + 'v' + G.set.battleSize + ' 对局。'); } });
}
