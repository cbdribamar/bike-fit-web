// Utilitários de interface.
import { ANGULOS_NOMES, REFERENCIAS } from "./config.js";

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const num = (v, casas = 0) =>
  Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v).toFixed(casas).replace(".", ",") : "—";

export function data(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function faixa(lo, hi) {
  if (lo == null && hi == null) return "—";
  if (hi == null) return `≥ ${num(lo)}°`;
  if (lo == null) return `≤ ${num(hi)}°`;
  return `${num(lo)}–${num(hi)}°`;
}

const AVAL = { ok: ["ok", "Dentro"], abaixo: ["abaixo", "Abaixo"], acima: ["acima", "Acima"] };
export function pill(av, longo = false) {
  const [cls, txt] = AVAL[av] || ["neutro", "—"];
  return `<span class="pill ${cls}">${longo && av === "ok" ? "Dentro da faixa" : txt}</span>`;
}

export const METRICAS_CURTAS = {
  joelho_max: "Extensão do joelho (PMI)",
  joelho_min: "Flexão do joelho (PMS)",
  anca_min: "Anca mais fechada",
  tornozelo_amplitude: "Amplitude do tornozelo",
  tronco_medio: "Inclinação do tronco",
  cotovelo_medio: "Cotovelo",
  cadencia: "Cadência",
};

export function descarregar(nome, conteudo, tipo = "text/plain") {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function idade(dn) {
  if (!dn) return null;
  const d = new Date(dn);
  if (Number.isNaN(d.getTime())) return null;
  const h = new Date();
  return h.getFullYear() - d.getFullYear() - (h < new Date(h.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}

/** Altura de selim sugerida (método LeMond: entreperna × 0,883), em mm. */
export const selimLemond = (p) => (Number(p.entreperna_cm) > 0 ? Math.round(Number(p.entreperna_cm) * 8.83) : null);

// ---------- painel de métricas ao vivo ----------
export function painelHtml() {
  return `
  <div class="card stack">
    <div>
      <div class="row"><h3 style="margin:0">Ângulos agora</h3><span class="spacer"></span><span data-p="info" class="small muted"></span></div>
      <div class="angs" style="margin-top:10px">
        ${Object.entries(ANGULOS_NOMES).map(([a, n]) => `<div class="ang"><div class="v" data-ang="${a}">—</div><div class="l">${n}</div></div>`).join("")}
      </div>
    </div>
    <div>
      <h3>Médias dos últimos ciclos</h3>
      <table><tbody data-p="resumo"><tr><td class="empty">A ligar…</td></tr></tbody></table>
    </div>
    <div>
      <h3>Observações</h3>
      <ul class="recs" data-p="recs"><li class="empty">—</li></ul>
    </div>
  </div>`;
}

export function painelAtualizar(raiz, e, refs = REFERENCIAS) {
  for (const n of raiz.querySelectorAll("[data-ang]")) {
    const v = e.angulos?.[n.dataset.ang];
    n.textContent = v != null ? `${Math.round(v)}°` : "—";
  }
  const info = raiz.querySelector('[data-p="info"]');
  if (info) info.textContent = `Lado: ${e.lado || "—"} · ${Math.round(e.fps || 0)} fps · marcadores ${e.nMarcadores ?? 0}/7`;
  const tb = raiz.querySelector('[data-p="resumo"]');
  if (tb) {
    const r = e.resumo || {};
    const ks = Object.keys(METRICAS_CURTAS).filter((k) => r[k]);
    tb.innerHTML = ks.length
      ? ks.map((k) => {
          const v = r[k];
          const un = k === "cadencia" ? " rpm" : "°";
          return `<tr><td>${METRICAS_CURTAS[k]}<div class="small muted">${k === "cadencia" ? "" : faixa(refs[k][0], refs[k][1])}</div></td>
            <td class="num"><b>${num(v.media)}${un}</b> <span class="small muted">±${num(v.dp, 1)}</span></td>
            <td>${pill(v.avaliacao)}</td></tr>`;
        }).join("")
      : `<tr><td class="empty">A aguardar ciclos de pedalada completos…</td></tr>`;
  }
  const ul = raiz.querySelector('[data-p="recs"]');
  if (ul) {
    const recs = e.recomendacoes || [];
    ul.innerHTML = recs.length ? recs.map((x) => `<li>${esc(x)}</li>`).join("") : `<li class="empty">Sem observações ainda.</li>`;
  }
}
