// Ciclista simulado para a demonstração (sem câmara nem rolos).
// Frame 1280×720; escala 1 px = 2,5 mm.

const PX_CM = 4.0;
const BB = [560, 585];
const COXA = 50 * PX_CM, PERNA = 50 * PX_CM;
const BRACO = 30 * PX_CM, ANTEBRACO = 27 * PX_CM;
const TRONCO = 56 * PX_CM;
const ANG_SELIM = (73.5 * Math.PI) / 180;
const RODA = 34 * PX_CM;
const PE = 15 * PX_CM;

export const DEMO_W = 1280, DEMO_H = 720;
export const COR_MARCADOR = "rgb(255,120,0)";
export const HSV_DEMO = { lo: [4, 150, 150], hi: [24, 255, 255] };

// Cenários do simulador. Medidas em cm e graus:
//   anca: altura do trocânter ao longo do tubo de selim (≈ altura do selim)
//   pedivela: comprimento da pedivela · tronco: inclinação do tronco
//   cotovelo: ângulo do cotovelo · tornozelo: meia-amplitude do movimento do tornozelo
const BASE = { anca: 88, pedivela: 17.25, tronco: 42, cotovelo: 155, tornozelo: 11, dy: 0 };
export const CENARIOS = {
  correto: { nome: "Correto", descricao: "Todos os valores dentro das faixas de referência.", ...BASE },
  baixo: { nome: "Selim baixo", descricao: "Só o selim está baixo: extensão e flexão do joelho abaixo da faixa.", ...BASE, anca: 85.5 },
  alto: { nome: "Selim alto", descricao: "Só o selim está alto: extensão do joelho acima da faixa.", ...BASE, anca: 89.4 },
  tudo_baixo: {
    nome: "Tudo abaixo",
    descricao: "Selim baixo, pedivela longa, tronco muito inclinado, cotovelos muito fletidos e tornozelo rígido.",
    anca: 84, pedivela: 19, tronco: 32, cotovelo: 145, tornozelo: 3,
  },
  tudo_alto: {
    nome: "Tudo acima",
    descricao: "Selim alto, pedivela curta, tronco muito direito, braços esticados e tornozelo a compensar. A anca não tem limite máximo.",
    anca: 92, pedivela: 14, tronco: 62, cotovelo: 172, tornozelo: 19,
    dy: 26, // desce o desenho para a cabeça caber no enquadramento (não altera ângulos)
  },
};
/** Compatibilidade: nomes antigos dos cenários de selim. */
export const SELINS = Object.fromEntries(["baixo", "correto", "alto"].map((k) => [k, CENARIOS[k].anca * PX_CM]));

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const norm = (a) => Math.hypot(a[0], a[1]);
const rad = (d) => (d * Math.PI) / 180;

/** Posição da articulação intermédia de uma cadeia de 2 segmentos a -> b -> c. */
function ik(a, c, l1, l2, paraFrente = true) {
  const dv = sub(c, a);
  const d = Math.min(norm(dv), l1 + l2 - 1e-3);
  const u = mul(dv, 1 / Math.max(norm(dv), 1e-6));
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - x * x, 0));
  const perp = [u[1], -u[0]];
  const b1 = add(add(a, mul(u, x)), mul(perp, h));
  const b2 = sub(add(a, mul(u, x)), mul(perp, h));
  if (paraFrente) return b1[0] > b2[0] ? b1 : b2;
  return b1[1] > b2[1] ? b1 : b2;
}

