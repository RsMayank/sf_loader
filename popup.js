// popup.js - Simple popup that shows status and opens full inspector

document.addEventListener('DOMContentLoaded', async () => {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const openInspectorBtn = document.getElementById('open-inspector');

    // Check if session is detected
    const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
    const twoHours = 2 * 60 * 60 * 1000;
    const isRecentSession = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

    if (data.sessionId && data.instanceUrl && isRecentSession) {
        // Session detected
        statusDot.classList.add('connected');
        statusText.textContent = 'Session Detected';
    } else {
        // No session
        statusDot.classList.remove('connected');
        statusText.textContent = 'No Session';
    }

    // Open full inspector in new tab
    openInspectorBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('inspector.html')
        });
    });
});
