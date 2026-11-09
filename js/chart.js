// Gráfico SVG dos ângulos ao longo do tempo (relatório).

const C = { a: "var(--c1)", b: "var(--c2)", raw: "var(--c-raw)", pk: "var(--warn)", tr: "var(--ok)" };

function painel({ t, linhas, y0, alt, larg, titulo, banda, marcas = [] }) {
  const vals = linhas.flatMap((l) => l.v).filter(Number.isFinite);
  if (!vals.length) return "";
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (banda) { lo = Math.min(lo, banda[0]); hi = Math.max(hi, banda[1]); }
  const pad = (hi - lo) * 0.08 || 5;
  lo -= pad; hi += pad;
  const ml = 44, mr = 10;
  const tMax = t[t.length - 1] || 1;
  const X = (x) => ml + ((larg - ml - mr) * x) / tMax;
  const Y = (y) => y0 + alt - (alt * (y - lo)) / (hi - lo);
  let s = `<text x="${ml}" y="${y0 - 6}" class="ct">${titulo}</text>`;
  s += `<rect x="${ml}" y="${y0}" width="${larg - ml - mr}" height="${alt}" class="cbg"/>`;
  if (banda) s += `<rect x="${ml}" y="${Y(banda[1])}" width="${larg - ml - mr}" height="${Y(banda[0]) - Y(banda[1])}" class="cband"/>`;
  const passo = Math.max(10, Math.ceil((hi - lo) / 4 / 10) * 10);
  for (let g = Math.ceil(lo / passo) * passo; g <= hi; g += passo) {
    s += `<line x1="${ml}" x2="${larg - mr}" y1="${Y(g)}" y2="${Y(g)}" class="cgrid"/><text x="${ml - 6}" y="${Y(g) + 4}" class="cax" text-anchor="end">${g}°</text>`;
  }
  for (const l of linhas) {
    let d = "", pen = false;
    l.v.forEach((v, i) => {
      if (!Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? "L" : "M"}${X(t[i]).toFixed(1)},${Y(v).toFixed(1)}`;
      pen = true;
    });
    s += `<path d="${d}" fill="none" stroke="${l.cor}" stroke-width="${l.esp || 1.6}" stroke-linejoin="round"/>`;
  }
  for (const m of marcas) {
    for (const i of m.idx) {
      const v = m.v[i];
      if (Number.isFinite(v)) s += `<circle cx="${X(t[i])}" cy="${Y(v)}" r="3.2" fill="${m.cor}"/>`;
    }
  }
  return s;
}

export function graficoSvg(s) {
  const se = s.series;
  if (!se?.t?.length) return "";
  const larg = 900, alt = 130, gap = 46;
  const ref = s.metricas?.joelho_max;
  const banda = ref && ref.ref_min != null && ref.ref_max != null ? [ref.ref_min, ref.ref_max] : null;
  const tMax = se.t[se.t.length - 1];
  let svg = painel({
    t: se.t, y0: 22, alt, larg, titulo: "Joelho (faixa verde: extensão de referência)", banda,
    linhas: [{ v: se.joelho, cor: C.raw, esp: 1 }, { v: se.joelho_suave, cor: C.a, esp: 1.8 }],
    marcas: [{ idx: se.picos, v: se.joelho_suave, cor: C.pk }, { idx: se.vales, v: se.joelho_suave, cor: C.tr }],
  });
  svg += painel({ t: se.t, y0: 22 + alt + gap, alt, larg, titulo: "Anca (laranja) e tronco (azul)",
    linhas: [{ v: se.anca, cor: C.a }, { v: se.tronco, cor: C.b }] });
  svg += painel({ t: se.t, y0: 22 + 2 * (alt + gap), alt, larg, titulo: "Tornozelo (laranja) e cotovelo (azul)",
    linhas: [{ v: se.tornozelo, cor: C.a }, { v: se.cotovelo, cor: C.b }] });
  const yEixo = 22 + 3 * alt + 2 * gap + 18;
  const ml = 44;
  for (let x = 0; x <= tMax; x += Math.max(1, Math.round(tMax / 8))) {
    svg += `<text x="${ml + ((larg - ml - 10) * x) / tMax}" y="${yEixo}" class="cax" text-anchor="middle">${x} s</text>`;
  }
  return `<svg class="grafico" viewBox="0 0 ${larg} ${yEixo + 8}" role="img" aria-label="Ângulos ao longo do tempo">${svg}</svg>`;
}
