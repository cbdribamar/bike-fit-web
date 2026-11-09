// Deteção de marcadores coloridos por limiar HSV (escala OpenCV: H 0-179, S/V 0-255).
// Trabalha sobre um objeto ImageData-like: { data: Uint8ClampedArray RGBA, width, height }.

export function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h / 2, max === 0 ? 0 : (d / max) * 255, max];
}

export function hsvMask(img, lo, hi) {
  const { data, width, height } = img;
  const mask = new Uint8Array(width * height);
  const wrap = lo[0] > hi[0];
  const [h0, s0, v0] = lo, [h1, s1, v1] = hi;
  // ciclo otimizado (sem alocações): rejeita cedo por brilho e saturação
  for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = r > g ? (r > b ? r : b) : g > b ? g : b;
    if (max < v0 || max > v1) continue;
    const min = r < g ? (r < b ? r : b) : g < b ? g : b;
    const d = max - min;
    if (d === 0) continue;
    const s = (d / max) * 255;
    if (s < s0 || s > s1) continue;
    let h;
    if (max === r) h = 30 * (((g - b) / d) % 6);
    else if (max === g) h = 30 * ((b - r) / d + 2);
    else h = 30 * ((r - g) / d + 4);
    if (h < 0) h += 180;
    if (wrap ? h >= h0 || h <= h1 : h >= h0 && h <= h1) mask[p] = 1;
  }
  return mask;
}

function erode(m, w, h) {
  const o = new Uint8Array(m.length);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      o[p] = m[p] & m[p - 1] & m[p + 1] & m[p - w] & m[p + w];
    }
  return o;
}

function dilate(m, w, h) {
  const o = new Uint8Array(m.length);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      o[p] = m[p] | m[p - 1] | m[p + 1] | m[p - w] | m[p + w];
    }
  return o;
}

/** Componentes ligadas (8-vizinhança). Devolve [{x, y, area}]. */
export function components(mask, w, h) {
  const label = new Int32Array(mask.length);
  const out = [];
  const stack = [];
  let next = 0;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p] || label[p]) continue;
    next++;
    let sx = 0, sy = 0, area = 0;
    stack.push(p);
    label[p] = next;
    while (stack.length) {
      const q = stack.pop();
      const qx = q % w, qy = (q - qx) / w;
      sx += qx; sy += qy; area++;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = qy + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx;
          if (nx < 0 || nx >= w) continue;
          const r = ny * w + nx;
          if (mask[r] && !label[r]) { label[r] = next; stack.push(r); }
        }
      }
    }
    out.push({ x: sx / area, y: sy / area, area });
  }
  return out;
}

/** Abertura (remove ruído) seguida de fecho, e filtro por área. */
export function detectBlobs(img, lo, hi, minArea, maxArea) {
  const { width: w, height: h } = img;
  let mask = hsvMask(img, lo, hi);
  mask = dilate(erode(mask, w, h), w, h);
  mask = erode(dilate(mask, w, h), w, h);
  const blobs = components(mask, w, h).filter((b) => b.area >= minArea && b.area <= maxArea);
  return { blobs, mask };
}

/** Calibra a cor a partir de um clique num marcador (x, y em píxeis da imagem). */
export function sampleHsvRange(img, x, y, r = 4, dh = 10, ds = 70, dv = 80) {
  const { data, width, height } = img;
  let sinS = 0, cosS = 0;
  const ss = [], vs = [];
  for (let yy = Math.max(0, y - r); yy <= Math.min(height - 1, y + r); yy++)
    for (let xx = Math.max(0, x - r); xx <= Math.min(width - 1, x + r); xx++) {
      const i = (yy * width + xx) * 4;
      const [hh, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      const ang = (hh * 2 * Math.PI) / 180;
      sinS += Math.sin(ang); cosS += Math.cos(ang);
      ss.push(s); vs.push(v);
    }
  const med = (a) => { const b = [...a].sort((p, q) => p - q); return b[b.length >> 1]; };
  const hue = ((((Math.atan2(sinS, cosS) * 180) / Math.PI) + 360) % 360) / 2;
  const s = med(ss), v = med(vs);
  const lo = [Math.round((hue - dh + 180) % 180), Math.round(Math.max(s - ds, 60)), Math.round(Math.max(v - dv, 50))];
  const hi = [Math.round((hue + dh) % 180), 255, 255];
  return { lo, hi, hsv: [Math.round(hue), Math.round(s), Math.round(v)] };
}
