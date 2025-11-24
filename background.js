// background.js (MV3 service worker)
// Handles SOQL queries (using same-origin session cookies) and CSV downloads.
//
// Behavior:
// - When it receives {type: 'SOQL_QUERY', query: 'SELECT ...'}, it attempts to determine
//   the instance URL from the sender tab (if available) and calls the REST query endpoint
//   with credentials included. If the sender tab isn't provided, it returns an error.
// - When it receives {type: 'DOWNLOAD_CSV', csv, filename}, it creates a blob URL and uses
//   chrome.downloads.download to save the file.

self.addEventListener('install', (evt) => {
    // service worker installed
    console.log('Salesforce Inspector background installed');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) {
        sendResponse({ ok: false, err: 'invalid_message' });
        return true;
    }

    if (msg.type === 'SOQL_QUERY') {
        (async () => {
            try {
                // use sender.tab.url to compute instance origin
                const tabUrl = sender && sender.tab && sender.tab.url;
                if (!tabUrl) {
                    sendResponse({ ok: false, err: 'no_tab_url' });
                    return;
                }
                const origin = (new URL(tabUrl)).origin;
                const apiVersion = msg.apiVersion || 'v56.0';
                const q = encodeURIComponent(msg.query);
                const url = `${origin}/services/data/${apiVersion}/query?q=${q}`;

                const res = await fetch(url, { credentials: 'include', method: 'GET', headers: { 'Accept': 'application/json' } });
                if (!res.ok) {
                    const text = await res.text();
                    sendResponse({ ok: false, err: `HTTP ${res.status}: ${text}` });
                    return;
                }
                const data = await res.json();
                sendResponse({ ok: true, data });
            } catch (e) {
                sendResponse({ ok: false, err: e.message });
            }
        })();
        return true; // indicate async response
    }

    if (msg.type === 'DOWNLOAD_CSV') {
        (async () => {
            try {
                if (!msg.csv) {
                    sendResponse({ ok: false, err: 'no_csv' });
                    return;
                }
                const filename = msg.filename || 'export.csv';
                const blob = new Blob([msg.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                chrome.downloads.download({ url, filename }, (downloadId) => {
                    // revoke object URL shortly after start
                    setTimeout(() => URL.revokeObjectURL(url), 15000);
                    sendResponse({ ok: true, id: downloadId });
                });
                return;
            } catch (e) {
                sendResponse({ ok: false, err: e.message });
            }
        })();
        return true;
    }

    // unknown type
    sendResponse({ ok: false, err: 'unknown_type' });
    return true;
});
