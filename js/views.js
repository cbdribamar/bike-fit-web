// Páginas da aplicação. Cada vista recebe o elemento <main> e devolve (opcionalmente) uma função de limpeza.
import { ciclosCsv, construirSessao, framesCsv } from "./analysis/report.js";
import { graficoSvg } from "./chart.js";
import { CAMPOS_PERFIL, LABELS, LOCAL_ANATOMICO, NOMES, referencias, TIPOS_BICICLETA } from "./config.js";
import { CENARIOS } from "./demo.js";
import { LiveAnalise, listarCamaras } from "./live.js";
import { criarRepositorio } from "./storage/index.js";
import {
  data, descarregar, esc, faixa, idade, num, painelAtualizar, painelHtml, pill, selimLemond,
} from "./ui.js";

const repo = () => criarRepositorio();
const nomeCenario = (k) => CENARIOS[k]?.nome || k;
const ir = (h) => { location.hash = h; };

function cartaoPerfil(p) {
  return `<a class="card tight perfil-card" href="#/perfis/${esc(p.id)}">
    <div class="row">
      <div class="avatar">${esc((p.nome || "?")[0].toUpperCase())}</div>
      <div>
        <div style="font-weight:600">${esc(p.nome)}</div>
        <div class="small muted">${esc(TIPOS_BICICLETA[p.tipo_bicicleta] || "—")}${p.altura_cm ? ` · ${esc(p.altura_cm)} cm` : ""} · ${p.n_sessoes || 0} teste${p.n_sessoes === 1 ? "" : "s"}</div>
      </div>
    </div></a>`;
}

/** Liga um canvas a uma LiveAnalise e atualiza o painel periodicamente. */
function ligarPainel(raiz, live, refs, onEstado) {
  const id = setInterval(() => {
    const e = live.estado();
    painelAtualizar(raiz, e, refs);
    onEstado?.(e);
  }, 350);
  return () => clearInterval(id);
}

