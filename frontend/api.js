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
        const response = await fetch('http://localhost:5000/health');
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
                welcomeMsg.textContent = `Using ${data.availableKeys} active Gemini API keys`;
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