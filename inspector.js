// inspector.js - Full-page SOQL Inspector

let currentToken = null;
let currentInstance = null;
let lastQueryResults = null;

// DOM Elements
const authSection = document.getElementById('auth-section');
const querySection = document.getElementById('query-section');
const authorizeBtn = document.getElementById('authorize-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const instanceInfo = document.getElementById('instance-info');
const soqlInput = document.getElementById('soql-input');
const runBtn = document.getElementById('run-btn');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const resultsSection = document.getElementById('results-section');

// Initialize
(async function init() {
    await checkAuthorization();
})();

// Check if already authorized
async function checkAuthorization() {
    const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'accessToken', 'sessionDetectedAt']);

    const twoHours = 2 * 60 * 60 * 1000;
    const isRecentSession = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

    if (data.sessionId && data.instanceUrl && isRecentSession) {
        // Auto-detected session
        currentToken = data.sessionId;
        currentInstance = data.instanceUrl;
        showQueryInterface('Auto-detected');
    } else if (data.accessToken && data.instanceUrl) {
        // Manual token
        currentToken = data.accessToken;
        currentInstance = data.instanceUrl;
        showQueryInterface('Manual Token');
    } else {
        // Not authorized
        showAuthSection();
    }
}

// Show authorization section
function showAuthSection() {
    authSection.style.display = 'block';
    querySection.style.display = 'none';
    updateStatus(false);
}

// Show query interface
function showQueryInterface(method = '') {
    authSection.style.display = 'none';
    querySection.classList.add('active');
    updateStatus(true, method);
    instanceInfo.textContent = currentInstance || '';
}

// Update connection status
function updateStatus(connected, method = '') {
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = method ? `Connected (${method})` : 'Connected';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Not Connected';
    }
}

// Authorize button click
authorizeBtn.addEventListener('click', async () => {
    authorizeBtn.disabled = true;
    authorizeBtn.textContent = 'Detecting Salesforce Session...';

    try {
        // Try to find an open Salesforce tab
        const tabs = await chrome.tabs.query({});
        const salesforceTabs = tabs.filter(tab =>
            tab.url && (
                tab.url.includes('salesforce.com') ||
                tab.url.includes('force.com')
            )
        );

        if (salesforceTabs.length === 0) {
            // No Salesforce tab found - open one
            alert('No Salesforce tab detected. Opening Salesforce login page...');
            const newTab = await chrome.tabs.create({
                url: 'https://login.salesforce.com',
                active: true
            });

            // Wait for user to log in, then check again
            authorizeBtn.textContent = 'Waiting for Salesforce Login...';

            // Poll for session detection
            const pollInterval = setInterval(async () => {
                const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
                const twoHours = 2 * 60 * 60 * 1000;
                const isRecent = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

                if (data.sessionId && data.instanceUrl && isRecent) {
                    clearInterval(pollInterval);
                    currentToken = data.sessionId;
                    currentInstance = data.instanceUrl;
                    showQueryInterface('Auto-detected');
                }
            }, 2000);

            // Stop polling after 5 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                authorizeBtn.disabled = false;
                authorizeBtn.textContent = 'Authorize & Connect to Salesforce';
            }, 5 * 60 * 1000);

        } else {
            // Salesforce tab found - try to get session from it
            const sfTab = salesforceTabs[0];

            // Inject content script if not already injected
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: sfTab.id },
                    files: ['content-script.js']
                });
            } catch (e) {
                // Already injected or error
            }

            // Wait a moment for session detection
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if session was detected
            const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
            const twoHours = 2 * 60 * 60 * 1000;
            const isRecent = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

            if (data.sessionId && data.instanceUrl && isRecent) {
                currentToken = data.sessionId;
                currentInstance = data.instanceUrl;
                showQueryInterface('Auto-detected');
            } else {
                // Session not detected - show manual option
                alert('Could not auto-detect session. Please refresh your Salesforce page and try again, or enter a token manually.');
                authorizeBtn.disabled = false;
                authorizeBtn.textContent = 'Authorize & Connect to Salesforce';
            }
        }
    } catch (error) {
        console.error('Authorization error:', error);
        alert('Error during authorization: ' + error.message);
        authorizeBtn.disabled = false;
        authorizeBtn.textContent = 'Authorize & Connect to Salesforce';
    }
});

// Run query
runBtn.addEventListener('click', async () => {
    const query = soqlInput.value.trim();

    if (!query) {
        showError('Please enter a SOQL query');
        return;
    }

    if (!currentToken || !currentInstance) {
        showError('Not connected. Please authorize first.');
        return;
    }

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    showLoading();

    try {
        const url = `${currentInstance}/services/data/v62.0/query?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const data = await response.json();
        lastQueryResults = data;
        displayResults(data);

    } catch (error) {
        showError('Query failed: ' + error.message);
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Run Query';
    }
});

// Clear query
clearBtn.addEventListener('click', () => {
    soqlInput.value = '';
    resultsSection.innerHTML = '<div class="results-info">Enter a SOQL query and click "Run Query" to see results.</div>';
    lastQueryResults = null;
});

// Export CSV
exportBtn.addEventListener('click', async () => {
    if (!lastQueryResults || !lastQueryResults.records || lastQueryResults.records.length === 0) {
        showError('No results to export. Run a query first.');
        return;
    }

    try {
        const csv = toCSV(lastQueryResults.records);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        await chrome.downloads.download({
            url: url,
            filename: 'soql-export.csv',
            saveAs: true
        });

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showSuccess(`Exported ${lastQueryResults.records.length} records to CSV`);
    } catch (error) {
        showError('Export failed: ' + error.message);
    }
});

// Display results
function displayResults(data) {
    const records = data.records || [];
    const totalSize = data.totalSize || 0;

    if (records.length === 0) {
        resultsSection.innerHTML = '<div class="results-info">No records found.</div>';
        return;
    }

    // Get all unique field names
    const fields = Array.from(new Set(records.flatMap(r => Object.keys(r).filter(k => k !== 'attributes'))));

    let html = `<div class="results-info">Found ${totalSize} record(s) - Showing ${records.length}</div>`;
    html += '<div class="results-table-container">';
    html += '<table class="results-table">';

    // Header
    html += '<thead><tr>';
    fields.forEach(field => {
        html += `<th>${escapeHtml(field)}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    records.forEach(record => {
        html += '<tr>';
        fields.forEach(field => {
            const value = record[field];
            const displayValue = value !== null && value !== undefined ? String(value) : '';
            html += `<td>${escapeHtml(displayValue)}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';

    html += '</table>';
    html += '</div>';

    resultsSection.innerHTML = html;
}

// Show loading
function showLoading() {
    resultsSection.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>Executing query...</div>
        </div>
    `;
}

// Show error
function showError(message) {
    resultsSection.innerHTML = `<div class="error-message"><strong>Error:</strong> ${escapeHtml(message)}</div>`;
}

// Show success
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    resultsSection.insertBefore(successDiv, resultsSection.firstChild);

    setTimeout(() => successDiv.remove(), 3000);
}

// Convert to CSV
function toCSV(records) {
    if (!records || records.length === 0) return '';

    const fields = Array.from(new Set(records.flatMap(r => Object.keys(r).filter(k => k !== 'attributes'))));

    const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const header = fields.join(',') + '\n';
    const rows = records.map(r => fields.map(f => escape(r[f])).join(',')).join('\n');

    return header + rows;
}

// Escape HTML
function escapeHtml(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