function gauss(rng) {
  const u = 1 - rng(), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DemoCiclista {
  constructor({ rpm = 85, cenario, selim, ruidoPose = 6 } = {}) {
    this.rpm = rpm;
    this.cenario = cenario || selim || "correto";
    this.ruido = ruidoPose;
    this.rng = mulberry32(1);
  }

  /** Parâmetros do cenário atual (ou um objeto de parâmetros personalizado). */
  get cfg() {
    return typeof this.cenario === "object" ? { ...BASE, ...this.cenario } : CENARIOS[this.cenario] || CENARIOS.correto;
  }

  // compatibilidade com o nome antigo
  get selim() { return this.cenario; }
  set selim(v) { this.cenario = v; }

  /** Eixo pedaleiro do cenário atual. */
  get bb() { return [BB[0], BB[1] + (this.cfg.dy || 0)]; }

  anca() {
    return add(this.bb, mul([-Math.cos(ANG_SELIM), -Math.sin(ANG_SELIM)], this.cfg.anca * PX_CM));
  }

  perna(th, anca) {
    const c = this.cfg;
    const pedal = add(this.bb, mul([Math.cos(th), Math.sin(th)], c.pedivela * PX_CM));
    const pe = add(pedal, [4, -4]);
    const alvo = rad(108 + c.tornozelo * Math.sin(th - rad(70)));
    let alfa = rad(30), tornozelo, joelho;
    for (let i = 0; i < 4; i++) {
      tornozelo = sub(pedal, mul([Math.cos(alfa), Math.sin(alfa)], PE));
      joelho = ik(anca, tornozelo, COXA, PERNA, true);
      const pv = sub(joelho, tornozelo);
      alfa = Math.atan2(pv[1], pv[0]) + alvo;
    }
    tornozelo = sub(pedal, mul([Math.cos(alfa), Math.sin(alfa)], PE));
    joelho = ik(anca, tornozelo, COXA, PERNA, true);
    return { pedal, pe, tornozelo, joelho };
  }

  pontos(t) {
    const th = ((2 * Math.PI * this.rpm) / 60) * t - Math.PI / 2;
    const anca = add(this.anca(), [0, 1.5 * Math.sin(2 * th)]);
    const c = this.cfg;
    const tr = rad(c.tronco + 0.6 * Math.sin(2 * th));
    const ombro = add(anca, mul([Math.cos(tr), -Math.sin(tr)], TRONCO));
    const d = Math.sqrt(BRACO ** 2 + ANTEBRACO ** 2 - 2 * BRACO * ANTEBRACO * Math.cos(rad(c.cotovelo)));
    const pulso = add(ombro, mul([Math.cos(rad(72)), Math.sin(rad(72))], d));
    const cotovelo = ik(ombro, pulso, BRACO, ANTEBRACO, false);
    const p = this.perna(th, anca);
    return { ombro, cotovelo, pulso, anca, joelho: p.joelho, tornozelo: p.tornozelo, pe: p.pe, _pedal: p.pedal, _th: th };
  }

  /** Imita a estimativa de pose: posições aproximadas (com ruído) de cada articulação. */
  poseSimulada(t) {
    const p = this.pontos(t);
    const out = {};
    for (const [k, v] of Object.entries(p)) {
      if (k.startsWith("_")) continue;
      out[k] = [v[0] + gauss(this.rng) * this.ruido, v[1] + gauss(this.rng) * this.ruido];
    }
    return out;
  }

  /** Desenha o frame no contexto 2D (1280×720). */
  draw(ctx, t) {
    const p = this.pontos(t);
    desenhar(ctx, this, p);
    return p;
  }
}

// ------------------------------------------------------------------ desenho
// Paleta escolhida para não ter nada parecido com o laranja dos marcadores
// (matiz 4–24 com saturação alta), para não confundir a deteção de cor.
const COR = {
  parede1: "#e9edf1", parede2: "#cfd6dd", chao: "#9aa3ab", chaoLinha: "#8a939b",
  quadro: "#1f6f78", quadroLuz: "#4fa3ad", aro: "#8c949b", pneu: "#1d1f22", raio: "#b8bec4",
  metal: "#5b6168", metalEsc: "#33373c", fita: "#202326", selim: "#1a1c1f",
  pele: "#d9b293", peleSombra: "#b8937a", peleLonge: "#a98a74",
  camisola: "#1f4e8c", camisolaLonge: "#173a68", faixa: "#e8eef6",
  calcoes: "#1b1c21", calcoesLonge: "#121317",
  meia: "#f1f3f5", sapato: "#f4f5f7", sola: "#2a2d31", sapatoLonge: "#c9ccd1",
  capacete: "#f6f7f9", capaceteDet: "#1f4e8c", oculos: "#14161a", luva: "#262a30",
};

const ad = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sb = (a, b) => [a[0] - b[0], a[1] - b[1]];
const ml = (a, k) => [a[0] * k, a[1] * k];
const nr = (a) => { const n = Math.hypot(a[0], a[1]) || 1; return [a[0] / n, a[1] / n]; };
const pp = (a) => [-a[1], a[0]];
const rd = (d) => (d * Math.PI) / 180;

/** Segmento com volume: largura ra em a, rm a meio (desviado por bojo), rb em b. */
function membro(ctx, a, b, ra, rm, rb, cor, bojo = 0) {
  const u = nr(sb(b, a)), n = pp(u);
  const m = ad(ml(ad(a, b), 0.5), ml(n, bojo));
  const a1 = ad(a, ml(n, ra)), a2 = sb(a, ml(n, ra));
  const b1 = ad(b, ml(n, rb)), b2 = sb(b, ml(n, rb));
  const m1 = ad(m, ml(n, rm)), m2 = sb(m, ml(n, rm));
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(...a1);
  ctx.quadraticCurveTo(m1[0] * 2 - (a1[0] + b1[0]) / 2, m1[1] * 2 - (a1[1] + b1[1]) / 2, ...b1);
  ctx.arc(b[0], b[1], rb, Math.atan2(n[1], n[0]), Math.atan2(-n[1], -n[0]), true);
  ctx.quadraticCurveTo(m2[0] * 2 - (a2[0] + b2[0]) / 2, m2[1] * 2 - (a2[1] + b2[1]) / 2, ...a2);
  ctx.arc(a[0], a[1], ra, Math.atan2(-n[1], -n[0]), Math.atan2(n[1], n[0]), true);
  ctx.closePath();
  ctx.fill();
}

function linha(ctx, a, b, cor, esp, cap = "round") {
  ctx.strokeStyle = cor; ctx.lineWidth = esp; ctx.lineCap = cap;
  ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
}

function circulo(ctx, c, r, cor) {
  ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 2 * Math.PI); ctx.fill();
}

