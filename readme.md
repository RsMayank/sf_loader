salesforce-inspector/
├── manifest.json
├── README.md           ← (this file)
├── icons/
├── background.js       ← service worker (handles REST requests + downloads)
├── content-script.js   ← injects button, overlay, detects record id
├── popup.html
├── popup.js            ← SOQL editor + results + CSV export
├── options.html
├── options.js
├── assets/styles.css
└── docs/dev-notes.md


Requirements

Chrome or Edge (desktop). MV3 extensions use the service worker model.

A Salesforce org (Developer org or sandbox) where you are logged in in the browser (for development/testing).

No server or connected app required for this starter — the extension uses the browser session cookies to call Salesforce REST endpoints.

Quick install (load unpacked)

Open Chrome and go to chrome://extensions/

Enable Developer mode (top-right).

Click Load unpacked and select the salesforce-inspector/ folder.

You should see the extension icon appear in the toolbar.

Quick test (on a Salesforce record page)

Log in to your Salesforce dev org in the same browser profile you used to install the extension.

Open any record page (Account, Contact, etc.). URL should contain the 15/18-character record id.

Click the Inspector floating button (bottom-right).

An overlay will open and try to detect the record id and load a small set of fields.

Click the extension icon in the browser toolbar to open the popup.

Run the default SOQL: SELECT Id, Name FROM Account LIMIT 10 (or edit and run your own).

Results should appear in the popup; click Export CSV to download the results.

Files you’ll edit first

manifest.json — hosts, permissions, and entry points. Add/remove host permissions if needed.

assets/styles.css — tweak UI look & feel.

content-script.js — change record detection heuristics and which fields to fetch for quick display.

background.js — change API version (default v56.0) or add new message handlers (e.g., bulk export).

popup.js — change result rendering, add pagination, or switch to Bulk API for big exports.

Developer tips & troubleshooting

If SOQL returns no_tab_url or the popup says “No response”, make sure:

You loaded the extension unpacked and it’s enabled.

You are testing on a Salesforce page where you are logged in.

host_permissions in manifest.json include your instance domain (*.salesforce.com or a custom domain).

Check logs:

Open the page where content-script runs → DevTools Console (to see injected script logs).

Go to chrome://extensions/ → find the extension → click Service worker (Inspect) to view background.js logs.

If fetch returns HTTP errors, copy the request URL and try it in DevTools Network tab to inspect response and headers.

CSP: avoid injecting remote scripts into Salesforce pages — keep UI contained and static to reduce breakage risk.

Security & best practices

This starter uses the logged-in session (cookies) to call the REST API. That means:

The extension performs actions with the same permissions as the logged-in user.

Do not ship code that sends org data to external servers without explicit user consent.

For distribution or multi-org use, implement OAuth (PKCE) and a secure token exchange flow — this starter intentionally omits OAuth for faster local development.