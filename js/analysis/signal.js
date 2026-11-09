// Processamento de sinal: interpolação, suavização Savitzky-Golay e deteção de picos.
// Equivalentes simples de numpy.interp, scipy.signal.savgol_filter e find_peaks.

export function interpNaN(y) {
  const out = Float64Array.from(y);
  const ok = [];
  for (let i = 0; i < out.length; i++) if (Number.isFinite(out[i])) ok.push(i);
  if (ok.length < 2) return out;
  for (let i = 0; i < out.length; i++) {
    if (Number.isFinite(out[i])) continue;
    if (i < ok[0]) { out[i] = out[ok[0]]; continue; }
    if (i > ok[ok.length - 1]) { out[i] = out[ok[ok.length - 1]]; continue; }
    // vizinhos válidos
    let lo = 0, hi = ok.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ok[m] < i) lo = m; else hi = m; }
    const a = ok[lo], b = ok[hi];
    out[i] = out[a] + ((out[b] - out[a]) * (i - a)) / (b - a);
  }
  return out;
}

/** Coeficientes Savitzky-Golay (polinómio de grau 2) para uma janela de meia-largura m. */
function sgCoeffs(m) {
  const den = (2 * m - 1) * (2 * m + 1) * (2 * m + 3);
  const c = [];
  for (let i = -m; i <= m; i++) c.push((3 * (3 * m * m + 3 * m - 1 - 5 * i * i)) / den);
  return c;
}

export function smooth(y, fps) {
  const x = interpNaN(y);
  let win = Math.max(5, Math.round(fps * 0.12) | 1);
  if (win % 2 === 0) win += 1;
  if (x.length < win || !x.every(Number.isFinite)) return x;
  const m = (win - 1) / 2;
  const c = sgCoeffs(m);
  const out = new Float64Array(x.length);
  const n = x.length;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -m; k <= m; k++) {
      let j = i + k;
      if (j < 0) j = -j; // reflexão nas extremidades
      if (j >= n) j = 2 * n - 2 - j;
      s += c[k + m] * x[j];
    }
    out[i] = s;
  }
  return out;
}

/** Picos com distância mínima (amostras) e proeminência mínima, como scipy.signal.find_peaks. */
export function findPeaks(x, { distance = 1, prominence = 0 } = {}) {
  const n = x.length;
  // 1. máximos locais (planaltos: ponto central)
  let peaks = [];
  let i = 1;
  while (i < n - 1) {
    if (x[i - 1] < x[i]) {
      let j = i;
      while (j + 1 < n && x[j + 1] === x[i]) j++;
      if (j + 1 < n && x[j + 1] < x[i]) { peaks.push((i + j) >> 1); i = j + 1; continue; }
      i = j + 1;
      continue;
    }
    i++;
  }
  // 2. distância: mantém os mais altos
  if (distance > 1 && peaks.length > 1) {
    const keep = new Array(peaks.length).fill(true);
    const order = peaks.map((_, k) => k).sort((a, b) => x[peaks[b]] - x[peaks[a]]);
    for (const k of order) {
      if (!keep[k]) continue;
      for (let q = k - 1; q >= 0 && peaks[k] - peaks[q] < distance; q--) keep[q] = false;
      for (let q = k + 1; q < peaks.length && peaks[q] - peaks[k] < distance; q++) keep[q] = false;
    }
    peaks = peaks.filter((_, k) => keep[k]);
  }
  // 3. proeminência
  if (prominence > 0) {
    peaks = peaks.filter((p) => {
      let left = x[p];
      for (let q = p - 1; q >= 0 && x[q] <= x[p]; q--) left = Math.min(left, x[q]);
      let right = x[p];
      for (let q = p + 1; q < n && x[q] <= x[p]; q++) right = Math.min(right, x[q]);
      return x[p] - Math.max(left, right) >= prominence;
    });
  }
  return peaks;
}

export function mean(a) {
  let s = 0, n = 0;
  for (const v of a) if (Number.isFinite(v)) { s += v; n++; }
  return n ? s / n : NaN;
}

export function std(a) {
  const m = mean(a);
  let s = 0, n = 0;
  for (const v of a) if (Number.isFinite(v)) { s += (v - m) ** 2; n++; }
  return n ? Math.sqrt(s / n) : NaN;
}
