'use strict';
/* ============ INK STRIKE · arsenal: stats, line-art gun models, first-person viewmodel ============ */
const WEAPONS = {
  knife:  { name: '刻刀', en: 'ETCHER', slot: 3, dmg: 40, dmg2: 65, rate: .42, rate2: .9, range: 2.0, speed: 1.0, draw: .35, reward: 1500, melee: true, price: 0 },
  p9:     { name: 'P9 速写', en: 'P9 SKETCH', slot: 2, dmg: 30, arm: .52, rate: .14, auto: false, mag: 12, res: 48, reload: 1.9, spread: .0035, moveSp: .022, sprayInc: .004, up: .016, side: .004, vm: .05, speed: .98, draw: .4, reward: 300, price: 200, snd: 'pistol', fall: .82 },
  deagle: { name: '重墨 .50', en: 'HEAVY INK .50', slot: 2, dmg: 58, arm: .93, rate: .27, auto: false, mag: 7, res: 35, reload: 2.1, spread: .0025, moveSp: .04, sprayInc: .03, up: .05, side: .012, vm: .11, speed: .95, draw: .5, reward: 300, price: 700, snd: 'deagle', fall: .85 },
  viper:  { name: '飞白 冲锋枪', en: 'DRYBRUSH SMG', slot: 1, dmg: 25, arm: .6, rate: .072, auto: true, mag: 30, res: 120, reload: 2.2, spread: .008, moveSp: .012, sprayInc: .0012, up: .0085, side: .0055, vm: .035, speed: .97, draw: .5, reward: 600, price: 1250, snd: 'smg', fall: .75 },
  nova:   { name: '泼墨 霰弹枪', en: 'SPLASH SHOTGUN', slot: 1, dmg: 20, pellets: 9, arm: .5, rate: .85, auto: false, mag: 8, res: 32, reload: 2.6, spread: .045, moveSp: .01, sprayInc: 0, up: .07, side: .015, vm: .16, speed: .93, draw: .6, reward: 900, price: 1050, snd: 'shotgun', fall: .55, pump: true },
  ak:     { name: 'AK 焦墨', en: 'AK CHARCOAL', slot: 1, dmg: 36, arm: .78, rate: .1, auto: true, mag: 30, res: 90, reload: 2.4, spread: .0022, moveSp: .05, sprayInc: .0011, up: .0135, side: .0085, vm: .06, speed: .9, draw: .6, reward: 300, price: 2700, snd: 'rifle', fall: .95 },
  m4:     { name: 'M4 工笔', en: 'M4 FINELINE', slot: 1, dmg: 31, arm: .7, rate: .092, auto: true, mag: 30, res: 90, reload: 2.7, spread: .0018, moveSp: .045, sprayInc: .0009, up: .0105, side: .006, vm: .045, speed: .92, draw: .6, reward: 300, price: 3100, snd: 'm4', fall: .95 },
  awp:    { name: '一笔 狙击枪', en: 'ONE STROKE', slot: 1, dmg: 115, arm: .97, rate: 1.4, auto: false, mag: 5, res: 25, reload: 3.3, spread: .0004, noScope: .07, moveSp: .12, sprayInc: 0, up: .06, side: .01, vm: .2, speed: .82, draw: .9, reward: 100, price: 4750, snd: 'awp', fall: 1, scope: true, bolt: true },
  he:     { name: '墨爆弹', en: 'INK BOMB', slot: 4, speed: .98, draw: .4, price: 300, reward: 300, nade: true, rate: 1 }
};
const BUY_LIST = ['deagle', 'viper', 'nova', 'ak', 'm4', 'awp', 'armor', 'he'];

