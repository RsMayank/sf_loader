# SF Loader v0.3.0 - Full Inspector Interface

## 🎉 What's New

The extension now opens a **full-page SOQL Inspector** (like Salesforce Inspector) instead of a small popup!

## 📋 How It Works

### User Flow

1. **Click Extension Icon** → Opens a small popup
2. **Click "Open SOQL Inspector"** → Opens full inspector interface in a new tab
3. **Click "Authorize & Connect"** → Automatically detects your Salesforce session
4. **Start Querying!** → Run SOQL queries and export to CSV

### Automatic Authorization

When you click "Authorize & Connect to Salesforce":

1. **Checks for open Salesforce tabs**
   - If found: Injects content script and extracts session automatically
   - If not found: Opens Salesforce login page

2. **Session Detection**
   - Tries 7 different methods to extract session ID
   - Retries up to 10 times (every 1 second)
   - Polls every 2 seconds until session is detected

3. **Ready to Query**
   - Once authorized, the full query interface appears
   - No manual token entry needed!

## 🎨 Features

### Full-Page Inspector Interface
- **Beautiful gradient design** with modern UI
- **Large query editor** with syntax highlighting
- **Full-width results table** with scrolling
- **Export to CSV** with one click
- **Connection status** indicator
- **Instance URL** display

### Automatic Session Detection
- **Zero configuration** - just click authorize
- **Smart detection** - finds Salesforce tabs automatically
- **Persistent sessions** - remembers your connection
- **Auto-refresh** - polls for new sessions

### SOQL Query Editor
- **Large text area** for complex queries
- **Run Query** button with loading states
- **Clear** button to reset
- **Export CSV** directly from results

## 📁 New Files

### `inspector.html`
Full-page interface with:
- Authorization section (shown when not connected)
- Query editor section (shown when connected)
- Beautiful gradient background
- Responsive design

### `inspector.js`
Main logic for:
- Authorization flow
- Session detection
- SOQL query execution
- Results rendering
- CSV export

### Updated Files

#### `popup.html`
- Simplified to just show connection status
- Single button to open inspector
- Clean, minimal design

#### `popup.js`
- Just checks connection status
- Opens inspector.html in new tab

#### `manifest.json`
- Added `tabs` permission
- Bumped version to 0.3.0

## 🚀 Usage Guide

### First Time Setup

1. **Install the extension**
   ```
   chrome://extensions/ → Load unpacked → Select sf_loader folder
   ```

2. **Click the extension icon**
   - Small popup appears
   - Shows connection status

3. **Click "Open SOQL Inspector"**
   - New tab opens with full interface

4. **Click "Authorize & Connect to Salesforce"**
   - If you have a Salesforce tab open: Session detected automatically
   - If not: Salesforce login page opens → Log in → Session detected

5. **Start querying!**
   - Enter SOQL query
   - Click "Run Query"
   - View results in table
   - Export to CSV if needed

### Daily Usage

1. **Click extension icon** → **Click "Open SOQL Inspector"**
2. If already authorized: Query interface appears immediately
3. If not: Click "Authorize & Connect" once

## 🔍 Authorization Flow Details

### Scenario 1: Salesforce Tab Already Open ✅
```
User clicks "Authorize & Connect"
  ↓
Extension finds Salesforce tab
  ↓
Injects content-script.js
  ↓
Content script extracts session ID
  ↓
Saves to chrome.storage.local
  ↓
Inspector detects session
  ↓
Shows query interface
```

### Scenario 2: No Salesforce Tab Open
```
User clicks "Authorize & Connect"
  ↓
No Salesforce tab found
  ↓
Opens https://login.salesforce.com
  ↓
User logs in
  ↓
Content script auto-injects
  ↓
Session extracted and saved
  ↓
Inspector polls and detects session
  ↓
Shows query interface
```

### Scenario 3: Session Already Saved
```
User opens inspector
  ↓
Checks chrome.storage.local
  ↓
Session found (< 2 hours old)
  ↓
Skips authorization
  ↓
Shows query interface immediately
```

## 💡 Technical Details

### Session Storage
```javascript
{
  sessionId: "00D...",           // Auto-detected session
  instanceUrl: "https://...",    // Salesforce instance
  sessionDetectedAt: 1732456789, // Timestamp
}
```

### Session Validity
- **Auto-detected sessions**: Valid for 2 hours
- **After 2 hours**: User needs to refresh Salesforce page or re-authorize

### Detection Methods
1. `window.$Api.getClient().getSessionId()` (Lightning)
2. `window.sforce.connection.sessionId` (Classic)
3. `window.UserContext.sessionId` (Visualforce)
4. `window.Sfdc.canvas.client.token()` (Canvas)
5. `window.__NEXT_DATA__.props` (Next.js pages)
6. `window.Aura.getToken()` (Aura framework)
7. Meta tags with `salesforce-session`

### Polling Intervals
- **Content script**: Retries every 1 second (max 10 attempts)
- **Inspector**: Polls every 2 seconds when waiting for authorization
- **Timeout**: Stops polling after 5 minutes

## 🎯 Benefits

### For Users
- ✅ **Full-screen interface** - More space for queries and results
- ✅ **One-click authorization** - No manual token entry
- ✅ **Persistent sessions** - Stays connected for 2 hours
- ✅ **Beautiful UI** - Modern, gradient design

### For Developers
- ✅ **Clean separation** - Popup vs Inspector
- ✅ **Reusable components** - Session detection logic
- ✅ **Easy to extend** - Add more features to inspector
- ✅ **Well documented** - Clear code comments

## 🐛 Troubleshooting

### Authorization Not Working?
1. **Check if you're logged into Salesforce**
   - Open a Salesforce tab manually
   - Try authorization again

2. **Check browser console**
   - Look for "SF Loader: Session detected and saved automatically ✓"
   - If not found, content script may not be injecting

3. **Reload the extension**
   - Go to `chrome://extensions/`
   - Click reload icon on SF Loader

### Session Not Persisting?
1. **Check session age**
   - Sessions expire after 2 hours
   - Refresh Salesforce page to get new session

2. **Check storage**
   - Open console: `chrome.storage.local.get(console.log)`
   - Verify sessionId and instanceUrl are present

### Query Failing?
1. **Check SOQL syntax**
   - Verify query is valid
   - Try in Salesforce Developer Console first

2. **Check connection**
   - Verify status shows "Connected"
   - Try re-authorizing

## 📝 Next Steps (Optional Enhancements)

- [ ] Add syntax highlighting to SOQL editor
- [ ] Add query history (save recent queries)
- [ ] Add query templates (common queries)
- [ ] Add field autocomplete
- [ ] Add object browser
- [ ] Add relationship viewer
- [ ] Add bulk API support for large exports
- [ ] Add dark mode toggle
- [ ] Add keyboard shortcuts

## 🎊 Summary

The extension now provides a **professional, full-page SOQL Inspector** with:
- ✅ One-click authorization
- ✅ Automatic session detection
- ✅ Full-screen query editor
- ✅ Beautiful, modern UI
- ✅ CSV export functionality
- ✅ Persistent sessions

**No more manual token entry!** Just click, authorize, and start querying! 🚀
