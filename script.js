// FunÃ§Ãµes de toggle para Ã­cones nos cards da home
function toggleTelamovelIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-telamovel-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-telamovel-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleSmartglassIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-smartglass-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-smartglass-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleShaderIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-shader-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-shader-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleLightIcon(el) {
    const img = el.querySelector('img');
    const deviceIdsAttr = el.dataset.deviceIds;
    const deviceIds = deviceIdsAttr ? deviceIdsAttr.split(',') : [];

    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-light-on.svg';
        el.dataset.state = 'on';
        // Atualiza cache local imediato e envia comando
        deviceIds.forEach(id => {
            // Atualiza cache de estado de switch
            const key = String(id).trim();
            const info = deviceStateCache.get(key) || { raw: null, switch: undefined, windowShade: undefined };
            info.switch = 'on';
            deviceStateCache.set(key, info);
            sendHubitatCommand(id, 'on');
        });
        // Reaplica estados em todos elementos (ex.: outras páginas/ícones)
        if (typeof syncAllElementsFromCache === 'function') try { syncAllElementsFromCache(); } catch (_) {}
    } else {
        img.src = 'images/icons/icon-small-light-off.svg';
        el.dataset.state = 'off';
        deviceIds.forEach(id => {
            const key = String(id).trim();
            const info = deviceStateCache.get(key) || { raw: null, switch: undefined, windowShade: undefined };
            info.switch = 'off';
            deviceStateCache.set(key, info);
            sendHubitatCommand(id, 'off');
        });
        if (typeof syncAllElementsFromCache === 'function') try { syncAllElementsFromCache(); } catch (_) {}
    }
}

function toggleTvIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'images/icons/icon-small-tv-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'images/icons/icon-small-tv-off.svg';
        el.dataset.state = 'off';
    }
}

// --- FunÃ§Ãµes para a pÃ¡gina do EscritÃ³rio ---

function toggleDevice(el, deviceType) {
    const img = el.querySelector('.control-icon');
    const stateEl = el.querySelector('.control-state');
    const currentState = el.dataset.state;
    let newState;
    let newLabel;

    const icons = {
        light: { 
            on: 'images/icons/icon-small-light-on.svg', 
            off: 'images/icons/icon-small-light-off.svg' 
        },
        tv: { 
            on: 'images/icons/icon-small-tv-on.svg', 
            off: 'images/icons/icon-small-tv-off.svg' 
        },
        shader: { 
            on: 'images/icons/icon-small-shader-on.svg', 
            off: 'images/icons/icon-small-shader-off.svg'
        }
    };

    if (!icons[deviceType]) return;

    let deviceId = el.dataset.deviceId || null;
    // Fallback por label para compatibilidade
    if (!deviceId) {
        const controlLabel = el.querySelector('.control-label')?.textContent?.trim();
        if (controlLabel === 'Pendente') {
            deviceId = '134';
        } else if (controlLabel === 'Trilho') {
            deviceId = '133';
        }
    }

    if (currentState === 'off' || currentState === 'closed') {
        newState = 'on';
        newLabel = deviceType === 'shader' ? 'Abertas' : 'ON';
        img.src = icons[deviceType].on;
        // Atualiza cache local e envia comando
        if (deviceId) {
            const key = String(deviceId);
            const info = deviceStateCache.get(key) || { raw: null, switch: undefined, windowShade: undefined };
            if (deviceType === 'shader') {
                info.windowShade = 'open';
            } else {
                info.switch = 'on';
            }
            deviceStateCache.set(key, info);
            sendHubitatCommand(deviceId, 'on');
        }
    } else {
        newState = deviceType === 'shader' ? 'closed' : 'off';
        newLabel = deviceType === 'shader' ? 'Fechadas' : 'OFF';
        img.src = icons[deviceType].off;
        if (deviceId) {
            const key = String(deviceId);
            const info = deviceStateCache.get(key) || { raw: null, switch: undefined, windowShade: undefined };
            if (deviceType === 'shader') {
                info.windowShade = 'closed';
            } else {
                info.switch = 'off';
            }
            deviceStateCache.set(key, info);
            sendHubitatCommand(deviceId, 'off');
        }
    }

    el.dataset.state = newState;
    if (stateEl) stateEl.textContent = newLabel;

    // Sincroniza demais elementos imediatamente a partir do cache
    if (typeof syncAllElementsFromCache === 'function') try { syncAllElementsFromCache(); } catch (_) {}
}

