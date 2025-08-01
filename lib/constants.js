// Constants for the AI Chat Widget
export const githubApiBaseUrl = "https://api.github.com";
export const rawGithubBaseUrl = "https://raw.githubusercontent.com";

export const WIDGET_SETTINGS_CONFIG = {
  owner: { label: "Site GitHub Owner", type: "string" },
  repo: { label: "Site Repository", type: "string" },
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
  contentSelector: {
    label: "HTML Content Selector",
    type: "string",
    defaultValue: ".post__content",
  },
  systemPrompt: {
    label: "System Prompt",
    type: "string",
    defaultValue:
      "You are a helpful AI assistant. Please format your response in lightweight markdown (no HTML tags).",
  },
  temperature: {
    label: "Temperature",
    type: "number",
    defaultValue: 0.7,
  },
  maxTokens: {
    label: "Max Tokens",
    type: "number",
    defaultValue: 4000,
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
      "gemini-2.5-flash-lite": {
        name: "Gemini 2.5 Flash Lite",
      },
      "gemini-2.5-pro": {
        name: "Gemini 2.5 Pro",
      },
      "gemini-2.0-flash": {
        name: "Gemini 2.0 Flash",
      },
      "gemini-2.0-flash-lite": {
        name: "Gemini 2.0 Flash Lite",
      },
      "gemini-2.0-pro": {
        name: "Gemini 2.0 Pro",
      },
      "gemini-1.5-flash": {
        name: "Gemini 1.5 Flash",
      },
      "gemini-1.5-pro": {
        name: "Gemini 1.5 Pro",
      },
    },
  },
  openai: {
    name: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1/chat/completions",
    models: {
      "gpt-4o-mini": {
        name: "GPT-4o mini",
      },
      "gpt-4.1-nano": {
        name: "GPT-4.1 nano",
      },
      "o4-mini": {
        name: "o4-mini",
      },
      "o3-mini": {
        name: "o3-mini",
      },
      o3: {
        name: "o3",
      },
    },
  },
  anthropic: {
    name: "Anthropic",
    apiBaseUrl: "https://api.anthropic.com/v1/messages",
    models: {
      "claude-opus-4-0": {
        name: "Claude Opus 4",
      },
      "claude-sonnet-4-0": {
        name: "Claude Sonnet 4",
      },
      "claude-3-7-sonnet-latest": {
        name: "Claude Sonnet 3.7",
      },
      "claude-3-5-sonnet-latest": {
        name: "Claude Sonnet 3.5",
      },
      "claude-3-5-haiku-latest": {
        name: "Claude Haiku 3.5",
      },
    },
  },
  openrouter: {
    name: "OpenRouter",
    apiBaseUrl: "https://openrouter.ai/api/v1",
    models: {}, // fetched dynamically
  },
};
