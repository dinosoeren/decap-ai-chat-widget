const CACHED_POSTS_EXPIRY_HOURS = 24;
const CACHE_KEYS = {
  TIMESTAMPS: "ai_chat_timestamps",
  POSTS_LIST: "ai_chat_posts_list_",
  POST_CONTENT: "ai_chat_post_content_",
  CHAT_RESPONSES: "ai_chat_responses_",
  // Cache keys for code samples
  REPOSITORIES_LIST: "ai_chat_repositories_list_",
  REPOSITORY_CONTENT: "ai_chat_repository_content_",
  CODE_SETTINGS_CACHE: "ai_chat_code_settings_cache_",
  API_KEYS: "ai_chat_api_keys",
};
const TIME_ID_PREFIX = {
  POSTS: "posts_",
  REPOSITORIES: "repositories_",
  CODE_SETTINGS: "code_settings",
};

export function getCachedApiKey(model) {
  const apiKeys = getCachedApiKeys();
  return apiKeys[getApiKeyModel(model)];
}

export function setCachedApiKey(model, apiKeyInput) {
  const apiKeys = getCachedApiKeys();
  apiKeys[getApiKeyModel(model)] = apiKeyInput;
  localStorage.setItem(CACHE_KEYS.API_KEYS, JSON.stringify(apiKeys));
}

function getApiKeyModel(model) {
  if (model === "geminipro") {
    return "gemini"; // use same API key for all gemini models
  }
  return model;
}

// Map from LLM to API key
function getCachedApiKeys() {
  return JSON.parse(localStorage.getItem(CACHE_KEYS.API_KEYS)) || {};
}

// Check if something was cached >24 hours ago
function isCacheExpired(timestampId) {
  if (!timestampId) return true; // Assume expired if no ID is provided
  try {
    const timestampsStr = localStorage.getItem(CACHE_KEYS.TIMESTAMPS);
    if (!timestampsStr) return true; // No timestamps stored, so expired

    const timestamps = JSON.parse(timestampsStr);
    if (!timestamps || !timestamps[timestampId]) return true; // No timestamp for this ID, so expired

    const cacheTime = new Date(timestamps[timestampId]);
    const now = new Date();
    const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

    return hoursDiff > CACHED_POSTS_EXPIRY_HOURS;
  } catch (error) {
    console.warn(`Cache ${timestampId} timestamp check failed:`, error);
    return true; // Assume expired on error to force refresh
  }
}

function setCacheTime(timestampId) {
  try {
    const timestampsStr = localStorage.getItem(CACHE_KEYS.TIMESTAMPS);
    const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};
    timestamps[timestampId] = Date.now().toString();
    localStorage.setItem(CACHE_KEYS.TIMESTAMPS, JSON.stringify(timestamps));
  } catch (error) {
    console.warn(`Failed to set cache ${timestampId} timestamp:`, error);
  }
}

function clearCacheTime(timestampId) {
  try {
    const timestampsStr = localStorage.getItem(CACHE_KEYS.TIMESTAMPS);
    const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};
    if (timestamps[timestampId]) {
      delete timestamps[timestampId];
    }
    localStorage.setItem(CACHE_KEYS.TIMESTAMPS, JSON.stringify(timestamps));
  } catch (error) {
    console.warn(`Failed to clear cache ${timestampId} timestamp:`, error);
  }
}

export function getCachedPosts(source = "github") {
  try {
    const timestampId = TIME_ID_PREFIX.POSTS + source;
    if (isCacheExpired(timestampId)) return null;
    const key = CACHE_KEYS.POSTS_LIST + source;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached posts:", error);
    return null;
  }
}

export function setCachedPosts(posts, source = "github") {
  try {
    const key = CACHE_KEYS.POSTS_LIST + source;
    localStorage.setItem(key, JSON.stringify(posts));
    const timestampId = TIME_ID_PREFIX.POSTS + source;
    setCacheTime(timestampId);
  } catch (error) {
    console.warn("Failed to cache posts:", error);
  }
}

export function getCachedPostContent(postUrl, source = "github") {
  try {
    const timestampId = TIME_ID_PREFIX.POSTS + source;
    if (isCacheExpired(timestampId)) return null;
    const key =
      CACHE_KEYS.POST_CONTENT +
      `${source}_` +
      btoa(postUrl).replace(/[^a-zA-Z0-9]/g, "");
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached post content:", error);
    return null;
  }
}

export function setCachedPostContent(postUrl, content, source = "github") {
  try {
    const key =
      CACHE_KEYS.POST_CONTENT +
      `${source}_` +
      btoa(postUrl).replace(/[^a-zA-Z0-9]/g, "");
    localStorage.setItem(key, JSON.stringify(content));
    // Timestamp is managed by the parent posts list cache
  } catch (error) {
    console.warn("Failed to cache post content:", error);
  }
}

// Clear all post list and content cache entries from Github API and sitemap
export function clearCachedPosts() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(CACHE_KEYS.POSTS_LIST) ||
          key.startsWith(CACHE_KEYS.POST_CONTENT))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    clearCacheTime(TIME_ID_PREFIX.POSTS + "github");
    clearCacheTime(TIME_ID_PREFIX.POSTS + "sitemap");
    console.log("Posts cache cleared");
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}

