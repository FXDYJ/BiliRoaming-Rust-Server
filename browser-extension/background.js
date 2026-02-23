/**
 * BiliRoaming Browser Extension - Background Service Worker
 *
 * Manages declarativeNetRequest redirect rules and extension settings.
 * Redirects Bilibili API requests to a configured BiliRoaming-Rust-Server proxy.
 */

const DEFAULT_SETTINGS = {
  enabled: false,
  serverUrl: "",
  defaultArea: "hk",
  unlockPlayurl: true,
  unlockSearch: true,
};

// Rule IDs for declarativeNetRequest
const RULE_ID_PLAYURL_WEB = 1;
const RULE_ID_SEARCH_WEB = 2;

/**
 * Parse the server URL and extract scheme, host, and port.
 */
function parseServerUrl(serverUrl) {
  try {
    const url = new URL(serverUrl);
    return {
      scheme: url.protocol.replace(":", ""),
      host: url.hostname,
      port: url.port || "",
    };
  } catch (e) {
    return null;
  }
}

/**
 * Build redirect rules based on current settings.
 */
function buildRules(settings) {
  const rules = [];
  const parsed = parseServerUrl(settings.serverUrl);
  if (!parsed) return rules;

  const transformBase = {
    scheme: parsed.scheme,
    host: parsed.host,
  };
  if (parsed.port) {
    transformBase.port = parsed.port;
  }

  const areaParams = [
    { key: "area", value: settings.defaultArea, replaceOnly: false },
  ];

  if (settings.unlockPlayurl) {
    rules.push({
      id: RULE_ID_PLAYURL_WEB,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          transform: {
            ...transformBase,
            queryTransform: { addOrReplaceParams: areaParams },
          },
        },
      },
      condition: {
        urlFilter: "||api.bilibili.com/pgc/player/web/playurl",
        resourceTypes: ["xmlhttprequest"],
      },
    });
  }

  if (settings.unlockSearch) {
    rules.push({
      id: RULE_ID_SEARCH_WEB,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          transform: {
            ...transformBase,
            queryTransform: { addOrReplaceParams: areaParams },
          },
        },
      },
      condition: {
        urlFilter: "||api.bilibili.com/x/web-interface/search/type",
        resourceTypes: ["xmlhttprequest"],
      },
    });
  }

  return rules;
}

/**
 * Update the declarativeNetRequest rules based on current settings.
 */
async function updateRules(settings) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);

  if (!settings.enabled || !settings.serverUrl) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    });
    await updateBadge(false);
    return;
  }

  const addRules = buildRules(settings);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
  await updateBadge(addRules.length > 0);
}

/**
 * Update the extension badge to show active/inactive status.
 */
async function updateBadge(active) {
  if (active) {
    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#00C853" });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

/**
 * Load settings from storage and apply rules.
 */
async function loadAndApplySettings() {
  const result = await chrome.storage.local.get("settings");
  const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
  await updateRules(settings);
}

// Listen for settings changes from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "settingsUpdated") {
    loadAndApplySettings().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === "getSettings") {
    chrome.storage.local.get("settings").then((result) => {
      sendResponse({ settings: { ...DEFAULT_SETTINGS, ...(result.settings || {}) } });
    });
    return true;
  }
  if (message.type === "testConnection") {
    testConnection(message.serverUrl).then((result) => sendResponse(result));
    return true;
  }
});

/**
 * Test connection to the proxy server.
 */
async function testConnection(serverUrl) {
  try {
    const response = await fetch(serverUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return { success: true, status: response.status };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(() => {
  loadAndApplySettings();
});

chrome.runtime.onStartup.addListener(() => {
  loadAndApplySettings();
});

// Also apply settings immediately when service worker starts
loadAndApplySettings();
