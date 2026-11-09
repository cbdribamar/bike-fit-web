// Implementação do repositório em IndexedDB (dados guardados neste browser).
import { DEFAULT_SETTINGS } from "../config.js";
import { carimbar, VERSAO_ESQUEMA } from "./index.js";

const DB_NOME = "bikefit";
const DB_VERSAO = 1;

function pedido(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export class IndexedDBRepositorio {
  constructor() {
    this._db = null;
  }

  async db() {
    if (this._db) return this._db;
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("perfis")) db.createObjectStore("perfis", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sessoes")) {
        const s = db.createObjectStore("sessoes", { keyPath: "id" });
        s.createIndex("perfil_id", "perfil_id");
      }
      if (!db.objectStoreNames.contains("definicoes")) db.createObjectStore("definicoes");
    };
    const db = await pedido(req);
    // se outro separador atualizar/apagar a base de dados, ou o browser a fechar, reabre na próxima operação
    db.onversionchange = () => { db.close(); if (this._db === db) this._db = null; };
    db.onclose = () => { if (this._db === db) this._db = null; };
    this._db = db;
    return db;
  }

  async _store(nome, modo = "readonly") {
    try {
      return (await this.db()).transaction(nome, modo).objectStore(nome);
    } catch (e) {
      if (e.name !== "InvalidStateError") throw e;
      this._db = null; // ligação fechada: reabre e tenta de novo
      return (await this.db()).transaction(nome, modo).objectStore(nome);
    }
  }

  // ---------- perfis ----------
  async listarPerfis() {
    const todos = await pedido((await this._store("perfis")).getAll());
    const vivos = todos.filter((p) => !p.apagado_em);
    const sessoes = await pedido((await this._store("sessoes")).getAll());
    for (const p of vivos) p.n_sessoes = sessoes.filter((s) => s.perfil_id === p.id && !s.apagado_em).length;
    return vivos.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));
  }

  async obterPerfil(id) {
    const p = await pedido((await this._store("perfis")).get(id));
    return p && !p.apagado_em ? p : null;
  }

  async guardarPerfil(perfil) {
    const { n_sessoes, ...limpo } = perfil;
    const reg = carimbar(limpo);
    await pedido((await this._store("perfis", "readwrite")).put(reg));
    return reg;
  }

  async apagarPerfil(id) {
    const p = await pedido((await this._store("perfis")).get(id));
    if (!p) return;
    const agora = new Date().toISOString();
    await pedido((await this._store("perfis", "readwrite")).put({ ...p, apagado_em: agora, atualizado_em: agora }));
    for (const s of await this.listarSessoes(id)) await this.apagarSessao(s.id);
  }

  // ---------- sessões ----------
  async listarSessoes(perfilId) {
    const st = await this._store("sessoes");
    const todas = await pedido(st.index("perfil_id").getAll(perfilId));
    return todas
      .filter((s) => !s.apagado_em)
      .map(({ series, ciclos, ...resumo }) => resumo)
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }

  async obterSessao(id) {
    const s = await pedido((await this._store("sessoes")).get(id));
    return s && !s.apagado_em ? s : null;
  }

  async guardarSessao(sessao) {
    if (!sessao.perfil_id) throw new Error("sessão sem perfil_id");
    const reg = carimbar(sessao);
    await pedido((await this._store("sessoes", "readwrite")).put(reg));
    return reg;
  }

  async apagarSessao(id) {
    const s = await pedido((await this._store("sessoes")).get(id));
    if (!s) return;
    const agora = new Date().toISOString();
    // as séries são removidas; fica só o registo de remoção para sincronização
    await pedido((await this._store("sessoes", "readwrite")).put({
      id: s.id, perfil_id: s.perfil_id, criado_em: s.criado_em, apagado_em: agora, atualizado_em: agora,
      versao_esquema: VERSAO_ESQUEMA,
    }));
  }

  // ---------- definições ----------
  async obterDefinicoes() {
    const d = await pedido((await this._store("definicoes")).get("app"));
    return { ...DEFAULT_SETTINGS, ...(d || {}) };
  }

  async guardarDefinicoes(defs) {
    await pedido((await this._store("definicoes", "readwrite")).put(defs, "app"));
  }

  // ---------- exportar / importar ----------
  async exportar() {
    const perfis = await pedido((await this._store("perfis")).getAll());
    const sessoes = await pedido((await this._store("sessoes")).getAll());
    return { versao: VERSAO_ESQUEMA, exportado_em: new Date().toISOString(), perfis, sessoes };
  }

  /** Junta os dados importados aos existentes; em conflito, fica o registo mais recente. */
  async importar(dados) {
    if (!dados || !Array.isArray(dados.perfis) || !Array.isArray(dados.sessoes)) {
      throw new Error("Ficheiro inválido: não parece uma exportação do Bike Fit.");
    }
    let nP = 0, nS = 0;
    for (const [nome, lista] of [["perfis", dados.perfis], ["sessoes", dados.sessoes]]) {
      for (const reg of lista) {
        if (!reg || typeof reg.id !== "string") continue;
        const atual = await pedido((await this._store(nome)).get(reg.id));
        if (atual && (atual.atualizado_em || "") >= (reg.atualizado_em || "")) continue;
        await pedido((await this._store(nome, "readwrite")).put(reg));
        if (nome === "perfis") nP++; else nS++;
      }
    }
    return { perfis: nP, sessoes: nS };
  }
}
