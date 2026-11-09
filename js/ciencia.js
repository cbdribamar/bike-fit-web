// Página "A ciência": explicação das métricas, do método e das limitações.
import { ESTILOS, REFERENCIAS, referenciasEstilo } from "./config.js";
import { DEMO_H, DEMO_W, DemoCiclista } from "./demo.js";
import { faixa } from "./ui.js";

// Cor e letra de cada ângulo na figura.
const ANG = {
  joelho: { letra: "A", cor: "#ff7a1a" },
  anca: { letra: "B", cor: "#2f9e5a" },
  tornozelo: { letra: "C", cor: "#7b5cff" },
  tronco: { letra: "D", cor: "#2f6fd0" },
  cotovelo: { letra: "E", cor: "#d6336c" },
};

const METRICAS = [
  {
    id: "joelho_max",
    ang: "joelho",
    titulo: "Extensão do joelho no ponto morto inferior",
    pontos: "anca (grande trocânter) – joelho (côndilo lateral) – tornozelo (maléolo lateral)",
    calculo: "Ângulo interno no joelho. Em cada ciclo de pedalada guarda-se o valor máximo, quando a perna está mais esticada (perto das 6 horas da pedivela). O relatório mostra a média e o desvio-padrão de todos os ciclos.",
    porque: "É o indicador mais usado para avaliar a <b>altura do selim</b>. O joelho deve estender-se o suficiente para aproveitar a força dos músculos da coxa, mas sem chegar a esticar por completo. Um ângulo de 140–150° corresponde a uma flexão de 30–40°. Os estudos que medem o ângulo com o ciclista a pedalar (medição dinâmica) encontram valores 5–10° mais esticados do que a medição estática com goniómetro, que recomenda 25–35° de flexão.",
    abaixo: "Selim baixo, ou demasiado avançado. O joelho trabalha mais fletido, o que aumenta a compressão entre a rótula e o fémur. Está associado a dor na parte da frente do joelho e a menor eficiência.",
    acima: "Selim alto. O ciclista tem de esticar a perna para chegar ao pedal: a anca oscila no selim, o tornozelo compensa (biqueira para baixo) e aumenta a tensão nos isquiotibiais e na parte de trás do joelho.",
    ajuste: "Subir ou descer o selim em passos de 3–5 mm e repetir o teste. Como ponto de partida, o perfil mostra a altura de selim pelo método LeMond (entreperna × 0,883).",
  },
  {
    id: "joelho_min",
    ang: "joelho",
    titulo: "Flexão do joelho no ponto morto superior",
    pontos: "anca – joelho – tornozelo (os mesmos pontos)",
    calculo: "Valor mínimo do mesmo ângulo em cada ciclo, quando o pedal está em cima (perto das 12 horas) e o joelho mais dobrado.",
    porque: "Indica o quanto o joelho tem de fechar no topo da pedalada. Depende da altura do selim e também do <b>comprimento da pedivela</b> em relação ao comprimento da perna. É a métrica com menos consenso na literatura: usa-se sobretudo em conjunto com a extensão.",
    abaixo: "Joelho muito fechado: selim baixo ou pedivela comprida para a perna. Aumenta a carga na articulação entre a rótula e o fémur, sobretudo a forçar com cadência baixa.",
    acima: "Joelho pouco fletido: selim alto ou pedivela curta. Por si só raramente é um problema; confirma com a extensão no ponto morto inferior.",
    ajuste: "Se a extensão estiver correta mas o joelho fechar demasiado em cima, considerar uma pedivela mais curta.",
  },
  {
    id: "anca_min",
    ang: "anca",
    titulo: "Ângulo da anca mais fechado",
    pontos: "ombro (acrómio) – anca (grande trocânter) – joelho",
    calculo: "Ângulo entre o tronco e a coxa. Guarda-se o valor mínimo de cada ciclo, no topo da pedalada, quando a coxa sobe em direção ao peito.",
    porque: "Um ângulo de anca muito fechado limita a força dos glúteos, comprime o abdómen (pior respiração) e pode causar conflito na articulação da anca. Resulta da combinação entre a inclinação do tronco e a altura do selim e do guiador.",
    abaixo: "Posição demasiado fechada: guiador baixo ou distante, selim muito avançado ou muito baixo. Em contrarrelógio aceitam-se valores mais fechados, por isso a referência baixa para ≥ 40°.",
    acima: "Não há limite máximo: uma anca mais aberta é normal em posições mais direitas (cidade, conforto).",
    ajuste: "Subir o guiador (espaçadores, avanço com mais inclinação), encurtar o alcance ou recuar o selim.",
  },
  {
    id: "tornozelo_amplitude",
    ang: "tornozelo",
    titulo: "Amplitude do tornozelo",
    pontos: "joelho – tornozelo (maléolo lateral) – pé (5.º metatarso)",
    calculo: "Diferença entre o valor máximo e o mínimo do ângulo do tornozelo durante o ciclo, ou seja, quanto o pé \"abre e fecha\" ao pedalar.",
    porque: "O tornozelo transmite a força da perna ao pedal. Um movimento moderado é normal e varia com a técnica de cada ciclista. Um movimento muito grande ou muito pequeno costuma ser compensação de outro problema da posição.",
    abaixo: "Tornozelo rígido: técnica de pedalada \"bloqueada\" ou selim baixo (o calcanhar não precisa de descer).",
    acima: "Tornozelo a compensar: com o selim alto, o ciclista aponta a biqueira para baixo no fundo da pedalada para chegar ao pedal.",
    ajuste: "Confirmar primeiro a altura do selim. A posição dos tacos (mais à frente ou mais atrás no sapato) também altera o movimento do tornozelo.",
  },
  {
    id: "tronco_medio",
    ang: "tronco",
    titulo: "Inclinação do tronco",
    pontos: "anca – ombro, medido em relação à horizontal",
    calculo: "Ângulo da linha anca–ombro com a horizontal, em média ao longo do ciclo. 0° seria o tronco deitado; 90° seria o tronco vertical.",
    porque: "Define o compromisso entre <b>aerodinâmica e conforto</b>. Um tronco mais baixo reduz a área frontal e a resistência do ar. Abaixo de certo ponto, porém, fecha a anca, sobrecarrega lombar e pescoço e pode reduzir a potência. Por isso a referência depende do tipo de bicicleta: estrada 35–50°, contrarrelógio 12–28°, gravel 40–55°, BTT 40–60°, cidade 55–80°. A faixa sobe 5° com flexibilidade baixa ou com o objetivo \"conforto\".",
    abaixo: "Posição mais agressiva do que o habitual para esta bicicleta e este perfil: guiador baixo ou alcance longo.",
    acima: "Posição mais direita: confortável, mas menos aerodinâmica. Pode ser o que o ciclista procura.",
    ajuste: "Altura do guiador (espaçadores, inclinação do avanço) e alcance (comprimento do avanço).",
  },
  {
    id: "cotovelo_medio",
    ang: "cotovelo",
    titulo: "Ângulo do cotovelo",
    pontos: "ombro – cotovelo (epicôndilo lateral) – pulso",
    calculo: "Média do ângulo interno do cotovelo ao longo do ciclo.",
    porque: "Os cotovelos ligeiramente fletidos (15–30° de flexão, ou seja 150–165°) absorvem as vibrações da estrada e evitam que o peso fique \"pendurado\" nos ombros e no pescoço. É sobretudo um indicador do <b>alcance</b> até ao guiador.",
    abaixo: "Cotovelos muito fletidos: alcance curto (avanço curto) ou o ciclista a encolher-se para baixar o tronco. Em contrarrelógio, nos apoios aerodinâmicos, o normal é 85–110°.",
    acima: "Braços esticados ou bloqueados: alcance longo. Transmite as vibrações diretamente aos ombros e ao pescoço e costuma vir acompanhado de dores nas mãos.",
    ajuste: "Avanço mais curto ou mais comprido, ou guiador com menos ou mais alcance.",
  },
  {
    id: "cadencia",
    ang: null,
    titulo: "Cadência",
    pontos: "calculada a partir dos ciclos do joelho",
    calculo: "60 ÷ duração de cada ciclo, em rotações por minuto, medida entre dois picos consecutivos da extensão do joelho.",
    porque: "Não é uma métrica de posição, mas influencia todas as outras: com cadência baixa as forças por pedalada são maiores; com cadência muito alta o ciclista tende a saltar no selim. Os ciclistas costumam escolher espontaneamente 80–95 rpm em esforço moderado. Para comparar testes entre si, convém usar uma cadência parecida.",
    abaixo: null,
    acima: null,
    ajuste: "Durante o teste, pedalar de forma constante numa cadência confortável (por exemplo 80–90 rpm).",
  },
];

