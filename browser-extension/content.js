/**
 * BiliRoaming Browser Extension - Content Script
 *
 * Injected into Bilibili pages at document_start. Loads hooks.js and inject.js
 * into the page context to bypass area restrictions and show notifications.
 */

(function () {
  "use strict";

  // Inject API hooks SYNCHRONOUSLY at document_start, before any page scripts.
  // Uses script.src (not inline textContent) to comply with Bilibili's CSP.
  injectApiHooks();

  function injectApiHooks() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("hooks.js");
    (document.head || document.documentElement).appendChild(script);
  }

  // Inject the page-level script for notifications
  function injectPageScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inject.js");
    script.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Pass settings to the page context
  function passSettingsToPage() {
    chrome.runtime.sendMessage({ type: "getSettings" }, (response) => {
      if (response && response.settings) {
        window.dispatchEvent(
          new CustomEvent("biliroaming-settings", {
            detail: response.settings,
          })
        );
      }
    });
  }

  // Listen for requests from inject.js
  window.addEventListener("biliroaming-request", (event) => {
    const { url, options, requestId } = event.detail;
    chrome.runtime.sendMessage(
      { type: "proxyFetch", url, options },
      (response) => {
        window.dispatchEvent(
          new CustomEvent("biliroaming-response", {
            detail: { requestId, response },
          })
        );
      }
    );
  });

  injectPageScript();

  // Wait for the inject script to load and request settings
  window.addEventListener("biliroaming-ready", () => {
    passSettingsToPage();
  });
})();