/* ---- gun geometry. profile coords are [forward, up]; forward = -Z ---- */
const GUNS = {
  ak(p) { const b = p.body;
    b.box(.042, .062, .32, 0, 0, -.06); b.prof([[-.10, .031], [.2, .031], [.2, .046], [.16, .06], [-.06, .06], [-.10, .046]], .036);
    b.box(.02, .02, .05, 0, .068, -.17); b.prof([[.22, -.036], [.44, -.026], [.44, .012], [.22, .012]], .048, { tint: WOOD, tone: .33 });
    b.prof([[.235, .018], [.42, .018], [.42, .05], [.235, .05]], .036, { tint: WOOD, tone: .33 }); b.cyl(.008, .008, .16, 6, 0, .04, -.5, { ax: 'z', ea: 50 });
    b.box(.022, .052, .03, 0, .024, -.57); b.cyl(.0078, .0078, .54, 6, 0, .008, -.49, { ax: 'z', ea: 50 }); b.prof([[.665, .015], [.705, .015], [.695, .078], [.675, .078]], .012);
    b.cyl(.0115, .0115, .05, 8, 0, .008, -.785, { ax: 'z' }); b.line([0, -.006, -.45, 0, -.006, -.74, .019, .03, -.27, .019, .03, -.39, -.019, .03, -.27, -.019, .03, -.39, .0215, .0, .07, .0215, -.015, -.0, .0215, -.02, -.12, .0215, .02, -.12]);
    b.prof([[-.005, -.03], [.042, -.03], [.016, -.135], [-.042, -.128]], .032, { tint: WOOD, tone: .66 });
    b.prof([[-.10, .03], [-.10, -.03], [-.16, -.046], [-.365, -.10], [-.375, -.10], [-.375, .0], [-.2, .026]], .04, { tint: WOOD, tone: .33 });
    b.poly([[0, -.03, -.042], [0, -.078, -.052], [0, -.078, -.098], [0, -.03, -.102]]); b.line([0, -.035, -.07, 0, -.06, -.064]);
    p.mag.prof([[.10, -.03], [.172, -.03], [.19, -.10], [.222, -.168], [.262, -.222], [.205, -.258], [.168, -.2], [.138, -.13], [.116, -.08]], .028, { tone: .66 });
    p.bolt.box(.03, .012, .026, .033, .036, -.115); p.bolt.box(.006, .03, .09, .0215, .038, -.06, { tone: .33 });
    return { muzzle: [.81, .008], eject: [.04, .045, -.09], lh: [.33, -.036], grip: [0, -.085] }; },
  m4(p) { const b = p.body;
    b.box(.042, .048, .22, 0, .022, -.02); b.prof([[-.09, 0], [.10, 0], [.10, -.036], [.05, -.042], [-.02, -.042], [-.09, -.02]], .038);
    b.box(.022, .012, .2, 0, .052, -.02); { const a = []; for (let i = 0; i < 10; i++) a.push(-.011, .059, .07 - i * .02, .011, .059, .07 - i * .02); b.line(a); }
    b.box(.03, .014, .07, 0, .065, .0); for (const s of [-.021, .021]) b.box(.004, .044, .05, s, .094, .0); b.box(.046, .004, .05, 0, .118, 0); b.box(.038, .04, .002, 0, .094, -.02, { tint: GLASS, tone: 0, edges: false }); b.sph(.004, 0, .094, -.022, { tint: AMBER, tone: 0, edges: false, ws: 5, hs: 3 });
    b.prof([[.13, -.026], [.40, -.02], [.40, .046], [.13, .046]], .048); { const a = []; for (let i = 0; i < 6; i++) { const z = -.16 - i * .04; a.push(.0245, .0, z, .0245, .03, z - .012, -.0245, .0, z, -.0245, .03, z - .012); } b.line(a); }
    b.prof([[.405, .0], [.45, .0], [.432, .088], [.42, .088]], .012); b.cyl(.008, .008, .16, 6, 0, .012, -.46, { ax: 'z', ea: 50 }); b.cyl(.019, .019, .2, 8, 0, .012, -.62, { ax: 'z', tone: .33 });
    b.prof([[-.06, -.02], [-.012, -.03], [-.046, -.132], [-.098, -.12]], .03, { tone: .66 }); b.cyl(.014, .014, .22, 8, 0, .02, .2, { ax: 'z' });
    b.prof([[-.20, .042], [-.335, .046], [-.34, -.072], [-.30, -.078], [-.27, -.012], [-.20, -.004]], .036, { tone: .33 });
    b.poly([[0, -.04, -.0], [0, -.082, -.006], [0, -.082, -.05], [0, -.04, -.05]]); b.line([0, -.045, -.022, 0, -.068, -.018, .0215, .02, -.06, .0215, .02, .02, .0215, .035, -.085, .0215, .005, -.085]);
    p.mag.prof([[.03, -.036], [.086, -.036], [.103, -.2], [.046, -.206]], .026, { tone: .66 }); p.bolt.box(.034, .01, .03, 0, .05, .09);
    return { muzzle: [.72, .012], eject: [.04, .03, -.04], lh: [.28, -.028], grip: [-.055, -.08] }; },
  viper(p) { const b = p.body;
    b.box(.05, .066, .27, 0, .02, -.06); b.box(.012, .02, .012, 0, .062, -.18); b.box(.03, .018, .012, 0, .06, .06); b.cyl(.021, .021, .17, 8, 0, .022, -.28, { ax: 'z', tone: .33 }); b.cyl(.011, .011, .03, 8, 0, .022, -.205, { ax: 'z' });
    b.prof([[-.03, -.012], [.026, -.012], [.014, -.13], [-.046, -.125]], .038, { tone: .66 }); b.poly([[0, -.013, -.026], [0, -.055, -.034], [0, -.055, -.082], [0, -.013, -.086]]); b.line([0, -.02, -.05, 0, -.045, -.046]);
    b.poly([[0, -.013, -.15], [0, -.075, -.145], [0, -.075, -.17], [0, -.013, -.175]]); b.line([.0255, .04, .07, .0255, .04, -.19, .0255, .0, .07, .0255, .0, -.19, .0255, .03, -.02, .0255, .03, -.08, .0255, .045, -.02, .0255, .045, -.08]);
    for (const s of [-.02, .02]) b.line([s, .03, .075, s, .03, .3, s, .03, .3, s, -.06, .31]); b.line([-.02, -.06, .31, .02, -.06, .31, -.02, .03, .3, .02, .03, .3]);
    p.mag.prof([[-.024, -.12], [.012, -.12], [.0, -.255], [-.038, -.25]], .026, { tone: .33 }); p.bolt.box(.018, .022, .026, 0, .064, -.1);
    return { muzzle: [.37, .022], eject: [.035, .04, -.06], lh: [.14, -.04], grip: [-.012, -.075] }; },
  p9(p) { const b = p.body;
    b.box(.026, .024, .17, 0, -.013, -.012); b.prof([[-.085, 0], [-.03, 0], [-.052, -.118], [-.112, -.108]], .03, { tone: .66 }); b.poly([[0, -.025, -.028], [0, -.055, -.024], [0, -.06, .025], [0, -.025, .03]]); b.line([0, -.028, -.002, 0, -.05, .002]);
    b.cyl(.006, .006, .02, 6, 0, .018, -.108, { ax: 'z' }); p.mag.prof([[-.105, -.102], [-.05, -.113], [-.053, -.13], [-.109, -.12]], .028, { tone: .33 });
    p.bolt.prof([[-.085, 0], [.10, 0], [.10, .028], [.088, .037], [-.085, .037]], .029); p.bolt.box(.006, .008, .008, 0, .041, -.09); p.bolt.box(.016, .008, .008, 0, .041, .075);
    { const a = []; for (let i = 0; i < 5; i++) a.push(.0148, .006, .04 + i * .008, .0148, .03, .045 + i * .008, -.0148, .006, .04 + i * .008, -.0148, .03, .045 + i * .008); p.bolt.line(a); }
    return { muzzle: [.12, .018], eject: [.02, .04, -.02], lh: [-.06, -.07], grip: [-.072, -.065], pistol: true }; },
  deagle(p) { const b = p.body;
    b.box(.032, .03, .2, 0, -.016, -.03); b.prof([[-.10, 0], [-.035, 0], [-.06, -.14], [-.132, -.128]], .036, { tone: .66 }); b.poly([[0, -.03, -.035], [0, -.066, -.03], [0, -.07, .03], [0, -.03, .035]]); b.line([0, -.034, -.004, 0, -.06, .0]);
    p.mag.prof([[-.125, -.12], [-.058, -.135], [-.062, -.153], [-.13, -.14]], .032, { tone: .33 });
    p.bolt.prof([[-.10, 0], [.158, 0], [.158, .03], [.07, .047], [-.10, .047]], .035); p.bolt.box(.012, .008, .2, 0, .05, -.04); p.bolt.box(.006, .012, .008, 0, .058, -.145); p.bolt.box(.02, .01, .008, 0, .052, .09);
    { const a = []; for (let i = 0; i < 6; i++) a.push(.018, .008, .05 + i * .008, .018, .04, .056 + i * .008, -.018, .008, .05 + i * .008, -.018, .04, .056 + i * .008); a.push(.018, .012, -.15, .018, .012, -.02, -.018, .012, -.15, -.018, .012, -.02); p.bolt.line(a); }
    return { muzzle: [.175, .02], eject: [.025, .05, -.02], lh: [-.07, -.085], grip: [-.085, -.075], pistol: true }; },
  awp(p) { const b = p.body;
    b.box(.044, .05, .27, 0, .012, -.03); b.cyl(.009, .0115, .7, 8, 0, .014, -.47, { ax: 'z' }); b.box(.03, .028, .065, 0, .014, -.85); b.line([.0155, .02, -.835, .0155, .008, -.835, .0155, .02, -.855, .0155, .008, -.855, .0155, .02, -.87, .0155, .008, -.87]);
    b.prof([[-.43, .036], [-.43, -.10], [-.37, -.112], [-.21, -.052], [-.125, -.06], [-.105, -.125], [-.05, -.122], [-.03, -.036], [.30, -.03], [.345, -.012], [.345, .0], [-.12, .0], [-.2, .036]], .046, { tone: .33 });
    b.box(.03, .02, .12, 0, .048, .3, { tone: .66 }); b.poly([[.0235, -.02, .15], [.0235, -.075, .2], [.0235, -.03, .23]], true); b.poly([[-.0235, -.02, .15], [-.0235, -.075, .2], [-.0235, -.03, .23]], true);
    b.cyl(.017, .017, .30, 8, 0, .082, -.07, { ax: 'z' }); b.cyl(.017, .03, .08, 8, 0, .082, -.26, { ax: 'z' }); b.cyl(.03, .03, .03, 8, 0, .082, -.315, { ax: 'z', tone: .66 }); b.cyl(.025, .017, .05, 8, 0, .082, .105, { ax: 'z' }); b.cyl(.025, .025, .025, 8, 0, .082, .14, { ax: 'z', tone: .66 });
    b.cyl(.011, .011, .03, 6, 0, .11, -.06); b.cyl(.011, .011, .03, 6, .028, .082, -.06, { ax: 'x' }); for (const z of [-.14, .02]) b.box(.022, .03, .025, 0, .05, z);
    b.line([0, -.032, -.2, 0, -.05, -.34, .01, -.032, -.2, .02, -.05, -.34, -.01, -.032, -.2, -.02, -.05, -.34]); b.poly([[0, -.036, -.03], [0, -.072, -.036], [0, -.072, -.085], [0, -.036, -.09]]);
    p.mag.box(.03, .045, .075, 0, -.052, -.13, { tone: .66 }); p.bolt.cyl(.006, .006, .05, 6, .045, .02, .07, { ax: 'x' }); p.bolt.sph(.012, .075, .02, .07, { tone: 1, ws: 6, hs: 4 });
    return { muzzle: [.89, .014], eject: [.04, .04, -.0], lh: [.2, -.034], grip: [-.078, -.085] }; },
  nova(p) { const b = p.body;
    b.prof([[-.10, -.03], [.12, -.03], [.12, .036], [-.06, .036], [-.10, .01]], .042); b.cyl(.011, .011, .52, 8, 0, .02, -.38, { ax: 'z' }); b.cyl(.012, .012, .44, 8, 0, -.012, -.34, { ax: 'z' }); b.box(.006, .01, .006, 0, .036, -.63); b.box(.03, .05, .016, 0, .004, -.55);
    b.prof([[-.10, .01], [-.10, -.03], [-.16, -.05], [-.385, -.10], [-.385, .0], [-.2, .022]], .038, { tone: .33 }); b.prof([[-.09, -.03], [-.04, -.03], [-.072, -.122], [-.124, -.112]], .032, { tone: .66 });
    b.poly([[0, -.03, -.035], [0, -.07, -.04], [0, -.07, .02], [0, -.03, .03]]); b.line([0, -.035, -.01, 0, -.058, -.006, .0215, .015, -.0, .0215, .015, -.09, .0215, -.005, 0, .0215, -.005, -.09]);
    p.bolt.cyl(.025, .025, .19, 8, 0, -.012, -.31, { ax: 'z', tone: .33 }); p.mag.cyl(.01, .01, .06, 8, 0, -.06, -.05, { ax: 'z', tint: RED, tone: 0 });
    return { muzzle: [.64, .02], eject: [.04, .02, -.04], lh: [.31, -.03], grip: [-.082, -.078], lhOnBolt: true }; },
  knife(p) { const b = p.body;
    b.prof([[.02, 0], [.2, 0], [.25, .024], [.2, .038], [.02, .038]], .005); b.line([.003, .026, -.04, .003, .026, -.19, -.003, .026, -.04, -.003, .026, -.19]); b.box(.036, .078, .014, 0, .019, -.014);
    b.prof([[-.115, .002], [.008, .002], [.008, .035], [-.115, .035]], .026, { tone: 1 }); b.box(.03, .045, .014, 0, .018, .12, { tone: .33 });
    return { muzzle: [.25, .02], lh: null, grip: [-.055, .018], knife: true }; },
  he(p) { const b = p.body; b.cyl(.036, .036, .07, 8, 0, 0, 0, { tone: .33 }); b.sph(.036, 0, .035, 0, { ws: 8, hs: 4 }); b.sph(.036, 0, -.035, 0, { ws: 8, hs: 4, tone: .66 }); b.cyl(.014, .014, .03, 6, 0, .08, 0); b.box(.012, .07, .006, .03, .04, 0, { tint: AMBER, tone: 0 });
    { const pts = []; for (let i = 0; i < 8; i++) pts.push([-.03 + Math.cos(i / 8 * 6.28) * .016, .09 + Math.sin(i / 8 * 6.28) * .016, 0]); b.poly(pts, true); }
    return { muzzle: [0, 0], lh: null, grip: [0, -.0], nade: true }; }
};

