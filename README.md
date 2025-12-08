# L2 Agent Chrome Extension

A foundation for building Chrome extensions with Manifest V3.

## Structure

```
l2agent/
├── manifest.json       # Extension configuration
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── background.js       # Background service worker
├── content.js          # Content script (runs on web pages)
├── options.html        # Options/settings page
├── options.js          # Options page logic
├── styles.css          # Shared styles
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Setup

1. **Create Icons**
   - Create an `icons` folder
   - Add three PNG icons: `icon16.png`, `icon48.png`, `icon128.png`
   - You can use any image editor or online tools to create these

2. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `l2agent` folder

3. **Development**
   - Make changes to your files
   - Click the refresh icon on the extension card to reload
   - Check the browser console for logs from content scripts
   - Check the extension's service worker console for background script logs

## Features

- **Popup**: Click the extension icon to open the popup
- **Content Script**: Automatically runs on all web pages
- **Background Service Worker**: Handles background tasks
- **Options Page**: Right-click extension icon → Options to access settings
- **Storage**: Uses Chrome's sync storage API for settings

## Permissions

Current permissions:
- `activeTab`: Access to the currently active tab
- `storage`: Store extension settings
- `host_permissions`: Access to all HTTP/HTTPS sites (for content scripts)

Modify `manifest.json` to add or remove permissions as needed.

## Next Steps

1. Add your extension logic to `content.js`, `popup.js`, or `background.js`
2. Customize the UI in `popup.html` and `styles.css`
3. Add more permissions if needed
4. Create icons for your extension
5. Test thoroughly before publishing

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/)

