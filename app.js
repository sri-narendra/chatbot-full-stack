// Configuration
const API_BASE = 'https://chatbot-full-stack.onrender.com/api/chat';
let sessionId = localStorage.getItem('sessionId');
let isSending = false;
let apiStatus = 'checking';
let sidebarExpanded = localStorage.getItem('sidebarExpanded') !== 'false';
let sessionToDelete = null;
let deleteMode = 'session';

// Voice Search
let isListening = false;
let recognition = null;
let voiceTranscript = '';
let finalTranscript = '';
let voiceSettings = {
    language: localStorage.getItem('voiceLanguage') || 'en-US',
    continuous: localStorage.getItem('continuousListening') === 'true'
};

// Settings
let settings = {
    maxTokens: parseInt(localStorage.getItem('maxTokens')) || 2000,
    historyMessages: parseInt(localStorage.getItem('historyMessages')) || 5,
    temperature: parseFloat(localStorage.getItem('temperature')) || 0.7
};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const deleteModal = document.getElementById('deleteModal');
const deleteModalText = document.getElementById('deleteModalText');
const settingsModal = document.getElementById('settingsModal');
const chatBox = document.getElementById('chatBox');
const voiceVisualizer = document.getElementById('voiceVisualizer');
const voiceStatus = document.getElementById('voiceStatus');
const voiceStatusText = document.getElementById('voiceStatusText');
const voiceTranscriptEl = document.getElementById('voiceTranscript');
const voiceWave = document.getElementById('voiceWave');
const voiceInstruction = document.getElementById('voiceInstruction');
const voiceBtn = document.getElementById('voiceBtn');

// ============================
// VOICE SEARCH FUNCTIONS - FIXED
// ============================
function initVoiceRecognition() {
    // Check if browser supports Speech Recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        voiceBtn.disabled = true;
        voiceBtn.title = 'Voice search not supported';
        showToast('Voice search not supported in your browser', 'error');
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    try {
        recognition = new SpeechRecognition();
        
        // Configure recognition - FIX: Set continuous properly
        recognition.continuous = true; // Always use continuous for better experience
        recognition.interimResults = true;
        recognition.lang = voiceSettings.language;
        recognition.maxAlternatives = 1;
        
        // Clear previous transcripts
        voiceTranscript = '';
        finalTranscript = '';
        
        // Event handlers
        recognition.onstart = () => {
            console.log('Voice recognition started');
            isListening = true;
            voiceBtn.classList.add('listening-btn');
            voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            voiceBtn.title = 'Stop listening';
            
            // Show visualizer
            voiceVisualizer.classList.remove('hidden');
            voiceVisualizer.classList.add('flex', 'animate-fade-in');
            voiceWave.classList.add('listening');
            voiceInstruction.textContent = 'Speak now. Click Stop or press Escape to finish.';
            
            updateVoiceStatus('Listening...', 'purple');
            showToast('Voice recognition started', 'info');
        };
        
        recognition.onresult = (event) => {
            console.log('Voice recognition result received');
            let interimTranscript = '';
            
            // Clear final transcript if starting new phrase
            if (event.results[event.resultIndex].isFinal) {
                finalTranscript = '';
            }
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update transcript display
            voiceTranscript = finalTranscript + interimTranscript;
            const displayText = voiceTranscript.trim() || 'Speak your message...';
            
            voiceTranscriptEl.innerHTML = `
                <p class="text-gray-300">${displayText}</p>
                ${interimTranscript ? 
                    `<p class="text-gray-500 text-sm mt-1 italic">${interimTranscript}</p>` : ''}
            `;
            
            // Auto-scroll transcript
            voiceTranscriptEl.scrollTop = voiceTranscriptEl.scrollHeight;
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            let errorMessage = 'Voice recognition error';
            switch(event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone found. Please check your microphone.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'network':
                    errorMessage = 'Network error occurred. Please check your connection.';
                    break;
                default:
                    errorMessage = `Error: ${event.error}`;
            }
            
            updateVoiceStatus(errorMessage, 'red');
            showToast(errorMessage, 'error');
            
            // Don't stop on network errors, try to continue
            if (event.error !== 'network' && event.error !== 'no-speech') {
                stopVoiceSearch();
            }
        };
        
        recognition.onend = () => {
            console.log('Voice recognition ended');
            
            // If we're still supposed to be listening, restart
            if (isListening) {
                console.log('Restarting voice recognition...');
                setTimeout(() => {
                    if (isListening && recognition) {
                        try {
                            recognition.start();
                            updateVoiceStatus('Listening...', 'purple');
                        } catch (error) {
                            console.error('Failed to restart recognition:', error);
                            stopVoiceSearch();
                        }
                    }
                }, 100);
            } else {
                // Clean up
                stopVoiceSearch();
            }
        };
        
        // Request microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                console.log('Microphone access granted');
                updateVoiceStatus('Voice search ready', 'green');
            })
            .catch(error => {
                console.error('Microphone access denied:', error);
                voiceBtn.disabled = true;
                voiceBtn.title = 'Microphone access required';
                updateVoiceStatus('Microphone access denied', 'red');
            });
        
        return true;
        
    } catch (error) {
        console.error('Failed to initialize voice recognition:', error);
        voiceBtn.disabled = true;
        voiceBtn.title = 'Voice recognition failed to initialize';
        updateVoiceStatus('Voice recognition unavailable', 'red');
        showToast('Failed to initialize voice recognition', 'error');
        return false;
    }
}

