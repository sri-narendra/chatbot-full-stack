// ============================
// SETTINGS FUNCTIONS
// ============================
function showSettings() {
    document.getElementById('maxTokensSlider').value = settings.maxTokens;
    document.getElementById('historyMessagesSlider').value = settings.historyMessages;
    document.getElementById('temperatureSlider').value = settings.temperature;
    document.getElementById('voiceLanguage').value = voiceSettings.language;
    document.getElementById('continuousListening').checked = voiceSettings.continuous;

    updateMaxTokensValue(settings.maxTokens);
    updateHistoryMessagesValue(settings.historyMessages);
    updateTemperatureValue(settings.temperature);

    updateApiStatusDetails();

    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
    settingsModal.classList.add('animate-fade-in');
}

function hideSettings() {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
}

function updateMaxTokensValue(value) {
    document.getElementById('maxTokensValue').textContent = `${value} tokens`;
    updateResponseLengthInfo(value);
}

function updateHistoryMessagesValue(value) {
    document.getElementById('historyMessagesValue').textContent = `${value} message${value !== 1 ? 's' : ''}`;
}

function updateTemperatureValue(value) {
    document.getElementById('temperatureValue').textContent = value;
}

function updateResponseLengthInfo(tokens) {
    const infoEl = document.getElementById('responseLengthInfo');
    if (tokens <= 500) {
        infoEl.textContent = 'Short responses';
        infoEl.className = 'text-xs text-green-400';
    } else if (tokens <= 2000) {
        infoEl.textContent = 'Medium responses';
        infoEl.className = 'text-xs text-blue-400';
    } else {
        infoEl.textContent = 'Long responses';
        infoEl.className = 'text-xs text-purple-400';
    }
}

async function saveSettings() {
    settings.maxTokens = parseInt(document.getElementById('maxTokensSlider').value);
    settings.historyMessages = parseInt(document.getElementById('historyMessagesSlider').value);
    settings.temperature = parseFloat(document.getElementById('temperatureSlider').value);
    
    voiceSettings.language = document.getElementById('voiceLanguage').value;
    voiceSettings.continuous = document.getElementById('continuousListening').checked;

    localStorage.setItem('maxTokens', settings.maxTokens);
    localStorage.setItem('historyMessages', settings.historyMessages);
    localStorage.setItem('temperature', settings.temperature);
    localStorage.setItem('voiceLanguage', voiceSettings.language);
    localStorage.setItem('continuousListening', voiceSettings.continuous);

    // Reinitialize voice recognition with new settings
    if (recognition && isListening) {
        stopVoiceSearch();
        setTimeout(() => {
            if (initVoiceRecognition()) {
                showToast('Voice settings updated. Click microphone to start again.', 'info');
            }
        }, 500);
    }

    try {
        await fetch(`${API_BASE}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                maxResponseTokens: settings.maxTokens,
                maxHistoryMessages: settings.historyMessages,
                temperature: settings.temperature
            })
        });
    } catch (error) {
        console.error('Failed to update backend config:', error);
    }

    showToast('Settings saved successfully', 'success');
    hideSettings();
    updateResponseLengthInfo(settings.maxTokens);
}

function resetSettings() {
    settings.maxTokens = 2000;
    settings.historyMessages = 5;
    settings.temperature = 0.7;
    voiceSettings.language = 'en-US';
    voiceSettings.continuous = false;

    document.getElementById('maxTokensSlider').value = settings.maxTokens;
    document.getElementById('historyMessagesSlider').value = settings.historyMessages;
    document.getElementById('temperatureSlider').value = settings.temperature;
    document.getElementById('voiceLanguage').value = voiceSettings.language;
    document.getElementById('continuousListening').checked = voiceSettings.continuous;

    updateMaxTokensValue(settings.maxTokens);
    updateHistoryMessagesValue(settings.historyMessages);
    updateTemperatureValue(settings.temperature);

    showToast('Settings reset to defaults', 'info');
}