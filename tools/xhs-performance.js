'use strict';
/* Small-tool export only. ES2017. Does not change collision, AI, team size or the source game.
 * Init after WebGL creation: xhsPerformanceInit({ renderer, getQuality, setQuality,
 *   notify(event), fallback(event), canSample() }); only renderer is required.
 * Call xhsPerformanceResize(w,h) from the existing onResize; it sets renderer size/DPR.
 * Call xhsPerformanceSample(frameIntervalMs,submissionMs) once per active rendered frame.
 * Call xhsPerformancePrepare(scene,VM.scene) immediately before rendering the world,
 * after actor/camera animation updates. It also handles newly selected guns and bots.
 * Call xhsPerformanceReset() after a scene change, resume, or restored context.
 * A fallback callback must stop rendering and expose a usable DOM recovery screen.
 * These limits do not certify GPU geometry budgets or real-device frame rates.
 */
(function (root) {
  var options = {}, ready = false, tier = 'balanced', width = 1, height = 1;
  var samples = [], costs = [], elapsedTotal = 0, warmMs = 0, warmFrames = 0;
  var slowWindows = 0, severeWindows = 0, unavailable = false, lastWindow = null, buffer = null;
  var lineGeometryCache = new WeakMap(), lineMaterialCache = new WeakMap(), atlases = new WeakMap(), convertedLines = 0, batchedBots = 0, batchWarnings = 0;
  var reducedFacades = false, estimatedTriangles = 0, effectBatch = null, smokeBatch = null;
  var budgets = { balanced: { dpr: 1.5, pixels: 2000000, calls: 100, triangles: 100000, textureEdge: 2048, textureBytes: 67108864 }, low: { dpr: 1, pixels: 1000000, calls: 50, triangles: 50000, textureEdge: 1024, textureBytes: 33554432 } };
  function getQuality() { return options.getQuality ? options.getQuality() : (typeof G !== 'undefined' && G.set ? G.set.quality : tier); }
  function setQuality(value) { if (options.setQuality) options.setQuality(value); else if (typeof G !== 'undefined' && G.set) { G.set.quality = value; var select = document.getElementById('sQuality'); if (select) select.value = value; } }
  function notify(type, reason) { var event = { type: type, reason: reason, quality: tier, window: lastWindow }; if (options.notify) options.notify(event); return event; }
  function reset() { samples.length = costs.length = 0; elapsedTotal = warmMs = warmFrames = 0; slowWindows = severeWindows = 0; }
  function detail() { if (options.setDetail) options.setDetail(tier); else if (typeof MAP !== 'undefined' && MAP.setDetail) MAP.setDetail(tier); if (typeof MAP !== 'undefined' && MAP.renderLayers) MAP.renderLayers.trim.visible = tier !== 'low'; }
  function quality(value, reason) { var next = value === 'low' ? 'low' : 'balanced', changed = next !== tier; if (options.beforeQuality && options.beforeQuality(next, reason) === false) return; tier = next; setQuality(next); detail(); reset(); if (ready) resize(width, height); if (changed && reason) notify('quality', reason); }
  function init(config) { options = config || {}; if (!options.renderer) throw new Error('xhsPerformanceInit requires a renderer'); ready = true; unavailable = false; quality(getQuality(), 'initial-budget'); return report(); }
  function resize(w, h) {
    width = Math.max(1, Math.floor(Number(w) || 1)); height = Math.max(1, Math.floor(Number(h) || 1));
    if (!ready) return null;
    var selected = getQuality() === 'low' ? 'low' : 'balanced';
    if (selected !== tier) { tier = selected; detail(); reset(); }
    if (getQuality() !== selected) setQuality(selected);
    var budget = budgets[tier], deviceDPR = Math.max(1, Number(root.devicePixelRatio) || 1);
    var dpr = Math.min(deviceDPR, budget.dpr, Math.sqrt(budget.pixels / (width * height)));
    options.renderer.setPixelRatio(dpr); options.renderer.setSize(width, height);
    var canvas = options.renderer.domElement;
    buffer = { width: canvas.width, height: canvas.height, pixels: canvas.width * canvas.height, dpr: dpr, pixelLimit: budget.pixels };
    return buffer;
  }
  function canSample() {
    if (!ready || unavailable || document.hidden) return false;
    if (options.canSample) return options.canSample();
    return typeof G !== 'undefined' && G.state === 'live' && !G.paused && !G.buyOpen && !G.mapOpen && !G.manualStep;
  }
  function percentile(sorted, fraction) { return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]; }
  function sample(elapsed, cpu) {
    if (!canSample()) { reset(); return; }
    if (!Number.isFinite(elapsed) || !Number.isFinite(cpu) || elapsed < 1 || cpu < 0 || elapsed > 30000) { reset(); return; }
    elapsed = Math.min(1000, elapsed); cpu = Math.min(1000, cpu);
    if (warmMs < 3000 || warmFrames < 90) { warmMs += elapsed; warmFrames++; return; }
    samples.push(elapsed); costs.push(cpu); elapsedTotal += elapsed;
    if (elapsedTotal < 4000 || samples.length < 90) return;
    samples.sort(function (a, b) { return a - b; }); costs.sort(function (a, b) { return a - b; });
    lastWindow = { frames: samples.length, durationMs: elapsedTotal, frameP50: percentile(samples, .5), frameP90: percentile(samples, .9), cpuP50: percentile(costs, .5), cpuP90: percentile(costs, .9) };
    samples.length = costs.length = 0; elapsedTotal = 0;
    var slow = lastWindow.frameP50 > 35 && lastWindow.frameP90 > 45 || lastWindow.cpuP50 > 20 && lastWindow.cpuP90 > 30;
    var severe = lastWindow.frameP50 > 100 || lastWindow.cpuP50 > 80;
    slowWindows = slow ? slowWindows + 1 : 0; severeWindows = severe ? severeWindows + 1 : 0;
    if (tier !== 'low' && slowWindows >= 2) { quality('low', 'sustained-frame-cost'); return; }
    if (tier === 'low' && severeWindows >= 3) { unavailable = true; var event = notify('unavailable', 'sustained-cost-at-low'); if (options.fallback) options.fallback(event); }
  }
  function report() {
    var b = budgets[tier], info = ready ? options.renderer.info : null;
    return { quality: tier, unavailable: unavailable, buffer: buffer, lastWindow: lastWindow, convertedLines: convertedLines, batchedBots: batchedBots, batchWarnings: batchWarnings,
      reducedFacades: reducedFacades, estimatedTriangles: estimatedTriangles,
      limits: { drawCalls: b.calls, triangles: b.triangles, textureEdge: b.textureEdge, textureBytes: b.textureBytes },
      rendererInfo: info ? { drawCalls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures, geometries: info.memory.geometries } : null };
  }
  function thinGeometry(source) {
    var cached = lineGeometryCache.get(source); if (cached) return cached;
    var start = source.attributes.instanceStart, end = source.attributes.instanceEnd;
    if (!start || !end) return null;
    var vertices = new Float32Array(start.count * 6);
    for (var i = 0, j = 0; i < start.count; i++) { vertices[j++] = start.getX(i); vertices[j++] = start.getY(i); vertices[j++] = start.getZ(i); vertices[j++] = end.getX(i); vertices[j++] = end.getY(i); vertices[j++] = end.getZ(i); }
    cached = new THREE.BufferGeometry(); cached.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); cached.computeBoundingSphere();
    cached.addEventListener('dispose', function () { lineGeometryCache.delete(source); source.dispose(); });
    lineGeometryCache.set(source, cached); return cached;
  }
  function thinMaterial(source) {
    var cached = lineMaterialCache.get(source); if (cached) return cached;
    /* The pinned grenade path passes the actor material table rather than a
     * LineMaterial. Keep a valid neutral outline in that legacy case. */
    var properties = { color: source.color || (typeof INK !== 'undefined' ? INK : 0x16161c) };
    var keys = ['opacity', 'transparent', 'depthTest', 'depthWrite', 'fog', 'toneMapped'];
    for (var i = 0; i < keys.length; i++) if (source[keys[i]] !== undefined) properties[keys[i]] = source[keys[i]];
    cached = new THREE.LineBasicMaterial(properties);
    if (source.color && source.color.isColor) cached.color = source.color;
    lineMaterialCache.set(source, cached); return cached;
  }
  function prepare(world, viewModel) {
    if (typeof THREE === 'undefined') return;
    /* Maps now live in a replaceable child root. Keep atlas ownership with that
     * root so every layout is packed and buildMap disposes it with the map. */
    var mapRoot = typeof MAP !== 'undefined' && MAP.root ? MAP.root : world;
    if (mapRoot && !atlases.has(mapRoot)) atlasSigns(mapRoot);
    if (typeof FX !== 'undefined') { if (FX.pm) FX.pm.visible = tier !== 'low'; if (FX.decals) for (var d = 0; d < FX.decals.length; d++) FX.decals[d].visible = tier !== 'low'; }
    if (typeof ACTOR_SHADOW !== 'undefined' && ACTOR_SHADOW) ACTOR_SHADOW.mesh.visible = tier !== 'low';
    function visit(object) {
      if (!object.isLineSegments2) return;
      var geometry = thinGeometry(object.geometry); if (!geometry) return;
      object.userData.xhsThickGeometry = object.geometry; object.userData.xhsThickMaterial = object.material;
      object.geometry = geometry; object.material = thinMaterial(object.material);
      /* Keep the same object, parent, transform and .ink references. Only the renderer
       * primitive changes; game line LOD recognizes isLineSegments2 and now skips it. */
      object.isLineSegments2 = false; object.isMesh = false; object.isLine = true; object.isLineSegments = true; object.type = 'LineSegments';
      object.raycast = THREE.LineSegments.prototype.raycast; convertedLines++;
    }
    if (world) world.traverse(visit); if (viewModel) viewModel.traverse(visit);
    if (typeof G !== 'undefined' && G.bots) for (var i = 0; i < G.bots.length; i++) prepareBot(G.bots[i]);
    prepareSmokes(world); prepareEffects(world); facadeBudget(world, viewModel);
  }
  function prepareSmokes(world) {
    if (!world || typeof SMOKES === 'undefined') return;
    if (!SMOKES.length) { if (smokeBatch) { disposeBatch(smokeBatch.model); smokeBatch.groups.length = 0; } return; }
    if (!smokeBatch) smokeBatch = { model: { root: world, fm: _smokeFm, lm: _smokeLm, mark: null, xhsNoBotCount: true }, weapon: 0, groups: [] };
    var changed = smokeBatch.groups.length !== SMOKES.length;
    for (var i = 0; !changed && i < SMOKES.length; i++) changed = smokeBatch.groups[i] !== SMOKES[i].g;
    if (changed) { smokeBatch.weapon++; smokeBatch.groups.length = 0; for (var j = 0; j < SMOKES.length; j++) smokeBatch.groups.push(SMOKES[j].g); }
    /* Each cloud keeps its own world transform and simulation object. Only its
     * renderer primitives join one fill and one outline submission. */
    prepareBot(smokeBatch); if (smokeBatch.model.xhsBatch) { smokeBatch.model.xhsBatch.fill.name = 'xhs-smoke-fill'; smokeBatch.model.xhsBatch.line.name = 'xhs-smoke-lines'; }
  }
  function prepareEffects(world) {
    if (!world || typeof FX === 'undefined' || !FX.rings.length || !FX.flashes.length) return;
    if (!effectBatch) {
      var flashes = new THREE.InstancedMesh(FX.flashes[0].geometry, FX.flashes[0].material, FX.flashes.length); flashes.frustumCulled = false; flashes.name = 'xhs-flash-batch';
      var capacity = 0; for (var k = 0; k < FX.rings.length; k++) { capacity += (FX.rings[k].geometry.attributes.position.count - 1) * 2; FX.rings[k].isLine = false; }
      for (var f = 0; f < FX.flashes.length; f++) FX.flashes[f].isMesh = false;
      var geometry = new THREE.BufferGeometry(), positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3), opacity = new THREE.BufferAttribute(new Float32Array(capacity), 1);
      geometry.setAttribute('position', positions); geometry.setAttribute('xhsOpacity', opacity);
      var material = new THREE.ShaderMaterial({ uniforms: { ink: { value: new THREE.Color(INK) } }, transparent: true,
        vertexShader: 'attribute float xhsOpacity; varying float vXhsOpacity; void main(){vXhsOpacity=xhsOpacity; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform vec3 ink; varying float vXhsOpacity; void main(){gl_FragColor=vec4(ink,vXhsOpacity);}' });
      var rings = new THREE.LineSegments(geometry, material); rings.frustumCulled = false; rings.name = 'xhs-ring-batch'; world.add(flashes, rings);
      effectBatch = { flashes: flashes, rings: rings, positions: positions, opacity: opacity, inverse: new THREE.Matrix4(), matrix: new THREE.Matrix4(), point: new THREE.Vector3() };
      FX.rings[0].geometry.addEventListener('dispose', function () { world.remove(flashes, rings); geometry.dispose(); material.dispose(); effectBatch = null; });
    }
    var batch = effectBatch, count = 0, vertex = 0; world.updateWorldMatrix(true, false); batch.inverse.copy(world.matrixWorld).invert();
    for (var i = 0; i < FX.flashes.length; i++) { var flash = FX.flashes[i]; if (!flash.visible) continue; flash.updateWorldMatrix(true, false); batch.matrix.multiplyMatrices(batch.inverse, flash.matrixWorld); batch.flashes.setMatrixAt(count++, batch.matrix); }
    batch.flashes.count = count; batch.flashes.visible = count > 0; batch.flashes.instanceMatrix.needsUpdate = count > 0;
    for (var r = 0; r < FX.rings.length; r++) { var ring = FX.rings[r]; if (!ring.visible) continue; ring.updateWorldMatrix(true, false); batch.matrix.multiplyMatrices(batch.inverse, ring.matrixWorld); var points = ring.geometry.attributes.position;
      for (var j = 0; j < points.count - 1; j++) for (var end = 0; end < 2; end++, vertex++) { batch.point.fromBufferAttribute(points, j + end).applyMatrix4(batch.matrix); batch.positions.setXYZ(vertex, batch.point.x, batch.point.y, batch.point.z); batch.opacity.setX(vertex, Math.max(0, ring.material.opacity)); }
    }
    batch.rings.visible = vertex > 0; batch.rings.geometry.setDrawRange(0, vertex); batch.positions.needsUpdate = batch.opacity.needsUpdate = vertex > 0;
  }
  function triangleCount(world) {
    var total = 0; if (!world) return total;
    world.traverseVisible(function (object) { var geometry = object.geometry; if (!object.isMesh || !geometry || !geometry.attributes.position) return;
      var count = geometry.index ? geometry.index.count : geometry.attributes.position.count, range = geometry.drawRange;
      count = Math.max(0, Math.min(count - range.start, range.count)); total += count / 3 * (object.isInstancedMesh ? object.count : 1) * (object.material && object.material.transparent && object.material.side === THREE.DoubleSide && !object.material.forceSinglePass ? 2 : 1);
    }); return total;
  }
  function facadeBudget(world, viewModel) {
    var trim = typeof MAP !== 'undefined' && MAP.renderLayers && MAP.renderLayers.trim, geometry = trim && trim.fill && trim.fill.geometry;
    reducedFacades = false; if (!geometry) return;
    /* buildWorld adds facade decorations only after all solids, routes, authored
     * props and signage are built. Keep ground-floor doors/windows and every
     * outline; only upper decorative window fills become optional under load. */
    if (!geometry.userData.xhsFacade) {
      var position = geometry.attributes.position, index = geometry.index, count = index ? index.count : position.count, near = [], upper = [];
      for (var i = 0; i < count; i += 3) { var a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
        var list = Math.min(position.getY(a), position.getY(b), position.getY(c)) <= 3.4 ? near : upper; list.push(a, b, c);
      }
      geometry.setIndex(near.concat(upper)); geometry.userData.xhsFacade = { full: count, near: near.length };
    }
    var limits = geometry.userData.xhsFacade; geometry.setDrawRange(0, limits.full);
    estimatedTriangles = triangleCount(world) + (typeof G !== 'undefined' && G.player && G.player.alive && G.state !== 'menu' ? triangleCount(viewModel) : 0);
    if (tier === 'balanced' && trim.visible && estimatedTriangles > budgets.balanced.triangles * .9) {
      geometry.setDrawRange(0, limits.near); estimatedTriangles -= (limits.full - limits.near) / 3; reducedFacades = true;
    }
  }
  function atlasSigns(world) {
    var signs = [], size = 1024, x = 0, y = 0, row = 0, i;
    for (i = 0; i < world.children.length; i++) { var child = world.children[i], mat = child.material;
      if (child.isMesh && !child.isInstancedMesh && child.geometry && child.geometry.type === 'PlaneGeometry' && mat && mat.isMeshBasicMaterial && mat.map && mat.map.image) signs.push(child);
    }
    if (!signs.length) { atlases.set(world, null); return; }
    signs.sort(function (a, b) { return b.material.map.image.height - a.material.map.image.height; });
    var canvas = document.createElement('canvas'); canvas.width = canvas.height = size; var context = canvas.getContext('2d'), entries = [];
    for (i = 0; i < signs.length; i++) { var sign = signs[i], image = sign.material.map.image, scale = image.width === image.height ? .75 : .5, w = Math.round(image.width * scale), h = Math.round(image.height * scale);
      if (x + w + 2 > size) { x = 0; y += row + 2; row = 0; } if (y + h + 2 > size) { batchWarnings++; atlases.set(world, null); return; }
      context.drawImage(image, x + 1, y + 1, w, h); entries.push({ sign: sign, x: x + 1, y: y + 1, width: w, height: h }); x += w + 2; row = Math.max(row, h);
    }
    var vertices = new Float32Array(signs.length * 18), texcoords = new Float32Array(signs.length * 12), offset = 0, vector = new THREE.Vector3();
    world.updateWorldMatrix(true, false); var inverse = new THREE.Matrix4().copy(world.matrixWorld).invert();
    for (i = 0; i < entries.length; i++) { var entry = entries[i], object = entry.sign, geo = object.geometry, positions = geo.attributes.position, uv = geo.attributes.uv; object.updateWorldMatrix(true, false);
      for (var j = 0; j < 6; j++, offset++) { var k = geo.index ? geo.index.getX(j) : j; vector.fromBufferAttribute(positions, k).applyMatrix4(object.matrixWorld).applyMatrix4(inverse); vertices[offset * 3] = vector.x; vertices[offset * 3 + 1] = vector.y; vertices[offset * 3 + 2] = vector.z;
        texcoords[offset * 2] = (entry.x + uv.getX(k) * entry.width) / size; texcoords[offset * 2 + 1] = 1 - (entry.y + (1 - uv.getY(k)) * entry.height) / size;
      }
    }
    var texture = new THREE.CanvasTexture(canvas); texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
    var geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.BufferAttribute(texcoords, 2)); geometry.computeBoundingSphere();
    var material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var mesh = new THREE.Mesh(geometry, material); mesh.name = 'xhs-sign-atlas'; mesh.userData.xhsAtlasSigns = signs.length; world.add(mesh); atlases.set(world, mesh);
    for (i = 0; i < signs.length; i++) { world.remove(signs[i]); signs[i].geometry.dispose(); signs[i].material.map.dispose(); signs[i].material.dispose(); }
  }
  function mergedGeometry(items, bones, fill) {
    var total = 0, i, j, item, source, count;
    for (i = 0; i < items.length; i++) { source = items[i].geometry; total += source.index ? source.index.count : source.attributes.position.count; }
    var vertices = new Float32Array(total * 3), parts = new Float32Array(total), tones = fill ? new Float32Array(total) : null, tints = fill ? new Float32Array(total * 3) : null;
    var offset = 0;
    for (i = 0; i < items.length; i++) {
      item = items[i]; source = item.geometry; var position = source.attributes.position, tone = source.attributes.tone, tint = source.attributes.tint;
      var identity = item.position.lengthSq() === 0 && item.quaternion.x === 0 && item.quaternion.y === 0 && item.quaternion.z === 0 && item.quaternion.w === 1 && item.scale.x === 1 && item.scale.y === 1 && item.scale.z === 1;
      var bone = identity ? item.parent : item, boneIndex = bones.indexOf(bone); if (boneIndex < 0) { boneIndex = bones.length; bones.push(bone); }
      count = source.index ? source.index.count : position.count;
      for (j = 0; j < count; j++, offset++) { var k = source.index ? source.index.getX(j) : j, v = offset * 3; vertices[v] = position.getX(k); vertices[v + 1] = position.getY(k); vertices[v + 2] = position.getZ(k); parts[offset] = boneIndex;
        if (fill) { var color = item.material.color; tones[offset] = tone ? tone.getX(k) : 0; tints[v] = tint ? tint.getX(k) : color ? color.r : 1; tints[v + 1] = tint ? tint.getY(k) : color ? color.g : 1; tints[v + 2] = tint ? tint.getZ(k) : color ? color.b : 1; }
      }
    }
    var geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); geometry.setAttribute('xhsPart', new THREE.BufferAttribute(parts, 1));
    if (fill) { geometry.setAttribute('tone', new THREE.BufferAttribute(tones, 1)); geometry.setAttribute('tint', new THREE.BufferAttribute(tints, 3)); }
    geometry.computeBoundingSphere(); geometry.boundingSphere.center.set(0, .9, 0); geometry.boundingSphere.radius = 3;
    return geometry;
  }
  function disposeBatch(model) {
    var batch = model.xhsBatch; if (!batch) return;
    for (var i = 0; i < batch.items.length; i++) { var item = batch.items[i]; item.isMesh = !!item.userData.xhsBatchWasMesh; item.isLine = !!item.userData.xhsBatchWasLine; delete item.userData.xhsBatchWasMesh; delete item.userData.xhsBatchWasLine; }
    model.root.remove(batch.fill); model.root.remove(batch.line); batch.fill.geometry.dispose(); batch.line.geometry.dispose(); batch.fill.material.dispose(); batch.line.material.dispose(); model.xhsBatch = null; if (!model.xhsNoBotCount) batchedBots--;
  }
  function buildBatch(bot) {
    var model = bot.model, fills = [], lines = [], bones = [], items;
    model.root.traverse(function (item) { if (item.isMesh && (item.material === model.fm || item === model.mark)) fills.push(item); else if (item.isLineSegments && item.material === thinMaterial(model.lm)) lines.push(item); });
    if (!fills.length || !lines.length) return null;
    var fg = mergedGeometry(fills, bones, true), lg = mergedGeometry(lines, bones, false), gl = options.renderer.getContext();
    var available = Math.floor((gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) - 32) / 4);
    if (bones.length > available || model.fm.vertexShader.indexOf('modelMatrix*vec4(position,1.0)') < 0) { fg.dispose(); lg.dispose(); batchWarnings++; return null; }
    var matrices = bones.map(function () { return new THREE.Matrix4(); }), declaration = 'attribute float xhsPart; uniform mat4 xhsBones[' + bones.length + '];\n';
    var fm = model.fm.clone(); fm.uniforms = Object.assign({}, model.fm.uniforms, { xhsBones: { value: matrices } });
    fm.vertexShader = declaration + fm.vertexShader.replace('modelMatrix*vec4(position,1.0)', 'modelMatrix*xhsBones[int(xhsPart)]*vec4(position,1.0)');
    var lm = thinMaterial(model.lm).clone(); lm.color = model.lm.color;
    lm.onBeforeCompile = function (shader) { shader.uniforms.xhsBones = { value: matrices }; shader.vertexShader = declaration + shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = (xhsBones[int(xhsPart)] * vec4(position,1.0)).xyz;'); };
    lm.customProgramCacheKey = function () { return 'xhs-bot-lines-' + bones.length; };
    var fill = new THREE.Mesh(fg, fm), line = new THREE.LineSegments(lg, lm); fill.userData.xhsBatch = line.userData.xhsBatch = true;
    items = fills.concat(lines); for (var i = 0; i < items.length; i++) { var item = items[i]; item.userData.xhsBatchWasMesh = !!item.isMesh; item.userData.xhsBatchWasLine = !!item.isLine; item.isMesh = item.isLine = false; }
    model.root.add(fill, line); if (!model.xhsNoBotCount) batchedBots++; else fill.frustumCulled = line.frustumCulled = false;
    if (!model.xhsDisposeBound) { model.xhsDisposeBound = true; model.fm.addEventListener('dispose', function () { disposeBatch(model); }); }
    return { fill: fill, line: line, items: items, bones: bones, matrices: matrices, inverse: new THREE.Matrix4(), weapon: bot.weapon };
  }
  function prepareBot(bot) {
    var model = bot.model; if (!model) return;
    if (model.xhsBatch && model.xhsBatch.weapon !== bot.weapon) disposeBatch(model);
    if (!model.xhsBatch && !model.xhsBatchUnsupported) { model.xhsBatch = buildBatch(bot); if (!model.xhsBatch) { model.xhsBatchUnsupported = true; unavailable = true; var event = notify('unavailable', 'vertex-uniform-budget'); if (options.fallback) options.fallback(event); } }
    var batch = model.xhsBatch; if (!batch) return;
    model.root.updateWorldMatrix(true, true); batch.inverse.copy(model.root.matrixWorld).invert();
    for (var i = 0; i < batch.bones.length; i++) { if (batch.bones[i] === model.mark && !model.mark.visible) batch.matrices[i].makeScale(0, 0, 0); else batch.matrices[i].multiplyMatrices(batch.inverse, batch.bones[i].matrixWorld); }
  }
  root.xhsPerformanceInit = init; root.xhsPerformanceResize = resize; root.xhsPerformanceSample = sample;
  root.xhsPerformanceReset = reset; root.xhsPerformanceSetQuality = function (value) { quality(value, 'user-setting'); };
  root.xhsPerformanceReport = report; root.xhsPerformancePrepare = prepare;
})(window);
