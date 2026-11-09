// Gera o resultado de uma sessão gravada (equivalente ao report.py).
import { ANGULOS, LABELS, REFERENCIAS } from "../config.js";
import { analyze, avaliar, recomendacoes } from "./cycles.js";

export function construirSessao(rows, { lado = "auto", refs = REFERENCIAS, meta = {} } = {}) {
  const t0 = rows[0].t;
  const t = rows.map((r) => r.t - t0);
  const dur = t[t.length - 1];
  const fps = rows.length > 1 && dur > 0 ? (rows.length - 1) / dur : 30;
  const series = Object.fromEntries(ANGULOS.map((a) => [a, rows.map((r) => r[a])]));
  const { ciclos, stats, pk, tr, k } = analyze(t, series, fps);
  const cobertura = Object.fromEntries(LABELS.map((l) => [
    l, (100 * rows.filter((r) => r[`fonte_${l}`] === "marcador").length) / rows.length,
  ]));
  const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
  return {
    data: new Date().toISOString(),
    duracao_s: r1(dur),
    frames: rows.length,
    fps: r1(fps),
    lado,
    n_ciclos: ciclos.length,
    metricas: Object.fromEntries(Object.entries(stats).map(([m, st]) => [m, {
      ...st, avaliacao: avaliar(m, st.media, refs),
      ref_min: refs[m][0], ref_max: refs[m][1], descricao: refs[m][2],
    }])),
    recomendacoes: ciclos.length ? recomendacoes(stats, refs) : [],
    cobertura,
    ciclos,
    // séries para o gráfico e exportação (arredondadas para poupar espaço)
    series: {
      t: t.map((v) => Math.round(v * 1000) / 1000),
      ...Object.fromEntries(ANGULOS.map((a) => [a, series[a].map(r1)])),
      joelho_suave: Array.from(k, r1),
      picos: pk, vales: tr,
      fontes: Object.fromEntries(LABELS.map((l) => [l, rows.map((r) => (r[`fonte_${l}`] === "marcador" ? 1 : r[`fonte_${l}`] === "pose" ? 2 : 0))])),
    },
    ...meta,
  };
}

export function framesCsv(s) {
  const cab = ["t", ...ANGULOS, ...LABELS.map((l) => `fonte_${l}`)];
  const nomeFonte = ["", "marcador", "pose"];
  const linhas = s.series.t.map((t, i) => [
    t, ...ANGULOS.map((a) => s.series[a][i] ?? ""), ...LABELS.map((l) => nomeFonte[s.series.fontes[l][i]]),
  ].join(","));
  return [cab.join(","), ...linhas].join("\n");
}

export function ciclosCsv(s) {
  if (!s.ciclos.length) return "";
  const cab = Object.keys(s.ciclos[0]);
  return [cab.join(","), ...s.ciclos.map((c) => cab.map((k) => Math.round(c[k] * 100) / 100).join(","))].join("\n");
}
