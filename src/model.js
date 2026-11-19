// Neurogenic bladder and urinary incontinence — pure model (no DOM).
// Neurogenic disorders follow the level of the lesion (suprapontine / suprasacral spinal / sacral-peripheral),
// with spinal shock first and upper-tract risk when storage or voiding pressures are high. Non-neurogenic disorders
// (enuresis, overactive bladder, stress incontinence, sphincter deficiency, functional incontinence) follow their
// symptom counts. Values marked "Model" are teaching assumptions.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const approach = (v, target, dt, tau) => v + (target - v) * Math.min(1, dt / tau);

export const GAUGES = {
  ep: { unit: '/24 h', dec: 1, normal: [0, 0.2], yMin: 0 },
  urg: { unit: '/24 h', dec: 1, normal: [0, 1], yMin: 0 },
  frecuencia: { unit: '/24 h', dec: 0, normal: [4, 8], yMin: 0 },
  pdet: { unit: 'cmH₂O', dec: 0, normal: [0, 40], yMin: 0 },
  capacidad: { unit: 'mL', dec: 0, normal: [350, 550], yMin: 0 },
  residuo: { unit: 'mL', dec: 0, normal: [0, 50], yMin: 0 },
  hidro: { unit: '0–4', dec: 1, normal: [0, 0.5], yMin: 0, yMax: 4 },
  fg: { unit: 'mL/min', dec: 0, normal: [90, 130], yMin: 0 },
  itu: { unit: '', dec: 1, normal: null, yMin: 0 },
  pas: { unit: 'mmHg', dec: 0, normal: [100, 139], yMin: 60 },
  fc: { unit: '/min', dec: 0, normal: [60, 100], yMin: 0 },
  vol: { unit: 'mL', dec: 0, normal: [0, 500], yMin: 0 },
  noches: { unit: '/30 d', dec: 1, normal: [0, 1], yMin: 0 },
  pad: { unit: 'g/24 h', dec: 0, normal: [0, 4], yMin: 0 },
  iciq: { unit: '0–21', dec: 0, normal: [0, 5], yMin: 0, yMax: 21 },
};

/** Upper-tract risk (Model): storage pressure above 40 cmH2O drives hydronephrosis. */
export const riskRate = (pdet) => Math.max(0, pdet - 40) / 40;

const R = (key, min, max, step, def, unit = '', dec = 0) => ({ key, min, max, step, def, unit, dec });
const Ch = (key, options, def) => ({ key, type: 'choice', options, def });
const M = (key, loc, unit, tMax, dt, params, tiles, charts, steps, treat = true) => ({ key, loc, unit, tMax, dt, treat, params, tiles, charts, steps });

