import { CACHE_KEYS, CACHED_POSTS_EXPIRY_HOURS } from "./constants.js";

export function getCachedApiKey(selectedLLM) {
  const apiKeys = getCachedApiKeys();
  return apiKeys[getLLMCacheKey(selectedLLM)];
}

export function setCachedApiKey(selectedLLM, apiKeyInput) {
  const apiKeys = getCachedApiKeys();
  apiKeys[getLLMCacheKey(selectedLLM)] = apiKeyInput;
  localStorage.setItem(CACHE_KEYS.API_KEYS, JSON.stringify(apiKeys));
}

function getLLMCacheKey(selectedLLM) {
  if (selectedLLM === "geminipro") {
    return "gemini"; // use same API key for all gemini models
  }
  return selectedLLM;
}

// Map from LLM to API key
function getCachedApiKeys() {
  return JSON.parse(localStorage.getItem(CACHE_KEYS.API_KEYS)) || {};
}

// Check if the posts were cached >24 hours ago
export function areCachedPostsOld() {
  try {
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHED_POSTS_TIMESTAMP);
    if (!timestamp) return false;

    const cacheTime = new Date(parseInt(timestamp));
    const now = new Date();
    const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

    return hoursDiff < CACHED_POSTS_EXPIRY_HOURS;
  } catch (error) {
    console.warn("Cache timestamp check failed:", error);
    return false;
  }
}

export function setCachedPostsTimestamp() {
  try {
    localStorage.setItem(
      CACHE_KEYS.CACHED_POSTS_TIMESTAMP,
      Date.now().toString()
    );
  } catch (error) {
    console.warn("Failed to set cache timestamp:", error);
  }
}

export function getCachedPosts(source = "github") {
  try {
    if (!areCachedPostsOld()) return null;
    const key =
      source === "github"
        ? CACHE_KEYS.POSTS_LIST_GITHUB
        : CACHE_KEYS.POSTS_LIST_SITEMAP;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached posts:", error);
    return null;
  }
}

export function setCachedPosts(posts, source = "github") {
  try {
    const key =
      source === "github"
        ? CACHE_KEYS.POSTS_LIST_GITHUB
        : CACHE_KEYS.POSTS_LIST_SITEMAP;
    localStorage.setItem(key, JSON.stringify(posts));
    setCachedPostsTimestamp();
  } catch (error) {
    console.warn("Failed to cache posts:", error);
  }
}

export function getCachedPostContent(postUrl, source = "github") {
  try {
    if (!areCachedPostsOld()) return null;
    const baseKey =
      source === "github"
        ? CACHE_KEYS.POST_CONTENT_GITHUB
        : CACHE_KEYS.POST_CONTENT_SITEMAP;
    const key = baseKey + btoa(postUrl).replace(/[^a-zA-Z0-9]/g, "");
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached post content:", error);
    return null;
  }
}

export function setCachedPostContent(postUrl, content, source = "github") {
  try {
    const baseKey =
      source === "github"
        ? CACHE_KEYS.POST_CONTENT_GITHUB
        : CACHE_KEYS.POST_CONTENT_SITEMAP;
    const key = baseKey + btoa(postUrl).replace(/[^a-zA-Z0-9]/g, "");
    localStorage.setItem(key, JSON.stringify(content));
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
        (key.startsWith(CACHE_KEYS.POSTS_LIST_GITHUB) ||
          key.startsWith(CACHE_KEYS.POSTS_LIST_SITEMAP) ||
          key.startsWith(CACHE_KEYS.POST_CONTENT_GITHUB) ||
          key.startsWith(CACHE_KEYS.POST_CONTENT_SITEMAP))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
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
        (key.startsWith(CACHE_KEYS.CHAT_RESPONSES_GEMINI) ||
          key.startsWith(CACHE_KEYS.CHAT_RESPONSES_GEMINIPRO) ||
          key.startsWith(CACHE_KEYS.CHAT_RESPONSES_OPENAI) ||
          key.startsWith(CACHE_KEYS.CHAT_RESPONSES_ANTHROPIC))
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

// Chat response caching functions
export function getCurrentPostKey() {
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

export function getCachedChatResponses(postKey, model = "gemini") {
  try {
    if (!postKey) return null;
    let cacheKey;
    if (model === "openai") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_OPENAI;
    } else if (model === "anthropic") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_ANTHROPIC;
    } else if (model === "geminipro") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_GEMINIPRO;
    } else {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_GEMINI;
    }
    const key = cacheKey + postKey;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached chat responses:", error);
    return null;
  }
}

export function setCachedChatResponses(
  postKey,
  messages,
  totalTokenCount,
  model = "gemini"
) {
  try {
    if (!postKey) return;
    let cacheKey;
    if (model === "openai") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_OPENAI;
    } else if (model === "anthropic") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_ANTHROPIC;
    } else if (model === "geminipro") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_GEMINIPRO;
    } else {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_GEMINI;
    }
    const key = cacheKey + postKey;
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

export function clearCachedChatResponses(postKey, model = "gemini") {
  try {
    if (!postKey) return;
    let cacheKey;
    if (model === "openai") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_OPENAI;
    } else if (model === "anthropic") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_ANTHROPIC;
    } else if (model === "geminipro") {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_GEMINIPRO;
    } else {
      cacheKey = CACHE_KEYS.CHAT_RESPONSES_GEMINI;
    }
    const key = cacheKey + postKey;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear cached chat responses:", error);
  }
}

// Code samples cache utility functions
export function getCachedRepositories(username) {
  try {
    const key = CACHE_KEYS.REPOSITORIES_LIST + username;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached repositories:", error);
    return null;
  }
}

export function setCachedRepositories(username, repositories) {
  try {
    const key = CACHE_KEYS.REPOSITORIES_LIST + username;
    localStorage.setItem(key, JSON.stringify(repositories));
  } catch (error) {
    console.warn("Failed to cache repositories:", error);
  }
}

export function getCachedRepositoryContent(repoPath) {
  try {
    const key =
      CACHE_KEYS.REPOSITORY_CONTENT +
      btoa(repoPath).replace(/[^a-zA-Z0-9]/g, "");
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached repository content:", error);
    return null;
  }
}

export function setCachedRepositoryContent(repoPath, content) {
  try {
    const key =
      CACHE_KEYS.REPOSITORY_CONTENT +
      btoa(repoPath).replace(/[^a-zA-Z0-9]/g, "");
    localStorage.setItem(key, JSON.stringify(content));
  } catch (error) {
    console.warn("Failed to cache repository content:", error);
  }
}

export function getCachedCodeSamples(postKey) {
  try {
    if (!postKey) return null;
    const key = CACHE_KEYS.CODE_SAMPLES_CACHE + postKey;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Failed to get cached code samples:", error);
    return null;
  }
}

export function setCachedCodeSamples(postKey, codeSamples) {
  try {
    if (!postKey) return;
    const key = CACHE_KEYS.CODE_SAMPLES_CACHE + postKey;
    localStorage.setItem(key, JSON.stringify(codeSamples));
  } catch (error) {
    console.warn("Failed to cache code samples:", error);
  }
}

export function clearCodeSamplesCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(CACHE_KEYS.REPOSITORIES_LIST) ||
          key.startsWith(CACHE_KEYS.REPOSITORY_CONTENT) ||
          key.startsWith(CACHE_KEYS.CODE_SAMPLES_CACHE))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("Code samples cache cleared");
  } catch (error) {
    console.warn("Failed to clear code samples cache:", error);
  }
}
