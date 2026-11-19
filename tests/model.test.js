import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTITIES, GAUGES, PRESETS, simulate, defaults, riskRate } from '../src/model.js';
import { STR } from '../src/i18n.js';

const last = r => r.points[r.points.length - 1];
const at = (r, t) => r.points.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
const min = (r, g) => Math.min(...r.points.map(p => p.g[g]));
const max = (r, g) => Math.max(...r.points.map(p => p.g[g]));
const evs = r => r.events.map(e => e.key);

/* ---------- generic: every entity ---------- */
for (const e of ENTITIES) {
  test(`${e.key}: well-formed output (defaults, extremes, both arms)`, () => {
    const variants = [defaults(e.key)];
    for (const p of e.params.filter(q => q.type !== 'choice')) {
      variants.push({ ...defaults(e.key), [p.key]: p.min }, { ...defaults(e.key), [p.key]: p.max });
    }
    for (const p of e.params.filter(q => q.type === 'choice')) for (const o of p.options) variants.push({ ...defaults(e.key), [p.key]: o });
    for (const v of variants) for (const tr of [false, true]) {
      const r = simulate(e.key, v, tr);
      assert.equal(r.points.length, Math.round(e.tMax / e.dt) + 1);
      for (let i = 1; i < r.points.length; i++) assert.ok(r.points[i].t > r.points[i - 1].t);
      for (const pt of r.points) {
        for (const g of [...e.tiles, ...e.charts]) {
          assert.ok(Number.isFinite(pt.g[g]) && pt.g[g] >= 0, `${e.key} ${g}=${pt.g[g]}`);
          assert.ok(GAUGES[g], `gauge ${g} defined`);
        }
        for (const a of pt.active) assert.ok(e.steps.includes(a), `${e.key} unknown step ${a}`);
        assert.ok(pt.lesion >= 0 && pt.lesion <= 1);
      }
      for (const ev of r.events) assert.ok(ev.t >= 0 && ev.t <= e.tMax);
    }
  });
}

test('pure: same input → same output, params not mutated', () => {
  for (const e of ENTITIES) {
    const p = defaults(e.key); const copy = JSON.stringify(p);
    assert.deepEqual(simulate(e.key, p, true), simulate(e.key, p, true));
    assert.equal(JSON.stringify(p), copy);
  }
});

test('upper-tract risk starts above 40 cmH2O of bladder pressure', () => {
  assert.equal(riskRate(40), 0);
  assert.ok(riskRate(80) > riskRate(50));
});

test('i18n: every key used by the model exists in ES and EN', () => {
  for (const lang of ['es', 'en']) {
    const S = STR[lang];
    for (const e of ENTITIES) {
      const E = S.ent[e.key];
      for (const f of ['name', 'what', 'params', 'sees', 'tto']) assert.ok(E[f], `${lang} ${e.key}.${f}`);
      for (const st of e.steps) assert.ok(E.steps[st], `${lang} step ${e.key}.${st}`);
      for (const p of e.params) {
        assert.ok(S.params[p.key], `${lang} param ${p.key}`);
        if (p.type === 'choice') for (const o of p.options) assert.ok(S.choice[p.key][o], `${lang} choice ${p.key}.${o}`);
      }
      for (const g of [...e.tiles, ...e.charts]) assert.ok(S.gauges[g], `${lang} gauge ${g}`);
      assert.ok(S.units[e.unit]);
      for (const tr of [false, true]) {
        const r = simulate(e.key, defaults(e.key), tr);
        for (const ev of r.events) assert.equal(typeof S.ev[ev.key], 'function', `${lang} event ${ev.key}`);
        for (const pt of r.points) if (pt.badge) assert.ok(S.badge[pt.badge], `${lang} badge ${pt.badge}`);
      }
    }
    for (const k of Object.keys(PRESETS)) assert.ok(S.presets[k], `${lang} preset ${k}`);
  }
});

/* ---------- presets ---------- */
test('presets reference valid entities and parameters', () => {
  for (const [k, pr] of Object.entries(PRESETS)) {
    const e = ENTITIES.find(x => x.key === pr.entity);
    assert.ok(e, k);
    for (const pk of Object.keys(pr.params)) assert.ok(e.params.some(p => p.key === pk), `${k}.${pk}`);
    for (const ev of [...simulate(pr.entity, pr.params, false).events, ...simulate(pr.entity, pr.params, true).events]) {
      assert.equal(typeof STR.es.ev[ev.key], 'function', `${k} event ${ev.key}`);
    }
  }
});

/* ---------- mechanisms ---------- */
const run = (k, p = {}, tr = false) => simulate(k, p, tr);
const L = (r) => last(r).g;
const ev = (r, k) => r.events.find(e => e.key === k);

test('suprapontine lesion: coordinated overactive detrusor with urge incontinence at low pressure, no renal risk', () => {
  const u = run('suprapontina', PRESETS.ictus_urgencia.params);
  assert.ok(L(u).ep > 2 && L(u).pdet < 40 && max(u, 'hidro') === 0);
  assert.ok(L(run('suprapontina', PRESETS.ictus_urgencia.params, true)).ep < L(u).ep * 0.5);
});

