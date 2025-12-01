# SF Loader v0.3.0 - Release Notes

**Release Date**: November 24, 2025

## 🎉 Major Update: Full-Page Inspector Interface

This release transforms SF Loader from a simple popup extension to a **professional, full-featured SOQL Inspector** with automatic session detection and a beautiful full-page interface.

---

## ✨ What's New

### 1. Full-Page SOQL Inspector
- **New Tab Interface**: Opens in a dedicated tab instead of a cramped popup
- **Large Query Editor**: Spacious text area for complex SOQL queries
- **Full-Width Results Table**: See all your data without scrolling horizontally
- **Beautiful Design**: Modern gradient UI with purple theme (#667eea to #764ba2)
- **Professional Layout**: Clean, organized interface similar to Salesforce Inspector

### 2. One-Click Authorization
- **Automatic Session Detection**: No more manual token entry!
- **Smart Tab Detection**: Finds open Salesforce tabs automatically
- **Auto-Login Flow**: Opens Salesforce login if no tab is found
- **Persistent Sessions**: Stays connected for 2 hours
- **Zero Configuration**: Just click "Authorize & Connect" and you're ready

### 3. Enhanced Session Detection
- **7 Detection Methods**: Works across Lightning, Classic, Visualforce, and more
- **Retry Logic**: Attempts detection up to 10 times (every 1 second)
- **Polling System**: Checks every 2 seconds when waiting for authorization
- **Session Validation**: Ensures session is valid before saving
- **Console Logging**: Debug-friendly messages for troubleshooting

### 4. Simplified Popup
- **Minimal Design**: Small, clean popup with connection status
- **Single Action**: One button to open the full inspector
- **Status Indicator**: Green/red dot shows connection state
- **Quick Access**: Fast way to launch the inspector

---

## 🔧 Technical Changes

### New Files
- **`inspector.html`** - Full-page SOQL inspector interface
- **`inspector.js`** - Authorization logic, query execution, CSV export
- **`docs/inspector-interface-guide.md`** - Complete usage documentation
- **`docs/v0.3.0-release-notes.md`** - Detailed technical release notes

### Modified Files
- **`popup.html`** - Simplified to launcher interface
- **`popup.js`** - Reduced to status check and tab opening
- **`content-script.js`** - Enhanced with 7 session detection methods
- **`manifest.json`** - Added `tabs` permission, bumped to v0.3.0
- **`readme.md`** - Updated with new usage flow

### Permissions Added
- **`tabs`** - Required to create inspector tab and query for Salesforce tabs

---

## 🚀 User Experience Improvements

### Before (v0.2.0)
- ❌ Small popup with limited space
- ❌ Manual token entry required
- ❌ Cramped query editor
- ❌ Small results table
- ❌ No clear authorization flow

### After (v0.3.0)
- ✅ Full-page inspector interface
- ✅ One-click automatic authorization
- ✅ Large, comfortable query editor
- ✅ Full-width results table
- ✅ Clear, guided authorization flow
- ✅ Beautiful, modern design
- ✅ Persistent sessions (2 hours)

---

## 📋 How to Use

### First Time Setup
1. Click the SF Loader extension icon
2. Click "Open SOQL Inspector"
3. Click "Authorize & Connect to Salesforce"
4. Session is detected automatically!
5. Start running SOQL queries

### Daily Usage
1. Click extension icon → "Open SOQL Inspector"
2. If already authorized: Start querying immediately
3. If not: Click "Authorize & Connect" once

---

## 🔍 Session Detection Methods

The extension now tries **7 different methods** to extract your Salesforce session:

1. **Lightning Experience**: `window.$Api.getClient().getSessionId()`
2. **Classic UI**: `window.sforce.connection.sessionId`
3. **Visualforce Pages**: `window.UserContext.sessionId`
4. **Canvas Apps**: `window.Sfdc.canvas.client.token()`
5. **Next.js Pages**: `window.__NEXT_DATA__.props`
6. **Aura Framework**: `window.Aura.getToken()`
7. **Meta Tags**: `<meta name="salesforce-session">`

---

## 🎨 Design Highlights

- **Purple Gradient Background**: Modern, eye-catching design
- **White Content Cards**: Clean, professional appearance
- **Rounded Corners & Shadows**: Depth and visual hierarchy
- **Green Status Indicator**: Clear connection feedback
- **Blue Action Buttons**: Prominent call-to-action
- **Responsive Layout**: Works on all screen sizes
- **Loading States**: Visual feedback for all operations

---

## 🐛 Bug Fixes

- Fixed session detection reliability issues
- Improved error handling for failed queries
- Better validation of session tokens
- Enhanced CORS handling for Salesforce API calls

---

## 📊 Performance Improvements

- **Faster Authorization**: Parallel tab detection
- **Optimized Polling**: Smart retry intervals
- **Efficient Storage**: Minimal chrome.storage usage
- **Lazy Loading**: Results render progressively

---

## 🔒 Security Enhancements

- **Local Storage Only**: Sessions never sent to external servers
- **Session Validation**: Checks token format before saving
- **Expiration Handling**: Auto-expires sessions after 2 hours
- **Secure Communication**: All API calls use HTTPS

---

## 📖 Documentation

New comprehensive documentation added:

- **[Inspector Interface Guide](./docs/inspector-interface-guide.md)** - Complete usage guide
- **[Auto Session Detection](./docs/auto-session-detection.md)** - Technical details
- **[Implementation Summary](./docs/implementation-summary.md)** - Developer notes
- **[README](./readme.md)** - Updated project overview

---

## 🎯 Breaking Changes

### None! 
This is a **backward-compatible** update. Existing functionality is preserved:
- Content script still works on Salesforce pages
- Background service worker unchanged
- All existing permissions maintained
- Previous session storage format compatible

---

## 🔮 Future Enhancements

Planned for future releases:

- [ ] Syntax highlighting in SOQL editor
- [ ] Query history and favorites
- [ ] Query templates for common operations
- [ ] Field autocomplete
- [ ] Object browser
- [ ] Relationship viewer
- [ ] Bulk API support for large exports
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts (Ctrl+Enter to run)

---

## 🙏 Acknowledgments

This release was inspired by the popular **Salesforce Inspector** extension, bringing similar functionality with modern design and automatic session detection.

---

## 📞 Support

For issues, questions, or feature requests:
- Check the [Inspector Interface Guide](./docs/inspector-interface-guide.md)
- Review [Troubleshooting](./docs/inspector-interface-guide.md#-troubleshooting)
- Open an issue on the project repository

---

## 🎊 Summary

**SF Loader v0.3.0** represents a major leap forward in usability and functionality. The new full-page inspector interface combined with automatic session detection provides a **professional, zero-configuration experience** for Salesforce developers and administrators.

**No more manual token generation!** Just click, authorize, and start querying! 🚀

---

**Upgrade Instructions**: Simply reload the extension in `chrome://extensions/` to get the latest version.

**Compatibility**: Chrome 88+, Edge 88+, or any Chromium-based browser supporting Manifest V3.
