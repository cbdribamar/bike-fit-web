// Router por hash (funciona no GitHub Pages sem configuração de servidor).
import { ciencia } from "./ciencia.js";
import * as V from "./views.js";

const ROTAS = [
  [/^#?\/?$/, V.inicio, "inicio"],
  [/^#\/ciencia$/, ciencia, "ciencia"],
  [/^#\/perfis$/, V.listaPerfis, "perfis"],
  [/^#\/perfis\/novo$/, (m) => V.editarPerfil(m, {}), "novo"],
  [/^#\/perfis\/([\w-]+)$/, (m, [id]) => V.verPerfil(m, { id }), "perfis"],
  [/^#\/perfis\/([\w-]+)\/editar$/, (m, [id]) => V.editarPerfil(m, { id }), "perfis"],
  [/^#\/perfis\/([\w-]+)\/teste$/, (m, [id]) => V.teste(m, { id }), "perfis"],
  [/^#\/perfis\/([\w-]+)\/sessoes\/([\w-]+)$/, (m, [id, sid]) => V.relatorio(m, { id, sid }), "perfis"],
];

const main = document.getElementById("app");
let limpar = null;
let geracao = 0;

async function navegar() {
  const minha = ++geracao;
  if (limpar) { try { limpar(); } catch (_) {} limpar = null; }
  const h = location.hash || "#/";
  const rota = ROTAS.find(([re]) => re.test(h));
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("ativo", rota && a.dataset.nav === rota[2]));
  main.innerHTML = `<p class="muted">A carregar…</p>`;
  window.scrollTo(0, 0);
  try {
    if (!rota) { V.naoEncontrado(main); return; }
    const params = h.match(rota[0]).slice(1).map(decodeURIComponent);
    const r = await rota[1](main, params);
    if (minha !== geracao) { r?.(); return; } // o utilizador já navegou para outra página
    limpar = typeof r === "function" ? r : null;
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="erro">Ocorreu um erro: ${String(e.message || e).replace(/</g, "&lt;")}</div>`;
  }
}

window.addEventListener("hashchange", navegar);
navegar();
