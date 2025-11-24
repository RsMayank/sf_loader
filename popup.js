// popup.js — enhanced with object detection + DESCRIBE-driven field suggestions
// Paste this into salesforce-inspector/popup.js (overwrite existing).

document.addEventListener('DOMContentLoaded', () => {
    const soqlEl = document.getElementById('soql');
    const runBtn = document.getElementById('run-soql');
    const exportBtn = document.getElementById('export-csv');
    const resultsEl = document.getElementById('results');

    // create suggestion container under textarea
    let suggBox = document.getElementById('field-suggestions');
    if (!suggBox) {
        suggBox = document.createElement('div');
        suggBox.id = 'field-suggestions';
        suggBox.style.maxHeight = '160px';
        suggBox.style.overflow = 'auto';
        suggBox.style.marginTop = '6px';
        suggBox.style.border = '1px solid #e8e8e8';
        suggBox.style.borderRadius = '6px';
        suggBox.style.padding = '6px';
        suggBox.style.display = 'none';
        suggBox.style.background = '#fff';
        document.querySelector('.popup-root').insertBefore(suggBox, resultsEl);
    }

    // cached fields for suggestions (ephemeral)
    let fieldCache = []; // array of {name,label,type}
    let currentOrigin = null;
    let currentObject = null;

    // helper: get active tab
    async function getActiveTab() {
        return new Promise((res) => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => res(tabs && tabs[0])));
    }

    // ask for host permission for the origin
    function requestHostPermission(origin) {
        return new Promise((resolve) => {
            if (!origin) return resolve(false);
            chrome.permissions.request({ origins: [origin + '/*'] }, (granted) => resolve(Boolean(granted)));
        });
    }

    // extract object API name from common Lightning/classic URLs
    function detectObjectFromUrl(url) {
        try {
            // Lightning pattern: /lightning/r/Account/<id>/view
            const m1 = url.match(/lightning\/r\/([^\/]+)\/[a-zA-Z0-9]{15,18}/);
            if (m1) return m1[1];

            // Lightning list/detail pattern: /lightning/o/Account/home or /lightning/o/Account/list?filter...
            const m2 = url.match(/lightning\/o\/([^\/]+)\/?/);
            if (m2) return m2[1];

            // Classic pattern might include ?fcf or /003/ etc., but we can fallback to Id prefix detection
            const idMatch = url.match(/\b([a-zA-Z0-9]{15,18})\b/);
            if (idMatch) {
                const prefix = idMatch[1].substring(0, 3);
                if (prefix === '001') return 'Account';
                if (prefix === '003') return 'Contact';
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    // request describe from background
    function describeObject(objectName, origin) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'DESCRIBE', objectName, origin }, (resp) => {
                resolve(resp);
            });
        });
    }

    // run SOQL (delegates to background)
    function runSoql(query) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'SOQL_QUERY', query, origin: currentOrigin }, (resp) => resolve(resp));
        });
    }

    // CSV download
    function downloadCsv(csv, filename = 'soql-export.csv') {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'DOWNLOAD_CSV', csv, filename }, (resp) => resolve(resp));
        });
    }

    // UI: render suggestions list
    function showSuggestions(list, filter = '') {
        fieldCache = list || [];
        const filtered = filter ? fieldCache.filter(f => (f.name + ' ' + (f.label || '')).toLowerCase().includes(filter.toLowerCase())) : fieldCache;
        if (!filtered.length) {
            suggBox.style.display = 'none';
            suggBox.innerHTML = '';
            return;
        }
        const items = filtered.map(f => `<div class="sugg-item" data-name="${escapeHtml(f.name)}" style="padding:6px;cursor:pointer;border-radius:4px">${escapeHtml(f.name)} <small style="color:#666">(${escapeHtml(f.label || '')})</small></div>`).join('');
        suggBox.innerHTML = items;
        suggBox.style.display = 'block';

        // attach click listeners
        Array.from(suggBox.querySelectorAll('.sugg-item')).forEach(el => {
            el.onclick = () => {
                insertFieldAtCursor(el.dataset.name);
                hideSuggestions();
            };
        });
    }

    function hideSuggestions() {
        suggBox.style.display = 'none';
    }

    function insertFieldAtCursor(field) {
        // simple insertion: append field to end or after last comma in selection
        const val = soqlEl.value;
        const selStart = soqlEl.selectionStart || val.length;
        const left = val.substring(0, selStart);
        const right = val.substring(selStart);
        // if left ends with a partial token, remove the partial token before inserting
        const partial = left.match(/([A-Za-z0-9_]+)$/);
        let newLeft = left;
        if (partial) newLeft = left.substring(0, left.length - partial[1].length);
        const inserted = (newLeft && !newLeft.endsWith(' ') ? newLeft + ' ' : newLeft) + field + ' ';
        soqlEl.value = inserted + right;
        soqlEl.focus();
        // move cursor after inserted field
        const pos = inserted.length;
        soqlEl.setSelectionRange(pos, pos);
    }

    // convert results to CSV (reuse earlier helper)
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

    // render table results
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

    // escape for HTML
    function escapeHtml(s) {
        return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    }

    // --- Initialization flow: detect tab + request permission + auto-describe ---
    (async function init() {
        resultsEl.innerHTML = '<div class="muted">Preparing...</div>';
        const tab = await getActiveTab();
        if (!tab || !tab.url) {
            resultsEl.innerHTML = '<div class="error">No active tab found. Open a Salesforce tab first.</div>';
            return;
        }

        const origin = new URL(tab.url).origin;
        currentOrigin = origin;

        // request permission for this origin (will prompt user)
        const granted = await requestHostPermission(origin);
        if (!granted) {
            resultsEl.innerHTML = `
                <div class="error">
                    <strong>Permission Required</strong><br>
                    This extension needs permission to access <code>${escapeHtml(origin)}</code>.<br>
                    <button id="retry-permission" class="inspector-btn" style="margin-top:8px">Grant Permission</button>
                </div>`;
            document.getElementById('retry-permission').addEventListener('click', async () => {
                const retryGranted = await requestHostPermission(origin);
                if (retryGranted) {
                    location.reload(); // Reload popup to reinitialize
                } else {
                    resultsEl.innerHTML = '<div class="error">Permission denied. Please enable permissions in chrome://extensions/</div>';
                }
            });
            return;
        }

        // detect object
        const obj = detectObjectFromUrl(tab.url);
        currentObject = obj;

        if (obj) {
            resultsEl.innerHTML = `<div class="muted">Detected object: <strong>${escapeHtml(obj)}</strong>. Fetching fields…</div>`;
            const resp = await describeObject(obj, origin);
            if (!resp || !resp.ok) {
                resultsEl.innerHTML = `<div class="error">Describe error: ${escapeHtml(resp && resp.err ? resp.err : 'unknown')}</div>`;
            } else {
                const fields = (resp.data && resp.data.fields) ? resp.data.fields.map(f => ({ name: f.name, label: f.label, type: f.type })) : [];
                if (fields.length) {
                    // show suggestions initially (top fields)
                    showSuggestions(fields.slice(0, 150));
                    resultsEl.innerHTML = `<div class="muted">Found ${fields.length} fields for ${escapeHtml(obj)} — suggestions ready (click a field to insert).</div>`;
                } else {
                    resultsEl.innerHTML = '<div class="muted">No fields found from describe.</div>';
                }
            }
        } else {
            resultsEl.innerHTML = '<div class="muted">Could not auto-detect object from URL; you can still run SOQL manually.</div>';
        }
    })();

    // text area listener: provide filtered suggestions on input
    soqlEl.addEventListener('input', (ev) => {
        const val = soqlEl.value;
        // attempt to detect last token for filtering suggestions
        const match = val.match(/([A-Za-z0-9_]+)$/);
        const token = match ? match[1] : '';
        if (!token) {
            // show top suggestions if cache present
            if (fieldCache.length) showSuggestions(fieldCache.slice(0, 80), '');
            return;
        }
        showSuggestions(fieldCache, token);
    });

    // click outside hides suggestions
    document.addEventListener('click', (e) => {
        if (!suggBox.contains(e.target) && e.target !== soqlEl) hideSuggestions();
    });

    // Run button action
    runBtn.addEventListener('click', async () => {
        const q = soqlEl.value.trim();
        if (!q) {
            resultsEl.innerHTML = '<div class="error">Please enter a SOQL query</div>';
            return;
        }
        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        resultsEl.innerHTML = '<div class="muted">Executing SOQL query…</div>';

        const resp = await runSoql(q);
        runBtn.disabled = false;
        runBtn.textContent = 'Run';

        if (!resp || !resp.ok) {
            const errorMsg = resp && resp.err ? resp.err : 'No response from background service';
            resultsEl.innerHTML = `<div class="error"><strong>Query Failed:</strong><br>${escapeHtml(errorMsg)}</div>`;
            return;
        }
        renderResults(resp.data);
    });

    // Export CSV action
    exportBtn.addEventListener('click', async () => {
        const q = soqlEl.value.trim();
        if (!q) {
            resultsEl.innerHTML = '<div class="error">Please enter a SOQL query</div>';
            return;
        }

        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        resultsEl.innerHTML = '<div class="muted">Running query and preparing CSV…</div>';

        const resp = await runSoql(q);
        if (!resp || !resp.ok) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export CSV';
            const errorMsg = resp && resp.err ? resp.err : 'No response from background service';
            resultsEl.innerHTML = `<div class="error"><strong>Export Failed:</strong><br>${escapeHtml(errorMsg)}</div>`;
            return;
        }

        try {
            const records = resp.data.records || [];
            if (records.length === 0) {
                exportBtn.disabled = false;
                exportBtn.textContent = 'Export CSV';
                resultsEl.innerHTML = '<div class="muted">No records to export</div>';
                return;
            }

            const csv = toCSV(records);
            const dresp = await downloadCsv(csv, 'soql-export.csv');

            exportBtn.disabled = false;
            exportBtn.textContent = 'Export CSV';

            if (!dresp || !dresp.ok) {
                const errorMsg = dresp && dresp.err ? dresp.err : 'unknown error';
                resultsEl.innerHTML = `<div class="error"><strong>Download Failed:</strong><br>${escapeHtml(errorMsg)}</div>`;
                return;
            }

            resultsEl.innerHTML = `<div class="muted"><strong>✓ CSV Export Successful!</strong><br>Downloaded ${records.length} records (Download ID: ${escapeHtml(String(dresp.id))})</div>`;
            renderResults(resp.data);
        } catch (e) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export CSV';
            resultsEl.innerHTML = `<div class="error"><strong>CSV Conversion Error:</strong><br>${escapeHtml(e.message)}</div>`;
        }
    });
});
