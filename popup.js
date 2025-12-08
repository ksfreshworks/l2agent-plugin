// Popup script - handles UI interactions
document.addEventListener("DOMContentLoaded", () => {
  const actionBtn = document.getElementById("action-btn");
  const statusText = document.getElementById("status-text");
  const resultDiv = document.getElementById("result");

  // Check if URL is injectable (not chrome://, edge://, etc.)
  function isInjectableUrl(url) {
    return url && (url.startsWith("http://") || url.startsWith("https://"));
  }

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.url) {
      try {
        statusText.textContent = `Active on: ${
          new URL(currentTab.url).hostname
        }`;
      } catch {
        statusText.textContent = "Active on: Unknown page";
      }
    }
  });

  // Handle button click
  actionBtn.addEventListener("click", async () => {
    resultDiv.classList.remove("show", "error");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Check if we can inject into this page
      if (!isInjectableUrl(tab.url)) {
        resultDiv.textContent =
          "Cannot run on this page (chrome:// or extension pages)";
        resultDiv.classList.add("show", "error");
        return;
      }

      // Try to inject content script first (in case it's not loaded)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch (injectError) {
        // Script might already be injected, continue anyway
        console.log("Script injection skipped:", injectError.message);
      }

      // Now send the message
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "doSomething",
      });

      resultDiv.textContent = response?.message || "Action completed!";
      resultDiv.classList.add("show");
    } catch (error) {
      console.error("Error:", error);
      resultDiv.textContent = "Error: " + error.message;
      resultDiv.classList.add("show", "error");
    }
  });

  // Load saved settings
  chrome.storage.sync.get(["settings"], (result) => {
    if (result.settings) {
      console.log("Loaded settings:", result.settings);
    }
  });
});