function toggleVoiceSearch() {
    if (isListening) {
        stopVoiceSearch();
    } else {
        startVoiceSearch();
    }
}

function startVoiceSearch() {
    // Stop any existing recognition first
    if (recognition && isListening) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping previous recognition:', error);
        }
    }
    
    if (!recognition) {
        if (!initVoiceRecognition()) {
            return;
        }
    }
    
    try {
        // Reset transcripts
        voiceTranscript = '';
        finalTranscript = '';
        voiceTranscriptEl.innerHTML = '<p class="text-gray-300">Speak your message...</p>';
        
        // Update recognition settings
        recognition.lang = voiceSettings.language;
        
        // Start recognition
        recognition.start();
        updateVoiceStatus('Starting voice recognition...', 'purple');
        
    } catch (error) {
        console.error('Failed to start voice recognition:', error);
        
        // If error is "already started", stop and restart
        if (error.toString().includes('already started')) {
            try {
                recognition.stop();
                setTimeout(() => {
                    recognition.start();
                }, 100);
            } catch (restartError) {
                console.error('Failed to restart recognition:', restartError);
                showToast('Failed to start voice recognition', 'error');
                updateVoiceStatus('Failed to start', 'red');
            }
        } else {
            showToast('Failed to start voice recognition', 'error');
            updateVoiceStatus('Failed to start', 'red');
        }
    }
}

function stopVoiceSearch() {
    console.log('Stopping voice search');
    
    isListening = false;
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
    
    // Reset UI
    voiceBtn.classList.remove('listening-btn');
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceBtn.title = 'Voice Search';
    
    // Hide visualizer
    voiceVisualizer.classList.add('hidden');
    voiceVisualizer.classList.remove('flex');
    voiceWave.classList.remove('listening');
    
    updateVoiceStatus('Voice search ready', 'purple');
}

function sendVoiceMessage() {
    const messageText = voiceTranscript.trim();
    if (messageText && messageText !== 'Speak your message...') {
        document.getElementById('message').value = messageText;
        stopVoiceSearch();
        
        // Auto-send after a short delay
        setTimeout(() => {
            sendMessage();
        }, 300);
    } else {
        showToast('No speech detected. Please try again.', 'error');
    }
}