export const ENTITIES = [
  M('suprapontina', 'cerebro', 'months', 24, 0.25, [R('gravedad', 1, 10, 1, 6), R('inicio', 0, 12, 1, 2)],
    ['ep', 'urg', 'pdet', 'residuo', 'hidro'], ['ep', 'urg'], ['lesion', 'coordinada', 'hiperactividad', 'iuu', 'bajas_presiones', 'tto']),
  M('suprasacra', 'medula', 'months', 24, 0.25, [Ch('nivel', ['alto', 'bajo'], 'alto'), R('shock', 0.5, 4, 0.5, 1.5, '', 1), R('gravedad', 1, 10, 1, 7)],
    ['pdet', 'residuo', 'hidro', 'fg', 'itu'], ['pdet', 'hidro'], ['lesion', 'shock', 'hiperreflexia', 'disinergia', 'altas_presiones', 'riesgo_renal', 'disreflexia', 'tto']),
  M('sacra', 'sacra', 'months', 24, 0.25, [Ch('acomodacion', ['normal', 'baja'], 'normal'), R('gravedad', 1, 10, 1, 7)],
    ['residuo', 'ep', 'pdet', 'itu', 'hidro'], ['residuo', 'itu'], ['lesion', 'shock', 'acontractil', 'rebosamiento', 'infeccion', 'tto']),
  M('disreflexia', 'medula', 'hours', 2, 0.01, [Ch('nivel', ['alto', 'bajo'], 'alto'), R('inicio', 0.3, 1.8, 0.05, 1, '', 2)],
    ['pas', 'fc', 'vol'], ['pas', 'fc'], ['noxa', 'simpatico', 'hta', 'bradicardia', 'tto']),
  M('enuresis', 'nino', 'months', 12, 0.1, [R('edad', 5, 14, 1, 7), Ch('tipo', ['monosintomatica', 'no_monosintomatica'], 'monosintomatica'), R('noches0', 4, 30, 1, 15), Ch('tto', ['alarma', 'desmopresina', 'retirada_estructurada'], 'alarma')],
    ['noches'], ['noches'], ['maduracion', 'nocturna', 'tto', 'recaida']),
  M('vejiga_hiperactiva', 'detrusor', 'months', 12, 0.1, [R('urg0', 3, 15, 1, 8), R('ep0', 0, 6, 0.5, 2, '', 1), Ch('respuesta', ['responde', 'refractaria'], 'responde'), Ch('tercera', ['tibial', 'sacra', 'toxina'], 'sacra')],
    ['urg', 'ep', 'frecuencia', 'residuo'], ['urg', 'ep'], ['hiperactividad', 'urgencia', 'iuu', 'tto', 'segunda_linea']),
  M('iue', 'suelo', 'months', 24, 0.25, [R('pad0', 10, 200, 10, 60), Ch('tipo', ['pura', 'mixta'], 'pura'), Ch('tto', ['suelo_pelvico', 'malla'], 'malla'), Ch('adherencia', ['mantiene', 'abandona'], 'mantiene')],
    ['pad', 'ep', 'iciq'], ['pad', 'ep'], ['debilidad', 'esfuerzo', 'escape', 'tto']),
  M('esfinter_hipoactivo', 'esfinter', 'months', 12, 0.1, [R('pad0', 200, 800, 50, 500), R('inicio', 0, 6, 0.5, 1, '', 1)],
    ['pad', 'ep', 'iciq'], ['pad', 'iciq'], ['esfinter', 'escape_continuo', 'implante', 'activacion']),
  M('iu_funcional', 'externo', 'weeks', 12, 0.1, [Ch('factor', ['delirio', 'infeccion', 'medicacion', 'diuresis', 'atrofia', 'restriccion', 'estrenimiento'], 'infeccion'), R('inicio', 0, 6, 0.5, 1, '', 1)],
    ['ep', 'pad'], ['ep', 'pad'], ['factor', 'escape', 'tto']),
];

export function defaults(key) {
  const e = ENTITIES.find(x => x.key === key);
  return Object.fromEntries(e.params.map(p => [p.key, p.def]));
}

function runner(e, init, step) {
  const points = [], events = [], fired = new Set();
  const emit = (t, k, args = []) => { if (fired.has(k)) return; fired.add(k); events.push({ t, key: k, args }); };
  const st = { ...init };
  const n = Math.round(e.tMax / e.dt);
  for (let i = 0; i <= n; i++) {
    const t = +(i * e.dt).toFixed(6);
    const o = step(st, t, e.dt, emit, i);
    const g = { ...o.g };
    for (const k of Object.keys(g)) g[k] = Number.isFinite(g[k]) ? Math.max(0, g[k]) : 0;
    points.push({ t, g, active: o.active.filter(a => e.steps.includes(a)), lesion: clamp(o.lesion ?? 0, 0, 1), badge: o.badge ?? null });
  }
  return { points, events };
}
const E = (k) => ENTITIES.find(x => x.key === k);
const sevOf = (g) => g / 7;
const iciqOf = (ep, pad) => clamp(Math.round(4 + 2.2 * Math.min(4, ep) + Math.min(6, pad / 40)), 0, 21);  // Model