function setupThermostat() {
    const currentTempSpan = document.getElementById('current-temp');
    const tempDecreaseBtn = document.getElementById('temp-decrease');
    const tempIncreaseBtn = document.getElementById('temp-increase');

    let currentTemperature = parseInt(currentTempSpan.textContent);

    function updateTemperatureDisplay() {
        currentTempSpan.textContent = currentTemperature;
    }

    tempDecreaseBtn.addEventListener('click', () => {
        currentTemperature--;
        updateTemperatureDisplay();
    });

    tempIncreaseBtn.addEventListener('click', () => {
        currentTemperature++;
        updateTemperatureDisplay();
    });

    updateTemperatureDisplay(); // Initialize display
}


// --- Controle do Hubitat ---

// Prefer using a proxy to avoid CORS issues
// You can override at runtime via window.USE_HUBITAT_PROXY and window.HUBITAT_PROXY_BASE_URL
const USE_HUBITAT_PROXY = (typeof window !== 'undefined' && 'USE_HUBITAT_PROXY' in window) ? !!window.USE_HUBITAT_PROXY : true;
const HUBITAT_PROXY_BASE_URL = (typeof window !== 'undefined' && window.HUBITAT_PROXY_BASE_URL) ? window.HUBITAT_PROXY_BASE_URL : '/hubitat/devices/';
const ALLOW_DIRECT_FALLBACK = false; // evitar CORS noise; use somente o proxy
// Direct cloud (fallback if you disable the proxy)
const HUBITAT_CLOUD_BASE_URL = 'https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/77/devices/';
const HUBITAT_ACCESS_TOKEN = '759c4ea4-f9c5-4250-bd11-131221eaad76';

function sendHubitatCommand(deviceId, command, value) {
    const buildProxy = () => {
        let u = `${HUBITAT_PROXY_BASE_URL}${deviceId}/${command}`;
        if (value) u += `/${value}`;
        return u;
    };
    const buildDirect = () => {
        let u = `${HUBITAT_CLOUD_BASE_URL}${deviceId}/${command}`;
        if (value) u += `/${value}`;
        u += `?access_token=${HUBITAT_ACCESS_TOKEN}`;
        return u;
    };

    const primaryUrl = USE_HUBITAT_PROXY ? buildProxy() : buildDirect();
    const fallbackUrl = (USE_HUBITAT_PROXY && ALLOW_DIRECT_FALLBACK) ? buildDirect() : null;

    console.log(`Enviando comando para o Hubitat: ${primaryUrl}`);

    const doFetch = (u) => fetch(u).then(r => r.ok ? r.json() : Promise.reject(r));

    doFetch(primaryUrl)
        .then(data => console.log('Resposta do Hubitat:', data))
        .catch(err => {
            console.warn('Falha no endpoint primário', err);
            if (fallbackUrl) {
                console.log('Tentando fallback direto (cloud)');
                return doFetch(fallbackUrl).then(data => console.log('Resposta (fallback):', data));
            }
        })
        .catch(error => console.error('Erro ao enviar comando para o Hubitat (final):', error));
}

// Cache simples em memória para evitar requisições repetidas na carga
const deviceStateCache = new Map(); // Map<deviceId, { raw: object, switch: 'on'|'off'|undefined, windowShade: string|undefined }>