// Clear all AI chat responses across all posts
export function clearAllChatResponseCaches() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEYS.CHAT_RESPONSES)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("Cleared all chat response caches");
  } catch (error) {
    console.warn("Failed to clear chat response caches:", error);
  }
}

// Chat responses are cached per post
function getCurrentPostKey() {
  try {
    // Extract post identifier from URL
    const url = window.location.href;
    const match = url.match(/\/entries\/([^\/]+)\/index/);
    if (match) {
      return match[1]; // Returns the post name (e.g., "ai-block-plan")
    }
    return null;
  } catch (error) {
    console.warn("Failed to get current post key:", error);
    return null;
  }
}

export function getCachedChatResponses(model = "gemini") {
  const postKey = getCurrentPostKey();
  if (!postKey) return null;
  try {
    const key = CACHE_KEYS.CHAT_RESPONSES + model + `_${postKey}`;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached chat responses:", error);
    return null;
  }
}

export function setCachedChatResponses(
  messages,
  totalTokenCount,
  model = "gemini"
) {
  const postKey = getCurrentPostKey();
  if (!postKey) return;
  try {
    const key = CACHE_KEYS.CHAT_RESPONSES + model + `_${postKey}`;
    const cacheData = {
      messages: messages,
      totalTokenCount: totalTokenCount,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to cache chat responses:", error);
  }
}

export function clearCachedChatResponses(model = "gemini") {
  const postKey = getCurrentPostKey();
  if (!postKey) return;
  try {
    const key = CACHE_KEYS.CHAT_RESPONSES + model + `_${postKey}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear cached chat responses:", error);
  }
}

// Code samples cache utility functions
export function getCachedRepositories(username, includeForks) {
  try {
    const rType = includeForks ? "_all" : "_owner";
    const timestampId = TIME_ID_PREFIX.REPOSITORIES + username + rType;
    if (isCacheExpired(timestampId)) return null;
    const key = CACHE_KEYS.REPOSITORIES_LIST + username + rType;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached repositories:", error);
    return null;
  }
}

export function setCachedRepositories(username, repositories, includeForks) {
  try {
    const rType = includeForks ? "_all" : "_owner";
    const key = CACHE_KEYS.REPOSITORIES_LIST + username + rType;
    localStorage.setItem(key, JSON.stringify(repositories));
    const timestampId = TIME_ID_PREFIX.REPOSITORIES + username + rType;
    setCacheTime(timestampId);
  } catch (error) {
    console.warn("Failed to cache repositories:", error);
  }
}

export function getCachedRepositoryContent(user, repo, path) {
  try {
    // Repository content cache validity is tied to the parent repository list
    const timestampId = TIME_ID_PREFIX.REPOSITORIES + user + "_all"; // Assume forks might be included
    const timestampIdOwner = TIME_ID_PREFIX.REPOSITORIES + user + "_owner";
    if (isCacheExpired(timestampId) && isCacheExpired(timestampIdOwner)) {
      return null;
    }
    const key =
      CACHE_KEYS.REPOSITORY_CONTENT +
      `${user}_${repo}_` +
      btoa(path).replace(/[^a-zA-Z0-9]/g, "");
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached repository content:", error);
    return null;
  }
}

export function setCachedRepositoryContent(user, repo, path, content) {
  try {
    const key =
      CACHE_KEYS.REPOSITORY_CONTENT +
      `${user}_${repo}_` +
      btoa(path).replace(/[^a-zA-Z0-9]/g, "");
    localStorage.setItem(key, JSON.stringify(content));
    // Timestamp is managed by the parent repository list cache
  } catch (error) {
    console.warn("Failed to cache repository content:", error);
  }
}

export function getCachedCodeSettings() {
  try {
    const timestampId = TIME_ID_PREFIX.CODE_SETTINGS;
    if (isCacheExpired(timestampId)) return null;
    const key = CACHE_KEYS.CODE_SETTINGS_CACHE;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached code samples:", error);
    return null;
  }
}

export function setCachedCodeSettings(codeSamples) {
  try {
    const key = CACHE_KEYS.CODE_SETTINGS_CACHE;
    localStorage.setItem(key, JSON.stringify(codeSamples));
    const timestampId = TIME_ID_PREFIX.CODE_SETTINGS;
    setCacheTime(timestampId);
  } catch (error) {
    console.warn("Failed to cache code samples:", error);
  }
}

export function clearCachedCodeAndSettings(user) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(CACHE_KEYS.REPOSITORIES_LIST) ||
          key.startsWith(CACHE_KEYS.REPOSITORY_CONTENT) ||
          key.startsWith(CACHE_KEYS.CODE_SETTINGS_CACHE))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    clearCacheTime(TIME_ID_PREFIX.CODE_SETTINGS);
    clearCacheTime(TIME_ID_PREFIX.REPOSITORIES + user + "_all");
    clearCacheTime(TIME_ID_PREFIX.REPOSITORIES + user + "_owner");
    console.log("Code samples cache cleared");
  } catch (error) {
    console.warn("Failed to clear code samples cache:", error);
  }
}
