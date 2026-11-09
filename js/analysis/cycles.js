// Deteção de ciclos de pedalada, estatísticas e observações.
import { REFERENCIAS } from "../config.js";
import { findPeaks, mean, smooth, std } from "./signal.js";

export function detectExtremos(knee, fps) {
  const k = smooth(knee, fps);
  if (k.length < 5 || !k.every(Number.isFinite)) return { pk: [], tr: [], k };
  const distance = Math.max(1, Math.floor((fps * 60) / 150)); // cadência máx. 150 rpm
  const pk = findPeaks(k, { distance, prominence: 20 });
  const tr = findPeaks(k.map((v) => -v), { distance, prominence: 20 });
  return { pk, tr, k };
}

const minIn = (a, s, e) => { let m = Infinity; for (let i = s; i <= e; i++) if (a[i] < m) m = a[i]; return m; };
const maxIn = (a, s, e) => { let m = -Infinity; for (let i = s; i <= e; i++) if (a[i] > m) m = a[i]; return m; };
const meanIn = (a, s, e) => { let t = 0; for (let i = s; i <= e; i++) t += a[i]; return t / (e - s + 1); };

/** series: { joelho, anca, tornozelo, cotovelo, tronco } (arrays alinhados com t). */
export function analyze(t, series, fps) {
  const { pk, tr, k } = detectExtremos(series.joelho, fps);
  const s = {};
  for (const [nome, v] of Object.entries(series)) s[nome] = smooth(v, fps);
  const ciclos = [];
  for (let i = 0; i + 1 < pk.length; i++) {
    const a = pk[i], b = pk[i + 1];
    const periodo = t[b] - t[a];
    if (!(periodo >= 0.4 && periodo <= 2.0)) continue; // 30-150 rpm
    ciclos.push({
      inicio_s: t[a],
      cadencia: 60 / periodo,
      joelho_max: k[a],
      joelho_min: minIn(k, a, b),
      anca_min: minIn(s.anca, a, b),
      tornozelo_amplitude: maxIn(s.tornozelo, a, b) - minIn(s.tornozelo, a, b),
      tronco_medio: meanIn(s.tronco, a, b),
      cotovelo_medio: meanIn(s.cotovelo, a, b),
    });
  }
  const stats = {};
  for (const m of Object.keys(REFERENCIAS)) {
    const vals = ciclos.map((c) => c[m]).filter(Number.isFinite);
    if (vals.length) stats[m] = { media: mean(vals), dp: std(vals), n: vals.length };
  }
  return { ciclos, stats, pk, tr, k };
}

export function avaliar(metric, valor, refs = REFERENCIAS) {
  const [lo, hi] = refs[metric];
  if (lo != null && valor < lo) return "abaixo";
  if (hi != null && valor > hi) return "acima";
  return lo != null || hi != null ? "ok" : "-";
}

export function recomendacoes(stats, refs = REFERENCIAS) {
  const r = [];
  const m = (k) => stats[k]?.media;
  const jm = m("joelho_max");
  if (jm != null) {
    const [jlo, jhi] = refs.joelho_max;
    if (jm < jlo) r.push("Extensão do joelho baixa: o selim pode estar baixo (ou demasiado avançado).");
    else if (jm > jhi)
      r.push("Extensão do joelho elevada: o selim pode estar alto. Confirma se a anca oscila ou se o tornozelo compensa (calcanhar muito descido).");
  }
  const jn = m("joelho_min");
  if (jn != null && jn < 65) r.push("Joelho muito fechado no ponto morto superior: selim baixo ou pedivelas compridas.");
  const am = m("anca_min");
  if (am != null && am < refs.anca_min[0]) r.push("Anca muito fechada: guiador baixo/distante ou selim demasiado avançado.");
  const ta = m("tornozelo_amplitude");
  if (ta != null) {
    if (ta > 30) r.push("Grande amplitude do tornozelo: pode ser compensação de um selim alto.");
    else if (ta < 15) r.push("Tornozelo pouco móvel: técnica de pedalada rígida ou selim baixo.");
  }
  const cm = m("cotovelo_medio");
  const [clo, chi] = refs.cotovelo_medio;
  if (cm != null && cm > chi) r.push("Braços quase em extensão: o alcance (avanço/guiador) pode ser longo.");
  else if (cm != null && cm < clo) r.push("Cotovelos muito fletidos: o alcance (avanço/guiador) pode ser curto.");
  const tm = m("tronco_medio");
  const [tlo, thi] = refs.tronco_medio;
  if (tm != null && tm < tlo)
    r.push("Tronco mais baixo do que o habitual para este tipo de bicicleta e perfil: pode sobrecarregar lombar e pescoço.");
  else if (tm != null && tm > thi)
    r.push("Tronco mais elevado do que o habitual para este tipo de bicicleta: posição confortável mas menos aerodinâmica.");
  const nomes = { joelho_max: "extensão do joelho", joelho_min: "flexão do joelho" };
  for (const k of ["joelho_max", "joelho_min"]) {
    if (stats[k] && stats[k].dp > 4)
      r.push(`Variação alta entre ciclos na ${nomes[k]} (desvio-padrão ${stats[k].dp.toFixed(1).replace(".", ",")}°). Verifica a deteção dos marcadores ou pedala de forma mais constante.`);
  }
  if (!r.length) r.push("Todos os valores médios estão dentro das faixas de referência.");
  return r;
}
