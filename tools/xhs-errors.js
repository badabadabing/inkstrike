'use strict';
function xhsNotice(message) {
  var box = document.getElementById('xhsNotice'); if (!box) return;
  box.hidden = false; box.textContent = message + ' ';
  var close = document.createElement('button'); close.type = 'button'; close.textContent = '知道了'; close.addEventListener('click', function () { box.hidden = true; }); box.appendChild(close);
}
function xhsError(error) {
  if (typeof xhsLoopStop === 'function') xhsLoopStop(); window.xhsRenderingBlocked = true;
  var box = document.getElementById('xhsError'); if (!box) return;
  var message = error && error.message || String(error); if (/creating WebGL context/.test(message)) message = '当前设备未能开启 3D 画面，请关闭其他应用后重试，或换一台设备打开。';
  box.hidden = false; box.textContent = '暂时无法继续：' + message + ' ';
  var retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重新打开'; retry.addEventListener('click', function () { location.reload(); }); box.appendChild(retry);
  var loading = document.getElementById('loading'); if (loading) loading.style.display = 'none';
}
addEventListener('error', function (event) { xhsError(event.error || event.message || '本地资源加载失败'); }, true);
addEventListener('unhandledrejection', function (event) { xhsError(event.reason); });
