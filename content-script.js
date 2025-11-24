// content-script.js
// Injects a floating "Inspector" button onto Salesforce pages, opens a small overlay,
// detects recordId from URL, and asks the background service worker to run a SOQL query.
//
// Notes:
// - This script runs in the page context (content script). It communicates with the
//   background service worker using chrome.runtime.sendMessage.
// - It uses a very small, isolated overlay to avoid interfering with Salesforce's UI.

console.log('🚀 SF Loader: Content script loaded!', window.location.href);

(function () {
    if (window.__sfInspectorInjected) {
        console.log('SF Loader: Already injected, skipping');
        return;
    }
    window.__sfInspectorInjected = true;
    console.log('SF Loader: Initializing...');

    // create floating button with rocket icon
    const btn = document.createElement('button');
    btn.id = 'sf-inspector-btn';
    btn.innerHTML = '🚀';
    Object.assign(btn.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 2147483647,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 166, 194, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)',
        background: 'linear-gradient(135deg, #00A1E0 0%, #0070D2 100%)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        fontFamily: 'Arial, sans-serif',
        outline: 'none'
    });
    btn.title = 'SF Loader - Click to inspect';

    // Add hover effect
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.1) translateY(-2px)';
        btn.style.boxShadow = '0 6px 20px rgba(0, 166, 194, 0.6), 0 4px 10px rgba(0, 0, 0, 0.3)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1) translateY(0)';
        btn.style.boxShadow = '0 4px 12px rgba(0, 166, 194, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)';
    });

    document.body.appendChild(btn);
    btn.addEventListener('click', openOverlay);

    // find 15/18-char Id in the URL (common heuristic)
    function findRecordId(url) {
        // Salesforce record Ids are 15 or 18 alphanumeric characters
        const m = url.match(/\b([a-zA-Z0-9]{15,18})\b/);
        return m ? m[1] : null;
    }

    // create overlay
    function openOverlay() {
        if (document.getElementById('sf-inspector-overlay')) {
            return;
        }

        // link css if available
        const cssHref = chrome.runtime.getURL('assets/styles.css');
        if (!document.querySelector(`link[href="${cssHref}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssHref;
            document.head.appendChild(link);
        }

        const overlay = document.createElement('div');
        overlay.id = 'sf-inspector-overlay';
        overlay.innerHTML = `
      <div class="inspector-header">
        <strong>SF Loader</strong>
        <div>
          <button id="inspector-refresh" class="inspector-small-btn">Refresh</button>
          <button id="inspector-close" class="inspector-small-btn">✕</button>
        </div>
      </div>
      <div id="inspector-body" class="inspector-body">
        Detecting context...
      </div>
      <div class="inspector-footer">
        <button id="open-soql-panel" class="inspector-btn">Open SOQL Popup</button>
      </div>
    `;
        document.body.appendChild(overlay);

        overlay.querySelector('#inspector-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#inspector-refresh').addEventListener('click', () => loadContext(overlay));
        overlay.querySelector('#open-soql-panel').addEventListener('click', () => {
            // open extension popup by opening the extension action page — fallback: open chrome extension page
            // Best-effort: open a new tab pointing to the extension popup html (works in dev; in release may be blocked)
            const popupUrl = chrome.runtime.getURL('popup.html');
            window.open(popupUrl, '_blank', 'noopener');
        });

        loadContext(overlay);
    }

    // load context (record id and a small SOQL fetch)
    async function loadContext(overlay) {
        const body = overlay.querySelector('#inspector-body');
        body.textContent = 'Detecting record id...';

        const recordId = findRecordId(location.href);
        if (!recordId) {
            body.innerHTML = '<div class="muted">No record id found in URL. Open an object record page and try again.</div>';
            return;
        }

        body.innerHTML = `<div>RecordId: <code>${recordId}</code></div><div id="record-fields" style="margin-top:8px">Loading...</div>`;

        // Try to detect object from Lightning URL first
        let obj = detectLightningObjectName(location.href);

        // Fallback to ID prefix mapping if Lightning detection fails
        if (!obj) {
            const prefix = recordId.substring(0, 3);
            const prefixMap = {
                '001': 'Account',
                '003': 'Contact',
                '005': 'User',
                '006': 'Opportunity',
                '00Q': 'Lead',
                '500': 'Case',
                '800': 'Contract',
                '701': 'Campaign',
                '00G': 'Group',
                '00D': 'Organization',
                '00E': 'Profile',
                '00e': 'PermissionSet',
                '012': 'RecordType',
                '01I': 'Task',
                '00U': 'Event',
                '00T': 'Event',
                '002': 'Note',
                '00O': 'Report',
                '00l': 'Folder',
                '01Z': 'Dashboard',
                '00N': 'CustomField',
                '01p': 'Pricebook2',
                '01u': 'Product2',
                '01t': 'PricebookEntry',
                '00k': 'Attachment',
                '015': 'ContentVersion',
                '068': 'ContentDocument'
            };
            obj = prefixMap[prefix] || 'SObject';
        }

        // Select appropriate fields based on object type
        let fields = ['Id', 'Name'];
        const fieldMap = {
            'Account': ['Id', 'Name', 'Industry', 'Website', 'Phone'],
            'Contact': ['Id', 'Name', 'Email', 'Phone', 'AccountId'],
            'Opportunity': ['Id', 'Name', 'StageName', 'Amount', 'CloseDate'],
            'Lead': ['Id', 'Name', 'Email', 'Company', 'Status'],
            'Case': ['Id', 'CaseNumber', 'Subject', 'Status', 'Priority'],
            'User': ['Id', 'Name', 'Email', 'Username', 'IsActive'],
            'Campaign': ['Id', 'Name', 'Status', 'Type', 'StartDate']
        };
        fields = fieldMap[obj] || ['Id', 'Name'];

        const soql = `SELECT ${fields.join(', ')} FROM ${obj} WHERE Id='${recordId}'`;

        const resp = await sendMessage({ type: 'SOQL_QUERY', query: soql });
        const container = overlay.querySelector('#record-fields');

        if (!resp) {
            container.innerHTML = `<div class="error">No response from background</div>`;
            return;
        }
        if (!resp.ok) {
            container.innerHTML = `<div class="error">Error: ${escapeHtml(resp.err || JSON.stringify(resp))}</div>`;
            return;
        }
        const rec = resp.data && resp.data.records && resp.data.records[0];
        if (!rec) {
            container.innerHTML = '<div class="muted">No record returned.</div>';
            return;
        }

        // render fields
        const rows = Object.keys(rec).map(k => `<div class="field-row"><strong>${escapeHtml(k)}:</strong> <span>${escapeHtml(String(rec[k] ?? ''))}</span></div>`).join('');
        container.innerHTML = `<div class="record-json"><pre>${JSON.stringify(rec, null, 2)}</pre></div><div style="margin-top:8px">${rows}</div>`;
    }

    // helper: send message to background and await response (wrap callback API)
    function sendMessage(msg) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(msg, (resp) => {
                resolve(resp);
            });
        });
    }

    // small escape for HTML insertion
    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // in content-script.js — helper to get object name from lightning URL
    function detectLightningObjectName(url) {
        // e.g. https://instance.lightning.force.com/lightning/r/Account/001xxx/view
        const m = url.match(/lightning\/r\/([^\/]+)\/[a-zA-Z0-9]{15,18}/);
        return m ? m[1] : null;
    }

    // Send session info to storage when detected
    function saveSession(sessionId) {
        console.log('SF Loader: saveSession called with:', sessionId ? `${sessionId.substring(0, 10)}...` : 'null');

        if (sessionId && sessionId.length > 10) {
            const instanceUrl = window.location.origin;
            console.log('SF Loader: Saving session to storage...');
            console.log('SF Loader: Instance URL:', instanceUrl);
            console.log('SF Loader: Session ID length:', sessionId.length);

            chrome.storage.local.set({
                sessionId: sessionId,
                instanceUrl: instanceUrl,
                sessionDetectedAt: Date.now()
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('SF Loader: ✗ Failed to save session:', chrome.runtime.lastError);
                } else {
                    console.log('SF Loader: ✓ Session saved successfully!');
                }
            });
            return true;
        }
        console.log('SF Loader: ✗ Session ID invalid or too short');
        return false;
    }

    // Inject the main world script to access global variables
    function injectMainScript() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = function () {
            this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
        console.log('SF Loader: Injected main world script');
    }

    // Listen for session ID from the injected script
    window.addEventListener('message', function (event) {
        // We only accept messages from ourselves
        if (event.source !== window) return;

        if (event.data.type && event.data.type === 'SF_LOADER_SESSION') {
            const sessionId = event.data.sessionId;
            console.log('SF Loader: Received session ID from main world');
            saveSession(sessionId);
        }
    });

    // Start detection by injecting the script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectMainScript);
    } else {
        injectMainScript();
    }

    // Re-inject on navigation (SPA)
    if (window.addEventListener) {
        window.addEventListener('popstate', () => {
            console.log('SF Loader: Navigation detected, re-injecting script...');
            injectMainScript();
        });
    }

})();
