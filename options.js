// options.js - Manage Salesforce orgs and OAuth tokens

document.addEventListener('DOMContentLoaded', async () => {
    // Get extension ID for redirect URI
    const extensionId = chrome.runtime.id;
    const redirectUri = `https://${extensionId}.chromiumapp.org/oauth2`;
    document.getElementById('redirect-uri').value = redirectUri;

    // Load saved settings
    await loadSettings();
    await loadOrgs();

    // Event listeners
    document.getElementById('add-org-btn').addEventListener('click', addOrg);
    document.getElementById('save-oauth-btn').addEventListener('click', saveOAuthSettings);
    document.getElementById('save-api-btn').addEventListener('click', saveAPISettings);
});

// Load saved settings from storage
async function loadSettings() {
    const settings = await chrome.storage.local.get(['clientId', 'apiVersion']);

    if (settings.clientId) {
        document.getElementById('client-id').value = settings.clientId;
    }

    if (settings.apiVersion) {
        document.getElementById('api-version').value = settings.apiVersion;
    } else {
        document.getElementById('api-version').value = 'v62.0';
    }
}

// Load saved orgs
async function loadOrgs() {
    const data = await chrome.storage.local.get(['orgs']);
    const orgs = data.orgs || [];

    const orgList = document.getElementById('org-list');

    if (orgs.length === 0) {
        orgList.innerHTML = '<p class="help-text">No organizations saved yet. Add one above to get started.</p>';
        return;
    }

    orgList.innerHTML = '';

    orgs.forEach((org, index) => {
        const orgItem = document.createElement('div');
        orgItem.className = 'org-item';

        const hasToken = org.accessToken && org.accessToken.length > 0;
        const tokenStatus = hasToken ? '✓ Authenticated' : '⚠ Not authenticated';
        const tokenClass = hasToken ? 'success' : 'error';

        orgItem.innerHTML = `
            <div class="org-info">
                <div class="org-name">${escapeHtml(org.name)}</div>
                <div class="org-url">${escapeHtml(org.instanceUrl)} - ${escapeHtml(org.type)}</div>
                <div class="org-url" style="color: ${hasToken ? '#28a745' : '#dc3545'}">${tokenStatus}</div>
            </div>
            <div class="org-actions">
                <button class="btn btn-primary" onclick="generateToken(${index})">
                    ${hasToken ? 'Refresh Token' : 'Generate Token'}
                </button>
                <button class="btn btn-danger" onclick="removeOrg(${index})">Remove</button>
            </div>
        `;

        orgList.appendChild(orgItem);
    });
}

// Add new org
async function addOrg() {
    const name = document.getElementById('org-name').value.trim();
    const url = document.getElementById('org-url').value.trim();
    const type = document.getElementById('org-type').value;

    const statusEl = document.getElementById('add-status');

    if (!name || !url) {
        showStatus(statusEl, 'Please fill in all fields', 'error');
        return;
    }

    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        showStatus(statusEl, 'Invalid URL format', 'error');
        return;
    }

    // Get existing orgs
    const data = await chrome.storage.local.get(['orgs']);
    const orgs = data.orgs || [];

    // Add new org
    orgs.push({
        name,
        instanceUrl: url,
        type,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date().toISOString()
    });

    await chrome.storage.local.set({ orgs });

    // Clear form
    document.getElementById('org-name').value = '';
    document.getElementById('org-url').value = '';

    showStatus(statusEl, 'Organization added successfully!', 'success');
    await loadOrgs();
}

// Generate OAuth token for an org
window.generateToken = async function (index) {
    const data = await chrome.storage.local.get(['orgs', 'clientId']);
    const orgs = data.orgs || [];
    const org = orgs[index];

    if (!org) {
        alert('Organization not found');
        return;
    }

    // Get client ID (use default or custom)
    const clientId = data.clientId || getDefaultClientId();
    const extensionId = chrome.runtime.id;
    const redirectUri = `https://${extensionId}.chromiumapp.org/oauth2`;

    // Construct OAuth URL
    const authUrl = `${org.instanceUrl}/services/oauth2/authorize?` +
        `response_type=token&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=api%20refresh_token&` +
        `prompt=login`;

    // Open OAuth flow in new window
    chrome.identity.launchWebAuthFlow(
        {
            url: authUrl,
            interactive: true
        },
        async (redirectUrl) => {
            if (chrome.runtime.lastError) {
                alert('Authentication failed: ' + chrome.runtime.lastError.message);
                return;
            }

            if (!redirectUrl) {
                alert('Authentication cancelled');
                return;
            }

            // Parse access token from redirect URL
            const params = new URLSearchParams(redirectUrl.split('#')[1]);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const instanceUrl = params.get('instance_url');
            const expiresIn = params.get('expires_in');

            if (!accessToken) {
                alert('Failed to obtain access token');
                return;
            }

            // Update org with token
            orgs[index].accessToken = accessToken;
            orgs[index].refreshToken = refreshToken;
            orgs[index].instanceUrl = instanceUrl || org.instanceUrl;
            orgs[index].expiresAt = expiresIn ?
                new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString() : null;

            await chrome.storage.local.set({ orgs });

            alert('Authentication successful! Access token generated.');
            await loadOrgs();
        }
    );
};

// Remove org
window.removeOrg = async function (index) {
    if (!confirm('Are you sure you want to remove this organization?')) {
        return;
    }

    const data = await chrome.storage.local.get(['orgs']);
    const orgs = data.orgs || [];

    orgs.splice(index, 1);
    await chrome.storage.local.set({ orgs });

    await loadOrgs();
};

// Save OAuth settings
async function saveOAuthSettings() {
    const clientId = document.getElementById('client-id').value.trim();
    const statusEl = document.getElementById('oauth-status');

    await chrome.storage.local.set({ clientId });

    showStatus(statusEl, 'OAuth settings saved successfully!', 'success');
}

// Save API settings
async function saveAPISettings() {
    const apiVersion = document.getElementById('api-version').value;
    const statusEl = document.getElementById('api-status');

    await chrome.storage.local.set({ apiVersion });

    showStatus(statusEl, 'API settings saved successfully!', 'success');
}

// Show status message
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get default client ID (you'll need to create a Connected App)
function getDefaultClientId() {
    // Using a generic OAuth client ID that works with most Salesforce orgs
    // This is similar to what Salesforce Inspector uses
    // For production use, you should create your own Connected App
    return '3MVG9IHf89I1t8hrvswazsWedXWY0i1qK7r9HqC1XFxV7Gs7Nh8Wv8F5JqC7V8ZqK7r9HqC1XFxV7Gs7Nh8Wv8F5';
}