const MODELS = {
  // Suprapontine (stroke, Parkinson, head injury): pontine centre intact → coordinated, overactive detrusor,
  // urge incontinence at LOW pressure (no renal risk). Anticholinergic / β3 from `inicio`.
  suprapontina(p, tr) {
    const s = sevOf(p.gravedad);
    return runner(E('suprapontina'), { ep: 0.5, urg: 2 }, (st, t, dt, emit) => {
      const on = tr && t >= p.inicio;
      if (on) emit(t, 'anticolinergico');
      st.ep = approach(st.ep, (on ? 0.35 : 1) * 4 * s, dt, on ? 1 : 2);
      st.urg = approach(st.urg, (on ? 0.4 : 1) * 9 * s, dt, on ? 1 : 2);
      if (st.ep > 1) emit(t, 'iuu');
      const active = ['lesion', 'coordinada', 'hiperactividad', 'bajas_presiones'];
      if (st.ep > 1) active.push('iuu');
      if (on) active.push('tto');
      return { g: { ep: st.ep, urg: st.urg, frecuencia: 8 + st.urg, pdet: 25 + 5 * s, capacidad: 250, residuo: 30, hidro: 0, fg: 90, itu: 0 }, active, lesion: s * 0.6, badge: 'bajas' };
    });
  },

  // Suprasacral spinal lesion (trauma, MS, syringomyelia): spinal shock (areflexia → retention with overflow)
  // then detrusor hyperreflexia + detrusor–sphincter dyssynergia → high pressures, hydronephrosis, infections,
  // GFR loss. Above T6: autonomic dysreflexia. Treatment: catheter in shock; then clean intermittent self-
  // catheterisation + anticholinergic/β3, intravesical botulinum toxin 200 U every 9 months if pressure stays high.
  suprasacra(p, tr) {
    const s = sevOf(p.gravedad);
    return runner(E('suprasacra'), { pdet: 10, res: 600, hidro: 0, fg: 100, itu: 0, tox: -99 }, (st, t, dt, emit) => {
      const shock = t < p.shock;
      const on = tr && !shock;
      if (shock) emit(t, 'shock');
      if (tr && shock) emit(t, 'sonda');
      if (!shock) emit(t, 'fin_shock');
      if (on) emit(t, 'acli');
      let targetP = shock ? 10 : 40 + 45 * s;
      if (on) targetP = 30 + 10 * s;
      if (on && t - st.tox >= 9 && targetP > 32 && t >= p.shock + 3) { st.tox = t; emit(t, 'toxina'); }
      if (on && t - st.tox < 9) targetP = 25;
      st.pdet = approach(st.pdet, targetP, dt, 0.75);
      st.res = shock ? (tr ? 0 : 600) : on ? 0 : approach(st.res, 120 + 60 * s, dt, 1);
      st.hidro = clamp(st.hidro + (riskRate(st.pdet) * 0.35 - (st.pdet < 35 ? 0.15 : 0)) * dt, 0, 4);
      st.fg = Math.max(15, st.fg - 0.9 * st.hidro * dt);
      st.itu += (on ? 0.08 : shock && !tr ? 0.5 : 0.35) * dt;
      if (st.pdet > 40) emit(t, 'altas_presiones');
      if (st.hidro >= 2) emit(t, 'hidronefrosis');
      if (st.fg < 60) emit(t, 'erc');
      if (!shock && p.nivel === 'alto') emit(t, 'disreflexia');
      const active = ['lesion'];
      if (shock) active.push('shock');
      else active.push('hiperreflexia', 'disinergia');
      if (st.pdet > 40) active.push('altas_presiones');
      if (st.hidro > 0.5) active.push('riesgo_renal');
      if (!shock && p.nivel === 'alto') active.push('disreflexia');
      if (tr) active.push('tto');
      return { g: { pdet: st.pdet, residuo: st.res, hidro: st.hidro, fg: st.fg, itu: st.itu, ep: shock ? 6 : on ? 0.5 : 3, capacidad: on ? 450 : 200, urg: 0, frecuencia: 0, alto: p.nivel === 'alto' ? 1 : 0 }, active,
        lesion: clamp(st.pdet / 100, 0, 1), badge: shock ? 'shock' : st.pdet > 40 ? 'altas' : 'bajas' };
    });
  },

  // Sacral / peripheral (myelomeningocele, tethered cord, diabetes, radical pelvic surgery, disc herniation):
  // acontractile detrusor → retention with overflow, infections; with poor compliance pressures also rise.
  // Treatment: clean intermittent self-catheterisation (± α-blocker).
  sacra(p, tr) {
    const s = sevOf(p.gravedad);
    const lowC = p.acomodacion === 'baja';
    return runner(E('sacra'), { res: 600, hidro: 0, itu: 0 }, (st, t, dt, emit) => {
      const shock = t < 1;
      const on = tr && t >= 0.5;
      if (shock) emit(t, 'shock');
      if (on) emit(t, 'acli');
      st.res = on ? approach(st.res, 20, dt, 0.25) : approach(st.res, 300 + 250 * s, dt, 1);
      const pdet = on ? (lowC ? 25 : 10) : (lowC ? 35 + 25 * s : 10);
      st.hidro = clamp(st.hidro + (riskRate(pdet) * 0.35 - (pdet < 35 ? 0.1 : 0)) * dt, 0, 4);
      st.itu += (on ? 0.06 : 0.3 + 0.2 * s) * dt;
      const ep = on ? 0.3 : 2 + 3 * s;
      if (st.res > 300) emit(t, 'rebosamiento');
      if (st.itu >= 1) emit(t, 'itu');
      if (st.hidro >= 2) emit(t, 'hidronefrosis');
      const active = ['lesion'];
      if (shock) active.push('shock');
      active.push('acontractil');
      if (st.res > 300) active.push('rebosamiento');
      if (st.itu >= 1 && !on) active.push('infeccion');
      if (on) active.push('tto');
      return { g: { residuo: st.res, ep, pdet, itu: st.itu, hidro: st.hidro, capacidad: 600, fg: 100 - 4 * st.hidro, urg: 0, frecuencia: 0 }, active,
        lesion: clamp(st.res / 600, 0, 1), badge: lowC && !on ? 'altas' : 'bajas' };
    });
  },

  // Autonomic dysreflexia (lesion above T6): a noxious stimulus below the lesion (here a distending bladder)
  // triggers an unopposed sympathetic reflex → extreme hypertension with reflex bradycardia. Emergency:
  // remove the stimulus (catheterise) + IV antihypertensive.
  disreflexia(p, tr) {
    const high = p.nivel === 'alto';
    return runner(E('disreflexia'), { vol: 300, pas: 115, fc: 72 }, (st, t, dt, emit) => {
      const on = tr && t >= p.inicio;
      if (t >= 0.1) emit(t, 'noxa');
      if (on) emit(t, 'sondaje');
      st.vol = on ? approach(st.vol, 20, dt, 0.05) : t >= 0.1 ? Math.min(800, st.vol + 300 * dt) : st.vol;
      const drive = high ? Math.max(0, st.vol - 400) / 300 : 0;
      st.pas = approach(st.pas, 115 + 100 * Math.min(1.3, drive) - (on ? 10 : 0), dt, on ? 0.12 : 0.08);
      st.fc = approach(st.fc, 72 - 22 * Math.min(1, drive), dt, 0.08);
      if (st.pas > 160) { emit(t, 'hta'); st.hadHta = true; }
      if (st.pas > 200) emit(t, 'riesgo_acv');
      if (st.fc < 55) emit(t, 'bradicardia');
      if (on && st.hadHta && st.pas < 140) emit(t, 'resuelta');
      const active = [];
      if (t >= 0.1 && !on) active.push('noxa');
      if (drive > 0.1) active.push('simpatico');
      if (st.pas > 160) active.push('hta');
      if (st.fc < 60) active.push('bradicardia');
      if (on) active.push('tto');
      return { g: { pas: st.pas, fc: st.fc, vol: st.vol, alto: high ? 1 : 0 }, active, lesion: clamp((st.pas - 115) / 120, 0, 1), badge: high ? 'encima_t6' : 'debajo_t6' };
    });
  },

  // Enuresis (≥ 5 years, ≥ 1 night/month): spontaneous resolution ~15 %/year. Alarm = first choice (slow, durable);
  // desmopressin works fast but relapses on stopping unless withdrawn in a structured way.
  enuresis(p, tr) {
    const nonMono = p.tipo === 'no_monosintomatica';
    return runner(E('enuresis'), { n: p.noches0 }, (st, t, dt, emit) => {
      const natural = p.noches0 * Math.pow(0.85, t / 12);
      let target = natural, tau = 2;
      const resp = nonMono ? 0.5 : 1;           // poorer response when non-monosymptomatic (Model)
      if (tr) {
        if (p.tto === 'alarma') { target = natural * (1 - 0.8 * resp); tau = 1.5; }
        else {
          const stopped = t >= 6;
          if (!stopped) { target = natural * (1 - 0.7 * resp); tau = 0.2; }
          else target = p.tto === 'retirada_estructurada' ? natural * (1 - 0.45 * resp) : natural * 0.9;
          if (stopped) emit(t, p.tto === 'retirada_estructurada' ? 'retirada' : 'suspension');
        }
        emit(0, p.tto);
      }
      st.n = approach(st.n, target, dt, tau);
      if (st.n < 1) emit(t, 'seco');
      if (nonMono) emit(0, 'mal_pronostico');
      const active = ['maduracion', 'nocturna'];
      if (tr) active.push('tto');
      if (tr && p.tto === 'desmopresina' && t >= 6 && st.n > 3) active.push('recaida');
      return { g: { noches: st.n }, active, lesion: clamp(st.n / 30, 0, 1), badge: nonMono ? 'no_mono' : 'mono' };
    });
  },

  // Overactive bladder: urgency ± urge incontinence, frequency, nocturia. First line mirabegron ± antimuscarinic
  // (~80 % respond, many abandon); refractory → posterior tibial or sacral S3 neuromodulation or botulinum toxin 100 U.
  vejiga_hiperactiva(p, tr) {
    const refr = p.respuesta === 'refractaria';
    const third = { tibial: 0.6, sacra: 0.4, toxina: 0.3 }[p.tercera];
    return runner(E('vejiga_hiperactiva'), { urg: p.urg0, ep: p.ep0, res: 30 }, (st, t, dt, emit) => {
      let f = 1;
      if (tr && t >= 0.5) { f = refr ? 0.85 : 0.4; emit(t, 'farmaco'); }
      if (tr && refr && t >= 3) { f = third; emit(t, p.tercera); }
      st.urg = approach(st.urg, p.urg0 * f, dt, 0.5);
      st.ep = approach(st.ep, p.ep0 * f, dt, 0.5);
      st.res = approach(st.res, tr && refr && t >= 3 && p.tercera === 'toxina' ? 160 : 30, dt, 0.5);
      if (st.res > 150) emit(t, 'residuo_toxina');
      const active = ['hiperactividad', 'urgencia'];
      if (st.ep > 0.5) active.push('iuu');
      if (tr && t >= 0.5) active.push('tto');
      if (tr && refr && t >= 3) active.push('segunda_linea');
      return { g: { urg: st.urg, ep: st.ep, frecuencia: 7 + 0.8 * st.urg, residuo: st.res }, active, lesion: clamp(st.urg / 15, 0, 1), badge: refr ? 'refractaria' : 'responde' };
    });
  },

  // Stress urinary incontinence: leak with effort when abdominal pressure rises (no detrusor contraction).
  // Pelvic-floor training helps while kept up; mid-urethral sling (transobturator / retropubic) cures 70–95 %.
  // Mixed incontinence responds worse (the urge component remains).
  iue(p, tr) {
    const mixed = p.tipo === 'mixta';
    return runner(E('iue'), { pad: p.pad0 }, (st, t, dt, emit) => {
      let target = p.pad0, tau = 2;
      if (tr && t >= 1) {
        if (p.tto === 'malla') { target = p.pad0 * (mixed ? 0.45 : 0.1); tau = 0.3; emit(t, 'malla'); }
        else {
          const kept = p.adherencia === 'mantiene' || t < 10;
          target = kept ? p.pad0 * (mixed ? 0.7 : 0.5) : p.pad0 * 0.9; tau = kept ? 2 : 3;
          emit(t, 'suelo_pelvico'); if (!kept) emit(t, 'abandono');
        }
      }
      st.pad = approach(st.pad, target, dt, tau);
      const ep = st.pad / 25 + (mixed ? 0.8 : 0);
      if (st.pad < 8) emit(t, 'continente');
      const active = ['debilidad', 'esfuerzo'];
      if (st.pad > 8) active.push('escape');
      if (tr && t >= 1) active.push('tto');
      return { g: { pad: st.pad, ep, iciq: iciqOf(ep, st.pad) }, active, lesion: clamp(st.pad / 200, 0, 1), badge: mixed ? 'mixta' : 'esfuerzo' };
    });
  },

  // Severe sphincter deficiency: continuous leakage. Artificial urinary sphincter (cuff + reservoir + pump) is the
  // standard in men; it is activated ~6 weeks after implantation.
  esfinter_hipoactivo(p, tr) {
    return runner(E('esfinter_hipoactivo'), { pad: p.pad0 }, (st, t, dt, emit) => {
      const implanted = tr && t >= p.inicio, active6w = tr && t >= p.inicio + 1.5;
      if (implanted) emit(t, 'implante');
      if (active6w) emit(t, 'activacion');
      st.pad = approach(st.pad, active6w ? 25 : p.pad0, dt, 0.4);
      const ep = Math.min(20, st.pad / 30);
      const active = ['esfinter'];
      if (st.pad > 100) active.push('escape_continuo');
      if (implanted) active.push('implante');
      if (active6w) active.push('activacion');
      return { g: { pad: st.pad, ep, iciq: iciqOf(ep, st.pad) }, active, lesion: clamp(st.pad / 800, 0, 1), badge: 'grave' };
    });
  },

  // Functional incontinence ("DI MEARÉ"): leakage from factors outside the urinary tract in frail older people;
  // it resolves when the factor is corrected (time to resolve by factor, Model).
  iu_funcional(p, tr) {
    const tau = { delirio: 2, infeccion: 0.7, medicacion: 1, diuresis: 1, atrofia: 4, restriccion: 3, estrenimiento: 1 }[p.factor];
    return runner(E('iu_funcional'), { ep: 3 }, (st, t, dt, emit) => {
      const on = tr && t >= p.inicio;
      if (on) emit(t, `corrige_${p.factor}`);
      st.ep = approach(st.ep, on ? 0.2 : 3, dt, tau);
      if (on && st.ep < 0.5) emit(t, 'resuelta');
      const active = ['factor'];
      if (st.ep > 0.5) active.push('escape');
      if (on) active.push('tto');
      return { g: { ep: st.ep, pad: st.ep * 30 }, active, lesion: clamp(st.ep / 3, 0, 1), badge: p.factor };
    });
  },
};

