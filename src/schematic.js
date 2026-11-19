// Schematic: the neuraxis (cortex, pontine micturition centre, spinal cord with T6, T10–L2 and S2–S4) with the
// lesion marked; the bladder (size = volume / residual, wall = pressure), sphincter and pelvic floor with leak
// drops; both kidneys with their hydronephrosis grade; plus panels that only some disorders use (blood pressure
// in dysreflexia, the wet-night calendar in enuresis, the «DI MEARÉ» factors in functional incontinence).
const DIMEARE = ['delirio', 'infeccion', 'medicacion', 'diuresis', 'atrofia', 'restriccion', 'estrenimiento'];

export function drawSchematic(box, e, pt, tr) {
  const g = pt.g;
  const loc = e.loc;
  const hot = (l) => loc === l;
  // lesion marker on the neuraxis
  const ly = { cerebro: 26, medula: g.alto === 0 ? 120 : 80, sacra: 186 }[loc];
  const lesion = ly !== undefined ? `<rect x="40" y="${ly - 7}" width="56" height="14" rx="4" fill="var(--hot)" opacity="0.85"/>
    <text x="104" y="${ly + 4}" style="font-size:11px" class="lbl-on">${tr('schem.lesion')}</text>` : '';
  const tick = (y, label) => `<line x1="60" y1="${y}" x2="76" y2="${y}" stroke="var(--axis)"/><text x="12" y="${y + 4}" style="font-size:10.5px">${label}</text>`;
  // bladder
  const showVol = e.key === 'disreflexia' || e.tiles.includes('residuo');
  const v = e.key === 'disreflexia' ? g.vol : showVol ? g.residuo : 150;
  const r = Math.max(26, Math.min(64, 26 + v / 14));
  const cx = 300, cy = 20 + r;
  const wall = 2 + Math.min(8, (g.pdet || 15) / 12);
  const drops = Math.min(8, Math.round(g.ep || 0));
  const hydro = Math.min(4, g.hidro || 0);
  const kid = (x) => `<path d="M${x} 40 q-30 0 -30 40 q0 40 30 40 q10 0 10 -16 q-8 -7 -8 -24 q0 -17 8 -24 q0 -16 -10 -16z" fill="var(--tissue)" stroke="${hydro > 0.5 ? 'var(--hot)' : 'var(--tissue-line)'}" stroke-width="${hydro > 0.5 ? 2 : 1.3}"/>
    <ellipse cx="${x - 2}" cy="80" rx="${3 + 3.5 * hydro}" ry="${5 + 5 * hydro}" fill="var(--cyst)" stroke="var(--tissue-line)"/>`;
  let panel = '';
  if (e.key === 'disreflexia') {
    panel = `<text x="470" y="176" style="font-size:13px;font-weight:700" class="${g.pas > 160 ? 'lbl-on' : ''}">PA ${Math.round(g.pas)} mmHg</text>
      <text x="470" y="196" style="font-size:12px">FC ${Math.round(g.fc)} /min</text>`;
  } else if (e.key === 'enuresis') {
    const wet = Math.round(g.noches);
    panel = `<text x="440" y="164" style="font-size:12px;font-weight:700;fill:var(--ink)">${tr('schem.noches')}: ${wet} / 30</text>` +
      Array.from({ length: 30 }, (_, i) => `<circle cx="${446 + (i % 10) * 22}" cy="${180 + Math.floor(i / 10) * 20}" r="7" fill="${i < wet ? 'var(--s1)' : 'var(--surface)'}" stroke="var(--axis)"/>`).join('');
  } else if (e.key === 'iu_funcional') {
    panel = `<text x="440" y="164" style="font-size:12px;font-weight:700;fill:var(--ink)">DI MEARÉ</text>` + DIMEARE.map((f, i) => {
      const on = pt.badge === f;
      return `<rect x="${440 + i * 34}" y="174" width="30" height="30" rx="6" fill="${on ? 'var(--hot-bg)' : 'var(--surface)'}" stroke="${on ? 'var(--hot)' : 'var(--axis)'}" stroke-width="${on ? 2 : 1}"/>
        <text x="${455 + i * 34}" y="195" text-anchor="middle" style="font-size:14px;font-weight:700" class="${on ? 'lbl-on' : ''}">${'DIMEARÉ'[i]}</text>`;
    }).join('') + `<text x="440" y="226" style="font-size:11px" class="lbl-on">${tr(`schem.factor.${pt.badge}`)}</text>`;
  } else {
    panel = `<text x="440" y="176" style="font-size:12px">${tr('schem.escapes')}: ${(g.ep || 0).toFixed(1)} / 24 h</text>` +
      (g.pad !== undefined && e.tiles.includes('pad') ? `<text x="440" y="196" style="font-size:12px">Pad test: ${Math.round(g.pad)} g</text>` : '') +
      (e.tiles.includes('pdet') ? `<text x="440" y="216" style="font-size:12px" class="${g.pdet > 40 ? 'lbl-on' : ''}">Pdet ${Math.round(g.pdet)} cmH₂O</text>` : '');
  }
  const cuff = e.key === 'esfinter_hipoactivo' && pt.active.includes('activacion');
  const sling = e.key === 'iue' && pt.active.includes('tto');
  const ny = cy + r;
  box.innerHTML = `
<svg viewBox="0 0 700 260" role="img" aria-label="${tr('schem.aria')}">
  <rect x="34" y="8" width="70" height="26" rx="12" fill="var(--tissue)" stroke="${hot('cerebro') || hot('nino') ? 'var(--hot)' : 'var(--tissue-line)'}" stroke-width="${hot('cerebro') || hot('nino') ? 2 : 1}"/>
  <text x="69" y="25" text-anchor="middle" style="font-size:11px;font-weight:700">${tr('schem.cortex')}</text>
  <rect x="44" y="46" width="50" height="20" rx="6" fill="var(--surface)" stroke="var(--tissue-line)"/>
  <text x="69" y="60" text-anchor="middle" style="font-size:10.5px">${tr('schem.pontino')}</text>
  <rect x="62" y="68" width="14" height="140" rx="7" fill="var(--tissue)" stroke="var(--tissue-line)"/>
  ${tick(96, 'T6')}${tick(140, 'T10–L2')}${tick(186, 'S2–S4')}
  ${lesion}
  <path d="M76 140 C 160 140, 220 ${cy}, ${cx - r} ${cy}" fill="none" stroke="var(--axis)" stroke-dasharray="4 3"/>
  <path d="M76 186 C 170 186, 220 ${ny - 6}, ${cx - r * 0.6} ${ny - 6}" fill="none" stroke="var(--axis)" stroke-dasharray="4 3"/>
  <path d="M76 192 C 180 222, 240 ${ny + 22}, ${cx - 30} ${ny + 22}" fill="none" stroke="var(--axis)" stroke-dasharray="4 3"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--cyst)" stroke="${hot('detrusor') ? 'var(--hot)' : 'var(--tissue-line)'}" stroke-width="${wall}"/>
  ${showVol ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--ink)">${Math.round(v)} mL</text>` : ''}
  <rect x="${cx - 5}" y="${ny}" width="10" height="34" fill="var(--surface)" stroke="${hot('esfinter') ? 'var(--hot)' : 'var(--tissue-line)'}" stroke-width="${hot('esfinter') ? 2 : 1}"/>
  ${cuff ? `<rect x="${cx - 12}" y="${ny + 8}" width="24" height="10" rx="4" fill="none" stroke="var(--s1)" stroke-width="3"/><text x="${cx + 18}" y="${ny + 17}" style="font-size:10.5px;fill:var(--s1)">${tr('schem.manguito')}</text>` : ''}
  <rect x="${cx - 56}" y="${ny + 18}" width="112" height="9" rx="4" fill="var(--tissue)" stroke="${hot('suelo') ? 'var(--hot)' : 'var(--tissue-line)'}" stroke-width="${hot('suelo') ? 2 : 1}"/>
  ${sling ? `<path d="M${cx - 40} ${ny + 14} Q ${cx} ${ny + 40} ${cx + 40} ${ny + 14}" fill="none" stroke="var(--s1)" stroke-width="3"/><text x="${cx + 44}" y="${ny + 12}" style="font-size:10.5px;fill:var(--s1)">${tr('schem.soporte')}</text>` : ''}
  <text x="${cx + 62}" y="${ny + 27}" style="font-size:10.5px" class="${hot('suelo') ? 'lbl-on' : ''}">${tr('schem.suelo')}</text>
  ${Array.from({ length: drops }, (_, i) => `<path d="M${cx - 2 + (i % 2) * 4} ${ny + 34 + i * 6} q-3 5 0 7 q3 -2 0 -7z" fill="var(--s1)"/>`).join('')}
  ${kid(500)}${kid(620)}
  <text x="560" y="140" text-anchor="middle" style="font-size:11px" class="${hydro > 0.5 ? 'lbl-on' : ''}">${tr('schem.hidro')} ${hydro.toFixed(1)} / 4</text>
  ${panel}
</svg>`;
}