const PASSOS_METODO = [
  ["Deteção dos marcadores", "Cada frame é convertido para o espaço de cor HSV. Os píxeis da cor calibrada formam manchas, e o centro de cada mancha dá a posição de um marcador com precisão de cerca de 1 píxel."],
  ["Identificação de cada marcador", "O modelo de pose MediaPipe estima onde está cada articulação. Na primeira vez, cada marcador é atribuído à articulação mais próxima, com o algoritmo húngaro (a atribuição de menor distância total). Nos frames seguintes, cada marcador é seguido a partir da sua posição e velocidade no frame anterior; a pose só volta a ser usada se um marcador se perder."],
  ["Ângulos", "Com as coordenadas 2D dos pontos, cada ângulo interno é calculado pelo produto escalar dos dois segmentos que se encontram na articulação. A inclinação do tronco é medida em relação à horizontal da imagem."],
  ["Suavização", "O sinal de cada ângulo é suavizado com um filtro Savitzky-Golay (janela de ~120 ms), que reduz o ruído sem achatar os picos."],
  ["Ciclos de pedalada", "Os picos de extensão do joelho marcam o início de cada ciclo. Para ser válido, um pico tem de ter uma proeminência de pelo menos 20° e o ciclo tem de durar entre 0,4 e 2 s (30–150 rpm)."],
  ["Estatísticas", "Cada métrica é calculada ciclo a ciclo. O relatório mostra a média e o desvio-padrão. Um desvio-padrão alto (> 4° no joelho) indica deteção instável ou pedalada irregular."],
];

