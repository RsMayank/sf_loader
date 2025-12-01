// inspector.js - Full-page SOQL Inspector

let currentToken = null;
let currentInstance = null;
let lastQueryResults = null;
let currentRecordFields = []; // Array of { name, value, type }

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

    // Check for URL parameters (Show All Data mode)
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const recordId = params.get('recordId');
    const objectName = params.get('object');

    if (mode === 'showAllData' && recordId && objectName) {
        // Wait a bit for connection to be established if needed
        if (!currentToken) {
            // If not connected yet, wait for the checkAuthorization to potentially find a session
            // checkAuthorization is async but we awaited it. If it failed, we might need to wait or show error.
            if (!currentToken) {
                console.log('Not connected yet, cannot Show All Data immediately.');
                return;
            }
        }

        // Auto-run Show All Data
        await performShowAllData(objectName, recordId);
    }
})();

async function performShowAllData(objectName, recordId) {
    // Switch to Record View
    querySection.classList.remove('active');
    const recordViewSection = document.getElementById('record-view-section');
    recordViewSection.classList.add('active');

    const recordViewTitle = document.getElementById('record-view-title');
    const recordViewContent = document.getElementById('record-view-content');

    // Clear search
    document.getElementById('record-search').value = '';
    document.getElementById('record-field-count').textContent = '';

    recordViewTitle.textContent = `${objectName} - ${recordId}`;
    recordViewContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>Loading all fields for ${objectName}...</div>
        </div>
    `;

    try {
        const describeUrl = `${currentInstance}/services/data/v62.0/sobjects/${objectName}/describe`;
        const describeRes = await fetch(describeUrl, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!describeRes.ok) {
            throw new Error(`Describe failed: ${describeRes.status} ${describeRes.statusText}`);
        }

        const describeData = await describeRes.json();
        const fields = describeData.fields.map(f => f.name).join(', ');

        // Map field types
        const fieldTypeMap = {};
        describeData.fields.forEach(f => {
            fieldTypeMap[f.name] = f.type;
        });

        const query = `SELECT ${fields} FROM ${objectName} WHERE Id = '${recordId}'`;

        const queryUrl = `${currentInstance}/services/data/v62.0/query?q=${encodeURIComponent(query)}`;
        const queryRes = await fetch(queryUrl, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!queryRes.ok) {
            throw new Error(`Query failed: ${queryRes.status} ${queryRes.statusText}`);
        }

        const queryData = await queryRes.json();
        const record = queryData.records[0];

        if (!record) {
            recordViewContent.innerHTML = '<div class="error-message">Record not found.</div>';
            return;
        }

        // Store for export
        lastQueryResults = queryData;

        // Prepare data for rendering
        currentRecordFields = Object.keys(record)
            .filter(k => k !== 'attributes')
            .sort()
            .map(key => ({
                name: key,
                value: record[key],
                type: fieldTypeMap[key] || 'unknown'
            }));

        renderRecordTable('');

    } catch (error) {
        recordViewContent.innerHTML = `<div class="error-message">Error: ${escapeHtml(error.message)}</div>`;
    }
}

function renderRecordTable(filterText) {
    const content = document.getElementById('record-view-content');
    const countDiv = document.getElementById('record-field-count');

    const lowerFilter = filterText.toLowerCase();
    const filteredFields = currentRecordFields.filter(f =>
        f.name.toLowerCase().includes(lowerFilter) ||
        (f.value !== null && String(f.value).toLowerCase().includes(lowerFilter)) ||
        f.type.toLowerCase().includes(lowerFilter)
    );

    countDiv.textContent = `Showing ${filteredFields.length} of ${currentRecordFields.length} fields`;

    let html = '<div class="results-table-container">';
    html += '<table class="results-table">';
    html += '<thead><tr><th>Field</th><th>Value</th><th>Type</th></tr></thead>';
    html += '<tbody>';

    filteredFields.forEach(f => {
        const displayValue = f.value !== null && f.value !== undefined ? String(f.value) : '';
        html += `<tr>
            <td><strong>${escapeHtml(f.name)}</strong></td>
            <td>${escapeHtml(displayValue)}</td>
            <td><span style="background: #edf2f7; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #4a5568;">${escapeHtml(f.type)}</span></td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    content.innerHTML = html;
}

