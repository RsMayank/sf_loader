# SF Loader

A powerful Chrome/Edge extension for Salesforce developers and admins. Inspect records, run SOQL queries, and export data with ease.

## ✨ Key Features

### 🔄 **Automatic Session Detection**
- **Zero configuration required!** Just browse Salesforce normally
- Automatically detects and uses your active Salesforce session
- No need to manually generate tokens or configure OAuth
- Works seamlessly with Lightning Experience and Classic UI

### 🔍 **Record Inspector**
- Floating button on Salesforce record pages
- Automatically detects record ID and object type
- Shows key field values in a clean overlay
- **Show All Data**: One-click access to view all fields for a record
- Supports 20+ standard objects + custom objects

### 📊 **SOQL Query Editor**
- Run SOQL queries directly from the browser
- View results in a formatted table
- Export results to CSV with one click
- Field suggestions and autocomplete

### 📥 **CSV Export**
- Export query results to CSV instantly
- Proper escaping and formatting
- Download directly to your computer

## 🚀 Quick Start

### Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `sf_loader` folder
5. The extension icon should appear in your toolbar

### Usage
1. **Navigate to any Salesforce record page**
2. **Look for the floating rocket icon (🚀)** in the bottom right corner
3. **Click the icon** to open the quick inspector overlay
   - View key fields instantly
   - Click **"Open Inspector"** to open the full query interface
   - Click **"Show All Data"** to view all fields for the current record
4. **Or click the extension icon** in the browser toolbar to open the Inspector directly

See [Inspector Interface Guide](./docs/inspector-interface-guide.md) for detailed usage.

## 📁 Project Structure

```
sf_loader/
├── manifest.json          # Extension configuration
├── README.md              # This file
├── icons/                 # Extension icons
├── background.js          # Service worker (handles API requests)
├── content-script.js      # Injects inspector button, auto-detects session
├── popup.html             # Small popup UI
├── popup.js               # Opens inspector in new tab
├── inspector.html         # Full-page SOQL inspector interface
├── inspector.js           # Inspector logic (authorization, queries, export)
├── options.html           # Settings page
├── options.js             # Settings logic
├── assets/
│   └── styles.css         # Styling for inspector overlay
└── docs/
    ├── auto-session-detection.md    # Auto-detection guide
    ├── inspector-interface-guide.md # Full inspector guide
    └── oauth-setup-guide.md         # Manual token setup guide
```

## 🛠️ Requirements

- **Browser**: Chrome or Edge (desktop)
- **Salesforce**: Any Salesforce org where you're logged in
- **No server required**: Uses browser session cookies

## 📖 Documentation

- [Automatic Session Detection](./docs/auto-session-detection.md) - How auto-detection works
- [OAuth Setup Guide](./docs/oauth-setup-guide.md) - Manual token configuration

## 🎯 Supported Objects

Account, Contact, User, Opportunity, Lead, Case, Contract, Campaign, Group, Organization, Profile, PermissionSet, RecordType, Task, Event, Note, Report, Folder, Dashboard, CustomField, Pricebook2, Product2, PricebookEntry, Attachment, ContentVersion, ContentDocument, and all custom objects.

## 🔒 Privacy & Security

- All session tokens are stored **locally** in your browser
- Never sent to external servers
- Only communicates with **your** Salesforce instance
- Uses Salesforce REST API v62.0

## 📝 License

MIT License - Feel free to use and modify!


