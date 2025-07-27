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