const FONTES = [
  "Holmes, J. C., Pruitt, A. L., & Whalen, N. J. (1994). Lower extremity overuse in bicycling. <i>Clinics in Sports Medicine</i>, 13(1), 187–205.",
  "Bini, R., Hume, P. A., & Croft, J. L. (2011). Effects of bicycle saddle height on knee injury risk and cycling performance. <i>Sports Medicine</i>, 41(6), 463–476.",
  "Ferrer-Roca, V., Roig, A., Galilea, P., & García-López, J. (2012). Influence of saddle height on lower limb kinematics in well-trained cyclists: static vs. dynamic evaluation in bike fitting. <i>Journal of Strength and Conditioning Research</i>, 26(11), 3025–3029.",
  "Peveler, W. W., & Green, J. M. (2011). Effects of saddle height on economy and anaerobic power in well-trained cyclists. <i>Journal of Strength and Conditioning Research</i>, 25(3), 629–633.",
  "Hamley, E. J., & Thomas, V. (1967). Physiological and postural factors in the calibration of the bicycle ergometer. <i>Journal of Physiology</i>, 191, 55P–57P.",
  "LeMond, G., & Gordis, K. (1987). <i>Greg LeMond's Complete Book of Bicycling</i>. Putnam.",
  "Fintelman, D. M., Sterling, M., Hemida, H., & Li, F.-X. (2014). Optimal cycling time trial position models: aerodynamics versus power output and metabolic energy. <i>Journal of Biomechanics</i>, 47(8), 1894–1898.",
  "Savitzky, A., & Golay, M. J. E. (1964). Smoothing and differentiation of data by simplified least squares procedures. <i>Analytical Chemistry</i>, 36(8), 1627–1639.",
  "Kuhn, H. W. (1955). The Hungarian method for the assignment problem. <i>Naval Research Logistics Quarterly</i>, 2(1–2), 83–97.",
  "Bazarevsky, V., et al. (2020). BlazePose: On-device real-time body pose tracking. <i>arXiv:2006.10204</i> (modelo usado pelo MediaPipe Pose).",
];