export function simulate(key, params, treated = false) {
  const e = ENTITIES.find(x => x.key === key);
  if (!e) throw new Error(`unknown entity ${key}`);
  const p = { ...defaults(key), ...params };
  return MODELS[key](p, treated && e.treat);
}

export const PRESETS = {
  ictus_urgencia: { entity: 'suprapontina', params: { gravedad: 6, inicio: 2 } },
  parkinson: { entity: 'suprapontina', params: { gravedad: 4, inicio: 1 } },
  lesion_cervical: { entity: 'suprasacra', params: { nivel: 'alto', shock: 1.5, gravedad: 8 } },
  esclerosis_multiple: { entity: 'suprasacra', params: { nivel: 'bajo', shock: 0.5, gravedad: 6 } },
  mielomeningocele: { entity: 'sacra', params: { acomodacion: 'baja', gravedad: 7 } },
  neuropatia_diabetica: { entity: 'sacra', params: { acomodacion: 'normal', gravedad: 5 } },
  disreflexia_globo: { entity: 'disreflexia', params: { nivel: 'alto', inicio: 1 } },
  disreflexia_tardia: { entity: 'disreflexia', params: { nivel: 'alto', inicio: 1.5 } },
  enuresis_alarma: { entity: 'enuresis', params: { edad: 7, tipo: 'monosintomatica', noches0: 15, tto: 'alarma' } },
  enuresis_desmopresina: { entity: 'enuresis', params: { edad: 9, tipo: 'monosintomatica', noches0: 15, tto: 'desmopresina' } },
  enuresis_no_mono: { entity: 'enuresis', params: { edad: 8, tipo: 'no_monosintomatica', noches0: 20, tto: 'alarma' } },
  vh_responde: { entity: 'vejiga_hiperactiva', params: { urg0: 8, ep0: 2, respuesta: 'responde' } },
  vh_refractaria_sacra: { entity: 'vejiga_hiperactiva', params: { urg0: 10, ep0: 3, respuesta: 'refractaria', tercera: 'sacra' } },
  iue_malla: { entity: 'iue', params: { pad0: 60, tipo: 'pura', tto: 'malla' } },
  iue_puerperio: { entity: 'iue', params: { pad0: 30, tipo: 'pura', tto: 'suelo_pelvico', adherencia: 'mantiene' } },
  iu_mixta: { entity: 'iue', params: { pad0: 80, tipo: 'mixta', tto: 'malla' } },
  esfinter_postprostatectomia: { entity: 'esfinter_hipoactivo', params: { pad0: 500, inicio: 1 } },
  anciana_itu: { entity: 'iu_funcional', params: { factor: 'infeccion', inicio: 1 } },
  anciano_fecaloma: { entity: 'iu_funcional', params: { factor: 'estrenimiento', inicio: 2 } },
};
