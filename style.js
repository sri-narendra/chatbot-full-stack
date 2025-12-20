// ============================
// STYLE AND ANIMATION FUNCTIONS
// ============================

// Initialize dynamic styling
function initDynamicStyles() {
    console.log('🎨 Initializing dynamic styles...');
    
    // Create particles background
    createParticles();
    
    // Add dynamic gradient effects
    initGradientEffects();
    
    // Setup scroll animations
    setupScrollAnimations();
    
    // Initialize message animations
    setupMessageAnimations();
    
    // Add keyboard shortcuts display
    setupKeyboardShortcuts();
    
    // Setup connection status properly
    setupConnectionStatus();
    
    // Update connection status styling
    updateConnectionStatusStyle();
}

// Create floating particles background
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    particlesContainer.innerHTML = '';
    
    // Create 50 particles
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random properties
        const size = Math.random() * 2 + 1;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 15 + Math.random() * 10;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
            border-radius: 50%;
            left: ${posX}%;
            top: ${posY}%;
            opacity: ${Math.random() * 0.5 + 0.2};
            animation: float ${duration}s ease-in-out ${delay}s infinite;
            pointer-events: none;
            z-index: 0;
        `;
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize gradient animation effects
function initGradientEffects() {
    // Add gradient animation to buttons on hover
    document.querySelectorAll('button').forEach(button => {
        if (button.classList.contains('bg-gradient-to-r')) {
            button.addEventListener('mouseenter', () => {
                button.style.backgroundSize = '200% 200%';
                button.style.animation = 'gradient 3s ease infinite';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.animation = '';
            });
        }
    });
}

// Setup smooth scroll animations
function setupScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // Observe all message containers
    document.querySelectorAll('.message-container').forEach(el => {
        observer.observe(el);
    });
}

// Enhanced message animations
function setupMessageAnimations() {
    // Add typing indicator effect
    window.showTypingIndicator = function() {
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typingIndicator';
        typingIndicator.className = 'typing-indicator p-4 rounded-2xl bg-gray-800/50 max-w-md mx-auto mb-4 animate-fade-in';
        typingIndicator.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                </div>
                <span class="text-gray-400 text-sm">Gemini is thinking...</span>
            </div>
        `;
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;
    };
    
    window.hideTypingIndicator = function() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('animate-slide-down');
            setTimeout(() => indicator.remove(), 300);
        }
    };
}

// Enhanced connection status styling
function updateConnectionStatusStyle() {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    
    const updateStyle = (connected) => {
        const dot = statusEl.querySelector('div');
        const text = statusEl.querySelector('span');
        
        if (connected) {
            dot.className = 'w-2 h-2 rounded-full bg-green-500 status-dot';
            dot.style.animation = 'status-pulse 2s infinite';
            if (text) text.textContent = 'Connected';
            statusEl.className = 'flex items-center gap-1.5 bg-green-900/20 px-2 py-1 rounded-full text-xs connection-badge border border-green-500/30';
            statusEl.title = 'API Connected';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-red-500 status-dot';
            dot.style.animation = 'pulse 1s infinite';
            if (text) text.textContent = 'Disconnected';
            statusEl.className = 'flex items-center gap-1.5 bg-red-900/20 px-2 py-1 rounded-full text-xs connection-badge border border-red-500/30';
            statusEl.title = 'API Disconnected';
        }
    };
    
    // Initial style update
    updateStyle(false);
    
    // Monitor connection status
    setInterval(async () => {
        const connected = await testConnection();
        updateStyle(connected);
    }, 30000);
}

// Setup connection status responsiveness
function setupConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    
    // Create a more compact status for mobile
    const updateForScreenSize = () => {
        if (window.innerWidth < 640) {
            // Mobile: Show only icon
            const textSpan = statusEl.querySelector('span');
            if (textSpan) textSpan.classList.add('hidden');
            statusEl.style.padding = '0.375rem';
            statusEl.style.minWidth = '2rem';
            statusEl.style.justifyContent = 'center';
        } else {
            // Desktop: Show full text
            const textSpan = statusEl.querySelector('span');
            if (textSpan) textSpan.classList.remove('hidden');
            statusEl.style.padding = '';
            statusEl.style.minWidth = '';
            statusEl.style.justifyContent = '';
        }
    };
    
    // Update on resize
    window.addEventListener('resize', updateForScreenSize);
    updateForScreenSize();
}