function updateVoiceStatus(text, color = 'purple') {
    voiceStatus.classList.remove('hidden');
    voiceStatusText.textContent = text;
    
    // Map color names to Tailwind classes
    const colorClasses = {
        'green': 'text-green-400',
        'red': 'text-red-400',
        'purple': 'text-purple-400',
        'yellow': 'text-yellow-400',
        'blue': 'text-blue-400'
    };
    
    voiceStatusText.className = colorClasses[color] || 'text-purple-400';
    
    // Auto-hide after 5 seconds if not listening
    if (!isListening && !text.includes('Listening')) {
        setTimeout(() => {
            if (!isListening) {
                voiceStatus.classList.add('hidden');
            }
        }, 5000);
    }
}

// ============================
// UTILITY FUNCTIONS
// ============================
function showToast(message, type = 'info') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === 'success' ? 'bg-green-900 border-l-4 border-green-500' :
        type === 'error' ? 'bg-red-900 border-l-4 border-red-500' :
        'bg-gray-800 border-l-4 border-blue-500'
    }`;

    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-slide-down');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================
// SIDEBAR FUNCTIONS
// ============================
function initSidebar() {
    if (sidebarExpanded) {
        expandSidebar();
    } else {
        collapseSidebar();
    }
}

function toggleSidebar() {
    if (sidebarExpanded) {
        collapseSidebar();
    } else {
        expandSidebar();
    }
    localStorage.setItem('sidebarExpanded', sidebarExpanded);
}

function expandSidebar() {
    sidebar.classList.remove('collapsed');
    sidebarExpanded = true;
}

function collapseSidebar() {
    sidebar.classList.add('collapsed');
    sidebarExpanded = false;
}

// ============================
// INPUT FUNCTIONS
// ============================
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

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

// ============================
// COPY & EDIT FUNCTIONS
// ============================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard', 'success'))
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy', 'error');
        });
}

function editMessage(messageId, currentText, isUser = true) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;

    const contentDiv = messageDiv.querySelector('.message-content');
    const actionsDiv = messageDiv.querySelector('.message-actions');
    const originalContent = contentDiv.textContent;

    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea w-full p-3 text-white';
    textarea.value = originalContent;
    textarea.rows = Math.min(Math.ceil(originalContent.length / 50), 10);

    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'flex gap-2 mt-2';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (newText && newText !== originalContent) {
            try {
                const response = await fetch(`${API_BASE}/message/${messageId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: newText })
                });

                if (response.ok) {
                    contentDiv.textContent = newText;
                    showToast('Message updated', 'success');
                }
            } catch (error) {
                console.error('Failed to update message:', error);
                showToast('Failed to update message', 'error');
            }
        }

        messageDiv.removeChild(textarea);
        messageDiv.removeChild(buttonDiv);
        contentDiv.classList.remove('hidden');
        if (actionsDiv) actionsDiv.classList.remove('hidden');
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'px-3 py-1 border border-gray-600 hover:bg-gray-700 rounded';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        messageDiv.removeChild(textarea);
        messageDiv.removeChild(buttonDiv);
        contentDiv.classList.remove('hidden');
        if (actionsDiv) actionsDiv.classList.remove('hidden');
    };

    buttonDiv.appendChild(saveBtn);
    buttonDiv.appendChild(cancelBtn);

    contentDiv.classList.add('hidden');
    if (actionsDiv) actionsDiv.classList.add('hidden');

    messageDiv.appendChild(textarea);
    messageDiv.appendChild(buttonDiv);
    textarea.focus();
}

