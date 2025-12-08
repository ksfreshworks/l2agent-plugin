// Background service worker (Manifest V3)
// This runs in the background and persists across page loads

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      settings: {
        enabled: true,
        version: '1.0.0'
      }
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'getData') {
    // Example: Fetch data or perform background task
    sendResponse({ success: true, data: 'Background data' });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