function fetchHubitatDeviceInfo(deviceId) {
    const proxyUrl = `${HUBITAT_PROXY_BASE_URL}${deviceId}`;
    const directUrl = `${HUBITAT_CLOUD_BASE_URL}${deviceId}?access_token=${HUBITAT_ACCESS_TOKEN}`;
    const primaryUrl = USE_HUBITAT_PROXY ? proxyUrl : directUrl;
    const fallbackUrl = (USE_HUBITAT_PROXY && ALLOW_DIRECT_FALLBACK) ? directUrl : null;
    const fetchJson = (u) => fetch(u, { cache: 'no-store' }).then(res => res.ok ? res.json() : Promise.reject(res));

    return fetchJson(primaryUrl)
        .catch((err) => {
            console.warn('Falha ao buscar via endpoint primário', err);
            if (fallbackUrl) return fetchJson(fallbackUrl);
            throw err;
        })
        .then((data) => {
            // Normaliza atributos úteis
            let switchValue;
            let windowShadeValue;
            if (Array.isArray(data.attributes)) {
                for (const attr of data.attributes) {
                    if (attr.name === 'switch') switchValue = attr.currentValue;
                    if (attr.name === 'windowShade') windowShadeValue = attr.currentValue;
                }
            }
            const normalized = { raw: data, switch: switchValue, windowShade: windowShadeValue };
            deviceStateCache.set(String(deviceId), normalized);
            return normalized;
        })
        .catch((err) => {
            console.error('Erro ao buscar estado do dispositivo', deviceId, err);
            return null;
        });
}

function getCachedOrFetch(deviceId) {
    const key = String(deviceId);
    if (deviceStateCache.has(key)) return Promise.resolve(deviceStateCache.get(key));
    return fetchHubitatDeviceInfo(key);
}

function mapStateForDeviceType(deviceInfo, deviceType) {
    // Retorna 'on' | 'off' | 'closed' conforme o tipo
    if (!deviceInfo) return null;
    if (deviceType === 'shader') {
        const v = (deviceInfo.windowShade || '').toLowerCase();
        // Considera qualquer estado aberto/abrindo como ligado visualmente
        if (v === 'open' || v === 'opening' || v === 'partially open' || v === 'partially_open') return 'on';
        if (v === 'closed' || v === 'closing') return 'closed';
        return null;
    }
    const sw = (deviceInfo.switch || '').toLowerCase();
    if (sw === 'on') return 'on';
    if (sw === 'off') return 'off';
    return null;
}

function setElementVisualState(el, deviceType, state) {
    if (!state) return;
    const img = el.querySelector('.control-icon') || el.querySelector('img');
    const stateEl = el.querySelector('.control-state');

    const icons = {
        light: {
            on: 'images/icons/icon-small-light-on.svg',
            off: 'images/icons/icon-small-light-off.svg',
        },
        tv: {
            on: 'images/icons/icon-small-tv-on.svg',
            off: 'images/icons/icon-small-tv-off.svg',
        },
        shader: {
            on: 'images/icons/icon-small-shader-on.svg',
            off: 'images/icons/icon-small-shader-off.svg',
        },
    };

    const kind = icons[deviceType] ? deviceType : 'light';

    if (deviceType === 'shader') {
        const normalized = state === 'on' ? 'on' : 'closed';
        if (img) img.src = normalized === 'on' ? icons.shader.on : icons.shader.off;
        el.dataset.state = normalized;
        if (stateEl) stateEl.textContent = normalized === 'on' ? 'Abertas' : 'Fechadas';
        return;
    }

    const normalized = state === 'on' ? 'on' : 'off';
    if (img) img.src = normalized === 'on' ? icons[kind].on : icons[kind].off;
    el.dataset.state = normalized;
    if (stateEl) stateEl.textContent = normalized === 'on' ? 'ON' : 'OFF';
}

function collectAllDeviceIdsFromDOM() {
    const ids = new Set();
    // Elementos com um único deviceId
    document.querySelectorAll('[data-device-id]').forEach((el) => {
        const id = el.getAttribute('data-device-id');
        if (id) ids.add(String(id).trim());
    });
    // Elementos com múltiplos deviceIds (grupo)
    document.querySelectorAll('[data-device-ids]').forEach((el) => {
        const raw = el.getAttribute('data-device-ids');
        if (!raw) return;
        raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => ids.add(String(id)));
    });
    return ids;
}

