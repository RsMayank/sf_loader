// popup.js - Simplified with manual token input

document.addEventListener('DOMContentLoaded', () => {
    const soqlEl = document.getElementById('soql');
    const runBtn = document.getElementById('run-soql');
    const exportBtn = document.getElementById('export-csv');
    const resultsEl = document.getElementById('results');
    const generateTokenBtn = document.getElementById('generate-token-btn');
    const saveTokenBtn = document.getElementById('save-token-btn');
    const tokenSection = document.getElementById('token-section');
    const instanceUrlInput = document.getElementById('instance-url');
    const accessTokenInput = document.getElementById('access-token');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const showInstructions = document.getElementById('show-instructions');

    let currentToken = null;
    let currentInstance = null;

    // Load saved token on startup
    (async function init() {
        // First, try to get auto-detected session from content script
        const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'accessToken', 'sessionDetectedAt']);

        // Prefer auto-detected session (from content script) if recent (within 2 hours)
        const twoHours = 2 * 60 * 60 * 1000;
        const isRecentSession = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

        if (data.sessionId && data.instanceUrl && isRecentSession) {
            currentToken = data.sessionId;
            currentInstance = data.instanceUrl;
            updateStatus(true, 'Auto-detected');
            generateTokenBtn.style.display = 'none'; // Hide the button when auto-detected
            resultsEl.innerHTML = '<div class="muted">✓ Session auto-detected from Salesforce page. Ready to run SOQL queries.</div>';
        } else if (data.accessToken && data.instanceUrl) {
            // Fallback to manually entered token
            currentToken = data.accessToken;
            currentInstance = data.instanceUrl;
            updateStatus(true, 'Manual Token');
            resultsEl.innerHTML = '<div class="muted">✓ Connected with saved token. Ready to run SOQL queries.</div>';
        } else {
            updateStatus(false);
            resultsEl.innerHTML = '<div class="muted">Please navigate to a Salesforce page, or click "Generate Token" to enter manually.</div>';
        }

        // Periodically check for auto-detected session (every 2 seconds)
        setInterval(async () => {
            const newData = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
            const newIsRecent = newData.sessionDetectedAt && (Date.now() - newData.sessionDetectedAt) < twoHours;

            // If we just got a new auto-detected session and we're not already connected
            if (newData.sessionId && newData.instanceUrl && newIsRecent && !currentToken) {
                currentToken = newData.sessionId;
                currentInstance = newData.instanceUrl;
                updateStatus(true, 'Auto-detected');
                generateTokenBtn.style.display = 'none';
                tokenSection.style.display = 'none';
                resultsEl.innerHTML = '<div class="muted">✓ Session auto-detected! Ready to run SOQL queries.</div>';
            }
        }, 2000);
    })();

    // Update connection status
    function updateStatus(connected, method = '') {
        if (connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = method ? `Connected (${method})` : 'Connected';
            generateTokenBtn.textContent = 'Disconnect';
        } else {
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = 'Not Connected';
            generateTokenBtn.textContent = 'Generate Token';
        }
    }

    // Generate Token button click
    generateTokenBtn.addEventListener('click', async () => {
        if (currentToken) {
            // Disconnect
            if (confirm('Are you sure you want to disconnect?')) {
                await chrome.storage.local.remove(['accessToken', 'instanceUrl', 'sessionId', 'sessionDetectedAt']);
                currentToken = null;
                currentInstance = null;
                updateStatus(false);
                tokenSection.style.display = 'none';
                resultsEl.innerHTML = '<div class="muted">Disconnected. Navigate to a Salesforce page or click "Generate Token" to reconnect.</div>';
            }
        } else {
            // Show token input section
            tokenSection.style.display = 'block';

            // Try to auto-detect instance URL from current tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && tabs[0].url) {
                const url = tabs[0].url;
                if (url.includes('salesforce.com') || url.includes('force.com')) {
                    const origin = new URL(url).origin;
                    instanceUrlInput.value = origin;
                }
            }
        }
    });

    // Save Token button click
    saveTokenBtn.addEventListener('click', async () => {
        const token = accessTokenInput.value.trim();
        const instance = instanceUrlInput.value.trim();

        if (!token || !instance) {
            alert('Please enter both Instance URL and Access Token');
            return;
        }

        // Validate instance URL
        try {
            new URL(instance);
        } catch (e) {
            alert('Invalid Instance URL format');
            return;
        }

        // Save to storage
        await chrome.storage.local.set({ accessToken: token, instanceUrl: instance });
        currentToken = token;
        currentInstance = instance;

        updateStatus(true);
        tokenSection.style.display = 'none';
        accessTokenInput.value = '';
        resultsEl.innerHTML = '<div class="muted">✓ Token saved successfully! Ready to run SOQL queries.</div>';
    });

    // Show instructions
    showInstructions.addEventListener('click', (e) => {
        e.preventDefault();
        const instructions = `
HOW TO GET AN ACCESS TOKEN:

Method 1: Using Workbench (Easiest)
1. Go to https://workbench.developerforce.com/
2. Login with your Salesforce credentials
3. After login, look at the URL - it will contain your access token
4. Or go to Info → Session Information to see your Session ID
5. Copy the Session ID and paste it as the Access Token

Method 2: Using Developer Console
1. Open Salesforce and press F12 (Developer Console)
2. Go to Console tab and run:
   console.log(window.$Api.getClient().getSessionId());
3. Copy the session ID that appears

Method 3: Using Setup (for permanent token)
1. Go to Setup → Apps → App Manager
2. Create a Connected App with OAuth enabled
3. Use OAuth flow to get an access token

Your Instance URL is usually:
https://yourcompany.salesforce.com
or
https://yourcompany.my.salesforce.com
        `;
        alert(instructions);
    });

    // Run SOQL query
    runBtn.addEventListener('click', async () => {
        if (!currentToken || !currentInstance) {
            resultsEl.innerHTML = '<div class="error">Please generate and save an access token first.</div>';
            return;
        }

        const query = soqlEl.value.trim();
        if (!query) {
            resultsEl.innerHTML = '<div class="error">Please enter a SOQL query</div>';
            return;
        }

        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        resultsEl.innerHTML = '<div class="muted">Executing SOQL query…</div>';

        try {
            const url = `${currentInstance}/services/data/v62.0/query?q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });

            runBtn.disabled = false;
            runBtn.textContent = 'Run';

            if (!response.ok) {
                const error = await response.text();
                resultsEl.innerHTML = `<div class="error"><strong>Query Failed:</strong><br>${escapeHtml(error)}</div>`;
                return;
            }

            const data = await response.json();
            renderResults(data);
        } catch (e) {
            runBtn.disabled = false;
            runBtn.textContent = 'Run';
            resultsEl.innerHTML = `<div class="error"><strong>Error:</strong><br>${escapeHtml(e.message)}</div>`;
        }
    });

    // Export CSV
    exportBtn.addEventListener('click', async () => {
        if (!currentToken || !currentInstance) {
            resultsEl.innerHTML = '<div class="error">Please generate and save an access token first.</div>';
            return;
        }

        const query = soqlEl.value.trim();
        if (!query) {
            resultsEl.innerHTML = '<div class="error">Please enter a SOQL query</div>';
            return;
        }

        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        resultsEl.innerHTML = '<div class="muted">Running query and preparing CSV…</div>';

        try {
            const url = `${currentInstance}/services/data/v62.0/query?q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                exportBtn.disabled = false;
                exportBtn.textContent = 'Export CSV';
                const error = await response.text();
                resultsEl.innerHTML = `<div class="error"><strong>Export Failed:</strong><br>${escapeHtml(error)}</div>`;
                return;
            }

            const data = await response.json();
            const records = data.records || [];

            if (records.length === 0) {
                exportBtn.disabled = false;
                exportBtn.textContent = 'Export CSV';
                resultsEl.innerHTML = '<div class="muted">No records to export</div>';
                return;
            }

            const csv = toCSV(records);

            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const downloadUrl = URL.createObjectURL(blob);
            const downloadId = await chrome.downloads.download({
                url: downloadUrl,
                filename: 'soql-export.csv',
                saveAs: false
            });

            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

            exportBtn.disabled = false;
            exportBtn.textContent = 'Export CSV';
            resultsEl.innerHTML = `<div class="muted"><strong>✓ CSV Export Successful!</strong><br>Downloaded ${records.length} records</div>`;
            renderResults(data);
        } catch (e) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export CSV';
            resultsEl.innerHTML = `<div class="error"><strong>Error:</strong><br>${escapeHtml(e.message)}</div>`;
        }
    });

    // Render results table
    function renderResults(data) {
        const count = data.totalSize || (data.records && data.records.length) || 0;
        const recs = data.records || [];

        if (count === 0) {
            resultsEl.innerHTML = '<div class="muted">No records returned.</div>';
            return;
        }

        const cols = Array.from(new Set(recs.flatMap(r => Object.keys(r))));
        const table = document.createElement('table');
        table.className = 'results-table';
        table.style.width = '100%';

        const thead = document.createElement('thead');
        thead.innerHTML = '<tr>' + cols.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        recs.slice(0, 200).forEach(r => {
            const row = document.createElement('tr');
            row.innerHTML = cols.map(c => `<td>${escapeHtml(String(r[c] ?? ''))}</td>`).join('');
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        resultsEl.innerHTML = `<div class="muted">Returned: ${count} — showing up to 200 rows</div>`;
        resultsEl.appendChild(table);
    }

    // Convert to CSV
    function toCSV(records) {
        if (!records || records.length === 0) return '';
        const cols = Array.from(new Set(records.flatMap(r => Object.keys(r))));
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v);
            if (s.includes('"') || s.includes(',') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const header = cols.join(',') + '\n';
        const rows = records.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
        return header + rows;
    }

    // Escape HTML
    function escapeHtml(s) {
        return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    }
});
