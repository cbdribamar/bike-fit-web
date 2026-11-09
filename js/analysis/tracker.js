// Atribui cada marcador detetado a um ponto anatómico.
// A pose dá uma posição aproximada de cada articulação; o marcador mais próximo
// (atribuição ótima, algoritmo húngaro) substitui-a pela posição precisa.

/** Algoritmo húngaro para matriz n×m com n <= m. Devolve, para cada linha, a coluna atribuída. */
export function hungarian(cost) {
  const n = cost.length;
  if (!n) return [];
  const m = cost[0].length;
  if (n > m) throw new Error("hungarian: n deve ser <= m");
  const INF = 1e18;
  const u = new Float64Array(n + 1), v = new Float64Array(m + 1);
  const p = new Int32Array(m + 1), way = new Int32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(m + 1).fill(INF);
    const used = new Uint8Array(m + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}

export class MarkerTracker {
  constructor(labels, maxDist, maxPerdido = 8) {
    this.labels = labels;
    this.maxDist = maxDist;
    this.maxPerdido = maxPerdido;
    this.prev = Object.fromEntries(labels.map((l) => [l, null]));
    this.perdido = Object.fromEntries(labels.map((l) => [l, 0]));
  }

  seed(pts) {
    for (const [l, p] of Object.entries(pts)) { this.prev[l] = p; this.perdido[l] = 0; }
  }

  /** blobs: [{x,y}], posePts: {label: [x,y]} → {label: {p:[x,y], fonte:'marcador'|'pose'}} */
  update(blobs, posePts = {}) {
    // Previsão de onde está cada marcador:
    //  1) posição no frame anterior + velocidade, se foi visto há pouco (mais fiável que a pose);
    //  2) senão, a estimativa de pose;
    //  3) senão, a última posição conhecida.
    const preds = {};
    for (const l of this.labels) {
      const prev = this.prev[l];
      if (prev && this.perdido[l] === 0) {
        const v = this.vel?.[l] || [0, 0];
        preds[l] = [prev[0] + v[0], prev[1] + v[1]];
      } else if (posePts[l]) preds[l] = posePts[l];
      else if (prev && this.perdido[l] <= this.maxPerdido) preds[l] = prev;
    }
    const result = {};
    const L = Object.keys(preds);
    if (L.length && blobs.length) {
      // matriz retangular: a dimensão menor fica nas linhas
      const D = L.map((l) => blobs.map((b) => Math.hypot(preds[l][0] - b.x, preds[l][1] - b.y)));
      let pares;
      if (L.length <= blobs.length) {
        pares = hungarian(D).map((c, r) => [r, c]);
      } else {
        const T = blobs.map((_, c) => L.map((__, r) => D[r][c]));
        pares = hungarian(T).map((r, c) => [r, c]);
      }
      for (const [r, c] of pares) {
        if (r >= 0 && c >= 0 && D[r][c] <= this.maxDist) {
          result[L[r]] = { p: [blobs[c].x, blobs[c].y], fonte: "marcador" };
        }
      }
    }
    for (const l of this.labels) {
      if (!result[l] && posePts[l]) result[l] = { p: posePts[l], fonte: "pose" };
    }
    this.vel = this.vel || {};
    for (const l of this.labels) {
      if (result[l]?.fonte === "marcador") {
        const p = result[l].p, prev = this.prev[l];
        this.vel[l] = prev && this.perdido[l] === 0 ? [p[0] - prev[0], p[1] - prev[1]] : [0, 0];
        this.prev[l] = p; this.perdido[l] = 0;
      } else this.perdido[l]++;
    }
    return result;
  }
}
