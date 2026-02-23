/**
 * BiliRoaming Browser Extension - Content Script
 *
 * Injected into Bilibili pages. Injects the page-level script (inject.js)
 * and bridges communication between the page context and extension.
 */

(function () {
  "use strict";

  // Inject the page-level script for API hooking
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
