'use strict';
function xhsBindEvent(node, type, handler) { node.addEventListener(type, handler); return handler; }
/* Feed the existing multi-touch controls from real pointer or touch events. Menus keep native scrolling. */
function xhsListen(node, type, handler, options) {
  var names = { touchstart: 'pointerdown', touchmove: 'pointermove', touchend: 'pointerup', touchcancel: 'pointercancel' }, stamp = -1000;
  if (window.PointerEvent) node.addEventListener(names[type], function (event) {
    if (event.pointerType === 'mouse' && (type === 'touchstart' && event.button !== 0 || type === 'touchmove' && !event.buttons)) return;
    if (event.pointerType !== 'mouse') stamp = event.timeStamp;
    handler({ target: event.target, cancelable: event.cancelable, changedTouches: [{ identifier: event.pointerId, clientX: event.clientX, clientY: event.clientY, target: event.target }], preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } });
    if (type === 'touchstart' && event.defaultPrevented && event.target.setPointerCapture) { try { event.target.setPointerCapture(event.pointerId); } catch (_) {} }
  }, options);
  node.addEventListener(type, function (event) { if (Math.abs(event.timeStamp - stamp) < 100) return; handler(event); }, options);
}
