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