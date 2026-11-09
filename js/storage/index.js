// Camada de armazenamento.
//
// A app só fala com um "repositório" com a interface abaixo. Hoje a implementação é
// IndexedDB (dados no browser). Para usar uma base de dados externa basta criar outra
// implementação com os mesmos métodos (ex.: SupabaseRepositorio) e devolvê-la em
// criarRepositorio(). Nenhuma outra parte da app precisa de mudar.
//
// Interface (todos os métodos são assíncronos):
//   listarPerfis()                 → Perfil[]   (sem os apagados)
//   obterPerfil(id)                → Perfil | null
//   guardarPerfil(perfil)          → Perfil     (cria ou atualiza; preenche id/datas)
//   apagarPerfil(id)               → void       (apaga também as sessões)
//   listarSessoes(perfilId)        → Sessao[]   (resumos, mais recentes primeiro)
//   obterSessao(id)                → Sessao | null
//   guardarSessao(sessao)          → Sessao
//   apagarSessao(id)               → void
//   obterDefinicoes()              → { hsvLo, hsvHi, ... }
//   guardarDefinicoes(defs)        → void
//   exportar()                     → { versao, exportado_em, perfis, sessoes }
//   importar(dados)                → { perfis, sessoes }  (contagens)
//
// Regras pensadas para sincronização futura com um servidor:
//   - ids são UUID gerados no cliente (não há colisões entre dispositivos);
//   - cada registo tem `criado_em` e `atualizado_em` (ISO 8601) para resolver conflitos;
//   - apagar é "soft delete" (`apagado_em`), para que a remoção também possa ser sincronizada;
//   - `versao_esquema` permite migrar dados antigos.
import { IndexedDBRepositorio } from "./indexeddb.js";

export const VERSAO_ESQUEMA = 1;

let repo = null;

export function criarRepositorio() {
  if (!repo) repo = new IndexedDBRepositorio();
  return repo;
}

export function novoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Preenche id, datas e versão de esquema antes de guardar. */
export function carimbar(reg) {
  const agora = new Date().toISOString();
  return {
    ...reg,
    id: reg.id || novoId(),
    criado_em: reg.criado_em || agora,
    atualizado_em: agora,
    versao_esquema: VERSAO_ESQUEMA,
  };
}