function cartao(m) {
  const ref = REFERENCIAS[m.id];
  const a = m.ang ? ANG[m.ang] : null;
  return `
  <article class="card ciencia-metrica" id="m-${m.id}">
    <div class="row" style="align-items:flex-start">
      ${a ? `<span class="letra" style="background:${a.cor}">${a.letra}</span>` : `<span class="letra" style="background:var(--muted)">↻</span>`}
      <div class="m-cab">
        <h3 style="margin:2px 0 4px">${m.titulo}</h3>
        <div class="small muted">${m.pontos}</div>
      </div>
      <span class="ref-chip">${m.id === "cadencia" ? "informativa" : `referência ${faixa(ref[0], ref[1])}`}</span>
    </div>
    <dl class="ciencia-dl">
      <dt>Como se mede</dt><dd>${m.calculo}</dd>
      <dt>Porque importa</dt><dd>${m.porque}</dd>
      ${m.abaixo ? `<dt><span class="pill abaixo">Abaixo</span></dt><dd>${m.abaixo}</dd>` : ""}
      ${m.acima ? `<dt><span class="pill acima">Acima</span></dt><dd>${m.acima}</dd>` : ""}
      <dt>O que ajustar</dt><dd>${m.ajuste}</dd>
    </dl>
  </article>`;
}