// ------------------------------------------------------------------ início
export async function inicio(main) {
  const perfis = (await repo().listarPerfis()).slice(0, 6);
  const refs = referencias({});
  main.innerHTML = `
  <section class="hero">
    <span class="tag">Bike fit em casa</span>
    <h1>Análise biomecânica de ciclismo com a câmara do teu portátil</h1>
    <p class="lead">Marcadores coloridos nas articulações, a bicicleta no rolo e a câmara de lado. A aplicação mede os ângulos de cada pedalada e compara-os com faixas de referência adequadas ao teu perfil. Tudo corre no teu browser: o vídeo nunca sai do computador.</p>
    <div class="row">
      <a class="btn primary" href="#/perfis/novo">Criar perfil e fazer um teste</a>
      <a class="btn" href="#demo" data-scroll>Ver a demonstração</a>
    </div>
  </section>

  <section class="section" id="demo">
    <h2 style="margin:0">Demonstração ao vivo</h2>
    <p class="muted small" style="margin:4px 0 14px">Ciclista simulado, analisado pelo mesmo motor que o teste real. Escolhe um cenário e vê os ângulos, as avaliações e as observações a mudar.</p>
    <div class="grid g-video">
      <div>
        <div class="video"><canvas id="cv-demo" aria-label="Demonstração: ciclista simulado com marcadores"></canvas><span class="badge">SIMULAÇÃO</span></div>
        <div class="row" style="margin-top:12px">
          <span class="small muted">Cenário:</span>
          <div class="seg" id="seg-cenario">${Object.entries(CENARIOS).map(([k, c]) => `<button type="button" data-v="${k}" class="${k === "correto" ? "on" : ""}">${esc(c.nome)}</button>`).join("")}</div>
        </div>
        <p class="small muted" id="desc-cenario" style="margin:8px 0 0">${esc(CENARIOS.correto.descricao)}</p>
        <div class="legend">
          <span><i style="background:#50c850"></i>marcador detetado</span>
          <span><i style="background:#ffc800"></i>estimativa de pose (sem marcador)</span>
          <span>Os números junto às articulações são os ângulos em graus.</span>
        </div>
      </div>
      <div id="painel-demo">${painelHtml()}</div>
    </div>
  </section>

  <section class="section">
    <div class="row"><h2 style="margin:0">Como funciona</h2><span class="spacer"></span><a class="btn sm" href="#/ciencia">A ciência por trás das métricas</a></div>
    <div class="grid g-4" style="margin-top:14px">
      <div class="card passo"><span class="n">1</span><h3>Perfil do ciclista</h3>
        <p class="small">Medidas do corpo (altura, entreperna, flexibilidade), tipo de bicicleta, objetivo e historial de dores. As referências ajustam-se ao perfil.</p></div>
      <div class="card passo"><span class="n">2</span><h3>Marcadores</h3>
        <p class="small">Sete autocolantes da mesma cor viva, do lado virado para a câmara:</p>
        <ul class="small">${LABELS.map((l) => `<li>${NOMES[l].toLowerCase()} (${LOCAL_ANATOMICO[l]})</li>`).join("")}</ul></div>
      <div class="card passo"><span class="n">3</span><h3>Câmara e calibração</h3>
        <p class="small">Câmara de lado, perpendicular à bicicleta, a 2–3 m e à altura da anca. Clica num marcador no ecrã para a aplicação aprender a cor.</p></div>
      <div class="card passo"><span class="n">4</span><h3>Gravar e analisar</h3>
        <p class="small">Depois de aquecer, grava 20–30 s. Cada pedalada é detetada automaticamente e o relatório fica guardado no perfil.</p></div>
    </div>
  </section>

  <section class="section">
    <div class="row"><h2 style="margin:0">Perfis</h2><span class="spacer"></span>
      <a class="btn sm" href="#/perfis">Ver todos</a><a class="btn sm primary" href="#/perfis/novo">Novo perfil</a></div>
    ${perfis.length
      ? `<div class="grid g-3" style="margin-top:14px">${perfis.map(cartaoPerfil).join("")}</div>`
      : `<div class="card" style="margin-top:14px"><p class="muted" style="margin:0">Ainda não há perfis. Cria o primeiro para começar. Também podes experimentar o teste com o simulador, sem câmara nem rolos.</p></div>`}
  </section>`;

  main.querySelector("[data-scroll]").addEventListener("click", (ev) => {
    ev.preventDefault();
    main.querySelector("#demo").scrollIntoView({ behavior: "smooth" });
  });
  const live = new LiveAnalise(main.querySelector("#cv-demo"), { tipo: "demo", refs });
  await live.iniciar();
  main.querySelector("#seg-cenario").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    main.querySelectorAll("#seg-cenario button").forEach((x) => x.classList.toggle("on", x === b));
    live.cenario = b.dataset.v;
    main.querySelector("#desc-cenario").textContent = CENARIOS[b.dataset.v].descricao;
  });
  const parar = ligarPainel(main.querySelector("#painel-demo"), live, refs);
  return () => { parar(); live.parar(); };
}

