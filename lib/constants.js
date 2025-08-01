// Constants for the AI Chat Widget
export const githubApiBaseUrl = "https://api.github.com";
export const rawGithubBaseUrl = "https://raw.githubusercontent.com";

export const WIDGET_SETTINGS_CONFIG = {
  owner: { label: "GitHub Owner", type: "string" },
  repo: { label: "Repository", type: "string" },
  branch: { label: "Branch", type: "string", defaultValue: "main" },
  contentPath: {
    label: "Content Path",
    type: "string",
    defaultValue: "content",
  },
  postTypes: {
    label: "Post Types",
    type: "array",
    defaultValue: ["project", "blog"],
  },
  sitemapXmlPath: {
    label: "Sitemap XML Path",
    type: "string",
    defaultValue: "../sitemap.xml",
  },
};

// Map of LLM chatbots to their API base URLs
export const LLM_PROVIDERS = {
  google: {
    name: "Google",
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models/",
    models: {
      "gemini-2.5-flash": {
        name: "Gemini 2.5 Flash",
      },
      "gemini-2.5-pro": {
        name: "Gemini 2.5 Pro",
      },
    },
  },
  openai: {
    name: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1/chat/completions",
    models: {
      "gpt-4o-mini": {
        name: "GPT-4o Mini",
      },
    },
  },
  anthropic: {
    name: "Anthropic",
    apiBaseUrl: "https://api.anthropic.com/v1/messages",
    models: {
      "claude-3-opus-20240229": {
        name: "Claude 3 Opus",
      },
    },
  },
};
