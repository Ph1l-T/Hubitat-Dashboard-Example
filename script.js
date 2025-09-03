// Funções de toggle para ícones nos cards da home
function toggleTelamovelIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-telamovel-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-telamovel-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleSmartglassIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-smartglass-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-smartglass-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleShaderIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-shader-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-shader-off.svg';
        el.dataset.state = 'off';
    }
}

function toggleLightIcon(el) {
    const img = el.querySelector('img');
    const deviceIdsAttr = el.dataset.deviceIds;
    const deviceIds = deviceIdsAttr ? deviceIdsAttr.split(',') : [];

    if (el.dataset.state === 'off') {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-light-on.svg';
        el.dataset.state = 'on';
        deviceIds.forEach(id => sendHubitatCommand(id, 'on'));
    } else {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-light-off.svg';
        el.dataset.state = 'off';
        deviceIds.forEach(id => sendHubitatCommand(id, 'off'));
    }
}

function toggleTvIcon(el) {
    const img = el.querySelector('img');
    if (el.dataset.state === 'off') {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-tv-on.svg';
        el.dataset.state = 'on';
    } else {
        img.src = 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-tv-off.svg';
        el.dataset.state = 'off';
    }
}

// --- Funções para a página do Escritório ---

function toggleDevice(el, deviceType) {
    const img = el.querySelector('.control-icon');
    const stateEl = el.querySelector('.control-state');
    const currentState = el.dataset.state;
    let newState;
    let newLabel;

    const icons = {
        light: { 
            on: 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-light-on.svg', 
            off: 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-light-off.svg' 
        },
        tv: { 
            on: 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-tv-on.svg', 
            off: 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-tv-off.svg' 
        },
        shader: { 
            on: 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-shader-on.svg', 
            off: 'https://cdn.jsdelivr.net/gh/Ph1l-T/My-Dashboard-Hubitat@main/images/icons/icon-small-shader-off.svg'
        }
    };

    if (!icons[deviceType]) return;

    let deviceId = el.dataset.deviceId || null;
    // Fallback por label para compatibilidade
    if (!deviceId) {
        const controlLabel = el.querySelector('.control-label')?.textContent?.trim();
        if (controlLabel === 'Pendente') {
            deviceId = '102';
        } else if (controlLabel === 'Trilho') {
            deviceId = '101';
        }
    }

    if (currentState === 'off' || currentState === 'closed') {
        newState = 'on';
        newLabel = deviceType === 'shader' ? 'Abertas' : 'ON';
        img.src = icons[deviceType].on;
        if (deviceId) sendHubitatCommand(deviceId, 'on');
    } else {
        newState = deviceType === 'shader' ? 'closed' : 'off';
        newLabel = deviceType === 'shader' ? 'Fechadas' : 'OFF';
        img.src = icons[deviceType].off;
        if (deviceId) sendHubitatCommand(deviceId, 'off');
    }

    el.dataset.state = newState;
    if (stateEl) stateEl.textContent = newLabel;
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

const HUBITAT_CLOUD_BASE_URL = 'https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/77/devices/';
const HUBITAT_ACCESS_TOKEN = '759c4ea4-f9c5-4250-bd11-131221eaad76';

function sendHubitatCommand(deviceId, command, value) {
    let url = `${HUBITAT_CLOUD_BASE_URL}${deviceId}/${command}`;
    if (value) url += `/${value}`;
    url += `?access_token=${HUBITAT_ACCESS_TOKEN}`;

    console.log(`Enviando comando para o Hubitat: ${url}`);

    fetch(url)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => console.log('Resposta do Hubitat:', data))
        .catch(error => console.error('Erro ao enviar comando para o Hubitat:', error));
}
