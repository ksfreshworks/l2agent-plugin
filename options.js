// Options page script
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("options-form");
  const enabledCheckbox = document.getElementById("enabled");
  const customSettingInput = document.getElementById("custom-setting");
  const saveMessage = document.getElementById("save-message");

  // Load saved settings
  chrome.storage.sync.get(["settings"], (result) => {
    if (result.settings) {
      enabledCheckbox.checked = result.settings.enabled !== false;
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