// Event listener for search
document.getElementById('record-search').addEventListener('input', (e) => {
    renderRecordTable(e.target.value);
});

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
            authorizeBtn.textContent = 'Opening Salesforce Login...';

            const newTab = await chrome.tabs.create({
                url: 'https://login.salesforce.com',
                active: true
            });

            // Wait for user to log in, then check again
            authorizeBtn.textContent = 'Waiting for Login... (Please log in to Salesforce)';

            let attempts = 0;
            const maxAttempts = 150; // 5 minutes (150 * 2 seconds)

            // Poll for session detection
            const pollInterval = setInterval(async () => {
                attempts++;

                // Try to inject content script into the tab to force detection
                try {
                    const currentTab = await chrome.tabs.get(newTab.id);
                    if (currentTab.url && currentTab.url.includes('salesforce.com')) {
                        // Inject content script to force session detection
                        await chrome.scripting.executeScript({
                            target: { tabId: newTab.id },
                            files: ['content-script.js']
                        });
                    }
                } catch (e) {
                    // Tab might be closed or script already injected
                }

                // Check if session was detected
                const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
                const twoHours = 2 * 60 * 60 * 1000;
                const isRecent = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

                if (data.sessionId && data.instanceUrl && isRecent) {
                    clearInterval(pollInterval);
                    currentToken = data.sessionId;
                    currentInstance = data.instanceUrl;
                    showQueryInterface('Auto-detected');

                    // Close the login tab
                    try {
                        await chrome.tabs.remove(newTab.id);
                    } catch (e) { /* Tab might already be closed */ }
                }

                // Update button text with countdown
                const remainingSeconds = Math.floor((maxAttempts - attempts) * 2);
                authorizeBtn.textContent = `Waiting for Login... (${remainingSeconds}s remaining)`;

                // Stop after max attempts
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    authorizeBtn.disabled = false;
                    authorizeBtn.textContent = 'Authorize & Connect to Salesforce';
                    alert('Login timeout. Please try again or check if you logged in successfully.');
                }
            }, 2000);

        } else {
            // Salesforce tab found - try to get session from it
            const sfTab = salesforceTabs[0];

            // Inject content script to force session detection
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: sfTab.id },
                    files: ['content-script.js']
                });
            } catch (e) {
                console.log('Content script injection:', e.message);
            }

            // Wait a moment for session detection
            authorizeBtn.textContent = 'Detecting session...';
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if session was detected
            const data = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
            const twoHours = 2 * 60 * 60 * 1000;
            const isRecent = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

            if (data.sessionId && data.instanceUrl && isRecent) {
                currentToken = data.sessionId;
                currentInstance = data.instanceUrl;
                showQueryInterface('Auto-detected');
            } else {
                // Session not detected - try to refresh the tab and retry
                authorizeBtn.textContent = 'Refreshing page...';
                await chrome.tabs.reload(sfTab.id);
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check again after refresh
                const retryData = await chrome.storage.local.get(['sessionId', 'instanceUrl', 'sessionDetectedAt']);
                const retryIsRecent = retryData.sessionDetectedAt && (Date.now() - retryData.sessionDetectedAt) < twoHours;

                if (retryData.sessionId && retryData.instanceUrl && retryIsRecent) {
                    currentToken = retryData.sessionId;
                    currentInstance = retryData.instanceUrl;
                    showQueryInterface('Auto-detected');
                } else {
                    alert('Could not auto-detect session. Please make sure you are logged into Salesforce and try again.');
                    authorizeBtn.disabled = false;
                    authorizeBtn.textContent = 'Authorize & Connect to Salesforce';
                }
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

// Event listeners for Record View buttons
document.getElementById('switch-to-query-btn').addEventListener('click', () => {
    document.getElementById('record-view-section').classList.remove('active');
    querySection.classList.add('active');
});

document.getElementById('record-export-btn').addEventListener('click', () => {
    // Reuse existing export logic
    exportBtn.click();
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
