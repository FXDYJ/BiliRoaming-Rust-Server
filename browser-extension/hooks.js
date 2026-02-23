/**
 * BiliRoaming Browser Extension - Page-Level API Hooks
 *
 * Loaded via script.src (not inline) to comply with Content Security Policy.
 * Hooks JSON.parse and XMLHttpRequest to remove area restrictions from
 * Bilibili API responses.
 */

(function () {
  var _parse = JSON.parse;

  // Hook JSON.parse to patch SSR data and API responses
  JSON.parse = function (text, reviver) {
    var result = _parse.call(this, text, reviver);
    if (result && typeof result === "object") {
      patchNextData(result);
      patchApiResponse(result);
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
            return JSON.stringify(data);
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
})();