function tubo(ctx, a, b, esp) {
  linha(ctx, a, b, COR.quadro, esp);
  // reflexo
  const n = ml(pp(nr(sb(b, a))), -esp * 0.22);
  linha(ctx, ad(a, n), ad(b, n), COR.quadroLuz, Math.max(1.5, esp * 0.22));
}

function roda(ctx, c, ang) {
  ctx.strokeStyle = COR.pneu; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.arc(c[0], c[1], RODA, 0, 2 * Math.PI); ctx.stroke();
  ctx.strokeStyle = COR.aro; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(c[0], c[1], RODA - 8, 0, 2 * Math.PI); ctx.stroke();
  ctx.strokeStyle = COR.raio; ctx.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const a = ang + (i * Math.PI) / 12;
    const o = rd(i % 2 ? 6 : -6);
    ctx.beginPath();
    ctx.moveTo(c[0] + Math.cos(a + o) * 9, c[1] + Math.sin(a + o) * 9);
    ctx.lineTo(c[0] + Math.cos(a) * (RODA - 9), c[1] + Math.sin(a) * (RODA - 9));
    ctx.stroke();
  }
  circulo(ctx, c, 10, COR.metal);
  circulo(ctx, c, 4, COR.metalEsc);
}

/** Pé + sapato: do tornozelo até à ponta, por cima do pedal. */
function sapato(ctx, tornozelo, pe, cor, sola) {
  const u = nr(sb(pe, tornozelo));
  const ponta = ad(pe, ml(u, 26));
  const calc = ad(tornozelo, ml(u, -18));
  const n = pp(u);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(...ad(calc, ml(n, -14)));
  ctx.quadraticCurveTo(...ad(tornozelo, ml(n, -20)), ...ad(pe, ml(n, -12)));
  ctx.quadraticCurveTo(...ad(ponta, ml(n, -6)), ...ponta);
  ctx.lineTo(...ad(ponta, ml(n, 4)));
  ctx.lineTo(...ad(calc, ml(n, 8)));
  ctx.closePath();
  ctx.fill();
  linha(ctx, ad(calc, ml(n, 8)), ad(ponta, ml(n, 4)), sola, 5);
}

