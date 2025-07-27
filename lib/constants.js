// Constants for the AI Chat Widget
export const owner = "dinosoeren";
export const repo = "walls.dev";
export const branch = "main";
export const postTypes = ["project", "blog"];
export const sitemapXmlPath = "../sitemap.xml";
export const githubApiBaseUrl = "https://api.github.com";
export const rawGithubBaseUrl = "https://raw.githubusercontent.com";

// Map of LLM chatbots to their API base URLs
export const LLM_CHATBOTS = {
  gemini: {
    name: "Gemini (2.5 Flash)",
    apiBaseUrl:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash",
  },
  geminipro: {
    name: "Gemini (2.5 Pro)",
    apiBaseUrl:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro",
  },
  openai: {
    name: "ChatGPT (GPT-4o-mini)",
    apiBaseUrl: "https://api.openai.com/v1/chat/completions",
  },
  anthropic: {
    name: "Claude (Opus)",
    apiBaseUrl: "https://api.anthropic.com/v1/messages",
  },
};

// Cache configuration
export const CACHED_POSTS_EXPIRY_HOURS = 24;
export const CACHE_KEYS = {
  POSTS_LIST_GITHUB: "ai_chat_posts_list_github",
  POSTS_LIST_SITEMAP: "ai_chat_posts_list_sitemap",
  POST_CONTENT_GITHUB: "ai_chat_post_content_github_",
  POST_CONTENT_SITEMAP: "ai_chat_post_content_sitemap_",
  CACHED_POSTS_TIMESTAMP: "ai_chat_cached_posts_timestamp",
  CHAT_RESPONSES_GEMINI: "ai_chat_responses_gemini_",
  CHAT_RESPONSES_GEMINIPRO: "ai_chat_responses_geminipro_",
  CHAT_RESPONSES_OPENAI: "ai_chat_responses_openai_",
  CHAT_RESPONSES_ANTHROPIC: "ai_chat_responses_anthropic_",
  // Cache keys for code samples
  REPOSITORIES_LIST: "ai_chat_repositories_list_",
  REPOSITORY_CONTENT: "ai_chat_repository_content_",
  CODE_SAMPLES_CACHE: "ai_chat_code_samples_cache_",
  API_KEYS: "ai_chat_api_keys",
};
