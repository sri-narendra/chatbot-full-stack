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