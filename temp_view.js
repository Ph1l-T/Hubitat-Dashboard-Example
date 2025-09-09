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
