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