# Automatic Session Detection

## Overview
SF Loader now **automatically detects and uses your Salesforce session** when you're logged into Salesforce. No manual token generation needed!

## How It Works

### 1. **Automatic Detection**
When you visit any Salesforce page while logged in, the extension:
- Automatically extracts your session ID from the page
- Stores it securely in browser storage
- Makes it available for SOQL queries

### 2. **Multiple Detection Methods**
The extension tries several methods to find your session:
- **Lightning Experience**: `window.$Api.getClient().getSessionId()`
- **Classic UI**: `window.sforce.connection.sessionId`
- **Visualforce Pages**: `window.UserContext.sessionId`
- **Aura Framework**: `window.Aura.getToken()`
- **Canvas Apps**: `window.Sfdc.canvas.client.token()`
- **Meta Tags**: Checks for session in page metadata

### 3. **Retry Logic**
- The extension attempts detection up to **10 times** (every 1 second)
- This ensures the session is captured even if the page loads slowly
- Works with Single Page Applications (SPA) navigation

### 4. **Session Freshness**
- Auto-detected sessions are valid for **2 hours**
- After 2 hours, you'll need to refresh your Salesforce page
- The extension will automatically re-detect the new session

## User Experience

### When Auto-Detection Works ✅
1. Navigate to any Salesforce page (while logged in)
2. Open the SF Loader popup
3. You'll see: **"✓ Session auto-detected from Salesforce page. Ready to run SOQL queries."**
4. The "Generate Token" button is **hidden**
5. You can immediately run SOQL queries!

### When Manual Token Is Needed ⚠️
If auto-detection fails (rare cases):
1. Click "Generate Token" button
2. Follow the instructions to get a session ID manually
3. Enter your Instance URL and Access Token
4. Click "Save Token"

## Benefits

✅ **Zero Configuration** - Just browse Salesforce normally  
✅ **Seamless Experience** - No interruptions or manual steps  
✅ **Always Fresh** - Automatically updates when you navigate  
✅ **Secure** - Session stored locally in browser only  
✅ **Fallback Available** - Manual token entry if needed  

## Troubleshooting

### Session Not Detected?
1. **Refresh the Salesforce page** - This triggers detection
2. **Check browser console** - Look for "SF Loader: Session detected and saved automatically ✓"
3. **Verify you're logged in** - Must be on a Salesforce domain
4. **Try a different page** - Some pages have better session access

### Still Not Working?
Use the manual token method:
1. Click "Generate Token"
2. Follow the [OAuth Setup Guide](./oauth-setup-guide.md)
3. Or use [Workbench](https://workbench.developerforce.com/) to get a session ID

## Technical Details

### Storage Keys
- `sessionId`: The auto-detected session token
- `instanceUrl`: Your Salesforce instance URL (e.g., https://yourcompany.salesforce.com)
- `sessionDetectedAt`: Timestamp of when session was detected
- `accessToken`: Manually entered token (fallback)

### Detection Frequency
- **Initial**: Runs immediately when page loads
- **Retry**: Every 1 second for up to 10 seconds
- **Popup Check**: Every 2 seconds when popup is open
- **Navigation**: Triggers on SPA page changes

### Session Priority
1. **Auto-detected session** (if recent, within 2 hours)
2. **Manual token** (if no auto-detected session)
3. **No session** (prompt user to navigate to Salesforce or enter token)

## Privacy & Security

- Session tokens are stored **locally** in your browser only
- Never sent to any external servers
- Only used to communicate with **your** Salesforce instance
- Cleared when you disconnect or clear browser data