// Keyboard shortcuts display
function setupKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Ctrl/Cmd + K', action: 'Focus input' },
        { key: 'Esc', action: 'Close modals' },
        { key: 'Ctrl/Cmd + Enter', action: 'Send message' },
        { key: 'Ctrl/Cmd + N', action: 'New chat' },
        { key: 'Ctrl/Cmd + ,', action: 'Open settings' }
    ];
    
    // Add keyboard event listeners
    document.addEventListener('keydown', (e) => {
        // Focus input on Ctrl/Cmd + K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('message').focus();
            showToast('Input focused', 'info');
        }
        
        // New chat on Ctrl/Cmd + N
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            newChat();
        }
        
        // Settings on Ctrl/Cmd + ,
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            showSettings();
        }
        
        // Send on Ctrl/Cmd + Enter
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Enhanced message creation with animations
function createEnhancedMessageElement(role, text, messageId = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-container mb-6 animate-fade-in ${role === 'user' ? 'text-right' : 'text-left'}`;
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    } else {
        messageDiv.dataset.messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    const innerDiv = document.createElement('div');
    innerDiv.className = `inline-block max-w-[85%] ${role === 'user' ? 'text-left' : ''}`;

    // Add avatar for assistant
    if (role === 'assistant' && !isError) {
        const avatar = document.createElement('div');
        avatar.className = 'w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center absolute -left-10 top-2 shadow-lg';
        avatar.innerHTML = '<i class="fas fa-robot text-xs"></i>';
        innerDiv.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = `p-5 rounded-2xl backdrop-blur-sm ${role === 'user' 
        ? 'user-message shadow-lg' 
        : isError 
            ? 'error-message assistant-message shadow-lg' 
            : 'assistant-message shadow-lg'
    }`;

    const content = document.createElement('div');
    content.className = 'message-content whitespace-pre-wrap';
    
    // Add typing animation for new messages
    if (!messageId) {
        content.className += ' typing-animation';
        content.style.opacity = '0';
        content.style.transform = 'translateY(10px)';
        
        // Animate content appearance
        setTimeout(() => {
            content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 100);
    }
    
    content.textContent = text;

    const actions = document.createElement('div');
    actions.className = 'message-actions flex gap-1 mt-3';

    if (role === 'assistant') {
        const copyBtn = createActionButton('fa-copy', 'Copy', () => copyToClipboard(text));
        actions.appendChild(copyBtn);
        
        // Add regenerate button for AI messages
        const regenerateBtn = createActionButton('fa-redo', 'Regenerate', () => regenerateMessage(messageDiv.dataset.messageId));
        actions.appendChild(regenerateBtn);
    } else if (role === 'user') {
        const editBtn = createActionButton('fa-edit', 'Edit', () => editMessage(messageDiv.dataset.messageId, text, true));
        actions.appendChild(editBtn);

        const copyBtn = createActionButton('fa-copy', 'Copy', () => copyToClipboard(text));
        actions.appendChild(copyBtn);
    }

    bubble.appendChild(content);
    bubble.appendChild(actions);
    innerDiv.appendChild(bubble);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-xs text-gray-500 mt-2 px-2';
    timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    innerDiv.appendChild(timeDiv);
    messageDiv.appendChild(innerDiv);

    return messageDiv;
}

function createActionButton(icon, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'action-btn p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 transform hover:scale-105';
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
    btn.title = title;
    btn.onclick = onClick;
    return btn;
}

// Regenerate message function
async function regenerateMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const originalContent = messageDiv.querySelector('.message-content').textContent;
    
    // Show loading state
    const regenerateBtn = messageDiv.querySelector('.fa-redo').parentElement;
    const originalHTML = regenerateBtn.innerHTML;
    regenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    regenerateBtn.disabled = true;
    
    try {
        // Call API to regenerate
        const response = await fetch(`${API_BASE}/regenerate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messageId: messageId,
                sessionId: sessionId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            messageDiv.querySelector('.message-content').textContent = data.reply;
            showToast('Message regenerated', 'success');
        }
    } catch (error) {
        console.error('Failed to regenerate message:', error);
        showToast('Failed to regenerate message', 'error');
    } finally {
        regenerateBtn.innerHTML = originalHTML;
        regenerateBtn.disabled = false;
    }
}

// Enhanced toast notifications
function showEnhancedToast(message, type = 'info') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        toast.classList.add('animate-slide-down');
        setTimeout(() => toast.remove(), 300);
    });

    const toast = document.createElement('div');
    toast.className = `toast fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl z-50 animate-slide-up backdrop-blur-xl border ${
        type === 'success' ? 'bg-green-900/80 border-green-500/30' :
        type === 'error' ? 'bg-red-900/80 border-red-500/30' :
        'bg-gray-900/80 border-blue-500/30'
    }`;

    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center ${
                type === 'success' ? 'bg-green-800/50' :
                type === 'error' ? 'bg-red-800/50' :
                'bg-blue-800/50'
            }">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    'fa-info-circle'
                } ${type === 'success' ? 'text-green-400' :
                  type === 'error' ? 'text-red-400' :
                  'text-blue-400'}"></i>
            </div>
            <div>
                <div class="font-medium">${message}</div>
                <div class="text-xs text-gray-400 mt-0.5">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-white">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('animate-slide-down');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
    
    // Override original showToast
    window.showToast = showEnhancedToast;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initDynamicStyles();
        showEnhancedToast('Welcome to Gemini AI Chat!', 'info');
    }, 1000);
});