// Options page script
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("options-form");
  const enabledCheckbox = document.getElementById("enabled");
  const backendUrlInput = document.getElementById("backend-url");
  const customSettingInput = document.getElementById("custom-setting");
  const saveMessage = document.getElementById("save-message");

  // Load saved settings
  chrome.storage.sync.get(["settings"], (result) => {
    if (result.settings) {
      enabledCheckbox.checked = result.settings.enabled !== false;
      if (result.settings.backendUrl) {
        backendUrlInput.value = result.settings.backendUrl;
      }
      if (result.settings.customSetting) {
        customSettingInput.value = result.settings.customSetting;
      }
    }
  });

  // Save settings
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const settings = {
      enabled: enabledCheckbox.checked,
      backendUrl: backendUrlInput.value || "http://localhost:3000",
      customSetting: customSettingInput.value,
      lastUpdated: new Date().toISOString(),
    };

    chrome.storage.sync.set({ settings }, () => {
      saveMessage.classList.add("show");
      setTimeout(() => {
        saveMessage.classList.remove("show");
      }, 2000);
    });
  });
});