// ============================
// MESSAGE CREATION FUNCTIONS
// ============================
function createMessageElement(role, text, messageId = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-container mb-6 animate-fade-in ${role === 'user' ? 'text-right' : 'text-left'}`;
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    } else {
        // Generate a unique ID for new messages
        messageDiv.dataset.messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    const innerDiv = document.createElement('div');
    innerDiv.className = `inline-block max-w-[85%] ${role === 'user' ? 'text-left' : ''}`;

    const bubble = document.createElement('div');
    bubble.className = `p-4 rounded-2xl ${role === 'user' ? 'user-message' : isError ? 'error-message assistant-message' : 'assistant-message'}`;

    const content = document.createElement('div');
    content.className = 'message-content whitespace-pre-wrap';
    content.textContent = text;

    const actions = document.createElement('div');
    actions.className = 'message-actions flex gap-1 mt-2';

    if (role === 'assistant') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy';
        copyBtn.onclick = () => copyToClipboard(text);
        actions.appendChild(copyBtn);
    } else if (role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit';
        editBtn.onclick = () => editMessage(messageDiv.dataset.messageId, text, true);
        actions.appendChild(editBtn);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy';
        copyBtn.onclick = () => copyToClipboard(text);
        actions.appendChild(copyBtn);
    }

    bubble.appendChild(content);
    bubble.appendChild(actions);
    innerDiv.appendChild(bubble);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-xs text-gray-500 mt-1 px-1';
    timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    innerDiv.appendChild(timeDiv);
    messageDiv.appendChild(innerDiv);

    return messageDiv;
}

function addMessage(role, text, messageType = 'normal') {
    // Remove welcome message if it exists
    const welcomeDiv = chatBox.querySelector('.text-center');
    if (welcomeDiv) {
        chatBox.removeChild(welcomeDiv.parentElement);
    }

    const messageContainer = document.createElement('div');
    messageContainer.className = 'max-w-3xl mx-auto';
    
    const messageEl = createMessageElement(role, text, null, messageType === 'error');
    messageContainer.appendChild(messageEl);
    chatBox.appendChild(messageContainer);
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ============================
// DELETE FUNCTIONS
// ============================
function showDeleteModal(sessionId, sessionTitle, mode = 'session') {
    sessionToDelete = sessionId;
    deleteMode = mode;

    if (mode === 'session') {
        deleteModalText.textContent = `Are you sure you want to delete "${sessionTitle || 'this chat'}"? This action cannot be undone.`;
    }

    deleteModal.classList.remove('hidden');
    deleteModal.classList.add('flex');
    deleteModal.classList.add('animate-fade-in');
}

function hideDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
    sessionToDelete = null;
}

async function confirmDelete() {
    if (!sessionToDelete) return;

    try {
        if (deleteMode === 'session') {
            const response = await fetch(`${API_BASE}/session/${sessionToDelete}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                if (sessionId === sessionToDelete) {
                    newChat();
                }

                await loadSessions();
                showToast('Chat deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete chat');
            }
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete chat', 'error');
    }

    hideDeleteModal();
}

function clearCurrentChat() {
    if (sessionId) {
        const currentSessionTitle = document.querySelector('.session-item.active .session-title')?.textContent || 'Current chat';
        showDeleteModal(sessionId, currentSessionTitle, 'session');
    }
}

// ============================
// API STATUS FUNCTIONS
// ============================
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.innerHTML = `
            <div class="w-2 h-2 rounded-full bg-green-500"></div>
            <span class="text-green-400">Connected</span>
        `;
    } else {
        statusEl.innerHTML = `
            <div class="w-2 h-2 rounded-full bg-red-500"></div>
            <span class="text-red-400">Disconnected</span>
        `;
    }
}

async function testConnection() {
    try {
        const response = await fetch('https://chatbot-full-stack.onrender.com/health');
        if (response.ok) {
            updateConnectionStatus(true);
            await checkApiStatus();
            return true;
        }
    } catch (error) {
        updateConnectionStatus(false);
        return false;
    }
}

