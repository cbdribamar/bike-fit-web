// Testes da lógica de análise (sem DOM). Correr: npm test  (ou node --test tests/)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { analyze } from "../js/analysis/cycles.js";
import { Analisador } from "../js/analysis/engine.js";
import { construirSessao } from "../js/analysis/report.js";
import { findPeaks, smooth } from "../js/analysis/signal.js";
import { hungarian } from "../js/analysis/tracker.js";
import { referencias } from "../js/config.js";
import { DemoCiclista, HSV_DEMO } from "../js/demo.js";

const fx = JSON.parse(readFileSync(new URL("./fixture_scipy.json", import.meta.url)));
const nan = (v) => v.map((x) => (x == null ? NaN : x));

test("suavização igual ao scipy savgol_filter (exceto extremidades)", () => {
  const k = smooth(nan(fx.series.joelho), fx.fps);
  let maxErr = 0;
  for (let i = 5; i < k.length - 5; i++) maxErr = Math.max(maxErr, Math.abs(k[i] - fx.smooth_joelho[i]));
  assert.ok(maxErr < 1e-6, `erro máximo ${maxErr}`);
});

test("picos e vales iguais ao scipy find_peaks", () => {
  const k = Float64Array.from(fx.smooth_joelho);
  const dist = Math.floor((fx.fps * 60) / 150);
  assert.deepEqual(findPeaks(k, { distance: dist, prominence: 20 }), fx.pk);
  assert.deepEqual(findPeaks(k.map((v) => -v), { distance: dist, prominence: 20 }), fx.tr);
});

test("estatísticas por ciclo iguais à versão Python", () => {
  const series = Object.fromEntries(Object.entries(fx.series).map(([k, v]) => [k, nan(v)]));
  const { ciclos, stats } = analyze(fx.t, series, fx.fps);
  assert.equal(ciclos.length, fx.n_ciclos);
  for (const [m, v] of Object.entries(fx.stats)) {
    assert.ok(Math.abs(stats[m].media - v.media) < 0.05, `${m}: ${stats[m].media} vs ${v.media}`);
  }
});

test("geometria do simulador igual à versão Python", () => {
  for (const [selim, porT] of Object.entries(fx.demo_pontos)) {
    const d = new DemoCiclista({ selim });
    for (const [t, pts] of Object.entries(porT)) {
      const p = d.pontos(Number(t));
      for (const [k, v] of Object.entries(pts)) {
        assert.ok(Math.hypot(p[k][0] - v[0], p[k][1] - v[1]) < 1e-6, `${selim} t=${t} ${k}`);
      }
    }
  }
});

test("algoritmo húngaro encontra a atribuição ótima", () => {
  const c = [[4, 1, 3], [2, 0, 5], [3, 2, 2]];
  assert.deepEqual(hungarian(c), [1, 0, 2]);
  assert.deepEqual(hungarian([[9, 1, 8, 7]]), [1]);
});

// Rasteriza só os marcadores (discos laranja sobre cinzento) num ImageData simulado.
function frameMarcadores(pts, w = 1280, h = 720) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = 120; data[i + 1] = 118; data[i + 2] = 115; data[i + 3] = 255; }
  for (const [k, v] of Object.entries(pts)) {
    if (k.startsWith("_")) continue;
    const [cx, cy] = v;
    for (let y = Math.floor(cy - 7); y <= cy + 7; y++)
      for (let x = Math.floor(cx - 7); x <= cx + 7; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= 49 && x >= 0 && y >= 0 && x < w && y < h) {
          const i = (y * w + x) * 4; data[i] = 255; data[i + 1] = 120; data[i + 2] = 0;
        }
  }
  return { data, width: w, height: h };
}

for (const [selim, aval] of [["baixo", "abaixo"], ["correto", "ok"], ["alto", "acima"]]) {
  test(`motor completo com simulador: selim ${selim} → extensão do joelho ${aval}`, () => {
    const demo = new DemoCiclista({ selim });
    const a = new Analisador({ hsvLo: HSV_DEMO.lo, hsvHi: HSV_DEMO.hi, poseFn: null, refs: referencias({}) });
    a.iniciarGravacao();
    for (let i = 0; i < 30 * 8; i++) {
      const t = i / 30;
      a.process(frameMarcadores(demo.pontos(t)), t, demo.poseSimulada(t));
    }
    const rows = a.pararGravacao();
    const s = construirSessao(rows, { refs: referencias({}) });
    assert.equal(s.cobertura.joelho, 100);
    assert.ok(Math.abs(s.metricas.cadencia.media - 85) < 2);
    assert.equal(s.metricas.joelho_max.avaliacao, aval);
    assert.equal(a.estado().resumo.joelho_max.avaliacao, aval);
  });
}

test("seguimento mantém a identidade dos marcadores mesmo com pose muito errada", () => {
  const demo = new DemoCiclista({ selim: "correto", ruidoPose: 0 });
  const a = new Analisador({ hsvLo: HSV_DEMO.lo, hsvHi: HSV_DEMO.hi, poseFn: null, refs: referencias({}) });
  a.iniciarGravacao();
  const ordem = ["ombro", "cotovelo", "pulso", "anca", "joelho", "tornozelo", "pe"];
  for (let i = 0; i < 30 * 8; i++) {
    const t = i / 30;
    const p = demo.pontos(t);
    // pose correta só nos primeiros frames; depois, rótulos trocados (pior caso)
    let pose = {};
    if (i < 3) for (const k of ordem) pose[k] = p[k];
    else for (let j = 0; j < ordem.length; j++) pose[ordem[j]] = p[ordem[(j + 1) % ordem.length]];
    a.process(frameMarcadores(p), t, pose);
  }
  const s = construirSessao(a.pararGravacao(), { refs: referencias({}) });
  assert.ok(Math.abs(s.metricas.joelho_max.media - 145.8) < 1.5, `joelho_max ${s.metricas.joelho_max.media}`);
  assert.ok(s.metricas.joelho_max.dp < 1.5);
});
