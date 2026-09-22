'use strict';
/* ============ INK STRIKE · progress: multi-kills, MVP, damage report, weapon mastery & stroke skins ============ */
const SKINS = [{ n: '素描', need: 0, ink: INK, w: 1.7 }, { n: '朱砂', need: 10, ink: 0xa81f1f, w: 1.8 }, { n: '靛青', need: 30, ink: 0x1f4f8f, w: 1.8 }, { n: '鎏金', need: 75, ink: 0x9a6a00, w: 2.1 }];
const STREAK = ['', '', '双杀 · 连笔', '三杀 · 行云', '四杀 · 泼墨', '五杀 · 一气呵成'];
const PROG = {
  data: Object.assign({ kills: {}, skin: {}, mvp: 0 }, JSON.parse(localStorage.getItem('inkstrike_prog') || '{}')), dmg: {}, rs: new Map(), streakN: 0, streakT: -9,
  save() { localStorage.setItem('inkstrike_prog', JSON.stringify(this.data)); },
  tier(k) { const n = this.data.kills[k] || 0; let t = 0; SKINS.forEach((s, i) => { if (n >= s.need) t = i; }); return t; },
  skin(k) { const t = this.tier(k), s = this.data.skin[k]; return s === undefined ? t : Math.min(s, t); },
  rstat(e) { let r = this.rs.get(e); if (!r) this.rs.set(e, r = { k: 0, dmg: 0, plant: 0, defuse: 0 }); return r; },
  resetRound() { this.rs.clear(); this.dmg = {}; if (G.mode === 'comp') this.streakN = 0; $('report').classList.remove('on'); },
  onHurt(e, dmg, by) { if (!by || by === e) return; this.rstat(by).dmg += dmg; const pl = G.player; if (by === pl) { const r = this.dmg[e.name] || (this.dmg[e.name] = { team: e.team, dealt: 0, hits: 0, taken: 0, thits: 0 }); r.dealt += dmg; r.hits++; } else if (e === pl) { const r = this.dmg[by.name] || (this.dmg[by.name] = { team: by.team, dealt: 0, hits: 0, taken: 0, thits: 0 }); r.taken += dmg; r.thits++; } },
  onKill(e, by, wkey) {
    if (!by || by === e) return; this.rstat(by).k++; if (!by.isPlayer) return;
    const now = G.now; this.streakN = (G.mode === 'comp' || now - this.streakT < 4.5) ? this.streakN + 1 : 1; this.streakT = now;
    if (this.streakN >= 2) { const n = Math.min(5, this.streakN); setTimeout(() => { banner(STREAK[n], `连续击倒 ×${this.streakN}`, 'go'); SFX.streak(n); }, 350); }
    if (wkey && WEAPONS[wkey] && G.mode !== 'range') { const before = this.tier(wkey); this.data.kills[wkey] = (this.data.kills[wkey] || 0) + 1; const after = this.tier(wkey); this.save();
      if (after > before) { delete this.data.skin[wkey]; this.save(); setTimeout(() => { banner(`解锁「${SKINS[after].n}」笔触`, `${WEAPONS[wkey].name} · 熟练度 ${this.data.kills[wkey]} 击倒`, 'go'); SFX.bell(true); if (G.player.cur === wkey) { VM.key = null; switchTo(wkey); } }, 1500); } }
  },
  mvp(win) { let best = null, bs = -1; for (const [e, r] of this.rs) { if (e.team !== win) continue; const s = r.k * 100 + r.dmg + (r.plant + r.defuse) * 160; if (s > bs) { bs = s; best = e; } } if (!best) return ''; best.mvps = (best.mvps || 0) + 1; if (best.isPlayer) { this.data.mvp++; this.save(); } const r = this.rs.get(best); return `MVP · ${best.name}(${r.defuse ? '拆除墨核 · ' : r.plant ? '安放墨核 · ' : ''}${r.k} 击倒 / ${Math.round(r.dmg)} 伤害)`; },
  report(title) {
    const rows = Object.entries(this.dmg).sort((a, b) => (b[1].dealt + b[1].taken) - (a[1].dealt + a[1].taken)).slice(0, 6); if (!rows.length) return;
    $('reportIn').innerHTML = `<h4>${title}</h4>` + rows.map(([n, r]) => `<div><span class="${r.team}">${n}</span><em class="o">${r.dealt ? `造成 ${Math.round(r.dealt)} · ${r.hits} 次` : '—'}</em><em class="i">${r.taken ? `受到 ${Math.round(r.taken)} · ${r.thits} 次` : '—'}</em></div>`).join(''); $('report').classList.add('on');
  },
  drawArmory() {
    const keys = Object.keys(WEAPONS).filter(k => !WEAPONS[k].nade);
    $('armoryGrid').innerHTML = keys.map(k => { const n = this.data.kills[k] || 0, t = this.tier(k), s = this.skin(k), next = SKINS[t + 1], pct = next ? Math.min(100, (n - SKINS[t].need) / (next.need - SKINS[t].need) * 100) : 100;
      return `<div class="card" data-k="${k}"><img class="ico" src="${G.icons[k]}"><div class="nm">${WEAPONS[k].name}</div><div class="en">${n} 击倒 · ${next ? `距「${next.n}」还差 ${next.need - n}` : '已满级'}</div><div class="bar"><i class="hatch" style="width:${pct}%"></i></div><div class="sk">${SKINS.map((q, i) => `<span class="${i === s ? 'cur' : ''} ${i > t ? 'lock' : ''}" style="--c:#${q.ink.toString(16).padStart(6, '0')}">${q.n}</span>`).join('')}</div></div>`; }).join('');
    $('armoryMvp').textContent = `生涯 MVP ×${this.data.mvp}`;
  },
  bind() { $('armoryGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if (!c) return; const k = c.dataset.k, t = this.tier(k); this.data.skin[k] = (this.skin(k) + 1) % (t + 1); this.save(); this.drawArmory(); SFX.init(); SFX.ui(); });
    $('armoryBtn').onclick = () => { this.drawArmory(); $('armory').classList.add('on'); }; $('armoryClose').onclick = () => $('armory').classList.remove('on'); }
};