function syncElementFromCache(el) {
    // device-type pode ser definido no HTML. Padrão: 'light'
    const deviceType = (el.getAttribute('data-device-type') || 'light').toLowerCase();

    // Caso grupo de dispositivos (ex.: luzes agrupadas na home)
    const group = el.getAttribute('data-device-ids');
    if (group) {
        const ids = group.split(',').map((s) => s.trim()).filter(Boolean);
        // Regra: mostra ON se QUALQUER um estiver ON (mais intuitivo para "desligar todos" no próximo toque)
        let anyOn = false;
        for (const id of ids) {
            const info = deviceStateCache.get(String(id));
            const mapped = mapStateForDeviceType(info, deviceType);
            if (mapped === 'on') { anyOn = true; break; }
        }
        setElementVisualState(el, deviceType, anyOn ? 'on' : (deviceType === 'shader' ? 'closed' : 'off'));
        return;
    }

    // Caso dispositivo único
    const id = el.getAttribute('data-device-id');
    if (id) {
        const info = deviceStateCache.get(String(id));
        const mapped = mapStateForDeviceType(info, deviceType);
        if (mapped) setElementVisualState(el, deviceType, mapped);
    }
}

function syncAllElementsFromCache() {
    document.querySelectorAll('[data-device-id], [data-device-ids]').forEach((el) => syncElementFromCache(el));
}

let __isRefreshingStates = false;
function refreshAllDeviceStates(force = false) {
    const ids = Array.from(collectAllDeviceIdsFromDOM());
    if (ids.length === 0) return Promise.resolve();
    if (__isRefreshingStates) return Promise.resolve();
    __isRefreshingStates = true;
    const fetcher = force ? fetchHubitatDeviceInfo : getCachedOrFetch;

    // Round-robin para reduzir chamadas: usa no mdximo POLL_MAX_DEVICES_PER_TICK por ciclo
    let slice = ids;
    try {
        if (force && typeof POLL_MAX_DEVICES_PER_TICK !== 'undefined' && POLL_MAX_DEVICES_PER_TICK > 0) {
            if (typeof __pollIndex !== 'number') { __pollIndex = 0; }
            slice = [];
            for (let i = 0; i < Math.min(POLL_MAX_DEVICES_PER_TICK, ids.length); i++) {
                slice.push(ids[(__pollIndex + i) % ids.length]);
            }
            __pollIndex = (__pollIndex + slice.length) % ids.length;
        }
    } catch (_) {}

    return Promise.all(slice.map((id) => fetcher(id)))
        .then(() => {
            syncAllElementsFromCache();
        })
        .finally(() => { __isRefreshingStates = false; });
}

// --- Event Stream (SSE) para atualização imediata ---

// Tenta descobrir automaticamente URLs comuns para stream de eventos do Maker API
function buildHubitatEventUrlCandidates() {
    // Via proxy/cloud o Hubitat normalmente não expõe SSE; evitamos tentar.
    if (USE_HUBITAT_PROXY) {
        return [];
    }
    const base = HUBITAT_CLOUD_BASE_URL.replace(/\/?devices\/??$/i, '');
    const tokenQS = `access_token=${encodeURIComponent(HUBITAT_ACCESS_TOKEN)}`;
    const candidates = [];
    candidates.push(`${base}/devices/watch?${tokenQS}`);
    candidates.push(`${base}/eventsocket?${tokenQS}`);
    candidates.push(`${HUBITAT_CLOUD_BASE_URL}watch?${tokenQS}`);
    candidates.push(`${HUBITAT_CLOUD_BASE_URL}eventsocket?${tokenQS}`);
    return Array.from(new Set(candidates));
}
let eventStreamConnected = false;
let pollTimer = null;
// Global EventSource handle for SSE; avoids ReferenceError
let hubitatEventSource = null;

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function startPolling(intervalMs = 10000) {
    stopPolling();
    pollTimer = setInterval(() => {
        refreshAllDeviceStates(true).catch((e) => console.error('Falha ao sincronizar estados periódicos', e));
    }, intervalMs);
}