// ------------------------------------------------------------------ perfis
export async function listaPerfis(main) {
  const perfis = await repo().listarPerfis();
  main.innerHTML = `
  <div class="row" style="margin-bottom:18px">
    <h1 style="margin:0">Perfis</h1><span class="spacer"></span>
    <button class="btn sm" id="exp">Exportar dados</button>
    <label class="btn sm" style="margin:0">Importar<input type="file" id="imp" accept="application/json,.json" hidden></label>
    <a class="btn primary" href="#/perfis/novo">Novo perfil</a>
  </div>
  <p class="small muted">Os perfis e os relatórios ficam guardados neste browser. Usa <b>Exportar dados</b> para fazer uma cópia de segurança ou para os passar para outro computador.</p>
  <p id="msg-imp" class="small"></p>
  ${perfis.length
    ? `<div class="grid g-3">${perfis.map(cartaoPerfil).join("")}</div>`
    : `<div class="card"><p class="muted" style="margin:0">Ainda não há perfis. <a href="#/perfis/novo">Cria o primeiro.</a></p></div>`}`;
  main.querySelector("#exp").addEventListener("click", async () => {
    const d = await repo().exportar();
    descarregar(`bikefit-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(d), "application/json");
  });
  main.querySelector("#imp").addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const msg = main.querySelector("#msg-imp");
    try {
      const r = await repo().importar(JSON.parse(await f.text()));
      msg.textContent = `Importados ${r.perfis} perfis e ${r.sessoes} relatórios.`;
      setTimeout(() => listaPerfis(main), 1200);
    } catch (e) {
      msg.textContent = e.message || "Não foi possível importar o ficheiro.";
      msg.style.color = "var(--warn)";
    }
  });
}

function formularioPerfil(p, editar) {
  return `
  <h1>${editar ? "Editar perfil" : "Novo perfil"}</h1>
  <p class="muted">Só o nome é obrigatório. Quanto mais dados preencheres, mais ajustadas ficam as referências e as observações. Podes completar o perfil mais tarde.</p>
  <div class="erro hidden" id="erro"></div>
  <form class="card" style="margin-top:16px" novalidate>
    ${Object.values(CAMPOS_PERFIL).map((g) => `
    <fieldset><legend>${g.titulo}</legend><div class="campos">
      ${g.campos.map(([campo, rotulo, tipo, extra]) => {
        const v = p[campo] ?? "";
        let input;
        if (tipo === "select") {
          input = `<select id="${campo}" name="${campo}">${Object.entries(extra).map(([k, n]) => `<option value="${esc(k)}" ${String(v) === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
        } else if (tipo === "textarea") {
          input = `<textarea id="${campo}" name="${campo}">${esc(v)}</textarea>`;
        } else {
          input = `<input id="${campo}" name="${campo}" type="${tipo === "number" ? "text" : tipo}" ${tipo === "number" ? 'inputmode="decimal"' : ""} value="${esc(v)}" ${campo === "nome" ? "autofocus" : ""}>`;
        }
        return `<div class="${tipo === "textarea" ? "full" : ""}">
          <label for="${campo}">${esc(rotulo)}${tipo === "number" && extra ? ` <span class="unid">(${extra})</span>` : ""}${campo === "nome" ? " *" : ""}</label>
          ${input}
          ${campo === "entreperna_cm" ? `<div class="small muted" style="margin-top:4px">Descalço, de costas para a parede, um livro entre as pernas puxado firmemente para cima: mede do chão ao topo do livro.</div>` : ""}
        </div>`;
      }).join("")}
    </div></fieldset>`).join("")}
    <div class="row">
      <button class="btn primary" type="submit">${editar ? "Guardar alterações" : "Criar perfil"}</button>
      <a class="btn" href="${editar ? `#/perfis/${esc(p.id)}` : "#/"}">Cancelar</a>
    </div>
  </form>`;
}

function lerFormulario(form) {
  const dados = {};
  for (const g of Object.values(CAMPOS_PERFIL)) {
    for (const [campo, , tipo] of g.campos) {
      let v = (form.elements[campo]?.value || "").trim();
      if (tipo === "number" && v) {
        const n = Number(v.replace(",", "."));
        v = Number.isFinite(n) ? n : "";
      }
      dados[campo] = v;
    }
  }
  return dados;
}

export async function editarPerfil(main, { id } = {}) {
  const p = id ? await repo().obterPerfil(id) : { tipo_bicicleta: "estrada" };
  if (!p) return naoEncontrado(main);
  main.innerHTML = formularioPerfil(p, !!id);
  const form = main.querySelector("form");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = lerFormulario(form);
    const numeros = Object.values(CAMPOS_PERFIL).flatMap((g) => g.campos).filter(([, , t]) => t === "number").map(([c]) => c);
    const invalido = numeros.find((c) => form.elements[c].value.trim() && dados[c] === "");
    const erro = main.querySelector("#erro");
    if (!dados.nome) { erro.textContent = "O nome é obrigatório."; erro.classList.remove("hidden"); form.elements.nome.focus(); return; }
    if (invalido) { erro.textContent = "Há um valor numérico inválido."; erro.classList.remove("hidden"); form.elements[invalido].focus(); return; }
    const reg = await repo().guardarPerfil({ ...p, ...dados });
    ir(`#/perfis/${reg.id}`);
  });
}

export async function verPerfil(main, { id }) {
  const p = await repo().obterPerfil(id);
  if (!p) return naoEncontrado(main);
  const sessoes = await repo().listarSessoes(id);
  const refs = referencias(p);
  const lemond = selimLemond(p);
  const anos = idade(p.data_nascimento);
  const dl = (grupo) => CAMPOS_PERFIL[grupo].campos
    .filter(([c]) => c !== "nome" && p[c] !== "" && p[c] != null)
    .map(([c, rot, tipo, extra]) => `<dt>${esc(rot)}</dt><dd>${tipo === "select" ? esc(extra[p[c]] ?? p[c]) : tipo === "number" ? esc(String(p[c]).replace(".", ",")) : esc(p[c])}${tipo === "number" && extra ? ` ${extra}` : ""}</dd>`)
    .join("");
  main.innerHTML = `
  <div class="row" style="margin-bottom:18px">
    <div class="avatar" style="width:52px;height:52px;font-size:1.3rem">${esc(p.nome[0].toUpperCase())}</div>
    <div><h1 style="margin:0">${esc(p.nome)}</h1>
      <div class="muted small">${esc(TIPOS_BICICLETA[p.tipo_bicicleta] || "—")}${anos != null ? ` · ${anos} anos` : ""} · perfil criado a ${data(p.criado_em)}</div></div>
    <span class="spacer"></span>
    <a class="btn" href="#/perfis/${esc(id)}/editar">Editar</a>
    <a class="btn primary" href="#/perfis/${esc(id)}/teste">Iniciar teste</a>
  </div>
  <div class="grid g-2">
    <div class="card"><h3>Dados do ciclista</h3><dl class="dados">${dl("pessoal") || `<dd class="muted">Sem dados. <a href="#/perfis/${esc(id)}/editar">Completar perfil</a></dd>`}</dl></div>
    <div class="card"><h3>Bicicleta</h3><dl class="dados">${dl("bicicleta")}</dl>
      ${lemond ? `<div class="aviso" style="margin-top:14px">Altura de selim de partida (método LeMond, entreperna × 0,883): <b>${lemond} mm</b>.
        ${p.altura_selim_mm ? ` A altura atual é ${esc(p.altura_selim_mm)} mm (${p.altura_selim_mm - lemond >= 0 ? "+" : ""}${Math.round(p.altura_selim_mm - lemond)} mm).` : ""}
        <div class="small muted" style="margin-top:4px">É só um ponto de partida. O teste com câmara é que confirma a extensão real do joelho.</div></div>` : ""}
    </div>
  </div>
  ${p.dores || p.lesoes || p.notas ? `<div class="card" style="margin-top:20px"><div class="grid g-3">
    ${[["dores", "Dores / desconfortos"], ["lesoes", "Lesões"], ["notas", "Notas"]].filter(([c]) => p[c]).map(([c, t]) => `<div><h3>${t}</h3><p class="small" style="white-space:pre-line">${esc(p[c])}</p></div>`).join("")}
  </div></div>` : ""}
  <div class="section">
    <div class="row"><h2 style="margin:0">Testes</h2><span class="spacer"></span><a class="btn sm primary" href="#/perfis/${esc(id)}/teste">Novo teste</a></div>
    <div class="card" style="margin-top:14px">
      ${sessoes.length ? `<div class="tabela"><table>
        <thead><tr><th>Data</th><th>Fonte</th><th>Ciclos</th><th>Ext. joelho</th><th>Flex. joelho</th><th>Cadência</th></tr></thead>
        <tbody>${sessoes.map((s) => {
          const m = s.metricas || {};
          const cel = (k) => (m[k] ? `${num(m[k].media)}° ${pill(m[k].avaliacao)}` : "—");
          return `<tr><td><a href="#/perfis/${esc(id)}/sessoes/${esc(s.id)}">${data(s.data)}</a></td>
            <td class="small">${esc(s.fonte || "—")}${s.selim_simulado ? ` (${esc(nomeCenario(s.selim_simulado))})` : ""}</td>
            <td class="num">${s.n_ciclos}</td><td class="num">${cel("joelho_max")}</td><td class="num">${cel("joelho_min")}</td>
            <td class="num">${m.cadencia ? `${num(m.cadencia.media)} rpm` : "—"}</td></tr>`;
        }).join("")}</tbody></table></div>`
      : `<p class="muted" style="margin:0">Ainda não há testes. Sem rolos? No ecrã do teste podes escolher o <b>simulador</b> para experimentar o fluxo completo.</p>`}
    </div>
  </div>
  <div class="section"><h2>Referências usadas para este perfil</h2>
    <div class="card"><table><thead><tr><th>Métrica</th><th>Faixa</th></tr></thead><tbody>
      ${Object.values(refs).filter(([lo, hi]) => lo != null || hi != null).map(([lo, hi, d]) => `<tr><td>${esc(d)}</td><td class="num">${faixa(lo, hi)}</td></tr>`).join("")}
    </tbody></table><p class="small muted" style="margin:10px 0 0">Ajustadas ao tipo de bicicleta, à flexibilidade e ao objetivo do perfil.</p></div>
  </div>
  <button class="btn danger sm" id="apagar" style="margin-top:40px">Apagar perfil</button>`;
  main.querySelector("#apagar").addEventListener("click", async () => {
    if (!confirm(`Apagar o perfil de ${p.nome} e todos os testes? Não é possível desfazer.`)) return;
    await repo().apagarPerfil(id);
    ir("#/perfis");
  });
}

// ------------------------------------------------------------------ teste
export async function teste(main, { id }) {
  const p = await repo().obterPerfil(id);
  if (!p) return naoEncontrado(main);
  const refs = referencias(p);
  let defs = await repo().obterDefinicoes();
  main.innerHTML = `
  <div style="margin-bottom:18px">
    <div class="small muted"><a href="#/perfis/${esc(id)}">${esc(p.nome)}</a> › Novo teste</div>
    <h1 style="margin:0">Teste com câmara</h1>
  </div>
  <form id="cfg" class="card" style="margin-bottom:20px">
    <h3>1. Fonte de vídeo</h3>
    <div class="campos">
      <div><label for="fonte">Fonte</label>
        <select id="fonte" name="fonte">
          <option value="camara">Câmara</option>
          <option value="demo">Simulador (sem câmara nem rolos)</option>
          <option value="video">Ficheiro de vídeo gravado</option>
        </select></div>
      <div data-fonte="camara"><label for="camara">Câmara</label>
        <select id="camara" name="camara"><option value="">Câmara predefinida</option></select></div>
      <div data-fonte="camara video"><label for="lado">Lado virado para a câmara</label>
        <select id="lado" name="lado"><option value="auto">Detetar automaticamente</option><option value="esquerdo">Esquerdo</option><option value="direito">Direito</option></select></div>
      <div data-fonte="demo"><label for="cenario">Cenário simulado</label>
        <select id="cenario" name="cenario">${Object.entries(CENARIOS).map(([k, c]) => `<option value="${k}" ${k === "correto" ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></div>
      <div data-fonte="video"><label for="ficheiro">Ficheiro (.mp4, .mov)</label><input id="ficheiro" name="ficheiro" type="file" accept="video/*"></div>
      <div data-fonte="video"><label for="fpsa">Frames por segundo a analisar</label>
        <select id="fpsa" name="fpsa"><option value="30">30 (vídeo normal)</option><option value="60">60 (vídeo gravado a 60 fps)</option></select></div>
    </div>
    <p class="small muted" data-fonte="video" style="margin:12px 0 0">O vídeo é analisado frame a frame, do início ao fim, e o relatório é criado automaticamente. Para mais precisão, grava com o telemóvel a 60 fps num tripé.
      ${defs.hsvLo ? "" : "A cor dos marcadores ainda não está calibrada: o vídeo abre parado no primeiro frame para clicares num marcador."}</p>
    <p class="small muted" data-fonte="camara" style="margin:12px 0 0">Na primeira vez, o browser pede autorização para usar a câmara e descarrega o modelo de pose (~9 MB).</p>
    <div class="row" style="margin-top:16px"><button class="btn primary" type="submit" id="ligar">Ligar</button><span id="msg-cfg" class="small"></span></div>
  </form>

  <div id="area" class="grid g-video hidden">
    <div>
      <div class="video" id="caixa"><canvas id="cv"></canvas><span class="badge" id="badge">A LIGAR…</span><span class="badge rec hidden" id="rec">● REC</span></div>
      <div class="row" style="margin-top:12px">
        <button class="btn" id="b-cal" type="button">Calibrar cor</button>
        <button class="btn" id="b-mask" type="button">Mostrar máscara</button>
        <span class="spacer"></span>
        <button class="btn rec" id="b-grav" type="button">● Iniciar gravação</button>
        <button class="btn primary hidden" id="b-parar" type="button">Parar e gerar relatório</button>
        <button class="btn" id="b-desl" type="button">Desligar</button>
      </div>
      <div class="progress hidden" id="prog" style="margin-top:12px"><div></div></div>
      <p id="msg" class="small" style="margin-top:10px"></p>
      <div class="legend"><span><i style="background:#50c850"></i>marcador detetado</span><span><i style="background:#ffc800"></i>só estimativa de pose</span><span><i style="border:1px solid #999"></i>mancha da cor calibrada</span></div>
    </div>
    <div class="stack">
      <div class="card"><h3>Antes de gravar</h3>
        <div class="check" id="c-cal"><span class="ic">✓</span><div>Cor calibrada<div class="small muted">Clica em <b>Calibrar cor</b> e depois no centro de um marcador.</div></div></div>
        <div class="check" id="c-marc"><span class="ic">✓</span><div>7 marcadores verdes<div class="small muted" id="c-marc-t">Usa a máscara para confirmar que só os marcadores aparecem.</div></div></div>
        <div class="check" id="c-cic"><span class="ic">✓</span><div>Ciclos detetados<div class="small muted">Pedala 1–2 min para aquecer. Os valores abaixo estabilizam.</div></div></div>
      </div>
      <div id="painel">${painelHtml()}</div>
    </div>
  </div>`;

  const $ = (s) => main.querySelector(s);
  const mostrarCampos = () => {
    const f = $("#fonte").value;
    main.querySelectorAll("[data-fonte]").forEach((n) => n.classList.toggle("hidden", !n.dataset.fonte.split(" ").includes(f)));
    $("#ligar").textContent = f === "video" ? "Analisar vídeo" : "Ligar";
  };
  $("#fonte").addEventListener("change", mostrarCampos);
  mostrarCampos();
  const preencherCamaras = async () => {
    const cams = await listarCamaras();
    const sel = $("#camara");
    const atual = sel.value;
    sel.innerHTML = `<option value="">Câmara predefinida</option>` +
      cams.filter((c) => c.deviceId).map((c, i) => `<option value="${esc(c.deviceId)}">${esc(c.label || `Câmara ${i + 1}`)}</option>`).join("");
    sel.value = atual;
  };
  preencherCamaras();

  let live = null, pararPainel = null, calibrar = false, aGuardar = false;
  const setMsg = (t, erro = false) => { $("#msg").textContent = t || ""; $("#msg").style.color = erro ? "var(--warn)" : ""; };

  async function guardar(rows) {
    if (aGuardar) return;
    if (rows.length < 30) { setMsg("Gravação demasiado curta (mínimo ~1 s com dados).", true); return; }
    aGuardar = true;
    const fonte = { camara: "Câmara", video: "Ficheiro de vídeo", demo: "Simulador" }[live.tipo];
    const sessao = construirSessao(rows, {
      lado: live.estado().lado || "auto", refs,
      meta: { perfil_id: id, fonte, tipo_bicicleta: p.tipo_bicicleta || "estrada", ...(live.tipo === "demo" ? { selim_simulado: live.cenario } : {}) },
    });
    const reg = await repo().guardarSessao(sessao);
    desligar();
    ir(`#/perfis/${id}/sessoes/${reg.id}`);
  }

  function desligar() {
    pararPainel?.(); pararPainel = null;
    live?.parar(); live = null;
  }

  function atualizar(e) {
    $("#badge").textContent = { camara: "CÂMARA", demo: "SIMULAÇÃO", video: "VÍDEO" }[e.fonte] || "";
    $("#c-cal").classList.toggle("feito", !!e.calibrado);
    $("#c-marc").classList.toggle("feito", e.nMarcadores === 7);
    $("#c-marc-t").textContent = `${e.nMarcadores ?? 0}/7 marcadores · ${e.nBlobs ?? 0} manchas da cor detetadas`;
    $("#c-cic").classList.toggle("feito", !!e.resumo?.joelho_max);
    $("#rec").classList.toggle("hidden", !e.gravar);
    $("#rec").textContent = `● REC ${num(e.tempoGravacao, 1)} s`;
    $("#b-grav").classList.toggle("hidden", !!e.gravar || (e.fonte === "video" && !e.pausado));
    $("#b-grav").textContent = e.fonte === "video" ? "▶ Iniciar análise" : "● Iniciar gravação";
    $("#b-parar").classList.toggle("hidden", !e.gravar || e.fonte === "video");
    if (e.fonte === "video") {
      $("#prog").classList.remove("hidden");
      $("#prog").firstElementChild.style.width = `${(e.progresso || 0) * 100}%`;
      if (!aGuardar && !e.pausado) setMsg("A analisar o vídeo…");
      if (e.pausado && !calibrar && !$("#msg").textContent) setMsg("Clica em Calibrar cor, depois num marcador, e por fim em Iniciar análise.");
    }
    if (e.erro) setMsg(e.erro, true);
  }

  $("#cfg").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = $("#fonte").value;
    const ficheiro = $("#ficheiro").files[0];
    if (f === "video" && !ficheiro) { $("#msg-cfg").textContent = "Escolhe um ficheiro de vídeo."; return; }
    $("#ligar").disabled = true;
    $("#msg-cfg").style.color = "";
    $("#msg-cfg").textContent = f === "demo" ? "A ligar…" : "A carregar o modelo de pose…";
    defs = await repo().obterDefinicoes();
    live = new LiveAnalise($("#cv"), {
      tipo: f, cenario: $("#cenario").value, ficheiro, cameraId: $("#camara").value || null, lado: $("#lado").value,
      fpsAnalise: Number($("#fpsa").value),
      defs, refs, onFim: (rows) => guardar(rows),
    });
    try {
      await live.iniciar();
    } catch (e) {
      $("#ligar").disabled = false;
      $("#msg-cfg").textContent = e.message || String(e);
      $("#msg-cfg").style.color = "var(--warn)";
      live = null;
      return;
    }
    $("#ligar").disabled = false;
    $("#msg-cfg").textContent = "";
    $("#cfg").classList.add("hidden");
    $("#area").classList.remove("hidden");
    setMsg("");
    pararPainel = ligarPainel($("#painel"), live, refs, atualizar);
    if (f === "camara") preencherCamaras();
  });

  $("#b-cal").addEventListener("click", () => {
    calibrar = !calibrar;
    $("#caixa").classList.toggle("calibrar", calibrar);
    setMsg(calibrar ? "Clica no centro de um marcador no vídeo." : "");
  });
  $("#cv").addEventListener("click", async (ev) => {
    if (!calibrar || !live) return;
    const cv = ev.currentTarget, r = cv.getBoundingClientRect();
    const ar = cv.width / cv.height, boxAr = r.width / r.height;
    let w = r.width, h = r.height, ox = 0, oy = 0;
    if (ar > boxAr) { h = r.width / ar; oy = (r.height - h) / 2; } else { w = r.height * ar; ox = (r.width - w) / 2; }
    const x = (ev.clientX - r.left - ox) / w, y = (ev.clientY - r.top - oy) / h;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const res = live.calibrar(x, y);
    calibrar = false;
    $("#caixa").classList.remove("calibrar");
    if (!res) return;
    if (live.tipo !== "demo") {
      defs = { ...defs, hsvLo: res.lo, hsvHi: res.hi };
      await repo().guardarDefinicoes(defs);
    }
    setMsg(`Cor calibrada (HSV ${res.hsv.join(", ")}). Confirma com a máscara.`);
  });
  $("#b-mask").addEventListener("click", () => {
    if (!live) return;
    live.mostrarMascara = !live.mostrarMascara;
    $("#b-mask").textContent = live.mostrarMascara ? "Esconder máscara" : "Mostrar máscara";
  });
  $("#b-grav").addEventListener("click", () => {
    if (!live) return;
    if (live.tipo === "video") { live.continuar(); setMsg("A analisar o vídeo…"); return; }
    live.analisador.iniciarGravacao();
    setMsg("A gravar. Pedala de forma constante durante 20–30 s.");
  });
  $("#b-parar").addEventListener("click", () => {
    if (!live) return;
    setMsg("A gerar o relatório…");
    guardar(live.analisador.pararGravacao());
  });
  $("#b-desl").addEventListener("click", () => {
    desligar();
    $("#area").classList.add("hidden");
    $("#cfg").classList.remove("hidden");
    setMsg("");
  });
  return desligar;
}

// ------------------------------------------------------------------ relatório
export async function relatorio(main, { id, sid }) {
  const p = await repo().obterPerfil(id);
  const s = await repo().obterSessao(sid);
  if (!p || !s || s.perfil_id !== id) return naoEncontrado(main);
  const m = s.metricas || {};
  const lemond = selimLemond(p);
  const ordem = ["joelho_max", "joelho_min", "anca_min", "tornozelo_amplitude", "tronco_medio", "cotovelo_medio"];
  main.innerHTML = `
  <div class="row" style="margin-bottom:18px">
    <div>
      <div class="small muted"><a href="#/perfis/${esc(id)}">${esc(p.nome)}</a> › Relatório</div>
      <h1 style="margin:0">Relatório de ${data(s.data)}</h1>
      <div class="small muted">${esc(s.fonte || "—")}${s.selim_simulado ? ` · cenário ${esc(nomeCenario(s.selim_simulado))}` : ""} · ${esc(TIPOS_BICICLETA[s.tipo_bicicleta] || "")} · ${num(s.duracao_s, 1)} s · ${s.n_ciclos} ciclos · ${num(s.fps)} fps · lado ${esc(s.lado)}</div>
    </div>
    <span class="spacer"></span>
    <a class="btn" href="#/perfis/${esc(id)}/teste">Novo teste</a>
  </div>
  ${s.n_ciclos ? "" : `<div class="erro">Não foram detetados ciclos de pedalada completos. Grava pelo menos 10–15 s a pedalar e confirma que a anca, o joelho e o tornozelo estão visíveis e com marcadores verdes.</div>`}
  <div class="grid g-3">
    ${ordem.filter((k) => m[k]).map((k) => {
      const x = m[k];
      return `<div class="card metric">
        <div class="row"><span class="d">${esc(x.descricao)}</span><span class="spacer"></span>${pill(x.avaliacao, true)}</div>
        <div class="v">${num(x.media, 1)}°</div>
        <div class="d">± ${num(x.dp, 1)}° · referência ${faixa(x.ref_min, x.ref_max)}</div></div>`;
    }).join("")}
  </div>
  <div class="grid g-2" style="margin-top:20px">
    <div class="card"><h3>Observações</h3>
      <ul class="recs">${(s.recomendacoes || []).map((r) => `<li>${esc(r)}</li>`).join("") || `<li class="empty">—</li>`}</ul>
      ${m.cadencia ? `<p class="small muted" style="margin:12px 0 0">Cadência média: ${num(m.cadencia.media)} rpm (± ${num(m.cadencia.dp, 1)})</p>` : ""}
      ${lemond ? `<div class="aviso" style="margin-top:14px">Altura de selim de partida pelo método LeMond: <b>${lemond} mm</b>${p.altura_selim_mm ? `. A altura registada no perfil é ${esc(p.altura_selim_mm)} mm` : ""}. Ajusta em passos de 3–5 mm e repete o teste.</div>` : ""}
      ${p.dores ? `<div class="aviso" style="margin-top:10px"><b>Dores registadas:</b> ${esc(p.dores)}</div>` : ""}
    </div>
    <div class="card"><h3>Qualidade da deteção</h3>
      <p class="small muted">Percentagem de frames em que cada ponto veio de um marcador real. Abaixo de ~80% significa que esse ponto veio sobretudo da estimativa de pose, que é menos precisa.</p>
      ${LABELS.map((l) => {
        const c = s.cobertura?.[l] ?? 0;
        return `<div style="margin-bottom:8px"><div class="row small"><span>${NOMES[l]}</span><span class="spacer"></span><span class="num">${num(c)}%</span></div>
          <div class="bar ${c < 80 ? "fraca" : ""}"><div style="width:${c}%"></div></div></div>`;
      }).join("")}
    </div>
  </div>
  <div class="card" style="margin-top:20px"><h3>Ângulos ao longo do tempo</h3>
    ${graficoSvg(s)}
    <div class="legend"><span><i style="background:var(--warn)"></i>extensão (PMI)</span><span><i style="background:var(--ok)"></i>flexão (PMS)</span><span><i style="background:var(--c-raw)"></i>joelho sem suavização</span></div>
    <div class="row" style="margin-top:12px"><span class="small muted">Descarregar:</span>
      <button class="btn sm" data-dl="ciclos">ciclos.csv</button>
      <button class="btn sm" data-dl="frames">frames.csv</button>
      <button class="btn sm" data-dl="json">sessao.json</button>
    </div>
  </div>
  <button class="btn danger sm" id="apagar" style="margin-top:30px">Apagar relatório</button>
  <p class="small muted" style="margin-top:20px">Análise 2D indicativa (<a href="#/ciencia">o que significa cada métrica</a>). As faixas de referência são genéricas, ajustadas ao perfil. Ajustes finais devem ter em conta conforto, flexibilidade e historial de lesões.</p>`;
  const base = `bikefit-${(p.nome || "perfil").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(s.data || "").slice(0, 10)}`;
  main.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.dl;
    if (t === "ciclos") descarregar(`${base}-ciclos.csv`, ciclosCsv(s), "text/csv");
    else if (t === "frames") descarregar(`${base}-frames.csv`, framesCsv(s), "text/csv");
    else descarregar(`${base}.json`, JSON.stringify(s, null, 2), "application/json");
  }));
  main.querySelector("#apagar").addEventListener("click", async () => {
    if (!confirm("Apagar este relatório? Não é possível desfazer.")) return;
    await repo().apagarSessao(sid);
    ir(`#/perfis/${id}`);
  });
}

export function naoEncontrado(main) {
  main.innerHTML = `<h1>Página não encontrada</h1><p class="muted">Este perfil ou relatório não existe neste browser.</p><a class="btn" href="#/">Voltar ao início</a>`;
}
