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