/* world (third-person / icon) model: everything merged */
const _wgCache = {};
function worldGun(key, fm, lm) {
  let c = _wgCache[key]; if (!c) { const s = new Sk('under'); const meta = GUNS[key]({ body: s, mag: s, bolt: s }); c = _wgCache[key] = { src: s.bake(fm, lm), meta }; }
  const g = new THREE.Group(); if (c.src.fill) g.add(new THREE.Mesh(c.src.fill.geometry, fm)); if (c.src.ink) g.add(new LineSegments2(c.src.ink.geometry, lm)); g.userData.meta = c.meta; return g;
}

/* ---------------- first-person viewmodel ---------------- */
const VM = { off: {},
  models: {}, cur: null, key: null, kick: 0, kickR: 0, boltT: 0, cyc: 1, swX: 0, swY: 0, drawT: 1, reloadT: -1, atk: 1, atkKind: 0, insp: 1, flashT: 0, dip: 0,
  init(aspect) {
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(54, aspect, .01, 10);
    this.fm = fillMat({ objSpace: true, freq: 75, fog: 0, hatch: .8, hw: .13 }); this.lm = lineMat({ width: 1.7, fog: false });
    this.root = new THREE.Group(); this.scene.add(this.root);
    const sh = new THREE.Shape(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, r = i % 2 ? .35 : 1; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const fg = new THREE.ShapeGeometry(sh); this.flash = new THREE.Group(); this.flash.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: AMBER, depthTest: false, side: THREE.DoubleSide })));
    const fl = new Sk('none'); const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, r = i % 2 ? .35 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); } fl.poly(pts, true);
    this.flash.add(fl.bake(null, lineMat({ width: 1.6, fog: false, depthTest: false }))); this.flash.visible = false; this.flash.traverse(o => { o.frustumCulled = false; o.renderOrder = 5; });
  },
  build(key) {
    const parts = { body: new Sk('under'), mag: new Sk('under'), bolt: new Sk('under'), handR: new Sk('sun'), handL: new Sk('sun') }, meta = GUNS[key](parts);
    const gf = meta.grip[0], gu = meta.grip[1], R = parts.handR, L = parts.handL;
    R.box(.056, .08, .066, .002, gu, -gf + .012, { tone: 1, r: [.25, 0, 0] }); R.box(.07, .03, .05, .0, gu + .035, -gf - .035, { tone: 1 }); R.box(.025, .03, .07, -.036, gu + .04, -gf - .0, { tone: 1 });
    R.limb([.012, gu - .03, -gf + .05], [.13, gu - .24, -gf + .6], .074, .082, { tone: 0 }); R.limb([.014, gu - .034, -gf + .06], [.03, gu - .06, -gf + .13], .082, .09, { tone: .33 });
    if (meta.lh) { const f = meta.lh[0], u = meta.lh[1];
      if (meta.pistol) { L.box(.06, .08, .07, -.03, u, -f, { tone: 1, r: [.2, .3, 0] }); L.limb([-.04, u - .03, -f + .04], [-.3, u - .22, -f + .5], .074, .082, { tone: 0 }); L.limb([-.042, u - .032, -f + .045], [-.075, u - .055, -f + .1], .082, .09, { tone: .33 }); }
      else { L.box(.082, .05, .11, 0, u - .022, -f, { tone: 1 }); L.box(.02, .05, .1, .04, u + .01, -f, { tone: 1 }); L.box(.02, .04, .09, -.042, u + .005, -f, { tone: 1 });
        L.limb([-.02, u - .05, -f + .05], [-.3, u - .3, -f + .52], .074, .082, { tone: 0 }); L.limb([-.022, u - .052, -f + .055], [-.055, u - .08, -f + .11], .082, .09, { tone: .33 }); } }
    const g = new THREE.Group(), m = { group: g, meta, parts: {} };
    for (const k in parts) { const b = parts[k].bake(this.fm, this.lm); b.traverse(o => o.frustumCulled = false); g.add(b); m.parts[k] = b; }
    if (key === 'nova') m.parts.mag.visible = false;
    return m;
  },
  show(key) { if (this.cur) this.root.remove(this.cur.group); this.cur = this.models[key] || (this.models[key] = this.build(key)); this.key = key; this.root.add(this.cur.group);
    this.cur.group.add(this.flash); const mz = this.cur.meta.muzzle; this.flash.position.set(0, mz[1], -mz[0] - .03); this.drawT = 0; this.reloadT = -1; this.atk = 1; this.insp = 1; this.cyc = 1; },
  fire(w) { this.kick = Math.min(this.kick + w.vm, .22); this.kickR = Math.min(this.kickR + w.vm * 1.6, .4); this.boltT = 1; this.flashT = .05; this.flash.rotation.z = rand(6.28); this.flash.scale.setScalar(rand(.05, .085) * (w.snd === 'm4' ? .5 : 1)); if (w.bolt || w.pump) this.cyc = 0; this.insp = 1; },
  update(dt, pl, w, mdx, mdy) {
    const c = this.cur; if (!c) return; const meta = c.meta, P = c.parts, r = this.root;
    this.kick = damp(this.kick, 0, 13, dt); this.kickR = damp(this.kickR, 0, 11, dt); this.boltT = damp(this.boltT, 0, 28, dt); this.dip = damp(this.dip, 0, 9, dt);
    this.swX = damp(this.swX, clamp(-mdx * .0009, -.06, .06), 9, dt); this.swY = damp(this.swY, clamp(mdy * .0009, -.05, .05), 9, dt);
    this.drawT = Math.min(1, this.drawT + dt / w.draw); if (this.flashT > 0) this.flashT -= dt; this.flash.visible = this.flashT > 0;
    const sp = Math.hypot(pl.vel.x, pl.vel.z) / 5, a = pl.onGround ? Math.min(sp, 1) : 0, ph = pl.bobPhase, e = 1 - Math.pow(1 - this.drawT, 3);
    const O = VM.off; let x = O.x ?? .13, y = O.y ?? -.13, z = O.z ?? -.64, rx = 0, ry = .045, rz = 0;
    if (meta.pistol) { x = O.x ?? .1; y = O.y ?? -.1; z = O.z ?? -.5; } if (meta.knife) { x = .13; y = -.13; z = -.3; rx = .5; ry = .7; rz = -.4; } if (meta.nade) { x = .13; y = -.12; z = -.3; }
    x += Math.sin(ph) * .0065 * a + this.swX * .5; y += -Math.abs(Math.cos(ph)) * .007 * a + .004 * a - this.swY * .4 - this.dip - pl.crouchAmt * .012 + clamp(pl.vel.y, -6, 6) * -.0035;
    z += this.kick; rx += this.kickR * .55 + this.swY; ry += this.swX * 1.4; rz += this.swX * -1.2 + Math.sin(ph) * .01 * a;
    rx -= (1 - e) * 1.0; y -= (1 - e) * .22;
    // reload choreography
    let magY = 0, magVis = true, lhX = 0, lhY = 0, lhZ = 0;
    if (this.reloadT >= 0) { const t = this.reloadT, env = Math.min(1, t / .14) * Math.min(1, (1 - t) / .14); rz += env * (meta.pistol ? -.5 : .42); rx += env * .22; y -= env * .03; x -= env * .02;
      const mo = t < .2 ? 0 : t < .4 ? (t - .2) / .2 : t < .58 ? 1 : t < .78 ? 1 - (t - .58) / .2 : 0; magY = -mo * .3; magVis = !(t > .4 && t < .58) ; lhY = magY * .9; lhZ = mo * .06;
      if (this.key === 'nova') { const k = (t * 5) % 1; magVis = t > .1 && t < .9; magY = 0; lhY = -.05 + Math.sin(k * Math.PI) * .04; lhZ = .22 - Math.sin(k * Math.PI) * .05; P.mag.position.set(0, .03 + Math.sin(k * Math.PI) * .02, .1 - k * .1); }
      if (t > .84 && t < .97) { const k = Math.sin((t - .84) / .13 * Math.PI); P.bolt.position.z = k * .05; if (!meta.pistol && !meta.lhOnBolt) { lhX = .05 * k; lhY += .06 * k; lhZ = .2 * k; } } }
    if (this.key !== 'nova') { P.mag.position.y = magY; } P.mag.visible = this.key === 'nova' ? (this.reloadT >= 0 && magVis) : magVis;
    if (this.reloadT < 0 || this.reloadT <= .84) P.bolt.position.z = this.boltT * (meta.pistol ? .035 : .03);
    // bolt / pump cycle
    if (this.cyc < 1) { this.cyc = Math.min(1, this.cyc + dt / (w.bolt ? 1.0 : .55)); const k = Math.sin(clamp((this.cyc - .25) / .6, 0, 1) * Math.PI);
      if (w.bolt) { rz += k * .22; rx += k * .08; P.bolt.position.z = k * .07; P.bolt.rotation.z = k * .6; } else { P.bolt.position.z = k * .085; lhZ = k * .085; } }
    P.handL.position.set(lhX, lhY, lhZ);
    // knife / grenade swings
    if (this.atk < 1) { this.atk = Math.min(1, this.atk + dt / (this.atkKind ? .5 : .3)); const k = Math.sin(this.atk * Math.PI);
      if (meta.nade) { z -= k * .22; y += k * .1; rx -= k * .8; } else if (this.atkKind) { z -= k * .28; rx -= k * .3; ry -= k * .5; } else { x -= k * .2; ry += k * 1.0; rz += k * .6; z -= k * .08; } }
    if (this.insp < 1) { this.insp = Math.min(1, this.insp + dt / 2.6); const k = Math.sin(this.insp * Math.PI), q = Math.sin(this.insp * 6.2832); ry += k * .95; rz += q * .4; x -= k * .06; y += k * .025; rx += k * .15; }
    r.position.set(x, y, z); r.rotation.set(rx, ry, rz, 'YXZ'); r.visible = !(pl.scoped > 0) && pl.alive;
  }
};
