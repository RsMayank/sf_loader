// background.js - Updated to use Bearer token authentication

// ephemeral per-tab map (in memory). Keys: tabId or origin; values: metadata cache
const tabState = {};

// cleanup when tab closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabState[tabId]) {
        delete tabState[tabId];
        console.log('Cleared inspector state for tab', tabId);
    }
});

// Helper function to get session token from storage
async function getSessionToken() {
    const data = await chrome.storage.local.get(['sessionId', 'accessToken', 'sessionDetectedAt']);

    // Prefer auto-detected session if recent (within 2 hours)
    const twoHours = 2 * 60 * 60 * 1000;
    const isRecentSession = data.sessionDetectedAt && (Date.now() - data.sessionDetectedAt) < twoHours;

    if (data.sessionId && isRecentSession) {
        return data.sessionId;
    } else if (data.accessToken) {
        return data.accessToken;
    }

    return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) {
        sendResponse({ ok: false, err: 'invalid_message' });
        return true;
    }

    if (msg.type === 'SOQL_QUERY') {
        (async () => {
            try {
                // Get session token
                const token = await getSessionToken();
                if (!token) {
                    sendResponse({ ok: false, err: 'No session token found. Please navigate to a Salesforce page or authorize manually.' });
                    return;
                }

                // Prefer supplied origin; fallback to sender.tab.url origin
                let origin = msg.origin;
                if (!origin) {
                    const tabUrl = sender && sender.tab && sender.tab.url;
                    if (!tabUrl) {
                        sendResponse({ ok: false, err: 'no_tab_or_origin' });
                        return;
                    }
                    origin = (new URL(tabUrl)).origin;
                }

                const apiVersion = msg.apiVersion || 'v62.0';
                const q = encodeURIComponent(msg.query);
                const url = `${origin}/services/data/${apiVersion}/query?q=${q}`;

                // Use Bearer token authentication instead of credentials: 'include'
                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!res.ok) {
                    const text = await res.text();
                    sendResponse({ ok: false, err: `HTTP ${res.status}: ${text}` });
                    return;
                }
                const data = await res.json();

                // Optionally cache query results per tab (ephemeral)
                if (sender && sender.tab) {
                    tabState[sender.tab.id] = tabState[sender.tab.id] || {};
                    tabState[sender.tab.id].lastQuery = { query: msg.query, timestamp: Date.now() };
                }

                sendResponse({ ok: true, data });
            } catch (e) {
                sendResponse({ ok: false, err: e.message });
            }
        })();
        return true;
    }

    // DESCRIBE request for field suggestions: msg.type = 'DESCRIBE', msg.objectName, msg.origin
    if (msg.type === 'DESCRIBE') {
        (async () => {
            try {
                // Get session token
                const token = await getSessionToken();
                if (!token) {
                    sendResponse({ ok: false, err: 'No session token found. Please navigate to a Salesforce page or authorize manually.' });
                    return;
                }

                let origin = msg.origin;
                if (!origin) {
                    const tabUrl = sender && sender.tab && sender.tab.url;
                    if (!tabUrl) {
                        sendResponse({ ok: false, err: 'no_tab_or_origin' });
                        return;
                    }
                    origin = (new URL(tabUrl)).origin;
                }
                const apiVersion = msg.apiVersion || 'v62.0';
                const obj = msg.objectName;
                if (!obj) {
                    sendResponse({ ok: false, err: 'no_object' });
                    return;
                }

                const url = `${origin}/services/data/${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe`;

                // Use Bearer token authentication instead of credentials: 'include'
                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!res.ok) {
                    const text = await res.text();
                    sendResponse({ ok: false, err: `HTTP ${res.status}: ${text}` });
                    return;
                }
                const data = await res.json();

                // Cache fields list in per-tab state
                if (sender && sender.tab) {
                    tabState[sender.tab.id] = tabState[sender.tab.id] || {};
                    tabState[sender.tab.id].describe = data;
                }

                sendResponse({ ok: true, data });
            } catch (e) {
                sendResponse({ ok: false, err: e.message });
            }
        })();
        return true;
    }

    // DOWNLOAD_CSV handler for exporting query results
    if (msg.type === 'DOWNLOAD_CSV') {
        (async () => {
            try {
                if (!msg.csv) {
                    sendResponse({ ok: false, err: 'no_csv_data' });
                    return;
                }

                const filename = msg.filename || 'soql-export.csv';

                // Create blob and download
                const blob = new Blob([msg.csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);

                const downloadId = await chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: false
                });

                // Clean up blob URL after download starts
                setTimeout(() => URL.revokeObjectURL(url), 1000);

                sendResponse({ ok: true, id: downloadId });
            } catch (e) {
                sendResponse({ ok: false, err: e.message });
            }
        })();
        return true;
    }

    sendResponse({ ok: false, err: 'unknown_message_type' });
});
