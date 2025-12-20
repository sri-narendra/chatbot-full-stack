// ============================
// INITIALIZATION
// ============================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Gemini Chat with Voice Search Initializing...');

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

// In your existing init.js, add this at the beginning of the DOMContentLoaded event:
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Gemini Chat with Voice Search Initializing...');

    // Initialize dynamic styles
    if (typeof initDynamicStyles === 'function') {
        initDynamicStyles();
    }

    // Rest of your existing initialization code...
    // [Your existing code continues here]
});