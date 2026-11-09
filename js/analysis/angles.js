// Ângulos articulares a partir de pontos 2D (coordenadas de imagem, y para baixo).

export function angle3(a, b, c) {
  const bax = a[0] - b[0], bay = a[1] - b[1];
  const bcx = c[0] - b[0], bcy = c[1] - b[1];
  const n = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (n === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, (bax * bcx + bay * bcy) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function computeAngles(p) {
  const tri = (a, b, c) => (p[a] && p[b] && p[c] ? angle3(p[a], p[b], p[c]) : NaN);
  const out = {
    joelho: tri("anca", "joelho", "tornozelo"),
    anca: tri("ombro", "anca", "joelho"),
    tornozelo: tri("joelho", "tornozelo", "pe"),
    cotovelo: tri("ombro", "cotovelo", "pulso"),
    tronco: NaN,
  };
  if (p.ombro && p.anca) {
    const dx = Math.abs(p.ombro[0] - p.anca[0]);
    const dy = p.anca[1] - p.ombro[1];
    out.tronco = (Math.atan2(dy, dx) * 180) / Math.PI;
  }
  return out;
}
