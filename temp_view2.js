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
