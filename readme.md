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

