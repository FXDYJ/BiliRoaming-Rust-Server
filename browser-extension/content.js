/**
 * BiliRoaming Browser Extension - Content Script
 *
 * Injected into Bilibili pages at document_start. Hooks JSON.parse and fetch
 * to bypass area restrictions, then injects inject.js for UI notifications.
 */

(function () {
  "use strict";

  // Inject API hooks SYNCHRONOUSLY at document_start, before any page scripts.
  // Must not be inside an async callback — Next.js cached scripts can execute
  // before chrome.storage.local.get returns, missing the __NEXT_DATA__ parse.
  injectApiHooks();

  /**
   * Inject an inline script into the page context that hooks JSON.parse
   * and fetch to remove area restrictions from Bilibili API responses.
   *
   * The hooks are injected unconditionally for timing reliability. They only
   * patch bilibili-specific rights.area_limit fields and are harmless on
   * non-restricted pages. The declarativeNetRequest redirect rules (which
   * require enabled + serverUrl) gate the actual proxy behavior.
   *
   * - JSON.parse hook: patches __NEXT_DATA__ SSR data (initial page load)
   * - fetch hook: patches API responses (SPA navigation between episodes)
   */
  function injectApiHooks() {
    const script = document.createElement("script");
    script.textContent = "(" + function () {
      var _parse = JSON.parse;

      // Hook JSON.parse to patch __NEXT_DATA__ SSR data
      JSON.parse = function (text, reviver) {
        var result = _parse.call(this, text, reviver);
        if (result && typeof result === "object") {
          patchNextData(result);
        }
        return result;
      };

      // Hook XMLHttpRequest to patch API responses (Bilibili uses XHR, not fetch)
      var _xhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        this._biliroaming_url = url || "";
        return _xhrOpen.apply(this, arguments);
      };

      var _xhrResponseText = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "responseText");
      Object.defineProperty(XMLHttpRequest.prototype, "responseText", {
        get: function () {
          var text = _xhrResponseText.get.call(this);
          var url = this._biliroaming_url || "";
          if (url.indexOf("/pgc/view/") !== -1 || url.indexOf("/pgc/season/") !== -1) {
            try {
              var data = _parse(text);
              if (patchApiResponse(data)) {
                var patched = JSON.stringify(data);
                return patched;
              }
            } catch (e) {}
          }
          return text;
        }
      });

      var _xhrResponse = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "response");
      Object.defineProperty(XMLHttpRequest.prototype, "response", {
        get: function () {
          var url = this._biliroaming_url || "";
          if (this.responseType === "" || this.responseType === "text") {
            if (url.indexOf("/pgc/view/") !== -1 || url.indexOf("/pgc/season/") !== -1) {
              return this.responseText;
            }
          }
          if (this.responseType === "json") {
            if (url.indexOf("/pgc/view/") !== -1 || url.indexOf("/pgc/season/") !== -1) {
              var resp = _xhrResponse.get.call(this);
              if (resp && typeof resp === "object") {
                patchApiResponse(resp);
              }
              return resp;
            }
          }
          return _xhrResponse.get.call(this);
        }
      });

      function patchNextData(obj) {
        try {
          var queries = obj.props && obj.props.pageProps &&
            obj.props.pageProps.dehydratedState && obj.props.pageProps.dehydratedState.queries;
          if (Array.isArray(queries)) {
            for (var i = 0; i < queries.length; i++) {
              var data = queries[i] && queries[i].state && queries[i].state.data;
              if (data) {
                if (data.rights) unlockRights(data.rights);
                patchEpisodes(data.episodes);
              }
            }
          }
        } catch (e) {}
      }

      function patchApiResponse(data) {
        var patched = false;
        if (!data) return false;
        var root = data.result || data.data;
        if (root) {
          if (root.rights) patched = unlockRights(root.rights) || patched;
          if (root.episodes) patched = patchEpisodes(root.episodes) || patched;
        }
        return patched;
      }

      function patchEpisodes(episodes) {
        if (!Array.isArray(episodes)) return false;
        var patched = false;
        for (var i = 0; i < episodes.length; i++) {
          var ep = episodes[i];
          if (ep && ep.rights) {
            patched = unlockRights(ep.rights) || patched;
          }
        }
        return patched;
      }

      function unlockRights(rights) {
        if (!rights) return false;
        var patched = false;
        if (typeof rights.area_limit === "number" && rights.area_limit > 0) {
          rights.area_limit = 0;
          patched = true;
        }
        if (typeof rights.ban_area_show === "number" && rights.ban_area_show > 0) {
          rights.ban_area_show = 0;
          patched = true;
        }
        if (typeof rights.allow_dm === "number" && rights.allow_dm === 0) {
          rights.allow_dm = 1;
          patched = true;
        }
        return patched;
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
