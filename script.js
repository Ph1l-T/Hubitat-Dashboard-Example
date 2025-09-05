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
// Direct cloud (fallback if you disable the proxy)
const HUBITAT_CLOUD_BASE_URL = 'https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/77/devices/';
const HUBITAT_ACCESS_TOKEN = '759c4ea4-f9c5-4250-bd11-131221eaad76';

function sendHubitatCommand(deviceId, command, value) {
    let url;
    if (USE_HUBITAT_PROXY) {
        url = `${HUBITAT_PROXY_BASE_URL}${deviceId}/${command}`;
        if (value) url += `/${value}`;
    } else {
        url = `${HUBITAT_CLOUD_BASE_URL}${deviceId}/${command}`;
        if (value) url += `/${value}`;
        url += `?access_token=${HUBITAT_ACCESS_TOKEN}`;
    }

    console.log(`Enviando comando para o Hubitat: ${url}`);

    fetch(url)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => console.log('Resposta do Hubitat:', data))
        .catch(error => console.error('Erro ao enviar comando para o Hubitat:', error));
}

// Cache simples em memória para evitar requisições repetidas na carga
const deviceStateCache = new Map(); // Map<deviceId, { raw: object, switch: 'on'|'off'|undefined, windowShade: string|undefined }>

function fetchHubitatDeviceInfo(deviceId) {
    const url = USE_HUBITAT_PROXY ? `${HUBITAT_PROXY_BASE_URL}${deviceId}` : `${HUBITAT_CLOUD_BASE_URL}${deviceId}?access_token=${HUBITAT_ACCESS_TOKEN}`;
    return fetch(url, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
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
    return Promise.all(ids.map((id) => fetcher(id)))
        .then(() => {
            syncAllElementsFromCache();
        })
        .finally(() => { __isRefreshingStates = false; });
}

// --- Event Stream (SSE) para atualização imediata ---

// Tenta descobrir automaticamente URLs comuns para stream de eventos do Maker API
function buildHubitatEventUrlCandidates() {
    if (USE_HUBITAT_PROXY) {
        const base = String(HUBITAT_PROXY_BASE_URL || '');
        const devicesBase = /\/devices\/$/i.test(base)
            ? base
            : (base.endsWith('/') ? base + 'devices/' : base + '/devices/');
        const rootBase = devicesBase.replace(/\/devices\/??$/i, '/');
        const watchUrl = devicesBase + 'watch';
        const eventSocketUrl = rootBase + 'eventsocket';
        return [watchUrl, eventSocketUrl];
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

const POLL_INTERVAL_MS = 1000; // 1s para feedback quase imediato

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
    startPolling(POLL_INTERVAL_MS);
});