function updateCacheFromEvent(evt) {
    // Espera formato: { name: 'switch'|'windowShade', value: 'on'|'off'|..., deviceId: '...' }
    if (!evt || !evt.deviceId) return;
    const key = String(evt.deviceId);
    const info = deviceStateCache.get(key) || { raw: null, switch: undefined, windowShade: undefined };
    if (evt.name === 'switch') info.switch = evt.value;
    if (evt.name === 'windowShade') info.windowShade = evt.value;
    deviceStateCache.set(key, info);
}

function connectHubitatEvents() {
    // Evita SSE quando usando proxy (cloud); usa apenas polling
    if (USE_HUBITAT_PROXY) {
        startPolling(POLL_INTERVAL_MS);
        return;
    }
    // If EventSource is unavailable (very old browsers), fallback to polling only
    if (typeof EventSource === 'undefined') {
        console.warn('EventSource not supported; using polling only');
        startPolling(POLL_INTERVAL_MS);
        return;
    }
    if (hubitatEventSource) {
        try { hubitatEventSource.close(); } catch (_) {}
        hubitatEventSource = null;
    }
    eventStreamConnected = false;

    const candidates = buildHubitatEventUrlCandidates();
    let index = 0;

    const tryNext = () => {
        if (index >= candidates.length) {
            // Nenhuma URL funcionou: usa polling rápido
            startPolling(POLL_INTERVAL_MS);
            return;
        }
        const url = candidates[index++];
        try {
            const es = new EventSource(url);
            let opened = false;
            es.onopen = () => {
                opened = true;
                eventStreamConnected = true;
                hubitatEventSource = es;
                console.log('SSE conectado:', url);
                // Mantemos polling como backup para garantir feedback
                startPolling(POLL_INTERVAL_MS);
            };
            es.onerror = (err) => {
                console.warn('Falha SSE, tentando próxima URL...', url, err);
                try { es.close(); } catch (_) {}
                if (!opened) {
                    // Tentar a próxima URL se nem abriu
                    tryNext();
                } else {
                    // Se caiu após abrir, tenta reconectar após um tempo
                    setTimeout(connectHubitatEvents, 5000);
                }
            };
            es.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    // Evento individual ou batelada
                    const list = Array.isArray(data) ? data : [data];
                    let touched = false;
                    for (const item of list) {
                        if (item && (item.name === 'switch' || item.name === 'windowShade') && item.deviceId) {
                            updateCacheFromEvent(item);
                            touched = true;
                        }
                    }
                    if (touched) {
                        syncAllElementsFromCache();
                    }
                } catch (err) {
                    // Em alguns casos o payload pode não ser JSON; ignora com log leve
                    // console.debug('Evento SSE não-JSON', e.data);
                }
            };
        } catch (e) {
            console.warn('Erro ao inicializar SSE para', url, e);
            tryNext();
        }
    };

    tryNext();
}

// Polling params tuned to reduce request rate
const POLL_INTERVAL_MS = 10000; // 10s when visible
const POLL_INTERVAL_HIDDEN_MS = 60000; // 60s when hidden/background
const POLL_MAX_DEVICES_PER_TICK = 4; // round-robin subset per tick
let __pollIndex = 0;

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Voltar ao app: força sync e garante conexão SSE
        refreshAllDeviceStates(true).finally(() => {
            connectHubitatEvents();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Sincroniza estados reais ao abrir a interface
    refreshAllDeviceStates(true)
        .then(() => connectHubitatEvents())
        .catch((e) => {
            console.error('Falha ao sincronizar estados iniciais', e);
            // Se nem o fetch funcionou, ainda tenta eventos e ativa polling padrão
            connectHubitatEvents();
        });

    // Polling de segurança (caso SSE não conecte)
    startPolling(document.visibilityState === 'visible' ? POLL_INTERVAL_MS : POLL_INTERVAL_HIDDEN_MS);

    // Esconder controles que não são de luz (sem data-device-id),
    // exceto os marcados explicitamente como permitidos
    const hideNonLightControlsInDOM = () => {
        try {
            document.querySelectorAll('.control-card:not([data-device-id]):not([data-allow-non-light="true"])').forEach((el) => {
                el.style.display = 'none';
            });
        } catch (_) {}
    };

    const root = document.getElementById('spa-root');
    hideNonLightControlsInDOM();
    if (root) {
        const mo = new MutationObserver(() => hideNonLightControlsInDOM());
        mo.observe(root, { childList: true, subtree: true });
    }

    // Define página de Cenários com Master ON/OFF, se disponível
    try {
        if (typeof pages !== 'undefined' && pages && typeof pages === 'object') {
            pages.scenes = scenesMarkup;
        }
    } catch (_) {}
    // Após render inicial, se estiver na página de cenários, garante conteúdo
    setTimeout(maybeOverrideScenes, 0);
});

