// popup.js
// Run SOQL and render results. CSV export instructs background to download.

document.addEventListener('DOMContentLoaded', () => {
    const soqlEl = document.getElementById('soql');
    const runBtn = document.getElementById('run-soql');
    const exportBtn = document.getElementById('export-csv');
    const resultsEl = document.getElementById('results');

    runBtn.addEventListener('click', async () => {
        const q = soqlEl.value.trim();
        if (!q) return;
        resultsEl.innerHTML = '<div class="muted">Running...</div>';

        // Ask the background to run the SOQL. We use the active tab as sender by default.
        chrome.runtime.sendMessage({ type: 'SOQL_QUERY', query: q }, (resp) => {
            if (!resp || !resp.ok) {
                resultsEl.innerHTML = `<div class="error">Error: ${escapeHtml(resp && resp.err ? resp.err : 'No response')}</div>`;
                return;
            }
            renderResults(resp.data);
        });
    });

    exportBtn.addEventListener('click', async () => {
        const q = soqlEl.value.trim();
        if (!q) return;
        resultsEl.innerHTML = '<div class="muted">Running and exporting...</div>';

        // get the rows first
        chrome.runtime.sendMessage({ type: 'SOQL_QUERY', query: q }, (resp) => {
            if (!resp || !resp.ok) {
                resultsEl.innerHTML = `<div class="error">Error: ${escapeHtml(resp && resp.err ? resp.err : 'No response')}</div>`;
                return;
            }
            try {
                const csv = toCSV(resp.data.records || []);
                chrome.runtime.sendMessage({ type: 'DOWNLOAD_CSV', csv, filename: 'soql-export.csv' }, (dresp) => {
                    if (!dresp || !dresp.ok) {
                        resultsEl.innerHTML = `<div class="error">Download error: ${escapeHtml(dresp && dresp.err ? dresp.err : 'unknown')}</div>`;
                        return;
                    }
                    resultsEl.innerHTML = `<div class="muted">Export started (id: ${escapeHtml(String(dresp.id))})</div>`;
                });
            } catch (e) {
                resultsEl.innerHTML = `<div class="error">CSV conversion error: ${escapeHtml(e.message)}</div>`;
            }
        });
    });

    function renderResults(data) {
        // Basic rendering: show totalSize and first 100 records JSON and a simple table preview
        const count = data.totalSize || (data.records && data.records.length) || 0;
        const recs = data.records || [];

        if (count === 0) {
            resultsEl.innerHTML = '<div class="muted">No records returned.</div>';
            return;
        }

        // compute columns as union of keys (preserve order from first record)
        const cols = Array.from(new Set(recs.flatMap(r => Object.keys(r))));
        const table = document.createElement('table');
        table.className = 'results-table';
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

    // convert array of objects to CSV (simple)
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

    function escapeHtml(s) {
        return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    }
});