export async function ciencia(main) {
  main.innerHTML = `
  <section class="hero">
    <span class="tag">A ciência</span>
    <h1>O que medimos e porquê</h1>
    <p class="lead">O bike fit procura a posição em que o ciclista produz força de forma eficiente, com conforto e sem sobrecarregar as articulações. A Bike Fit mede, em vídeo e com o ciclista a pedalar, os ângulos usados nos estudos de biomecânica do ciclismo e compara-os com as faixas recomendadas.</p>
  </section>

  <section class="section">
    <div class="grid g-video">
      <figure class="card" style="margin:0">
        <canvas id="cv-ciencia" class="figura-ciencia" aria-label="Ciclista com os ângulos medidos assinalados"></canvas>
        <figcaption class="small muted" style="margin-top:10px">Os sete marcadores (laranja) e os cinco ângulos medidos, com o pedal em baixo (ponto morto inferior).</figcaption>
      </figure>
      <div class="card">
        <h3>Os ângulos</h3>
        <ul class="legenda-ang">
          ${Object.entries(ANG).map(([k, a]) => `<li><span class="letra sm" style="background:${a.cor}">${a.letra}</span> <a href="#/ciencia" data-ir="${{ joelho: "joelho_max", anca: "anca_min", tornozelo: "tornozelo_amplitude", tronco: "tronco_medio", cotovelo: "cotovelo_medio" }[k]}">${{ joelho: "Joelho", anca: "Anca", tornozelo: "Tornozelo", tronco: "Tronco (em relação à horizontal)", cotovelo: "Cotovelo" }[k]}</a></li>`).join("")}
        </ul>
        <p class="small muted" style="margin:12px 0 0">Todos os ângulos são <b>internos</b>: 180° seria a articulação totalmente esticada. Para o joelho, um ângulo de 145° corresponde a 35° de flexão.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <h2>As métricas</h2>
    <p class="muted">As faixas abaixo são as de base, para bicicleta de estrada. No perfil de cada ciclista ajustam-se ao tipo de bicicleta, à flexibilidade e ao objetivo.</p>
    <div class="stack" style="margin-top:16px">${METRICAS.map(cartao).join("")}</div>
  </section>

  <section class="section" id="perfis-tipo">
    <h2>Perfis-tipo por estilo de ciclista</h2>
    <p class="muted">Ciclistas com objetivos diferentes adotam posições diferentes. Os perfis-tipo agrupam essas tendências em faixas de referência. Podes escolher um no perfil do ciclista, e cada relatório mostra com qual a posição medida mais se parece.</p>
    <div class="grid g-2" style="margin-top:14px">
      ${Object.values(ESTILOS).map((e) => `<div class="card tight"><h3 style="margin:0 0 4px">${e.nome}</h3><p class="small" style="margin:0">${e.descricao}</p><p class="small muted" style="margin:6px 0 0">Cadência típica: ${e.cadencia}</p></div>`).join("")}
    </div>
    <div class="card tabela" style="margin-top:16px">
      <table class="tabela-estilos">
        <thead><tr><th>Métrica</th><th>Base (estrada)</th>${Object.values(ESTILOS).map((e) => `<th>${e.nome}</th>`).join("")}</tr></thead>
        <tbody>
          ${["joelho_max", "joelho_min", "anca_min", "tornozelo_amplitude", "tronco_medio", "cotovelo_medio"].map((m) => {
            const base = REFERENCIAS[m];
            return `<tr><td>${base[2]}</td><td class="num">${faixa(base[0], base[1])}</td>${Object.keys(ESTILOS).map((k) => {
              const r = referenciasEstilo(k)[m];
              const muda = r[0] !== base[0] || r[1] !== base[1];
              return `<td class="num">${muda ? `<b>${faixa(r[0], r[1])}</b>` : `<span class="muted">${faixa(r[0], r[1])}</span>`}</td>`;
            }).join("")}</tr>`;
          }).join("")}
        </tbody>
      </table>
      <p class="small muted" style="margin:10px 0 0">A negrito estão os valores que diferem da base. A flexibilidade baixa e o objetivo "conforto" continuam a ajustar estas faixas: tronco +5° e extensão do joelho −2°.</p>
    </div>
    <div class="aviso" style="margin-top:14px"><b>Importante:</b> os perfis-tipo são construídos a partir das faixas publicadas na literatura de bike fit e das tendências conhecidas de cada estilo. <b>Não reproduzem a posição de nenhum ciclista concreto</b>: os ângulos medidos dos profissionais não são públicos, e as estimativas feitas a partir de fotografias de corrida têm demasiado erro para servirem de referência.</div>
  </section>

  <section class="section">
    <h2>Como funciona a análise</h2>
    <div class="grid g-3" style="margin-top:14px">
      ${PASSOS_METODO.map(([t, d], i) => `<div class="card passo"><span class="n">${i + 1}</span><h3>${t}</h3><p class="small" style="margin:0">${d}</p></div>`).join("")}
    </div>
  </section>

  <section class="section">
    <h2>Limitações</h2>
    <div class="card">
      <ul class="recs">
        <li><b>Análise 2D.</b> A câmara vê o ciclista de lado e mede ângulos projetados no plano da imagem. Se a câmara não estiver perpendicular à bicicleta, os ângulos ficam distorcidos (erro de paralaxe). Movimentos laterais do joelho exigem uma vista frontal.</li>
        <li><b>Os marcadores estão na pele.</b> Os pontos ósseos movem-se ligeiramente debaixo da pele e da roupa, sobretudo o grande trocânter. Os erros típicos são de alguns graus.</li>
        <li><b>Frames por segundo.</b> A 30 fps há cerca de 20 imagens por pedalada a 90 rpm. Os extremos podem ficar entre dois frames. Gravar a 60 fps reduz este erro.</li>
        <li><b>Referências populacionais.</b> As faixas descrevem o que funciona para a maioria dos ciclistas, não o ideal de cada pessoa. Lesões, assimetrias, flexibilidade e conforto pesam mais do que estar exatamente dentro de uma faixa.</li>
        <li><b>Não é um diagnóstico.</b> Em caso de dor persistente, consulta um profissional de saúde ou um bike fitter certificado.</li>
      </ul>
    </div>
  </section>

  <section class="section">
    <h2>Fontes</h2>
    <div class="card"><ol class="fontes small">${FONTES.map((f) => `<li>${f}</li>`).join("")}</ol></div>
  </section>`;

  main.querySelectorAll("[data-ir]").forEach((a) => a.addEventListener("click", (ev) => {
    ev.preventDefault();
    main.querySelector(`#m-${a.dataset.ir}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  desenharFigura(main.querySelector("#cv-ciencia"));
}

// Recorte da imagem à volta do ciclista (coordenadas do frame 1280×720).
const RECORTE = { x: 290, y: 20, w: 700, h: 690 };

function desenharFigura(cv) {
  const off = document.createElement("canvas");
  off.width = DEMO_W;
  off.height = DEMO_H;
  const ctx = off.getContext("2d");
  const demo = new DemoCiclista();
  const t = 60 / (2 * demo.rpm); // pedal em baixo
  const p = demo.draw(ctx, t);

  ctx.lineCap = "round";
  const seg = (a, b) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.lineWidth = 3;
  for (const [a, b] of [["ombro", "cotovelo"], ["cotovelo", "pulso"], ["ombro", "anca"], ["anca", "joelho"], ["joelho", "tornozelo"], ["tornozelo", "pe"]]) seg(p[a], p[b]);

  // arco do ângulo interno no vértice b, entre os segmentos b→a e b→c
  const arco = (a, b, c, cor, letra, r = 46) => {
    const a1 = Math.atan2(a[1] - b[1], a[0] - b[0]);
    let a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    ctx.fillStyle = cor + "40";
    ctx.strokeStyle = cor;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(...b); ctx.arc(b[0], b[1], r, a1, a1 + d, d < 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(b[0], b[1], r, a1, a1 + d, d < 0); ctx.stroke();
    const meio = a1 + d / 2;
    etiqueta([b[0] + Math.cos(meio) * (r + 30), b[1] + Math.sin(meio) * (r + 30)], cor, letra);
  };
  const etiqueta = (pos, cor, letra) => {
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(pos[0], pos[1], 22, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(letra, pos[0], pos[1] + 1);
  };
  arco(p.anca, p.joelho, p.tornozelo, ANG.joelho.cor, ANG.joelho.letra, 55);
  arco(p.ombro, p.anca, p.joelho, ANG.anca.cor, ANG.anca.letra, 50);
  arco(p.joelho, p.tornozelo, p.pe, ANG.tornozelo.cor, ANG.tornozelo.letra, 38);
  arco(p.ombro, p.cotovelo, p.pulso, ANG.cotovelo.cor, ANG.cotovelo.letra, 44);
  // tronco: linha horizontal a partir da anca
  const hz = [p.anca[0] + 240, p.anca[1]];
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = ANG.tronco.cor;
  ctx.lineWidth = 3;
  seg(p.anca, hz);
  ctx.setLineDash([]);
  arco(hz, p.anca, p.ombro, ANG.tronco.cor, ANG.tronco.letra, 150);

  for (const k of ["ombro", "cotovelo", "pulso", "anca", "joelho", "tornozelo", "pe"]) {
    ctx.fillStyle = "rgb(255,120,0)";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p[k][0], p[k][1], 8, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }

  const { x, y, w, h } = RECORTE;
  cv.width = w;
  cv.height = h;
  cv.getContext("2d").drawImage(off, x, y, w, h, 0, 0, w, h);
}