// --- Master ON/OFF (Cenários) ---

// Lista consolidada das luzes mapeadas na UI (relayboard 133–147, em uso):
const KNOWN_LIGHT_IDS = [
    '133','134','135','136','137','138','139','140','141','142','143','144','145','146','147'
];

function getAllKnownLightIds() {
    const ids = new Set(KNOWN_LIGHT_IDS);
    // Adiciona quaisquer IDs presentes no DOM atual
    try {
        collectAllDeviceIdsFromDOM().forEach((id) => ids.add(String(id)));
    } catch (_) {}
    return Array.from(ids);
}

function anyKnownLightOn() {
    const ids = getAllKnownLightIds();
    for (const id of ids) {
        const info = deviceStateCache.get(String(id));
        const mapped = mapStateForDeviceType(info, 'light');
        if (mapped === 'on') return true;
    }
    return false;
}

function openMasterConfirmModal() {
    // Decide ação com base no estado atual
    const anyOn = anyKnownLightOn();
    const action = anyOn ? 'off' : 'on';
    window.__masterAction = action;
    const modal = document.getElementById('master-modal');
    const msg = document.getElementById('master-modal-message');
    const title = document.getElementById('master-modal-title');
    if (modal && msg && title) {
        title.textContent = 'Confirmação';
        msg.textContent = action === 'off' ? 'Deseja Desligar tudo?' : 'Deseja Ligar tudo?';
        modal.classList.add('show');
    }
}

function closeMasterModal() {
    const modal = document.getElementById('master-modal');
    if (modal) modal.classList.remove('show');
}

function executeMasterFromModal() {
    const action = window.__masterAction === 'off' ? 'off' : 'on';
    const ids = getAllKnownLightIds();
    for (const id of ids) {
        try {
            // Atualiza cache local para feedback imediato
            const key = String(id);
            const info = deviceStateCache.get(key) || { raw: null, switch: undefined, windowShade: undefined };
            info.switch = action;
            deviceStateCache.set(key, info);
            sendHubitatCommand(id, action);
        } catch (_) {}
    }
    try { syncAllElementsFromCache(); } catch (_) {}
    closeMasterModal();
}

function renderScenesOverrideIntoRoot() {
    const root = document.getElementById('spa-root');
    if (!root) return;
    root.innerHTML = scenesMarkup();
}

function maybeOverrideScenes() {
    const page = (location.hash || '').replace('#','') || 'home';
    if (page === 'scenes') {
        renderScenesOverrideIntoRoot();
        // Garante sincronização de estados após montar a página
        refreshAllDeviceStates(true).catch(() => {});
    }
}

window.addEventListener('hashchange', maybeOverrideScenes);

// Gera o markup da página de Cenários
function scenesMarkup() {
    return `
<div class="page active page-container" style="background-image: url('images/photos/home-photo.png');">
  <div class="page-header">
    <h1 class="page-title">Cenários</h1>
  </div>
  <div class="controls-grid">
    <div class="control-card large master-toggle" data-allow-non-light="true" onclick="openMasterConfirmModal()">
      <img src="images/icons/icon-small-light-off.svg" class="control-icon">
      <div class="control-label">Master ON/OFF</div>
    </div>
  </div>
  <div class="modal-overlay" id="master-modal">
    <div class="modal">
      <div class="modal-title" id="master-modal-title">Confirmação</div>
      <div class="modal-message" id="master-modal-message">...</div>
      <div class="modal-actions">
        <button class="btn cancel" onclick="closeMasterModal()">Cancelar</button>
        <button class="btn execute" onclick="executeMasterFromModal()">Executar</button>
      </div>
    </div>
  </div>
</div>`;
}

