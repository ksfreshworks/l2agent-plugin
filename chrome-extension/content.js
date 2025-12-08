// Content script - runs in the context of web pages
// This can access and modify the DOM of the pages you visit

console.log("L2 Agent content script loaded");

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);

  if (request.action === "doSomething") {
    // Example: Modify the page or extract data
    const pageTitle = document.title;
    const pageUrl = window.location.href;

    sendResponse({
      success: true,
      message: `Processed: ${pageTitle}`,
      url: pageUrl,
    });
  }

  if (request.action === "extractPageContent") {
    // Extract page content for analysis
    const pageData = {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText || document.body.textContent || '',
      html: document.documentElement.outerHTML.substring(0, 50000), // Limit HTML size
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language
      }
    };

    sendResponse({
      success: true,
      data: pageData
    });
  }

  return true; // Keep the message channel open for async response
});

// Example: Inject a custom element into the page
function injectCustomElement() {
  // Be careful not to interfere with existing page content
  const customDiv = document.createElement("div");
  customDiv.id = "l2agent-custom";
  customDiv.style.display = "none"; // Hidden by default
  document.body.appendChild(customDiv);
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectCustomElement);
} else {
  injectCustomElement();
}
