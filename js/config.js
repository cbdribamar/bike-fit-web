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

// Perfis-tipo por estilo de ciclista.
// São faixas GENÉRICAS, construídas a partir das faixas da literatura de bike fit e das
// tendências típicas de cada estilo. Não correspondem a nenhum ciclista concreto.
// Só se indicam as métricas que mudam em relação à base de estrada.
export const ESTILOS = {
  trepador: {
    nome: "Trepador",
    descricao: "Leve, pedala muito tempo em subida e sentado. Posição compacta, com o tronco um pouco mais alto e a anca menos fechada, e cadência alta.",
    refs: { joelho_max: [140, 148], anca_min: [48, null], tronco_medio: [38, 48], cotovelo_medio: [150, 165] },
    cadencia: "85–95 rpm",
  },
  rolador: {
    nome: "Rolador / endurance",
    descricao: "Muitas horas na bicicleta (granfondos, cicloturismo, ultradistância). Prioriza conforto e sustentabilidade: tronco mais alto, anca mais aberta e joelho um pouco menos esticado.",
    refs: { joelho_max: [138, 146], anca_min: [50, null], tronco_medio: [45, 60], cotovelo_medio: [145, 160] },
    cadencia: "80–90 rpm",
  },
  sprinter: {
    nome: "Sprinter / puncheur",
    descricao: "Esforços curtos e muito intensos. Posição mais baixa e alongada, com alcance maior, que favorece a aerodinâmica e a força no guiador.",
    refs: { joelho_max: [142, 150], anca_min: [44, null], tronco_medio: [30, 42], cotovelo_medio: [148, 162] },
    cadencia: "90–100 rpm",
  },
  contrarrelogista: {
    nome: "Contrarrelogista",
    descricao: "Bicicleta de contrarrelógio ou triatlo, com os antebraços nos apoios aerodinâmicos. Tronco muito baixo e anca fechada; o selim costuma ir mais alto e mais à frente.",
    refs: { joelho_max: [142, 152], joelho_min: [68, 78], anca_min: [40, null], tronco_medio: [12, 28], cotovelo_medio: [85, 110] },
    cadencia: "85–95 rpm",
  },
};

/** Faixas de um estilo (base de estrada + o que o estilo altera). */
export function referenciasEstilo(estilo) {
  const refs = structuredClone(REFERENCIAS);
  for (const [m, [lo, hi]] of Object.entries(ESTILOS[estilo]?.refs || {})) refs[m] = [lo, hi, refs[m][2]];
  return refs;
}

/**
 * Faixas de referência ajustadas ao perfil.
 * Ordem: base de estrada → tipo de bicicleta → estilo de ciclista (se indicado) →
 * flexibilidade baixa / objetivo conforto (posição mais alta e joelho menos esticado).
 */
export function referencias(perfil = {}) {
  const tipo = perfil.tipo_bicicleta || "estrada";
  const estilo = ESTILOS[perfil.estilo] ? perfil.estilo : null;
  const refs = estilo ? referenciasEstilo(estilo) : structuredClone(REFERENCIAS);
  if (!estilo) {
    const [lo, hi] = TRONCO_POR_TIPO[tipo] || TRONCO_POR_TIPO.estrada;
    refs.tronco_medio = [lo, hi, refs.tronco_medio[2]];
    if (tipo === "contrarrelogio") {
      refs.anca_min = [40, null, refs.anca_min[2]];
      refs.cotovelo_medio = [85, 110, refs.cotovelo_medio[2]];
    }
  }
  const flex = perfil.flexibilidade;
  if (flex === "baixa" || perfil.objetivo === "conforto") {
    const [lo, hi, d] = refs.tronco_medio;
    refs.tronco_medio = [lo + 5, hi + 5, d];
  }
  if (flex === "baixa") {
    const [lo, hi, d] = refs.joelho_max;
    refs.joelho_max = [lo - 2, hi - 2, d];
  }
  return refs;
}

/** Diferenças menores do que isto (em graus) contam como dentro da faixa na comparação. */
export const TOLERANCIA_ESTILO = 0.5;

const METRICAS_POSICAO = ["joelho_max", "joelho_min", "anca_min", "tornozelo_amplitude", "tronco_medio", "cotovelo_medio"];

/**
 * Compara as médias medidas com cada perfil-tipo.
 * Devolve [{estilo, nome, dentro, total, distancia}] ordenado do mais parecido para o menos:
 * mais métricas dentro da faixa; em empate, menor distância total (em graus) às faixas;
 * e, por fim, maior proximidade ao centro de cada faixa (0 = no centro, 1 = no limite).
 */
export function compararEstilos(metricas) {
  const out = Object.entries(ESTILOS).map(([estilo, e]) => {
    const refs = referenciasEstilo(estilo);
    let dentro = 0, total = 0, distancia = 0, centro = 0, nCentro = 0;
    for (const m of METRICAS_POSICAO) {
      const v = metricas?.[m]?.media;
      if (!Number.isFinite(v)) continue;
      total++;
      const [lo, hi] = refs[m];
      let d = lo != null && v < lo ? lo - v : hi != null && v > hi ? v - hi : 0;
      if (d < TOLERANCIA_ESTILO) d = 0; // abaixo da precisão da medição
      if (d === 0) dentro++;
      distancia += d;
      if (lo != null && hi != null) { centro += Math.abs(v - (lo + hi) / 2) / ((hi - lo) / 2); nCentro++; }
    }
    const proximidade = nCentro ? centro / nCentro : 0;
    return { estilo, nome: e.nome, dentro, total, distancia, proximidade };
  });
  return out.sort((a, b) => b.dentro - a.dentro || a.distancia - b.distancia || a.proximidade - b.proximidade);
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
      ["estilo", "Estilo de ciclista", "select", {
        "": "— (usar o tipo de bicicleta)", trepador: "Trepador", rolador: "Rolador / endurance",
        sprinter: "Sprinter / puncheur", contrarrelogista: "Contrarrelogista",
      }],
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
