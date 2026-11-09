// Motor de análise: frame (ImageData) + pose → marcadores → ângulos → resumo ao vivo.
// Não depende do DOM: pode correr no browser ou em Node (testes).
import { ANGULOS, LABELS, REFERENCIAS } from "../config.js";
import { computeAngles } from "./angles.js";
import { analyze, avaliar, recomendacoes } from "./cycles.js";
import { detectBlobs, sampleHsvRange } from "./markers.js";
import { MarkerTracker } from "./tracker.js";

export class Analisador {
  /**
   * @param {object} o
   * @param {(t:number)=>object|Promise<object>} o.poseFn  devolve {label:[x,y]} em píxeis do frame
   */
  constructor({ hsvLo = null, hsvHi = null, poseFn, minArea = 12, maxArea = 2500,
                refs = REFERENCIAS, ladoFn = () => "auto", janelaLive = 5 }) {
    Object.assign(this, { hsvLo, hsvHi, poseFn, minArea, maxArea, refs, ladoFn, janelaLive });
    this.tracker = null;
    this.gravar = false;
    this.rows = [];
    this.t0Grav = null;
    this.buf = { t: [], ...Object.fromEntries(ANGULOS.map((a) => [a, []])) };
    this.idx = 0;
    this.fps = null;
    this.tAnt = null;
    this.ultimoFrame = null;
    this.ultimaMascara = null;
    this.estadoAtual = { angulos: {}, fontes: {}, resumo: {}, recomendacoes: [] };
  }

  calibrar(xFrac, yFrac) {
    const f = this.ultimoFrame;
    if (!f) return null;
    const r = sampleHsvRange(f, Math.round(xFrac * f.width), Math.round(yFrac * f.height));
    this.hsvLo = r.lo; this.hsvHi = r.hi;
    return r;
  }

  iniciarGravacao() { this.rows = []; this.gravar = true; this.t0Grav = null; }
  pararGravacao() { this.gravar = false; return this.rows.slice(); }

  /**
   * Processa um frame.
   * @param {ImageData} img   frame (pode estar reduzido para acelerar a deteção de cor)
   * @param {number} t        tempo em segundos
   * @param {object} pose     {label:[x,y]} já em coordenadas de img
   * @returns {{tracked, ang, blobs, mask}}
   */
  process(img, t, pose = {}) {
    const { width: w, height: h } = img;
    this.ultimoFrame = img;
    if (!this.tracker) this.tracker = new MarkerTracker(LABELS, 0.07 * h);
    if (this.tAnt != null && t > this.tAnt) {
      const inst = 1 / (t - this.tAnt);
      this.fps = this.fps == null ? inst : 0.92 * this.fps + 0.08 * inst;
    }
    this.tAnt = t;
    this.idx++;

    let blobs = [], mask = null;
    if (this.hsvLo) {
      const esc = (h / 720) ** 2;
      ({ blobs, mask } = detectBlobs(img, this.hsvLo, this.hsvHi, this.minArea * esc, this.maxArea * esc));
    }
    this.ultimaMascara = mask;
    const tracked = this.tracker.update(blobs, pose);
    const pts = Object.fromEntries(Object.entries(tracked).map(([l, v]) => [l, v.p]));
    const ang = computeAngles(pts);
    const fontes = Object.fromEntries(LABELS.map((l) => [l, tracked[l]?.fonte ?? null]));

    if (this.gravar) {
      if (this.t0Grav == null) this.t0Grav = t;
      const row = { t, ...ang };
      for (const l of LABELS) row[`fonte_${l}`] = fontes[l] || "";
      this.rows.push(row);
    }

    // buffer para o resumo ao vivo (últimos ~40 s)
    this.buf.t.push(t);
    for (const a of ANGULOS) this.buf[a].push(ang[a]);
    if (this.buf.t.length > 1200) for (const k of Object.keys(this.buf)) this.buf[k].shift();

    let { resumo, recomendacoes: recs } = this.estadoAtual;
    if (this.idx % 15 === 0 && this.buf.t.length > 30) {
      const tt = this.buf.t;
      const ini = tt.findIndex((x) => x >= tt[tt.length - 1] - this.janelaLive);
      const serie = Object.fromEntries(ANGULOS.map((a) => [a, this.buf[a].slice(ini)]));
      const { stats } = analyze(tt.slice(ini), serie, this.fps || 30);
      resumo = Object.fromEntries(Object.entries(stats).map(([m, v]) => [m, { ...v, avaliacao: avaliar(m, v.media, this.refs) }]));
      recs = Object.keys(stats).length ? recomendacoes(stats, this.refs) : [];
    }

    this.estadoAtual = {
      angulos: Object.fromEntries(ANGULOS.map((a) => [a, Number.isFinite(ang[a]) ? ang[a] : null])),
      fontes,
      nMarcadores: Object.values(fontes).filter((f) => f === "marcador").length,
      nBlobs: blobs.length,
      resumo,
      recomendacoes: recs,
      fps: this.fps || 0,
      lado: this.ladoFn(),
      calibrado: !!this.hsvLo,
      gravar: this.gravar,
      tempoGravacao: this.gravar && this.t0Grav != null ? t - this.t0Grav : 0,
      framesGravados: this.rows.length,
      t,
    };
    return { tracked, ang, blobs, mask, w, h };
  }

  estado() { return this.estadoAtual; }
}