// --- TV Remote handlers ---

function handleRemoteClick(btn) {
    try {
        const container = btn.closest('#tv-remote');
        const tvId = (container && container.getAttribute('data-tv-id')) || '142';
        const cmd = btn.getAttribute('data-cmd');
        const val = btn.getAttribute('data-val');

        // Map UI commands to Hubitat-style commands where possível
        // Preferir comandos suportados pelo device TV (id 149): on/off/mute/volume/channel, e fallback para 'push'
        const map = {
            power: ['on'],
            mute: ['mute'],
            volUp: ['volumeUp'],
            volDown: ['volumeDown'],
            chUp: ['channelUp'],
            chDown: ['channelDown'],
        };

        if (cmd === 'num' && val != null) {
            console.log('Remote num', val);
            // Fallback universal: usar 'push' com o dígito se suportado
            try { sendHubitatCommand(tvId, 'push', String(val)); } catch (_) {}
            return;
        }
        if (cmd === 'num100') { try { sendHubitatCommand(tvId, 'push', '100'); } catch (_) {} return; }
        if (cmd === 'back') { try { sendHubitatCommand(tvId, 'push', 'back'); } catch (_) {} return; }
        if (['menu','service','input','up','down','left','right','ok'].includes(cmd)) {
            try { sendHubitatCommand(tvId, 'push', cmd); } catch (_) {}
            return;
        }

        const targets = map[cmd];
        if (targets && targets.length) {
            for (const c of targets) {
                try { sendHubitatCommand(tvId, c); } catch (_) {}
            }
            return;
        }

        // Fallback: log
        console.log('Remote button pressed:', { tvId, cmd, val });
    } catch (e) {
        console.error('handleRemoteClick failed', e);
    }
}

// --- AC helpers ---
function acSetPower(deviceId, on) {
    sendHubitatCommand(deviceId, on ? 'on' : 'off');
}
function acSetMode(deviceId, mode) {
    // comandos do device aceitam 'auto','cool','heat','off'
    sendHubitatCommand(deviceId, mode);
}
function acSetFanMode(deviceId, mode) {
    if (mode === 'auto') return sendHubitatCommand(deviceId, 'fanAuto');
    if (mode === 'on') return sendHubitatCommand(deviceId, 'fanOn');
    return sendHubitatCommand(deviceId, 'setThermostatFanMode', mode);
}
function acAdjustCoolingSetpoint(deviceId, delta) {
    const disp = document.getElementById('ac-setpoint-display');
    let current = 20;
    if (disp) {
        const m = /([0-9]+)(?:\s*°?C)?/i.exec(disp.textContent || '');
        if (m) current = parseInt(m[1], 10);
    }
    const next = Math.max(16, Math.min(30, current + (delta||0)));
    if (disp) disp.textContent = `${next}°C`;
    sendHubitatCommand(deviceId, 'setCoolingSetpoint', String(next));
}

// --- PWA: registro do Service Worker ---
(() => {
  try {
    if ('serviceWorker' in navigator) {
      // Usa caminho relativo para funcionar em subpaths (ex.: GitHub Pages)
      const swUrl = (document.currentScript && document.currentScript.src && document.currentScript.src.includes('/')) ? 'sw.js' : 'sw.js';
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(swUrl).catch((err) => {
          console.warn('Falha ao registrar Service Worker', err);
        });
      });
    }
  } catch (e) {
    // Silencia falhas do SW para não impactar a UI
  }
})();

// Ajuste de polling conforme visibilidade da página
try {
  document.addEventListener('visibilitychange', () => {
    if (typeof startPolling === 'function') {
      if (document.visibilityState === 'visible') {
        startPolling(typeof POLL_INTERVAL_MS !== 'undefined' ? POLL_INTERVAL_MS : 10000);
      } else {
        const hiddenMs = (typeof POLL_INTERVAL_HIDDEN_MS !== 'undefined') ? POLL_INTERVAL_HIDDEN_MS : 60000;
        startPolling(hiddenMs);
      }
    }
  });
} catch (_) {}