function pedal(ctx, c, cor) {
  ctx.fillStyle = cor;
  ctx.fillRect(c[0] - 14, c[1] - 3, 28, 7);
}

function desenhar(ctx, demo, p) {
  const c = demo.cfg;
  const BB = demo.bb;
  const dy = c.dy || 0;
  const th = p._th;
  const chaoY = 702 + dy;

  // fundo: parede e chão
  const g = ctx.createLinearGradient(0, 0, 0, chaoY);
  g.addColorStop(0, COR.parede1); g.addColorStop(1, COR.parede2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, chaoY);
  ctx.fillStyle = COR.chao; ctx.fillRect(0, chaoY, 1280, 720 - chaoY + 40);
  ctx.strokeStyle = COR.chaoLinha; ctx.lineWidth = 1;
  for (let x = -400; x < 1700; x += 120) { ctx.beginPath(); ctx.moveTo(x, chaoY); ctx.lineTo(x + (x - 640) * 0.4, 760); ctx.stroke(); }
  // sombra
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath(); ctx.ellipse(BB[0] + 40, chaoY + 4, 360, 12, 0, 0, 2 * Math.PI); ctx.fill();

  const tras = ad(BB, [-41 * PX_CM, -3.5 * PX_CM]);
  const frente = ad(BB, [60 * PX_CM, -3.5 * PX_CM]);
  const dirSelim = [-Math.cos(ANG_SELIM), -Math.sin(ANG_SELIM)];
  const topoSelim = ad(BB, ml(dirSelim, c.anca * PX_CM - 24));
  const caixaTopo = ad(frente, [-58, -230]);
  const caixaBase = ad(frente, [-44, -180]);
  const juncaoSelim = ad(BB, ml(dirSelim, 150 * 1.0 + 10));
  const avanco = ad(caixaTopo, [20, -10]);
  const giro = (-th * 2.8) % (2 * Math.PI); // roda traseira a girar (relação ~2,8)

  // rolo de treino
  linha(ctx, [tras[0] - 70, chaoY], [tras[0], tras[1]], COR.metalEsc, 7);
  linha(ctx, [tras[0] + 70, chaoY], [tras[0], tras[1]], COR.metalEsc, 7);
  ctx.fillStyle = COR.metalEsc; ctx.fillRect(tras[0] - 85, chaoY - 6, 170, 8);
  circulo(ctx, [tras[0] + 40, tras[1] + RODA + 2], 16, COR.metal);
  circulo(ctx, [tras[0] + 40, tras[1] + RODA + 2], 6, COR.metalEsc);
  // calço da roda da frente
  ctx.fillStyle = COR.metalEsc;
  ctx.beginPath(); ctx.ellipse(frente[0], chaoY - 6, 60, 10, 0, Math.PI, 2 * Math.PI); ctx.fill();

  // lado de lá: perna e braço (mais escuros, atrás da bicicleta)
  const longe = demo.perna(th + Math.PI, p.anca);
  pedal(ctx, longe.pedal, COR.metalEsc);
  linha(ctx, BB, longe.pedal, COR.metalEsc, 9);
  membro(ctx, p.anca, longe.joelho, 30, 30, 18, COR.calcoesLonge, -4);
  membro(ctx, longe.joelho, longe.tornozelo, 17, 19, 10, COR.peleLonge, 5);
  membro(ctx, ad(longe.tornozelo, ml(nr(sb(longe.joelho, longe.tornozelo)), 26)), longe.tornozelo, 11, 11, 10, COR.sapatoLonge);
  sapato(ctx, longe.tornozelo, longe.pe, COR.sapatoLonge, COR.sola);

  // rodas
  roda(ctx, tras, giro);
  roda(ctx, frente, 0.3);

  // transmissão
  const cog = ad(tras, [0, 0]);
  ctx.strokeStyle = COR.metalEsc; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(BB[0], BB[1] - 38); ctx.lineTo(cog[0], cog[1] - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(BB[0], BB[1] + 38); ctx.lineTo(cog[0], cog[1] + 16); ctx.stroke();
  circulo(ctx, cog, 18, COR.metal);
  circulo(ctx, cog, 7, COR.metalEsc);

  // quadro
  tubo(ctx, tras, BB, 9);                       // escora inferior
  tubo(ctx, tras, juncaoSelim, 7);              // escora superior
  tubo(ctx, BB, juncaoSelim, 13);               // tubo de selim
  tubo(ctx, juncaoSelim, caixaTopo, 11);        // tubo superior
  tubo(ctx, BB, caixaBase, 15);                 // tubo diagonal
  tubo(ctx, caixaBase, caixaTopo, 16);          // caixa de direção
  linha(ctx, caixaBase, frente, COR.quadro, 9); // forqueta
  linha(ctx, juncaoSelim, topoSelim, COR.metal, 7); // espigão
  // selim
  const s0 = ad(topoSelim, [-44, 2]), s1 = ad(topoSelim, [40, 4]);
  ctx.fillStyle = COR.selim;
  ctx.beginPath();
  ctx.moveTo(...s0);
  ctx.quadraticCurveTo(topoSelim[0] - 10, topoSelim[1] - 12, s1[0], s1[1]);
  ctx.lineTo(s1[0] + 4, s1[1] + 6);
  ctx.quadraticCurveTo(topoSelim[0], topoSelim[1] + 10, s0[0], s0[1] + 8);
  ctx.closePath(); ctx.fill();
  // avanço e guiador de estrada
  linha(ctx, caixaTopo, avanco, COR.metalEsc, 9);
  const mao = p.pulso;
  const gTop = ad(avanco, [6, 0]);
  ctx.strokeStyle = COR.fita; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(...gTop);
  ctx.quadraticCurveTo(mao[0] + 14, gTop[1] - 2, mao[0] + 10, mao[1] + 6);
  ctx.quadraticCurveTo(mao[0] + 40, mao[1] + 40, mao[0] + 6, mao[1] + 62);
  ctx.lineTo(mao[0] - 14, mao[1] + 58);
  ctx.stroke();
  // manete
  ctx.fillStyle = COR.metalEsc;
  ctx.beginPath(); ctx.ellipse(mao[0] + 8, mao[1] + 2, 9, 16, rd(-20), 0, 2 * Math.PI); ctx.fill();

  // pedaleiro (lado de cá)
  ctx.strokeStyle = COR.metal; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(BB[0], BB[1], 40, 0, 2 * Math.PI); ctx.stroke();
  ctx.setLineDash([3, 4]); ctx.strokeStyle = COR.metalEsc; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(BB[0], BB[1], 43, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 4; i++) { const a = th + (i * Math.PI) / 2 + 0.4; linha(ctx, BB, ad(BB, [Math.cos(a) * 38, Math.sin(a) * 38]), COR.metal, 5); }

  // ---- ciclista (lado da câmara) ----
  const dirTronco = nr(sb(p.ombro, p.anca));
  const angTronco = Math.atan2(-dirTronco[1], dirTronco[0]);
  const angCabeca = Math.max(rd(18), angTronco - rd(16));
  const pescoco = ad(p.ombro, ml([Math.cos(angCabeca), -Math.sin(angCabeca)], 30));
  const cabeca = ad(p.ombro, ml([Math.cos(angCabeca), -Math.sin(angCabeca)], 62));

  // glúteo (calções) por baixo do tronco
  circulo(ctx, ad(p.anca, [-4, 2]), 31, COR.calcoes);
  // tronco (camisola) com costas arredondadas
  membro(ctx, ad(p.anca, ml(dirTronco, 12)), p.ombro, 30, 38, 28, COR.camisola, -10);
  // faixa da camisola
  const nT = pp(dirTronco);
  linha(ctx, ad(ml(ad(p.anca, p.ombro), 0.5), ml(nT, 34)), ad(ml(ad(p.anca, p.ombro), 0.5), ml(nT, -30)), COR.faixa, 6, "butt");

  // pescoço e cabeça
  membro(ctx, p.ombro, pescoco, 13, 12, 12, COR.peleSombra);
  circulo(ctx, cabeca, 25, COR.pele);
  // orelha e óculos
  circulo(ctx, ad(cabeca, [-6, 2]), 5, COR.peleSombra);
  const fr = [Math.cos(angCabeca - rd(10)), -Math.sin(angCabeca - rd(10))];
  ctx.fillStyle = COR.oculos;
  ctx.beginPath(); ctx.ellipse(...ad(cabeca, ad(ml(fr, 19), [0, -2])), 11, 6, rd(-8), 0, 2 * Math.PI); ctx.fill();
  linha(ctx, ad(cabeca, [-4, -4]), ad(cabeca, ad(ml(fr, 12), [0, -4])), COR.oculos, 3);
  // capacete aerodinâmico
  ctx.save();
  ctx.translate(cabeca[0], cabeca[1] - 8);
  ctx.rotate(-angCabeca + rd(22));
  ctx.fillStyle = COR.capacete;
  ctx.beginPath();
  ctx.moveTo(-34, 6);
  ctx.quadraticCurveTo(-30, -28, 6, -26);
  ctx.quadraticCurveTo(32, -24, 34, 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = COR.capaceteDet;
  ctx.fillRect(-10, -24, 6, 22); ctx.fillRect(4, -24, 6, 22);
  ctx.restore();

  // braço: ombro (manga), antebraço, luva
  membro(ctx, p.ombro, p.cotovelo, 18, 17, 12, COR.pele, -2);
  membro(ctx, p.ombro, ad(p.ombro, ml(nr(sb(p.cotovelo, p.ombro)), 40)), 21, 21, 19, COR.camisola);
  membro(ctx, p.cotovelo, p.pulso, 12, 13, 9, COR.pele, 2);
  circulo(ctx, ad(p.pulso, ml(nr(sb(p.pulso, p.cotovelo)), 8)), 12, COR.luva);

  // perna: coxa (calções), perna (gémeo), meia e sapato
  const dirCoxa = nr(sb(p.joelho, p.anca));
  const fimCalcao = ad(p.anca, ml(sb(p.joelho, p.anca), 0.82));
  membro(ctx, p.anca, p.joelho, 34, 33, 19, COR.pele, -4);
  membro(ctx, p.anca, fimCalcao, 35, 34, 22, COR.calcoes, -4);
  void dirCoxa;
  membro(ctx, p.joelho, p.tornozelo, 18, 21, 10, COR.pele, 6);
  const dirPerna = nr(sb(p.joelho, p.tornozelo));
  membro(ctx, ad(p.tornozelo, ml(dirPerna, 30)), p.tornozelo, 12, 12, 11, COR.meia);
  linha(ctx, BB, p._pedal, COR.metal, 10);
  pedal(ctx, p._pedal, COR.metalEsc);
  sapato(ctx, p.tornozelo, p.pe, COR.sapato, COR.sola);
  circulo(ctx, BB, 9, COR.metalEsc);

  // marcadores (por cima de tudo)
  for (const k of ["ombro", "cotovelo", "pulso", "anca", "joelho", "tornozelo", "pe"]) {
    circulo(ctx, p[k], 7, COR_MARCADOR);
  }
}
