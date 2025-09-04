Ideias para implementar (atualização imediata e confiabilidade)

- SSE explícito: adicionar suporte a uma variável `HUBITAT_EVENT_URL` para forçar a URL do stream (ex.: `.../devices/watch?access_token=...`). Se definida, usar ela antes dos candidatos automáticos.

- Polling rápido ajustável: tornar o intervalo de fallback configurável (1s/2s/5s). Hoje: 2s quando SSE indisponível; 15s quando SSE ativo.

- Reconexão/backoff: trocar o retry fixo (5s) por backoff exponencial com limite, e reset ao recuperar.

- Debounce de apply: quando chegar rajada de eventos, consolidar por 50–150 ms antes de chamar `syncAllElementsFromCache()` para evitar repaints repetidos.

- Indicador de status: exibir estado da conexão (SSE conectado, reconectando, em fallback) e timestamp do último evento/refresh.

- Mapeamentos extras: suportar `level` (dimmer) para ajustar ícone/label (ex.: “ON 45%”) e outros atributos se necessário.

- Config segura: mover `HUBITAT_CLOUD_BASE_URL` e `HUBITAT_ACCESS_TOKEN` para um arquivo de configuração (ex.: `config.json`) carregado no runtime, evitando expor segredos em `script.js`.

Locais no código relacionados

- script.js:305 — constrói URLs candidatas do stream (SSE).
- script.js:347 — conecta ao EventSource e trata eventos.
- script.js:330 — polling e intervalos (fallback/segurança).
- script.js:417 — retomada ao `visibilitychange` (força sync e reconecta).
- index.html:283 — força sincronização após cada render da SPA.

Sugestão de próxima ação

1) Implementar `HUBITAT_EVENT_URL` e um pequeno painel de status (para validar facilmente a conexão SSE). Depois, ajustar o intervalo do fallback conforme desempenho.

Prompts prontos (copiar e colar amanhã)

- SSE explícito:
  - Prompt: Leia `TODO.md` e implemente a ideia "SSE explícito": adicione suporte à variável global `HUBITAT_EVENT_URL` (string). Se definida, use-a com prioridade na conexão do SSE antes dos candidatos automáticos em `buildHubitatEventUrlCandidates()`. Exponha a variável no topo de `script.js` (ou em um bloco de config) e valide a conexão logando "SSE conectado" com a URL usada. Não altere outras funcionalidades.
  - Prompt: Defina `HUBITAT_EVENT_URL` para `https://cloud.hubitat.com/api/<GUID>/apps/<APP_ID>/devices/watch?access_token=<TOKEN>` e ajuste o código para sempre tentar essa URL primeiro.

- Polling rápido ajustável:
  - Prompt: Leia `TODO.md` e implemente "Polling rápido ajustável": extraia os intervalos para constantes `POLL_FAST_MS` (fallback sem SSE) e `POLL_SAFE_MS` (segurança com SSE). Permita sobrescrever via `localStorage.pollFastMs` e `localStorage.pollSafeMs`. Defaults: `POLL_FAST_MS = 2000`, `POLL_SAFE_MS = 15000`. Documente no console como alterar (ex.: `localStorage.pollFastMs = '1000'`).
  - Prompt: Ajuste o fallback para 1000ms e mantenha segurança em 15000ms; mostre onde mudar depois se precisar.

- Reconexão/backoff:
  - Prompt: Implemente backoff exponencial na reconexão do SSE: atrasos 1000ms, 2000ms, 4000ms, 8000ms até 30000ms; resete o contador quando `onopen` ocorrer. Logue as tentativas e o próximo atraso. Não modifique a lógica do polling existente.

- Debounce de apply:
  - Prompt: Adicione debounce de 100ms na aplicação dos eventos SSE: acumule eventos recebidos em um buffer e chame `syncAllElementsFromCache()` apenas após 100ms sem novos eventos. Garanta que eventos de `switch` e `windowShade` atualizem o cache imediatamente e que o debounce só controle o repaint.

- Indicador de status:
  - Prompt: Adicione um indicador visual discreto de status no canto inferior direito mostrando: "SSE" (conectado), "Reconectando..." (com contador de tentativas), "Polling Xs" (intervalo atual) e "Atualizado: HH:MM:SS" (timestamp do último apply). Inclua CSS mínimo em `styles.css` e atualize o indicador em `onopen`, `onerror`, `onmessage` e no timer de polling.

- Mapeamentos extras (level/dimmer):
  - Prompt: Suporte atributo `level` (0–100) para luzes: quando `switch === 'on'` e `level` disponível, exiba label como `ON 45%` nos cards; para ícones agrupados, se qualquer dispositivo `on`, mostrar `on` e, opcionalmente, média do nível no título (se simples). Não altere envio de comandos por enquanto.

- Config segura (config.json):
  - Prompt: Mova `HUBITAT_CLOUD_BASE_URL` e `HUBITAT_ACCESS_TOKEN` para `config.json`. Crie `config.json.example` e carregue config no início de `script.js` via `fetch('config.json')`. Atrasar inicialização que depende de config até o carregamento. Atualize `index.html` se necessário para aguardar. Não comitar `config.json` real.

- Verificação/diagnóstico:
  - Prompt: Execute um "status check": me diga (apenas lendo o código) qual URL do SSE será usada, se o fallback está em 2s, se há debounce e backoff ativos, e quais IDs de dispositivo o app está monitorando na tela atual.

- Geral (plano de execução):
  - Prompt: Leia `TODO.md`, proponha um plano de 3–5 passos e implemente somente a ideia "SSE explícito" primeiro. Depois pare e me mostre como validar.
