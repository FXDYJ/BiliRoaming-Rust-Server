/**
 * BiliRoaming Browser Extension - Popup Settings Script
 *
 * Handles the extension settings popup UI and persists settings to chrome.storage.
 */

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    enabled: document.getElementById("enabled"),
    serverUrl: document.getElementById("serverUrl"),
    defaultArea: document.getElementById("defaultArea"),
    unlockPlayurl: document.getElementById("unlockPlayurl"),
    unlockSearch: document.getElementById("unlockSearch"),
    saveBtn: document.getElementById("saveBtn"),
    saveResult: document.getElementById("saveResult"),
    testBtn: document.getElementById("testBtn"),
    testResult: document.getElementById("testResult"),
  };

  // Load saved settings
  chrome.runtime.sendMessage({ type: "getSettings" }, (response) => {
    if (response && response.settings) {
      const s = response.settings;
      elements.enabled.checked = s.enabled;
      elements.serverUrl.value = s.serverUrl;
      elements.defaultArea.value = s.defaultArea;
      elements.unlockPlayurl.checked = s.unlockPlayurl;
      elements.unlockSearch.checked = s.unlockSearch;
    }
  });

  // Save settings
  elements.saveBtn.addEventListener("click", () => {
    const serverUrl = normalizeUrl(elements.serverUrl.value);
    if (elements.enabled.checked && !serverUrl) {
      showMessage(elements.saveResult, elements.serverUrl.value.trim() ? "服务器地址格式无效" : "请填写服务器地址", "error");
      return;
    }

    const settings = {
      enabled: elements.enabled.checked,
      serverUrl: serverUrl,
      defaultArea: elements.defaultArea.value,
      unlockPlayurl: elements.unlockPlayurl.checked,
      unlockSearch: elements.unlockSearch.checked,
    };

    chrome.storage.local.set({ settings }, () => {
      chrome.runtime.sendMessage({ type: "settingsUpdated" }, () => {
        showMessage(elements.saveResult, "设置已保存", "success");
      });
    });
  });

  // Test connection
  elements.testBtn.addEventListener("click", () => {
    const serverUrl = normalizeUrl(elements.serverUrl.value);
    if (!serverUrl) {
      showMessage(elements.testResult, elements.serverUrl.value.trim() ? "服务器地址格式无效" : "请填写服务器地址", "error");
      return;
    }

    showMessage(elements.testResult, "连接中...", "");
    chrome.runtime.sendMessage(
      { type: "testConnection", serverUrl },
      (result) => {
        if (result && result.success) {
          showMessage(
            elements.testResult,
            "连接成功 (HTTP " + result.status + ")",
            "success"
          );
        } else {
          showMessage(
            elements.testResult,
            "连接失败: " + (result ? result.error : "未知错误"),
            "error"
          );
        }
      }
    );
  });

  function normalizeUrl(input) {
    let url = input.trim().replace(/\/+$/, "");
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    try {
      new URL(url);
    } catch (e) {
      return "";
    }
    return url;
  }

  function showMessage(element, text, className) {
    element.textContent = text;
    element.className =
      element.id === "testResult" ? "test-result" : "save-result";
    if (className) {
      element.classList.add(className);
    }
  }
});