async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        if (response.ok) {
            const data = await response.json();

            const apiStatusEl = document.getElementById('apiStatus');
            const welcomeMsg = document.getElementById('welcomeMessage');

            if (data.availableKeys > 0) {
                apiStatusEl.textContent = `${data.availableKeys} API keys active`;
                apiStatusEl.className = 'text-xs text-green-400';
                apiStatus = 'working';
                welcomeMsg.textContent = `Using ${data.availableKeys} active Buddy API keys`;
            } else if (data.quotaExceededKeys > 0) {
                apiStatusEl.textContent = 'All keys quota exceeded';
                apiStatusEl.className = 'text-xs text-red-400';
                apiStatus = 'quota_exceeded';
                welcomeMsg.textContent = 'All API keys have exceeded quota';
            } else {
                apiStatusEl.textContent = 'No keys available';
                apiStatusEl.className = 'text-xs text-red-400';
                apiStatus = 'error';
                welcomeMsg.textContent = 'No API keys available';
            }

            return data;
        }
    } catch (error) {
        console.error('Failed to check API status:', error);
    }
}

async function updateApiStatusDetails() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        if (response.ok) {
            const data = await response.json();
            const statusEl = document.getElementById('apiStatusDetails');

            statusEl.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Available Keys:</span>
                        <span class="${data.availableKeys > 0 ? 'text-green-400' : 'text-red-400'}">
                            ${data.availableKeys}/${data.totalKeys}
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span>Success Rate:</span>
                        <span class="${data.successRate > 80 ? 'text-green-400' : data.successRate > 50 ? 'text-yellow-400' : 'text-red-400'}">
                            ${data.successRate}%
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span>Total Requests:</span>
                        <span>${data.totalRequests}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Current Max Tokens:</span>
                        <span>${data.configuration?.maxResponseTokens || 2000}</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load API status:', error);
    }
}

// ============================
// CHAT FUNCTIONS
// ============================
function generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

