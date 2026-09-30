'use strict';
// Build-time conversion of legacy property bindings to classic-script event listeners.
const acorn = require('/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/vercel/node_modules/acorn');
function eventBindings(source) {
  const assignments = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'MemberExpression' && !node.left.computed && /^on(click|change|input)$/.test(node.left.property.name)) assignments.push(node); for (const key of Object.keys(node)) { const value = node[key]; if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value); } }
  visit(acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' }));
  function rewrite(start, end) { const all = assignments.filter(n => n.start >= start && n.end <= end), outer = all.filter(n => !all.some(p => p !== n && p.start <= n.start && p.end >= n.end)); let result = source.slice(start, end); for (const n of outer.sort((a, b) => b.start - a.start)) { const object = n.left.object; result = result.slice(0, n.start - start) + 'xhsBindEvent(' + rewrite(object.start, object.end) + ', ' + JSON.stringify(n.left.property.name.slice(2)) + ', ' + rewrite(n.right.start, n.right.end) + ')' + result.slice(n.end - start); } return result; }
  return rewrite(0, source.length);
}
module.exports = { eventBindings };
