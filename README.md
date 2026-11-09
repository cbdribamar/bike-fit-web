# Bike Fit (versão web)

Análise biomecânica de ciclismo com a câmara do portátil e marcadores coloridos. Corre **inteiramente no browser**: não há servidor nem instalação, e o vídeo nunca sai do computador. É um site estático, pronto para o GitHub Pages.

## O que faz

- **Página inicial com demonstração ao vivo**: ciclista simulado analisado pelo mesmo motor que o teste real, com cinco cenários: *Correto*, *Selim baixo*, *Selim alto*, *Tudo abaixo* (todas as métricas abaixo da faixa) e *Tudo acima* (todas acima; a anca só tem limite mínimo).
- **A ciência**: explicação de cada métrica (como é medida, porque importa, o que significa estar abaixo ou acima, o que ajustar), do método de análise, das limitações e das fontes.
- **Perfis**: dados do ciclista, da bicicleta e de dores ou lesões. As referências ajustam-se ao perfil, incluindo o **estilo de ciclista** (perfis-tipo Trepador, Rolador / endurance, Sprinter / puncheur e Contrarrelogista). Cada relatório mostra com que perfil-tipo a posição medida mais se parece. Os perfis-tipo são faixas genéricas e não reproduzem nenhum ciclista concreto.
- **Teste**: com a câmara (ao vivo), com o simulador (sem rolos) ou com um ficheiro de vídeo (analisado frame a frame).
- **Relatório**: métricas por ciclo de pedalada, observações, qualidade da deteção, gráfico e exportação em CSV/JSON. Fica guardado no perfil.
- **Exportar / importar** todos os dados num ficheiro JSON, para cópia de segurança ou para passar para outro computador.

## Correr localmente

Os módulos JavaScript precisam de ser servidos por HTTP; abrir o `index.html` diretamente não funciona. Na pasta `bike-fit-web/`:

```bash
python3 -m http.server 5173
```

Abre `http://localhost:5173`. A câmara funciona em `localhost` e em HTTPS.

Na primeira utilização da câmara ou de um vídeo, o browser descarrega o MediaPipe (~13 MB) e o modelo de pose (~9 MB). A seguir ficam em cache.

## Publicar no GitHub Pages

1. Cria um repositório no GitHub (por exemplo `bike-fit`) e envia o conteúdo desta pasta para a raiz do branch `main`:
   ```bash
   cd bike-fit-web
   git init -b main
   git add .
   git commit -m "Bike Fit web"
   git remote add origin https://github.com/<utilizador>/bike-fit.git
   git push -u origin main
   ```
2. No GitHub: **Settings › Pages › Build and deployment › Source: Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Passado um minuto, o site fica em `https://<utilizador>.github.io/bike-fit/`.

O ficheiro `.nojekyll` impede o GitHub de processar o site com Jekyll. O router usa `#/…`, por isso não é preciso configurar redirecionamentos.

## Onde ficam os dados

Hoje os perfis e os relatórios ficam no **IndexedDB do browser**. São privados, mas pertencem a esse browser e a esse computador: limpar os dados do site apaga-os. Usa **Perfis › Exportar dados** para fazer cópias de segurança.

### Preparado para uma base de dados externa

Toda a app fala apenas com um *repositório* (`js/storage/index.js`) com uma interface fixa: `listarPerfis`, `guardarPerfil`, `listarSessoes`, `guardarSessao`, `exportar`, `importar`, etc. Para passar a usar uma base de dados externa, cria-se outra implementação com os mesmos métodos e devolve-se em `criarRepositorio()`. Nada mais muda.

Os registos já seguem regras que facilitam a sincronização:

| Regra | Porquê |
|---|---|
| `id` é um UUID gerado no cliente | sem colisões entre dispositivos, funciona offline |
| `criado_em` / `atualizado_em` em ISO 8601 | resolução de conflitos (fica o mais recente) |
| apagar = `apagado_em` (soft delete) | a remoção também é sincronizada |
| `versao_esquema` | migrações futuras |

**Recomendação: Supabase** (Postgres + autenticação + regras de acesso por utilizador), que tem um cliente JavaScript que funciona num site estático. Esquema de partida:

```sql
create table perfis (
  id uuid primary key,
  utilizador_id uuid not null references auth.users default auth.uid(),
  dados jsonb not null,             -- campos do perfil
  criado_em timestamptz not null,
  atualizado_em timestamptz not null,
  apagado_em timestamptz,
  versao_esquema int not null default 1
);
create table sessoes (
  id uuid primary key,
  perfil_id uuid not null references perfis(id),
  utilizador_id uuid not null references auth.users default auth.uid(),
  resumo jsonb not null,            -- métricas, observações, cobertura
  series jsonb,                     -- séries de ângulos (para o gráfico)
  criado_em timestamptz not null,
  atualizado_em timestamptz not null,
  apagado_em timestamptz,
  versao_esquema int not null default 1
);
alter table perfis enable row level security;
alter table sessoes enable row level security;
create policy "dono" on perfis for all using (utilizador_id = auth.uid());
create policy "dono" on sessoes for all using (utilizador_id = auth.uid());
```

Estratégia sugerida: *local-first*. O IndexedDB continua a ser a fonte imediata (funciona offline) e um `RepositorioSincronizado` envia e recebe alterações por `atualizado_em`.

> **Dados de saúde:** dores e lesões são dados de saúde segundo o RGPD. Antes de os guardar num servidor, é preciso consentimento explícito, acesso restrito ao próprio utilizador (as políticas acima) e uma forma de apagar a conta. Os vídeos nunca precisam de ser enviados: só os resultados.

## Testes

```bash
npm test        # ou: node --test tests/
```

- A lógica de análise é comparada com a versão Python/scipy, usando dados de referência em `tests/fixture_scipy.json`: suavização, picos, estatísticas e geometria do simulador.
- O motor completo é testado com o simulador (selim baixo, correto e alto).
- O seguimento dos marcadores é testado com uma estimativa de pose deliberadamente errada.

## Estrutura

```
index.html            página única (router por hash)
css/style.css         estilos (claro/escuro automático)
js/app.js             router
js/views.js           páginas: início, perfis, teste, relatório
js/ciencia.js         página "A ciência" (métricas, método, limitações, fontes)
js/live.js            captura: simulador, câmara (getUserMedia), vídeo (frame a frame)
js/pose.js            MediaPipe Pose (WebAssembly, carregado do CDN)
js/demo.js            ciclista simulado
js/chart.js           gráfico SVG do relatório
js/ui.js              utilitários e painel de métricas
js/config.js          referências, campos do perfil, constantes
js/analysis/          motor sem DOM: marcadores, seguimento, ângulos, ciclos, relatório
js/storage/           repositório (IndexedDB hoje; base de dados externa no futuro)
tests/                testes em Node
```

## Limitações

Análise 2D: a câmara tem de estar perpendicular à bicicleta. A vista frontal (trajetória do joelho) ainda não está implementada. Os resultados são indicativos e não substituem um bike fit profissional.
