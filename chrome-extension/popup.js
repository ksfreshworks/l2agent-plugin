// Popup script - handles UI interactions
document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('action-btn');
  const statusText = document.getElementById('status-text');
  const resultDiv = document.getElementById('result');

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab) {
      statusText.textContent = `Active on: ${new URL(currentTab.url).hostname}`;
    }
  });

  // Handle button click
  actionBtn.addEventListener('click', async () => {
    try {
      // Get current tab and extract page content
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Extract page content
      const pageData = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractPageContent'
      });

      if (!pageData.success) {
        throw new Error('Failed to extract page content');
      }

      // Send to backend for analysis
      const backendResponse = await chrome.runtime.sendMessage({
        action: 'analyzePage',
        url: pageData.data.url,
        title: pageData.data.title,
        content: pageData.data.content,
        metadata: pageData.data.metadata
      });

      if (backendResponse.success) {
        resultDiv.textContent = 'Page analyzed successfully!';
        resultDiv.classList.add('show');
        console.log('Backend response:', backendResponse.result);
      } else {
        throw new Error(backendResponse.error || 'Backend request failed');
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.textContent = 'Error: ' + error.message;
      resultDiv.classList.add('show', 'error');
    }
  });

  // Load saved settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (result.settings) {
      console.log('Loaded settings:', result.settings);
    }
  });
});