test('suprasacral lesion: spinal shock with retention, then high pressures with hydronephrosis and GFR loss; catheterisation + antimuscarinic protect the kidney', () => {
  const p = PRESETS.lesion_cervical.params;
  const u = run('suprasacra', p);
  assert.ok(at(u, 0.5).g.residuo > 400 && at(u, 0.5).g.pdet < 20, 'shock: areflexic, retained');
  assert.ok(L(u).pdet > 60 && L(u).hidro >= 3 && L(u).fg < 60 && ev(u, 'erc'));
  const t = run('suprasacra', p, true);
  assert.ok(L(t).pdet < 40 && max(t, 'hidro') < 0.5 && L(t).fg > 90 && L(t).itu < L(u).itu && ev(t, 'toxina'));
  assert.ok(ev(u, 'disreflexia') && !ev(run('suprasacra', { ...p, nivel: 'bajo' }), 'disreflexia'), 'dysreflexia only above T6');
});

test('sacral / peripheral lesion: acontractile bladder with overflow and infections; poor compliance adds renal risk; self-catheterisation empties it', () => {
  const n = run('sacra', PRESETS.neuropatia_diabetica.params), m = run('sacra', PRESETS.mielomeningocele.params);
  assert.ok(L(n).residuo > 300 && L(n).itu > 5 && max(n, 'hidro') === 0);
  assert.ok(L(m).hidro > 2);
  const t = run('sacra', PRESETS.mielomeningocele.params, true);
  assert.ok(L(t).residuo < 50 && L(t).ep < 1 && L(t).hidro === 0);
});

test('autonomic dysreflexia: bladder distension → extreme hypertension with bradycardia above T6; emptying the bladder resolves it; earlier is better', () => {
  const u = run('disreflexia', PRESETS.disreflexia_globo.params);
  assert.ok(max(u, 'pas') > 200 && min(u, 'fc') < 55 && ev(u, 'riesgo_acv'));
  assert.ok(max(run('disreflexia', { nivel: 'bajo' }), 'pas') < 130, 'no dysreflexia below T6');
  const early = run('disreflexia', PRESETS.disreflexia_globo.params, true), late = run('disreflexia', PRESETS.disreflexia_tardia.params, true);
  assert.ok(ev(early, 'resuelta') && L(early).pas < 140 && max(early, 'pas') < max(late, 'pas'));
});

test('enuresis: alarm is slower but durable; desmopressin is fast but relapses on stopping unless withdrawn in a structured way', () => {
  const a = run('enuresis', { tto: 'alarma' }, true), d = run('enuresis', { tto: 'desmopresina' }, true), s = run('enuresis', { tto: 'retirada_estructurada' }, true);
  assert.ok(at(d, 1).g.noches < at(a, 1).g.noches, 'desmopressin acts faster');
  assert.ok(L(a).noches < L(d).noches && L(s).noches < L(d).noches);
  assert.ok(L(run('enuresis', { tipo: 'no_monosintomatica' }, true)).noches > L(a).noches);
  assert.ok(L(run('enuresis', {})).noches < 15, 'some spontaneous resolution');
});

test('overactive bladder: first-line drugs work when it responds; refractory → third-line options, toxin raises the residual', () => {
  const r = run('vejiga_hiperactiva', PRESETS.vh_responde.params, true);
  assert.ok(L(r).urg < 4.5 && L(r).ep < 1);
  const rf = run('vejiga_hiperactiva', PRESETS.vh_refractaria_sacra.params, true);
  assert.ok(at(rf, 2.5).g.urg > 7 && L(rf).urg < 5 && ev(rf, 'sacra'));
  const tx = run('vejiga_hiperactiva', { respuesta: 'refractaria', tercera: 'toxina' }, true);
  assert.ok(L(tx).residuo > 150 && ev(tx, 'residuo_toxina'));
});

test('stress incontinence: the sling cures most (≤ 10 % of leakage), pelvic-floor training helps while kept up, mixed incontinence responds worse', () => {
  const m = L(run('iue', PRESETS.iue_malla.params, true)), u = L(run('iue', PRESETS.iue_malla.params));
  assert.ok(m.pad <= u.pad * 0.12);
  const kept = L(run('iue', { tto: 'suelo_pelvico', adherencia: 'mantiene' }, true)), quit = L(run('iue', { tto: 'suelo_pelvico', adherencia: 'abandona' }, true));
  assert.ok(kept.pad < quit.pad && kept.pad > m.pad);
  assert.ok(L(run('iue', PRESETS.iu_mixta.params, true)).pad / 80 > m.pad / 60);
});

test('severe sphincter deficiency: artificial sphincter works once activated (~6 weeks after implantation)', () => {
  const p = PRESETS.esfinter_postprostatectomia.params, t = run('esfinter_hipoactivo', p, true);
  assert.ok(at(t, p.inicio + 1).g.pad > 300 && L(t).pad < 50 && ev(t, 'activacion').t >= p.inicio + 1.5);
});

test('functional incontinence resolves when the external factor is corrected', () => {
  for (const f of ['delirio', 'infeccion', 'medicacion', 'diuresis', 'atrofia', 'restriccion', 'estrenimiento']) {
    const t = run('iu_funcional', { factor: f }, true), u = run('iu_funcional', { factor: f });
    assert.ok(L(t).ep < 0.5 && L(u).ep > 2.5, f);
  }
  const fast = ev(run('iu_funcional', { factor: 'infeccion' }, true), 'resuelta'), slow = ev(run('iu_funcional', { factor: 'atrofia' }, true), 'resuelta');
  assert.ok(fast && (!slow || fast.t < slow.t), 'infection resolves faster than atrophy');
});
