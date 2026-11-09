// Constantes, faixas de referência e campos do perfil.

export const MEDIAPIPE_VERSION = "1.1.1";
export const MEDIAPIPE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;
export const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";

// Pontos (marcadores) da análise lateral.
export const LABELS = ["ombro", "cotovelo", "pulso", "anca", "joelho", "tornozelo", "pe"];
export const NOMES = {
  ombro: "Ombro", cotovelo: "Cotovelo", pulso: "Pulso", anca: "Anca",
  joelho: "Joelho", tornozelo: "Tornozelo", pe: "Pé",
};
export const LOCAL_ANATOMICO = {
  ombro: "acrómio", cotovelo: "epicôndilo lateral", pulso: "estilóide (lado de fora)",
  anca: "grande trocânter", joelho: "côndilo lateral do fémur",
  tornozelo: "maléolo lateral", pe: "5.º metatarso (sapato)",
};

// Índices do MediaPipe Pose (33 landmarks) por lado do corpo.
export const POSE_IDX = {
  esquerdo: { ombro: 11, cotovelo: 13, pulso: 15, anca: 23, joelho: 25, tornozelo: 27, pe: 31 },
  direito: { ombro: 12, cotovelo: 14, pulso: 16, anca: 24, joelho: 26, tornozelo: 28, pe: 32 },
};

export const SEGMENTOS = [
  ["ombro", "cotovelo"], ["cotovelo", "pulso"], ["ombro", "anca"],
  ["anca", "joelho"], ["joelho", "tornozelo"], ["tornozelo", "pe"],
];

export const ANGULOS = ["joelho", "anca", "tornozelo", "cotovelo", "tronco"];
export const ANGULOS_NOMES = {
  joelho: "Joelho", anca: "Anca", tornozelo: "Tornozelo", cotovelo: "Cotovelo", tronco: "Tronco",
};

// [mínimo, máximo, descrição]; null = sem limite.
export const REFERENCIAS = {
  joelho_max: [140, 150, "Ângulo do joelho em extensão (PMI)"],
  joelho_min: [65, 75, "Ângulo do joelho em flexão (PMS)"],
  anca_min: [45, null, "Ângulo da anca mais fechado"],
  tornozelo_amplitude: [15, 30, "Amplitude do tornozelo"],
  tronco_medio: [35, 50, "Inclinação do tronco"],
  cotovelo_medio: [150, 165, "Ângulo do cotovelo"],
  cadencia: [null, null, "Cadência (rpm)"],
};

export const TIPOS_BICICLETA = {
  estrada: "Estrada",
  contrarrelogio: "Contrarrelógio / triatlo",
  gravel: "Gravel",
  btt: "BTT",
  cidade: "Cidade / lazer",
};

const TRONCO_POR_TIPO = {
  estrada: [35, 50], contrarrelogio: [12, 28], gravel: [40, 55], btt: [40, 60], cidade: [55, 80],
};

/** Faixas de referência ajustadas ao perfil (tipo de bicicleta, flexibilidade, objetivo). */
export function referencias(perfil = {}) {
  const refs = structuredClone(REFERENCIAS);
  const tipo = perfil.tipo_bicicleta || "estrada";
  let [lo, hi] = TRONCO_POR_TIPO[tipo] || TRONCO_POR_TIPO.estrada;
  const flex = perfil.flexibilidade;
  if (flex === "baixa" || perfil.objetivo === "conforto") { lo += 5; hi += 5; }
  refs.tronco_medio = [lo, hi, refs.tronco_medio[2]];
  if (tipo === "contrarrelogio") {
    refs.anca_min = [40, null, refs.anca_min[2]];
    refs.cotovelo_medio = [85, 110, refs.cotovelo_medio[2]];
  }
  if (flex === "baixa") refs.joelho_max = [138, 148, refs.joelho_max[2]];
  return refs;
}

// Campos do perfil: [campo, rótulo, tipo, opções/unidade]
export const CAMPOS_PERFIL = {
  pessoal: {
    titulo: "Dados do ciclista",
    campos: [
      ["nome", "Nome", "text"],
      ["data_nascimento", "Data de nascimento", "date"],
      ["sexo", "Sexo", "select", { "": "—", F: "Feminino", M: "Masculino", O: "Outro" }],
      ["altura_cm", "Altura", "number", "cm"],
      ["peso_kg", "Peso", "number", "kg"],
      ["entreperna_cm", "Entreperna", "number", "cm"],
      ["braco_cm", "Comprimento do braço", "number", "cm"],
      ["flexibilidade", "Flexibilidade", "select", { "": "—", baixa: "Baixa", media: "Média", alta: "Alta" }],
      ["experiencia", "Experiência", "select",
        { "": "—", iniciante: "Iniciante", intermedio: "Intermédio", avancado: "Avançado", competicao: "Competição" }],
      ["km_semana", "Volume semanal", "number", "km"],
      ["objetivo", "Objetivo", "select", { "": "—", conforto: "Conforto", equilibrio: "Equilíbrio", performance: "Performance" }],
    ],
  },
  bicicleta: {
    titulo: "Bicicleta e medidas atuais",
    campos: [
      ["tipo_bicicleta", "Tipo de bicicleta", "select", TIPOS_BICICLETA],
      ["marca_modelo", "Marca / modelo", "text"],
      ["tamanho_quadro", "Tamanho do quadro", "text"],
      ["altura_selim_mm", "Altura do selim (eixo pedaleiro → topo do selim)", "number", "mm"],
      ["recuo_selim_mm", "Recuo do selim", "number", "mm"],
      ["pedivela_mm", "Comprimento da pedivela", "number", "mm"],
      ["avanco_mm", "Comprimento do avanço", "number", "mm"],
      ["largura_guiador_mm", "Largura do guiador", "number", "mm"],
    ],
  },
  saude: {
    titulo: "Dores, lesões e notas",
    campos: [
      ["dores", "Dores ou desconfortos ao pedalar", "textarea"],
      ["lesoes", "Lesões / cirurgias anteriores", "textarea"],
      ["notas", "Notas", "textarea"],
    ],
  },
};

export const DEFAULT_SETTINGS = {
  hsvLo: null, // [H, S, V] no formato OpenCV (H 0-179, S/V 0-255)
  hsvHi: null,
  minArea: 12, // relativo a um frame de 720 px de altura
  maxArea: 2500,
};
