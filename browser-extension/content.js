/**
 * BiliRoaming Browser Extension - Content Script
 *
 * Injected into Bilibili pages at document_start. Hooks JSON.parse and fetch
 * to bypass area restrictions, then injects inject.js for UI notifications.
 */

(function () {
  "use strict";

  // Inject API hooks synchronously when extension is enabled.
  // Uses chrome.storage.local directly (faster than messaging background.js).
  // The callback fires within ~1ms, well before Next.js hydration scripts load.
  chrome.storage.local.get("settings", (result) => {
    const settings = result.settings;
    if (settings && settings.enabled && settings.serverUrl) {
      injectApiHooks();
    }
  });

  /**
   * Inject an inline script into the page context that hooks JSON.parse
   * and fetch to remove area restrictions from Bilibili API responses.
   *
   * - JSON.parse hook: patches __NEXT_DATA__ SSR data (initial page load)
   * - fetch hook: patches API responses (SPA navigation between episodes)
   */
  function injectApiHooks() {
    const script = document.createElement("script");
    script.textContent = "(" + function () {
      var _parse = JSON.parse;
      var _fetch = window.fetch;

      JSON.parse = function (text, reviver) {
        var result = _parse.call(this, text, reviver);
        if (result && typeof result === "object") {
          patchNextData(result);
        }
        return result;
      };

      window.fetch = function (input, init) {
        return _fetch.call(this, input, init).then(function (response) {
          var url = (typeof input === "string" ? input : (input && input.url)) || "";
          if (url.indexOf("/pgc/view/") === -1 && url.indexOf("/pgc/season/") === -1) {
            return response;
          }
          return response.clone().text().then(function (text) {
            try {
              var data = _parse(text);
              if (patchApiRights(data)) {
                return new Response(JSON.stringify(data), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                });
              }
            } catch (e) {}
            return response;
          });
        });
      };

      function patchNextData(obj) {
        try {
          var queries = obj.props && obj.props.pageProps &&
            obj.props.pageProps.dehydratedState && obj.props.pageProps.dehydratedState.queries;
          if (Array.isArray(queries)) {
            for (var i = 0; i < queries.length; i++) {
              var data = queries[i] && queries[i].state && queries[i].state.data;
              if (data && data.rights) {
                unlockRights(data.rights);
              }
            }
          }
        } catch (e) {}
      }

      function patchApiRights(data) {
        var patched = false;
        if (data && data.result && data.result.rights) {
          patched = unlockRights(data.result.rights) || patched;
        }
        if (data && data.data && data.data.rights) {
          patched = unlockRights(data.data.rights) || patched;
        }
        return patched;
      }

      function unlockRights(rights) {
        if (rights && typeof rights.area_limit === "number" && rights.area_limit > 0) {
          rights.area_limit = 0;
          rights.ban_area_show = 0;
          return true;
        }
        return false;
      }
    } + ")()";
    (document.head || document.documentElement).appendChild(script);
    script.remove();
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