async function loadSessions() {
    try {
        const response = await fetch(API_BASE + '/sessions');
        if (!response.ok) throw new Error('Failed to load sessions');

        const sessions = await response.json();
        const container = document.getElementById('sessions');

        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="text-gray-500 text-sm p-4 text-center">
                    No chats yet
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        sessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = `session-item group p-3 mb-1 rounded-lg cursor-pointer transition ${
                session._id === sessionId ? 'bg-gray-800 active' : 'hover:bg-gray-800'
            }`;

            sessionDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="session-title text-sm truncate">${session.lastMessage || 'New Chat'}</div>
                        <div class="text-xs text-gray-500 mt-1">
                            ${new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); showDeleteModal('${session._id}', '${session.lastMessage || 'Chat'}')" 
                        class="delete-btn p-1 text-gray-500 hover:text-red-400">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `;

            sessionDiv.onclick = () => loadHistory(session._id);
            container.appendChild(sessionDiv);
        });

    } catch (error) {
        console.error('Error loading sessions:', error);
        const container = document.getElementById('sessions');
        container.innerHTML = `
            <div class="text-red-400 text-sm p-4 text-center">
                Failed to load chats
            </div>
        `;
    }
}

async function loadHistory(sessionIdToLoad) {
    sessionId = sessionIdToLoad;
    localStorage.setItem('sessionId', sessionId);

    chatBox.innerHTML = '<div class="text-center text-gray-400 py-10">Loading chat...</div>';

    try {
        const response = await fetch(`${API_BASE}/history/${sessionId}`);
        if (!response.ok) throw new Error('Failed to load history');

        const history = await response.json();
        chatBox.innerHTML = '';

        if (history.length === 0) {
            addMessage('assistant', 'This chat is empty. Start a new conversation!');
        } else {
            history.forEach(msg => {
                const isError = msg.content.includes('⚠️') ||
                    msg.content.includes('quota') ||
                    msg.content.includes('unavailable');
                addMessage(msg.role, msg.content, isError ? 'error' : 'normal');
            });
        }

        await loadSessions();

    } catch (error) {
        console.error('Error loading history:', error);
        chatBox.innerHTML = '';
        addMessage('assistant', '⚠️ Could not load chat history.', 'error');
    }
}

function newChat() {
    sessionId = generateSessionId();
    localStorage.setItem('sessionId', sessionId);

    chatBox.innerHTML = `
        <div class="max-w-3xl mx-auto">
            <div class="text-center text-gray-400 py-10">
                <div class="text-4xl mb-4">🤖</div>
                <h2 class="text-2xl font-semibold mb-2">How can I help you today?</h2>
                <p class="text-gray-500" id="welcomeMessage">Multiple Buddy API keys active</p>
            </div>
        </div>
    `;

    if (apiStatus === 'working') {
        addMessage('assistant', 'Hello! I\'m using multiple Buddy API keys for reliability. How can I help you today?');
    } else if (apiStatus === 'quota_exceeded') {
        addMessage('assistant', '⚠️ All Buddy API keys have exceeded their quota. Please try again later or add more API keys.', 'error');
    } else {
        addMessage('assistant', '⚠️ Buddy API is currently unavailable. Please try again later.', 'error');
    }

    loadSessions();

    if (!sidebarExpanded) {
        expandSidebar();
        localStorage.setItem('sidebarExpanded', true);
    }
}

async function sendMessage() {
    if (isSending) return;

    const input = document.getElementById('message');
    const sendBtn = document.getElementById('sendBtn');
    const text = input.value.trim();

    if (!text) return;

    isSending = true;
    input.disabled = true;
    sendBtn.disabled = true;

    // Add user message
    addMessage('user', text);
    
    input.value = '';
    input.style.height = 'auto';

    try {
        if (!sessionId) {
            sessionId = generateSessionId();
            localStorage.setItem('sessionId', sessionId);
        }

        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                sessionId: sessionId,
                maxTokens: settings.maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const messageType = data.source === 'Buddy' ? 'normal' : 'error';

        // Add assistant response
        addMessage('assistant', data.reply, messageType);

        if (data.sessionId) {
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
        }

        await loadSessions();

    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('assistant', '⚠️ Error connecting to server.', 'error');
        await testConnection();

    } finally {
        isSending = false;
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

// ============================
// INITIALIZATION
// ============================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Buddy Chat with Voice Search Initializing...');

    // Initialize sidebar
    initSidebar();
    
    // Set up sidebar toggle
    document.getElementById('sidebarToggle').onclick = toggleSidebar;

    // Initialize response length info
    updateResponseLengthInfo(settings.maxTokens);

    // Initialize voice recognition
    initVoiceRecognition();

    // Test connection
    const connected = await testConnection();

    if (connected) {
        await loadSessions();

        if (sessionId) {
            await loadHistory(sessionId);
        } else {
            newChat();
        }
    } else {
        chatBox.innerHTML = '';
        addMessage('assistant', '⚠️ Cannot connect to server. Make sure backend is running on https://chatbot-full-stack.onrender.com', 'error');
    }

    // Focus input
    document.getElementById('message').focus();

    // Check API status periodically
    setInterval(async () => {
        if (!isSending) {
            await checkApiStatus();
        }
    }, 30000);

    // Close modals on outside click
    [deleteModal, settingsModal, voiceVisualizer].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal === deleteModal) hideDeleteModal();
                if (modal === settingsModal) hideSettings();
                if (modal === voiceVisualizer) stopVoiceSearch();
            }
        });
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!deleteModal.classList.contains('hidden')) hideDeleteModal();
            if (!settingsModal.classList.contains('hidden')) hideSettings();
            if (!voiceVisualizer.classList.contains('hidden')) stopVoiceSearch();
        }
    });

    // Auto-stop voice search when sending message
    const originalSendMessage = sendMessage;
    sendMessage = function() {
        if (isListening) {
            stopVoiceSearch();
        }
        return originalSendMessage.apply(this, arguments);
    };
});