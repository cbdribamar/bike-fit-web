// Estimativa de pose com MediaPipe (WebAssembly, carregado do CDN apenas quando é preciso).
import { MEDIAPIPE_URL, POSE_IDX, POSE_MODEL_URL } from "./config.js";

let carregamento = null;
// O landmarker em modo VIDEO exige timestamps sempre crescentes, mesmo entre fontes diferentes.
let ultimoTs = -1;

async function criarLandmarker() {
  const { FilesetResolver, PoseLandmarker } = await import(`${MEDIAPIPE_URL}/vision_bundle.mjs`);
  const fileset = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_URL}/wasm`);
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  try {
    return await PoseLandmarker.createFromOptions(fileset, opts("GPU"));
  } catch (_) {
    return await PoseLandmarker.createFromOptions(fileset, opts("CPU"));
  }
}

export class PoseEstimator {
  constructor(lado = "auto", framesAuto = 30) {
    this.lado = lado === "auto" ? null : lado;
    this.framesAuto = framesAuto;
    this.votos = 0;
    this.n = 0;
    this.lm = null;
    this.offset = ultimoTs + 1; // cada fonte começa depois da anterior
  }

  async carregar() {
    // O mesmo landmarker é partilhado: carregar o modelo demora alguns segundos.
    if (!carregamento) carregamento = criarLandmarker();
    try {
      this.lm = await carregamento;
    } catch (e) {
      carregamento = null;
      throw new Error("Não foi possível carregar o modelo de pose (é preciso ligação à internet na primeira utilização).");
    }
  }

  escolherLado(lms) {
    const zMedio = (lado) => {
      const ids = Object.values(POSE_IDX[lado]);
      return ids.reduce((s, i) => s + lms[i].z, 0) / ids.length;
    };
    this.votos += zMedio("esquerdo") - zMedio("direito");
    this.n++;
    const provisorio = this.votos > 0 ? "direito" : "esquerdo";
    if (this.n >= this.framesAuto) this.lado = provisorio;
    return provisorio;
  }

  /** source: HTMLVideoElement/Canvas; devolve {label: [x, y]} em píxeis de (w, h). */
  detetar(source, tsMs, w, h) {
    if (!this.lm) return {};
    const ts = Math.max(this.offset + Math.round(tsMs), ultimoTs + 1);
    ultimoTs = ts;
    const res = this.lm.detectForVideo(source, ts);
    const lms = res.landmarks?.[0];
    if (!lms) return {};
    const lado = this.lado || this.escolherLado(lms);
    const pts = {};
    for (const [label, idx] of Object.entries(POSE_IDX[lado])) {
      const lm = lms[idx];
      if ((lm.visibility ?? 1) >= 0.3) pts[label] = [lm.x * w, lm.y * h];
    }
    return pts;
  }
}
