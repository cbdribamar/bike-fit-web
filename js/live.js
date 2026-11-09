// Captura e análise ao vivo no browser: simulador, câmara ou ficheiro de vídeo.
import { Analisador } from "./analysis/engine.js";
import { SEGMENTOS } from "./config.js";
import { DEMO_H, DEMO_W, DemoCiclista, HSV_DEMO } from "./demo.js";
import { PoseEstimator } from "./pose.js";

const LARGURA_MAX = 960; // resolução de processamento (mais rápido, precisão suficiente)
const ARTICULACAO = { joelho: "joelho", anca: "anca", tornozelo: "tornozelo", cotovelo: "cotovelo", tronco: "ombro" };

export class LiveAnalise {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} o  { tipo: 'demo'|'camara'|'video', selim, ficheiro, cameraId, lado, defs, refs, onFim }
   */
  constructor(canvas, o) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.o = o;
    this.tipo = o.tipo;
    this.ativo = false;
    this.mostrarMascara = false;
    this.progresso = null;
    this.video = null;
    this.stream = null;
    this.url = null;
    this.demo = o.tipo === "demo" ? new DemoCiclista({ selim: o.selim || "correto" }) : null;
    this.pose = null;
    this.analisador = null;
  }

  async iniciar() {
    const { defs = {}, refs } = this.o;
    if (this.tipo === "demo") {
      this.analisador = new Analisador({
        hsvLo: HSV_DEMO.lo, hsvHi: HSV_DEMO.hi, refs, ladoFn: () => "esquerdo (simulado)",
      });
      this._dimensionar(DEMO_W, DEMO_H);
    } else {
      this.pose = new PoseEstimator(this.o.lado || "auto");
      await this.pose.carregar();
      this.video = document.createElement("video");
      this.video.muted = true;
      this.video.playsInline = true;
      if (this.tipo === "camara") {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este browser não permite aceder à câmara.");
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: this.o.cameraId ? { exact: this.o.cameraId } : undefined,
              width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 },
            },
          });
        } catch (e) {
          throw new Error(e.name === "NotAllowedError"
            ? "O acesso à câmara foi recusado. Autoriza a câmara nas definições do browser e tenta de novo."
            : `Não foi possível abrir a câmara (${e.name}).`);
        }
        this.video.srcObject = this.stream;
      } else {
        this.url = URL.createObjectURL(this.o.ficheiro);
        this.video.src = this.url;
        this.video.preload = "auto";
      }
      await new Promise((res, rej) => {
        this.video.onloadedmetadata = res;
        this.video.onerror = () => rej(new Error("Não foi possível ler o vídeo."));
      });
      if (this.tipo === "camara") await this.video.play();
      this._dimensionar(this.video.videoWidth, this.video.videoHeight);
      this.analisador = new Analisador({
        hsvLo: defs.hsvLo, hsvHi: defs.hsvHi, minArea: defs.minArea, maxArea: defs.maxArea, refs,
        ladoFn: () => this.pose.lado || "a detetar…",
      });
    }
    this.ativo = true;
    this.t0 = performance.now();
    this.tUlt = -1;
    this.nDemo = 0;
    if (this.tipo === "video") {
      // O vídeo é percorrido frame a frame (por seek): todos os frames são analisados,
      // seja qual for a velocidade do computador.
      this.passo = 1 / (this.o.fpsAnalise || 30);
      this.tVideo = 0;
      this.pausado = true;
      await this._frameVideo(); // mostra o primeiro frame
      if (defs.hsvLo) this.continuar();
      return;
    }
    this._agendar();
  }

  /** Vídeo: inicia (ou retoma) a análise depois de calibrada a cor. */
  continuar() {
    if (this.tipo !== "video" || !this.pausado) return;
    this.pausado = false;
    this.tVideo = 0;
    this.tUlt = -1;
    this.analisador.iniciarGravacao();
    this._agendar();
  }

  async _frameVideo() {
    const v = this.video;
    const t = this.tVideo;
    if (t > v.duration - this.passo / 2) { this._terminarVideo(); return; }
    await new Promise((res) => {
      const fim = () => { clearTimeout(to); v.removeEventListener("seeked", fim); res(); };
      const to = setTimeout(fim, 3000);
      v.addEventListener("seeked", fim);
      v.currentTime = t + 0.001;
    });
    if (!this.ativo) return;
    if (!this.pausado) this.tVideo += this.passo;
    this._frame(t);
  }

  _dimensionar(w, h) {
    const k = Math.min(1, LARGURA_MAX / w);
    this.srcW = w; this.srcH = h;
    this.canvas.width = Math.round(w * k);
    this.canvas.height = Math.round(h * k);
    this.k = k;
  }

  _agendar() {
    if (!this.ativo) return;
    if (this.tipo === "demo") {
      // relógio simulado: 30 fps de "tempo de vídeo", ao ritmo real quando o computador acompanha
      const devido = this.t0 + (this.nDemo * 1000) / 30;
      setTimeout(() => this._frame(null), Math.max(0, devido - performance.now()));
      return;
    }
    if (this.tipo === "video") {
      if (!this.pausado) this._frameVideo();
      return;
    }
    if (this.video && "requestVideoFrameCallback" in this.video) {
      this.video.requestVideoFrameCallback((now, meta) => this._frame(meta.mediaTime));
    } else {
      requestAnimationFrame(() => this._frame(this.video ? this.video.currentTime : null));
    }
  }

  _frame(mediaTime) {
    if (!this.ativo) return;
    try {
      const { ctx, canvas } = this;
      const W = canvas.width, H = canvas.height;
      let t, pose;
      if (this.tipo === "demo") {
        t = this.nDemo++ / 30;
        ctx.save();
        ctx.scale(this.k, this.k);
        this.demo.draw(ctx, t);
        ctx.restore();
        pose = escalar(this.demo.poseSimulada(t), this.k);
      } else {
        t = this.tipo === "video" ? mediaTime : (performance.now() - this.t0) / 1000;
        if (t <= this.tUlt && !this.pausado) return;
        ctx.drawImage(this.video, 0, 0, W, H);
        pose = this.pose.detetar(this.video, t * 1000, W, H);
      }
      this.tUlt = t;
      const img = ctx.getImageData(0, 0, W, H);
      const r = this.analisador.process(img, t, pose);
      this._desenhar(r);
      if (this.tipo === "video" && this.video.duration) this.progresso = Math.min(1, t / this.video.duration);
    } catch (e) {
      console.error(e);
      this.erro = String(e.message || e);
    } finally {
      this._agendar();
    }
  }

  _desenhar({ tracked, ang, blobs, mask, w, h }) {
    const { ctx } = this;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(235,235,235,.9)";
    ctx.lineWidth = 1;
    for (const b of blobs) { ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    for (const [a, b] of SEGMENTOS) {
      if (!tracked[a] || !tracked[b]) continue;
      ctx.beginPath(); ctx.moveTo(...tracked[a].p); ctx.lineTo(...tracked[b].p); ctx.stroke();
    }
    for (const { p, fonte } of Object.values(tracked)) {
      ctx.fillStyle = fonte === "marcador" ? "#50c850" : "#ffc800";
      ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,.85)";
    ctx.fillStyle = "#fff";
    for (const [nome, v] of Object.entries(ang)) {
      const j = tracked[ARTICULACAO[nome]];
      if (!Number.isFinite(v) || !j) continue;
      const txt = `${Math.round(v)}°`;
      ctx.strokeText(txt, j.p[0] + 12, j.p[1] - 10);
      ctx.fillText(txt, j.p[0] + 12, j.p[1] - 10);
    }
    if (this.mostrarMascara && mask) {
      const mw = Math.floor(w / 4), mh = Math.floor(h / 4);
      const mi = ctx.createImageData(mw, mh);
      for (let y = 0; y < mh; y++)
        for (let x = 0; x < mw; x++) {
          // máximo do bloco 4×4 para os marcadores não desaparecerem na redução
          let on = 0;
          for (let dy = 0; dy < 4 && !on; dy++)
            for (let dx = 0; dx < 4 && !on; dx++) on = mask[(y * 4 + dy) * w + x * 4 + dx];
          const i = (y * mw + x) * 4;
          const c = on ? 255 : 0;
          mi.data[i] = c; mi.data[i + 1] = c; mi.data[i + 2] = c; mi.data[i + 3] = 255;
        }
      ctx.putImageData(mi, w - mw, h - mh);
      ctx.strokeStyle = "#ffc800"; ctx.lineWidth = 2;
      ctx.strokeRect(w - mw, h - mh, mw, mh);
    }
  }

  _terminarVideo() {
    if (!this.ativo) return;
    const rows = this.analisador.pararGravacao();
    this.parar();
    this.o.onFim?.(rows);
  }

  calibrar(xFrac, yFrac) {
    return this.analisador?.calibrar(xFrac, yFrac) ?? null;
  }

  set selim(v) { if (this.demo) this.demo.selim = v; }
  get selim() { return this.demo?.selim; }

  estado() {
    return { ...(this.analisador?.estado() || {}), fonte: this.tipo, progresso: this.progresso, erro: this.erro,
      ativo: this.ativo, pausado: !!this.pausado };
  }

  parar() {
    this.ativo = false;
    if (this.video) { this.video.pause(); this.video.removeAttribute("src"); this.video.srcObject = null; }
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.url) URL.revokeObjectURL(this.url);
    this.stream = null; this.url = null;
  }
}

function escalar(pts, k) {
  const o = {};
  for (const [l, p] of Object.entries(pts)) o[l] = [p[0] * k, p[1] * k];
  return o;
}

export async function listarCamaras() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const d = await navigator.mediaDevices.enumerateDevices();
  return d.filter((x) => x.kind === "videoinput");
}
