# Salesforce Inspector - OAuth Setup Guide

## Overview
This extension now uses OAuth 2.0 authentication instead of session cookies, providing a more secure and reliable way to access Salesforce APIs.

---

## Architecture

```
User clicks "Generate Token" 
    ↓
Extension opens OAuth flow
    ↓
User logs into Salesforce
    ↓
Salesforce redirects with access token
    ↓
Extension stores token securely
    ↓
All API calls use the stored token
```

---

## Setup Steps

### Step 1: Create a Salesforce Connected App

1. **Log into your Salesforce org**
2. Go to **Setup** → **Apps** → **App Manager**
3. Click **New Connected App**
4. Fill in the details:
   - **Connected App Name**: `Salesforce Inspector Extension`
   - **API Name**: `Salesforce_Inspector_Extension`
   - **Contact Email**: Your email
5. **Enable OAuth Settings**: Check this box
6. **Callback URL**: Enter your extension's redirect URI:
   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org/oauth2
   ```
   (You'll get this from the Options page after installing the extension)

7. **Selected OAuth Scopes**: Add these scopes:
   - `Access and manage your data (api)`
   - `Perform requests on your behalf at any time (refresh_token, offline_access)`
   - `Access your basic information (id, profile, email, address, phone)`

8. **Save** the Connected App

9. **Copy the Consumer Key** (Client ID) - you'll need this

### Step 2: Install the Extension

1. Open Chrome/Edge
2. Go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the folder: `g:\salesforce_skill\sf_loader`

### Step 3: Configure the Extension

1. Click the extension icon in your browser toolbar
2. Click **Options** or right-click → **Options**
3. In the **OAuth Configuration** section:
   - Copy the **Redirect URI** shown
   - Go back to your Connected App and add this URI if you haven't already
   - Paste your **Client ID** (Consumer Key) from the Connected App
   - Click **Save OAuth Settings**

### Step 4: Add Your Salesforce Org

1. In the Options page, go to **Add Salesforce Org** section
2. Fill in:
   - **Organization Name**: e.g., "Production", "Sandbox", "Dev Org"
   - **Instance URL**: e.g., `https://yourinstance.salesforce.com`
   - **Org Type**: Select Production, Sandbox, or Developer Edition
3. Click **Add Organization**

### Step 5: Generate Access Token

1. In the **Saved Organizations** section, find your org
2. Click **Generate Token**
3. A new window will open with Salesforce login
4. Log in with your Salesforce credentials
5. Click **Allow** to grant permissions
6. The window will close and your token will be saved
7. You should see "✓ Authenticated" next to your org

---

## Usage

### Using the Extension

1. **Navigate to any Salesforce page** in your org
2. **Click the Inspector button** (bottom-right floating button)
3. The overlay will show record details
4. **Click the extension icon** to open the SOQL editor
5. Write your SOQL query and click **Run**
6. Export results as CSV if needed

### Managing Multiple Orgs

- You can add multiple orgs (Production, Sandbox, etc.)
- Each org has its own access token
- The extension will automatically use the token for the current org you're viewing

### Refreshing Tokens

- Access tokens expire after a certain time
- Click **Refresh Token** to get a new token
- The extension will show "⚠ Not authenticated" if the token has expired

---

## Troubleshooting

### "Permission denied" error
- Make sure you've generated an access token for the org
- Try clicking **Refresh Token** to get a new token

### OAuth flow doesn't open
- Check that you've added the `identity` permission in manifest.json
- Make sure the redirect URI in your Connected App matches exactly

### "Invalid client_id" error
- Verify the Client ID in Options matches your Connected App's Consumer Key
- Make sure the Connected App is approved and active

### Token expired
- Click **Refresh Token** to generate a new one
- Tokens typically last for 2 hours by default

---

## Security Notes

✅ **Secure Storage**: Tokens are stored in Chrome's secure storage (chrome.storage.local)
✅ **No External Servers**: All authentication happens directly with Salesforce
✅ **User Control**: Users can revoke access anytime from Salesforce Setup
✅ **Scoped Permissions**: Extension only requests necessary OAuth scopes

⚠️ **Important**: Never share your access tokens or Client Secret with anyone

---

## Differences from Session-Based Auth

| Feature | Session Cookies | OAuth Tokens |
|---------|----------------|--------------|
| Setup | None | Requires Connected App |
| Security | Relies on browser session | Dedicated access token |
| Multi-org | Limited | Full support |
| Token Expiry | Session-based | Configurable (default 2hrs) |
| Refresh | Automatic | Manual click |
| Best for | Quick testing | Production use |

---

## Next Steps

1. ✅ Create Connected App in Salesforce
2. ✅ Install extension
3. ✅ Configure OAuth settings
4. ✅ Add your orgs
5. ✅ Generate tokens
6. ✅ Start inspecting!

---

## Default Client ID

If you don't want to create your own Connected App, you can use a default one (not recommended for production):

**Note**: For security and reliability, it's highly recommended to create your own Connected App.

---

## Support

If you encounter issues:
1. Check the browser console for errors (F12)
2. Check the service worker logs (chrome://extensions → Service worker)
3. Verify your Connected App settings in Salesforce
4. Make sure all URLs and Client IDs match exactly
