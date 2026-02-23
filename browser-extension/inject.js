/**
 * BiliRoaming Browser Extension - Page-Level Inject Script
 *
 * Injected into Bilibili page context to hook API calls.
 * Provides visual feedback when content is unlocked via the proxy.
 */

(function () {
  "use strict";

  let settings = null;

  // Listen for settings from the content script
  window.addEventListener("biliroaming-settings", (event) => {
    settings = event.detail;
    if (settings && settings.enabled) {
      showNotification("BiliRoaming 已启用 (" + getAreaName(settings.defaultArea) + ")");
    }
  });

  function getAreaName(area) {
    const names = {
      cn: "大陆",
      hk: "香港",
      tw: "台湾",
      th: "泰国",
    };
    return names[area] || area;
  }

  /**
   * Show a brief notification on the page.
   */
  function showNotification(message) {
    const existing = document.getElementById("biliroaming-notification");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.id = "biliroaming-notification";
    div.textContent = message;
    Object.assign(div.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      background: "rgba(0, 200, 83, 0.9)",
      color: "#fff",
      padding: "8px 16px",
      borderRadius: "4px",
      fontSize: "14px",
      zIndex: "999999",
      fontFamily: "sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      transition: "opacity 0.3s",
    });

    document.body.appendChild(div);
    setTimeout(() => {
      div.style.opacity = "0";
      setTimeout(() => div.remove(), 300);
    }, 3000);
  }

  // Signal that inject.js is ready
  window.dispatchEvent(new CustomEvent("biliroaming-ready"));
})();
