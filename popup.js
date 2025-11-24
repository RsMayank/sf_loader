// popup.js - Opens the full inspector interface

document.addEventListener('DOMContentLoaded', () => {
    const openInspectorBtn = document.getElementById('open-inspector');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    // Check connection status
    (async function checkStatus() {
        const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'accessToken', 'sessionDetectedAt']);

        const twoHours = 2 * 60 * 60 * 1000;
        const isRecentSession = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

        if ((data.sessionId && data.instanceUrl && isRecentSession) || (data.accessToken && data.instanceUrl)) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Not Connected';
        }
    })();

    // Open inspector in new tab
    openInspectorBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('inspector.html')
        });
    });
});
