const CACHED_POSTS_EXPIRY_HOURS = 24;
const MAX_HISTORY_ITEMS = 20;
const CACHE_KEYS = {
  WIDGET_SETTINGS: "ai_chat_widget_settings",
  TIMESTAMPS: "ai_chat_timestamps",
  SELECTED_MODEL: "ai_chat_selected_model_",
  API_KEYS: "ai_chat_api_keys",
  OPENROUTER_MODELS: "ai_chat_openrouter_models",
  GITHUB_TOKEN: "ai_chat_github_token",
  POSTS_LIST: "ai_chat_posts_list_",
  POST_CONTENT: "ai_chat_post_content_",
  CHAT_RESPONSES: "ai_chat_responses_",
  CHAT_HISTORY: "ai_chat_history_",
  META_PROMPT: "ai_chat_meta_prompt",
  INCLUDE_META_PROMPT: "ai_chat_include_meta_prompt",
  // Cache keys for code samples
  REPOSITORIES_LIST: "ai_chat_repositories_list_",
  REPOSITORY_CONTENT: "ai_chat_repository_content_",
  CODE_SETTINGS_CACHE: "ai_chat_code_settings_cache_",
};
const TIME_ID_PREFIX = {
  POSTS: "posts_",
  REPOSITORIES: "repositories_",
  CODE_SETTINGS: "code_settings",
  OPENROUTER_MODELS: "openrouter_models",
};

export function getCachedWidgetSettings() {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.WIDGET_SETTINGS);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.warn("Failed to get cached widget settings:", error);
    return {};
  }
}

export function setCachedWidgetSettings(settings) {
  try {
    localStorage.setItem(CACHE_KEYS.WIDGET_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to cache widget settings:", error);
  }
}

export function getCachedApiKey(provider) {
  const apiKeys = getCachedApiKeys();
  return apiKeys[provider];
}

export function setCachedApiKey(provider, apiKeyInput) {
  const apiKeys = getCachedApiKeys();
  apiKeys[provider] = apiKeyInput;
  localStorage.setItem(CACHE_KEYS.API_KEYS, JSON.stringify(apiKeys));
}

// Map from LLM to API key
function getCachedApiKeys() {
  return JSON.parse(localStorage.getItem(CACHE_KEYS.API_KEYS)) || {};
}

export function getCachedOpenRouterModels() {
  try {
    const timestampId = TIME_ID_PREFIX.OPENROUTER_MODELS;
    if (isCacheExpired(timestampId)) return null;
    const cached = localStorage.getItem(CACHE_KEYS.OPENROUTER_MODELS);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached OpenRouter models:", error);
    return null;
  }
}

export function setCachedOpenRouterModels(models) {
  try {
    localStorage.setItem(CACHE_KEYS.OPENROUTER_MODELS, JSON.stringify(models));
    const timestampId = TIME_ID_PREFIX.OPENROUTER_MODELS;
    setCacheTime(timestampId);
  } catch (error) {
    console.warn("Failed to cache OpenRouter models:", error);
  }
}

export function getCachedGithubToken() {
  try {
    return localStorage.getItem(CACHE_KEYS.GITHUB_TOKEN) || "";
  } catch (error) {
    console.warn("Failed to get cached GitHub token:", error);
    return "";
  }
}

export function setCachedGithubToken(token) {
  try {
    localStorage.setItem(CACHE_KEYS.GITHUB_TOKEN, token);
  } catch (error) {
    console.warn("Failed to cache GitHub token:", error);
  }
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

export function getCachedMetaPrompt() {
  try {
    return localStorage.getItem(CACHE_KEYS.META_PROMPT) || "";
  } catch (error) {
    console.warn("Failed to get cached meta prompt:", error);
    return "";
  }
}

export function setCachedMetaPrompt(metaPrompt) {
  try {
    localStorage.setItem(CACHE_KEYS.META_PROMPT, metaPrompt);
  } catch (error) {
    console.warn("Failed to cache meta prompt:", error);
  }
}

export function getCachedIncludeMetaPrompt() {
  try {
    const value = localStorage.getItem(CACHE_KEYS.INCLUDE_META_PROMPT);
    return value === null ? true : value === "true";
  } catch (error) {
    console.warn("Failed to get cached include meta prompt:", error);
    return true;
  }
}

export function setCachedIncludeMetaPrompt(include) {
  try {
    localStorage.setItem(CACHE_KEYS.INCLUDE_META_PROMPT, include);
  } catch (error) {
    console.warn("Failed to cache include meta prompt:", error);
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
      if (
        key &&
        (key.startsWith(CACHE_KEYS.CHAT_RESPONSES) ||
          key.startsWith(CACHE_KEYS.CHAT_HISTORY))
      ) {
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

export function getCachedChatResponses(model) {
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

export function setCachedChatResponses(messages, totalTokenCount, model) {
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

export function clearCachedChatResponses(model) {
  const postKey = getCurrentPostKey();
  if (!postKey) return;
  try {
    const key = CACHE_KEYS.CHAT_RESPONSES + model + `_${postKey}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear cached chat responses:", error);
  }
}

export function getCachedChatHistory(model) {
  const postKey = getCurrentPostKey();
  if (!postKey) return [];
  try {
    const key = CACHE_KEYS.CHAT_HISTORY + model + `_${postKey}`;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.warn("Failed to get cached chat history:", error);
    return [];
  }
}

export function setCachedChatHistory(history, model) {
  const postKey = getCurrentPostKey();
  if (!postKey) return;
  try {
    const key = CACHE_KEYS.CHAT_HISTORY + model + `_${postKey}`;
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.warn("Failed to cache chat history:", error);
  }
}

export function addChatToHistory(chatData, model) {
  if (!chatData || !chatData.messages || chatData.messages.length === 0) {
    return; // Don't save empty chats
  }
  const history = getCachedChatHistory(model);
  history.unshift(chatData); // Add to the beginning
  if (history.length > MAX_HISTORY_ITEMS) {
    history.pop(); // Limit history size
  }
  setCachedChatHistory(history, model);
}

export function clearChatHistory(model) {
  const postKey = getCurrentPostKey();
  if (!postKey) return;
  try {
    const key = CACHE_KEYS.CHAT_HISTORY + model + `_${postKey}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear chat history:", error);
  }
}

export function getCachedSelectedModel() {
  const postKey = getCurrentPostKey();
  if (!postKey) return null;
  try {
    const key = CACHE_KEYS.SELECTED_MODEL + postKey;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached selected model:", error);
    return null;
  }
}

export function setCachedSelectedModel(model) {
  const postKey = getCurrentPostKey();
  if (!postKey) return;
  try {
    const key = CACHE_KEYS.SELECTED_MODEL + postKey;
    localStorage.setItem(key, JSON.stringify(model));
  } catch (error) {
    console.warn("Failed to cache selected model:", error);
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
