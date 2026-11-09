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
    anca: 84, pedivela: 19, tronco: 25, cotovelo: 135, tornozelo: 3,
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
    const BB = this.bb, dy = this.cfg.dy || 0;
    const p = this.pontos(t);
    const th = p._th;
    const g = ctx.createLinearGradient(0, 0, 0, DEMO_H);
    g.addColorStop(0, "#ece8e4");
    g.addColorStop(1, "#c4c0bb");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DEMO_W, DEMO_H);
    ctx.fillStyle = "#b4b2af";
    ctx.fillRect(0, 700 + dy, DEMO_W, 20);

    const ln = (a, b, cor, esp) => {
      ctx.strokeStyle = cor; ctx.lineWidth = esp; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    const tras = add(BB, [-41 * PX_CM, -3.5 * PX_CM]);
    const frente = add(BB, [60 * PX_CM, -3.5 * PX_CM]);
    const topoSelim = add(BB, mul([-Math.cos(ANG_SELIM), -Math.sin(ANG_SELIM)], this.cfg.anca * PX_CM - 22));
    const guiador = add(p.pulso, [12, 6]);
    const caixa = add(frente, [-50, -215]);
    const QUADRO = "#284678", PELE = "#cdaf96", EQUIP = "#1e2d46", EQUIP_LONGE = "#1e283a";

    // rolo
    ctx.fillStyle = "#3c3c3c";
    ctx.fillRect(tras[0] - 60, 688 + dy, 120, 14);
    ln([tras[0], 688 + dy], tras, "#505050", 6);

    // perna do lado de lá
    const longe = this.perna(th + Math.PI, p.anca);
    ln(p.anca, longe.joelho, EQUIP_LONGE, 30);
    ln(longe.joelho, longe.tornozelo, "#917d6e", 22);
    ln(longe.tornozelo, add(longe.pe, [12, 0]), "#282828", 14);
    ln(BB, longe.pedal, "#5a5a5a", 6);

    // rodas
    for (const c of [tras, frente]) {
      ctx.strokeStyle = "#282828"; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(c[0], c[1], RODA, 0, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = "#a0a0a0"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c[0], c[1], RODA - 14, 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = "#5a5a5a";
      ctx.beginPath(); ctx.arc(c[0], c[1], 8, 0, 2 * Math.PI); ctx.fill();
    }
    // quadro
    ln(tras, BB, QUADRO, 8);
    ln(tras, add(topoSelim, [10, 40]), QUADRO, 7);
    ln(BB, topoSelim, QUADRO, 9);
    ln(add(topoSelim, [10, 40]), caixa, QUADRO, 9);
    ln(BB, add(caixa, [0, 40]), QUADRO, 11);
    ln(caixa, frente, "#5a5a5a", 7);
    ln(caixa, guiador, "#3c3c3c", 7);
    ctx.strokeStyle = "#3c3c3c"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(guiador[0] + 8, guiador[1] + 18, 14, 22, 0, -Math.PI / 2, rad(120)); ctx.stroke();
    ctx.fillStyle = "#1e1e1e";
    ctx.beginPath(); ctx.ellipse(topoSelim[0], topoSelim[1], 34, 7, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = "#5a5a5a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(BB[0], BB[1], 22, 0, 2 * Math.PI); ctx.stroke();

    // corpo (lado da câmara)
    ln(p.anca, p.ombro, EQUIP, 58);
    const cabeca = add(p.ombro, [48, -26]);
    ln(p.ombro, cabeca, PELE, 22);
    ctx.fillStyle = PELE;
    ctx.beginPath(); ctx.arc(cabeca[0] + 11, cabeca[1] - 5, 24, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#c82828";
    ctx.beginPath(); ctx.ellipse(cabeca[0] + 6, cabeca[1] - 17, 32, 18, rad(-10), Math.PI, 2 * Math.PI); ctx.fill();
    ln(p.anca, p.joelho, EQUIP, 36);
    ln(p.joelho, p.tornozelo, PELE, 26);
    ln(p.tornozelo, add(p.pe, [14, 0]), "#1e1e1e", 16);
    ln(BB, p._pedal, "#6e6e6e", 7);
    ln(p.ombro, p.cotovelo, PELE, 18);
    ln(p.cotovelo, p.pulso, PELE, 15);

    ctx.fillStyle = COR_MARCADOR;
    for (const k of ["ombro", "cotovelo", "pulso", "anca", "joelho", "tornozelo", "pe"]) {
      ctx.beginPath(); ctx.arc(p[k][0], p[k][1], 7, 0, 2 * Math.PI); ctx.fill();
    }
    return p;
  }
}
