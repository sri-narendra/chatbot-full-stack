// ============================
// MESSAGE CREATION FUNCTIONS
// ============================

// Toast notification function
function showToast(msg, type = 'info', duration = 4000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Create toast element if it doesn't exist
        const toastDiv = document.createElement('div');
        toastDiv.id = 'toast';
        toastDiv.className = 'toast';
        document.body.appendChild(toastDiv);
        return showToast(msg, type, duration);
    }

    toast.textContent = msg;
    toast.classList.remove('fade-out');
    toast.classList.add('show');

    // Style based on type
    if (type === 'success') {
        toast.style.background = '#10b981';
    } else if (type === 'error') {
        toast.style.background = '#ef4444';
    } else {
        toast.style.background = '#3b82f6';
    }

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.classList.remove('fade-out');
        }, 500); // Wait for fade-out animation to complete
    }, duration);
}

// Enhanced copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard!', 'success', 4000))
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy', 'error', 4000);
        });
}

// Edit message function - FIXED VERSION
function editMessage(messageId, currentText, isUser = true) {
    console.log('Edit clicked for message ID:', messageId);
    
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) {
        console.error('Message div not found');
        showToast('Message not found', 'error');
        return;
    }

    // Find the message bubble (user-message or assistant-message)
    const messageBubble = messageDiv.querySelector('.user-message, .assistant-message');
    if (!messageBubble) {
        console.error('Message bubble not found');
        return;
    }

    const originalContent = messageBubble.querySelector('.message-content').textContent;
    const originalHTML = messageBubble.innerHTML;

    // Create edit interface
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-mode';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = originalContent;
    textarea.rows = Math.min(Math.ceil(originalContent.length / 50), 10);

    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'edit-btns';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        console.log('Cancelling edit');
        // Restore original message
        messageBubble.innerHTML = originalHTML;
        showToast('Edit cancelled', 'info');
    };

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        console.log('Saving edit:', newText);
        
        if (!newText) {
            showToast('Message cannot be empty', 'error');
            return;
        }
        
        if (newText === originalContent) {
            showToast('No changes made', 'info');
            cancelBtn.click();
            return;
        }

        try {
            // For now, just update locally. Add API call later if needed:
            // const response = await fetch(`${API_BASE}/message/${messageId}`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ content: newText })
            // });
            
            // Create new message content
            const newContent = document.createElement('div');
            newContent.className = 'message-content whitespace-pre-wrap';
            newContent.textContent = newText;
            
            // Create new actions
            const newActions = document.createElement('div');
            newActions.className = 'message-actions';
            
            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'Copy';
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                copyToClipboard(newText);
            };
            newActions.appendChild(copyBtn);
            
            // Edit button (only for user messages)
            if (isUser) {
                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn edit-btn';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = 'Edit';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    editMessage(messageId, newText, true);
                };
                newActions.appendChild(editBtn);
            }
            
            // Replace bubble content
            messageBubble.innerHTML = '';
            messageBubble.appendChild(newContent);
            messageBubble.appendChild(newActions);
            
            showToast('Message updated successfully', 'success', 4000);
            
        } catch (error) {
            console.error('Failed to update message:', error);
            showToast('Failed to update message', 'error', 4000);
            // Restore original on error
            cancelBtn.click();
        }
    };

    buttonDiv.appendChild(cancelBtn);
    buttonDiv.appendChild(saveBtn);
    
    editContainer.appendChild(textarea);
    editContainer.appendChild(buttonDiv);
    
    // Replace the entire message bubble with edit interface
    messageBubble.innerHTML = '';
    messageBubble.appendChild(editContainer);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// Create message element with enhanced copy/edit buttons
function createMessageElement(role, text, messageId = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-container mb-6 animate-fade-in ${role === 'user' ? 'text-right' : 'text-left'}`;

    // Generate message ID if not provided
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    } else {
        messageDiv.dataset.messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    const innerDiv = document.createElement('div');
    innerDiv.className = `inline-block max-w-[85%] ${role === 'user' ? 'text-left' : ''}`;

    const bubble = document.createElement('div');
    bubble.className = `p-4 rounded-2xl relative ${role === 'user' ? 'user-message' : isError ? 'error-message assistant-message' : 'assistant-message'}`;

    const content = document.createElement('div');
    content.className = 'message-content whitespace-pre-wrap';
    content.textContent = text;

    // Create actions container
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    // Copy button (for both user and assistant)
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.title = 'Copy';
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        copyToClipboard(text);
    };
    actions.appendChild(copyBtn);

    // Edit button (only for user messages)
    if (role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editMessage(messageDiv.dataset.messageId, text, true);
        };
        actions.appendChild(editBtn);
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

// Add message to chat
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

// Override the original copyToClipboard function from utils.js
if (typeof copyToClipboard !== 'function') {
    window.copyToClipboard = copyToClipboard;
}

// Override the original editMessage function
if (typeof editMessage !== 'function') {
    window.editMessage = editMessage;
}

// Export for debugging
console.log('Messages.js loaded - editMessage function available:', typeof editMessage);