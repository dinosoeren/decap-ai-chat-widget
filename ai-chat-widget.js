// Custom AI Chat Widget for Decap CMS
// Wait for CMS to be available before registering the widget
(function () {
  const owner = "dinosoeren";
  const repo = "walls.dev";
  const branch = "main";
  const postTypes = ["project", "blog"];
  const sitemapXmlPath = "../sitemap.xml";
  const githubApiBaseUrl = "https://api.github.com";
  const rawGithubBaseUrl = "https://raw.githubusercontent.com";

  // Map of LLM chatbots to their API base URLs
  const LLM_CHATBOTS = {
    gemini: {
      name: "Gemini (2.5 Flash)",
      apiBaseUrl:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash",
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
  const CACHED_POSTS_EXPIRY_HOURS = 24;
  const CACHE_KEYS = {
    POSTS_LIST_GITHUB: "ai_chat_posts_list_github",
    POSTS_LIST_SITEMAP: "ai_chat_posts_list_sitemap",
    POST_CONTENT_GITHUB: "ai_chat_post_content_github_",
    POST_CONTENT_SITEMAP: "ai_chat_post_content_sitemap_",
    CACHED_POSTS_TIMESTAMP: "ai_chat_cached_posts_timestamp",
    CHAT_RESPONSES_GEMINI: "ai_chat_responses_gemini_",
    CHAT_RESPONSES_OPENAI: "ai_chat_responses_openai_",
    CHAT_RESPONSES_ANTHROPIC: "ai_chat_responses_anthropic_",
    // Cache keys for code samples
    REPOSITORIES_LIST: "ai_chat_repositories_list_",
    REPOSITORY_CONTENT: "ai_chat_repository_content_",
    CODE_SAMPLES_CACHE: "ai_chat_code_samples_cache_",
  };

  // Cache utility functions

  // Check if the posts were cached >24 hours ago
  function areCachedPostsOld() {
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

  function setCachedPostsTimestamp() {
    try {
      localStorage.setItem(
        CACHE_KEYS.CACHED_POSTS_TIMESTAMP,
        Date.now().toString()
      );
    } catch (error) {
      console.warn("Failed to set cache timestamp:", error);
    }
  }

  function getCachedPosts(source = "github") {
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

  function setCachedPosts(posts, source = "github") {
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

  function getCachedPostContent(postUrl, source = "github") {
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

  function setCachedPostContent(postUrl, content, source = "github") {
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
  function clearPostsCache() {
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
  function clearAllChatResponseCaches() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith(CACHE_KEYS.CHAT_RESPONSES_GEMINI) ||
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

  function getCachedChatResponses(postKey, model = "gemini") {
    try {
      if (!postKey) return null;
      let cacheKey;
      if (model === "openai") {
        cacheKey = CACHE_KEYS.CHAT_RESPONSES_OPENAI;
      } else if (model === "anthropic") {
        cacheKey = CACHE_KEYS.CHAT_RESPONSES_ANTHROPIC;
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

  function setCachedChatResponses(
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

  function clearCachedChatResponses(postKey, model = "gemini") {
    try {
      if (!postKey) return;
      let cacheKey;
      if (model === "openai") {
        cacheKey = CACHE_KEYS.CHAT_RESPONSES_OPENAI;
      } else if (model === "anthropic") {
        cacheKey = CACHE_KEYS.CHAT_RESPONSES_ANTHROPIC;
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
  function getCachedRepositories(username) {
    try {
      const key = CACHE_KEYS.REPOSITORIES_LIST + username;
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn("Failed to get cached repositories:", error);
      return null;
    }
  }

  function setCachedRepositories(username, repositories) {
    try {
      const key = CACHE_KEYS.REPOSITORIES_LIST + username;
      localStorage.setItem(key, JSON.stringify(repositories));
    } catch (error) {
      console.warn("Failed to cache repositories:", error);
    }
  }

  function getCachedRepositoryContent(repoPath) {
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

  function setCachedRepositoryContent(repoPath, content) {
    try {
      const key =
        CACHE_KEYS.REPOSITORY_CONTENT +
        btoa(repoPath).replace(/[^a-zA-Z0-9]/g, "");
      localStorage.setItem(key, JSON.stringify(content));
    } catch (error) {
      console.warn("Failed to cache repository content:", error);
    }
  }

  function getCachedCodeSamples(postKey) {
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

  function setCachedCodeSamples(postKey, codeSamples) {
    try {
      if (!postKey) return;
      const key = CACHE_KEYS.CODE_SAMPLES_CACHE + postKey;
      localStorage.setItem(key, JSON.stringify(codeSamples));
    } catch (error) {
      console.warn("Failed to cache code samples:", error);
    }
  }

  function clearCodeSamplesCache() {
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

  let retryCount = 0;
  const maxRetries = 5;

  function registerAiChatWidget() {
    if (typeof CMS === "undefined") {
      // If CMS is not available yet, try again in a moment (up to maxRetries times)
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(registerAiChatWidget, 100);
      } else {
        console.warn(
          "AI Chat widget: CMS not available after",
          maxRetries,
          "retries. Widget registration failed."
        );
      }
      return;
    }

    // Control component for the widget
    var AiChatControl = createClass({
      getInitialState: function () {
        return {
          selectedLLM: "gemini", // Default to Gemini
          apiKey: "", // Never commit API keys to version control
          messages: [],
          currentMessage: "",
          isLoading: false,
          error: null,
          posts: [],
          selectedPosts: [],
          loadingPosts: false,
          showPostSelector: false,
          totalTokenCount: 0,
          // Code samples state
          username: owner, // Default username
          repositories: [],
          selectedRepository: "",
          currentPath: "",
          repositoryContent: [],
          selectedCodeFiles: [],
          loadingRepositories: false,
          loadingRepositoryContent: false,
          showCodeSamplesSelector: false,
          includeForks: false,
        };
      },

      handleLLMChange: function (e) {
        const selectedLLM = e.target.value;
        this.setState({ selectedLLM }, () => {
          // Load cached responses for the new model
          this.loadCachedChatResponses();
        });
      },

      handleApiKeyChange: function (e) {
        const apiKey = e.target.value;
        this.setState({ apiKey });
        // Don't save API key to frontmatter
      },

      handleMessageChange: function (e) {
        this.setState({ currentMessage: e.target.value });
      },

      handleSendMessage: function () {
        if (!this.state.currentMessage.trim() || !this.state.apiKey.trim()) {
          return;
        }

        const userMessage = this.state.currentMessage;
        const updatedMessages = [
          ...this.state.messages,
          { role: "user", content: userMessage },
        ];

        this.setState({
          currentMessage: "",
          messages: updatedMessages,
          isLoading: true,
          error: null,
        });

        // Don't save messages to frontmatter

        // Call AI API with the updated conversation history
        this.callAiAPI(userMessage, updatedMessages);
      },

      handleKeyPress: function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      },

      // Code samples event handlers
      handleUsernameChange: function (e) {
        const username = e.target.value;
        this.setState({ username });
      },

      componentDidMount: function () {
        this.loadCachedChatResponses();
        this.loadCachedCodeSamples();
      },

      loadCachedCodeSamples: function () {
        const postKey = getCurrentPostKey();
        if (!postKey) return;
        const cached = getCachedCodeSamples(postKey);
        if (cached && cached.selectedRepository) {
          // Restore repository, path, selected files, and settings
          this.setState(
            {
              selectedRepository: cached.selectedRepository,
              currentPath: cached.currentPath || "",
              selectedCodeFiles: cached.selectedCodeFiles || [],
              showCodeSamplesSelector: cached.showCodeSamplesSelector || false,
              includeForks:
                typeof cached.includeForks === "boolean"
                  ? cached.includeForks
                  : false,
            },
            () => {
              if (cached.selectedRepository) {
                this.loadRepositoryContent(
                  cached.selectedRepository,
                  cached.currentPath || ""
                );
              }
            }
          );
        }
      },

      persistCodeSamplesSelection: function () {
        const postKey = getCurrentPostKey();
        if (!postKey) return;
        setCachedCodeSamples(postKey, {
          selectedRepository: this.state.selectedRepository,
          currentPath: this.state.currentPath,
          selectedCodeFiles: this.state.selectedCodeFiles,
          showCodeSamplesSelector: this.state.showCodeSamplesSelector,
          includeForks: this.state.includeForks,
        });
      },

      handleRepositoryChange: function (e) {
        const selectedRepository = e.target.value;
        this.setState(
          {
            selectedRepository,
            currentPath: "",
            repositoryContent: [],
            selectedCodeFiles: [],
          },
          () => {
            if (selectedRepository) {
              this.loadRepositoryContent(selectedRepository, "");
            }
            this.persistCodeSamplesSelection();
          }
        );
      },

      handleCodeFileSelection: function (e) {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedFileNames = selectedOptions.map((option) => option.value);

        // Limit to 10 selections
        if (selectedFileNames.length > 10) {
          // Deselect the last selected if over limit
          e.target.options[e.target.selectedIndex].selected = false;
          return;
        }

        this.setState(
          { selectedCodeFiles: selectedFileNames },
          this.persistCodeSamplesSelection
        );
      },

      toggleCodeSamplesSelector: function () {
        this.setState((prevState) => {
          const newShowCodeSamplesSelector = !prevState.showCodeSamplesSelector;

          // Load repositories when showing the selector for the first time
          if (
            newShowCodeSamplesSelector &&
            prevState.repositories.length === 0 &&
            !prevState.loadingRepositories
          ) {
            this.loadRepositories();
          }

          setTimeout(() => this.persistCodeSamplesSelection(), 0);

          return {
            showCodeSamplesSelector: newShowCodeSamplesSelector,
          };
        });
      },

      navigateToPath: function (path) {
        const { selectedRepository } = this.state;
        if (selectedRepository) {
          this.loadRepositoryContent(selectedRepository, path);
        }
        this.setState({ currentPath: path }, this.persistCodeSamplesSelection);
      },

      navigateUp: function () {
        const { currentPath } = this.state;
        if (currentPath) {
          const parentPath = currentPath.split("/").slice(0, -1).join("/");
          this.navigateToPath(parentPath);
        }
      },

      callAiAPI: function (userMessage, messages) {
        const apiKey = this.state.apiKey;
        const selectedLLM = this.state.selectedLLM;
        const llmConfig = LLM_CHATBOTS[selectedLLM];

        if (!llmConfig) {
          this.setState({
            isLoading: false,
            error: "Selected LLM not found in configuration",
          });
          return;
        }

        // Load content from selected projects/blog posts and build enhanced prompt
        this.loadSelectedContent().then((postContent) => {
          // Build the conversation history for multi-turn chat
          let enhancedMessages = [...messages];

          // If this is the first message and we have post content, add it as context
          if (messages.length === 1 && postContent) {
            const contextMessage = {
              role: "user",
              content: `${postContent}\n\nNow, please respond to my prompt: ${userMessage}`,
            };
            enhancedMessages = [contextMessage];
          }

          if (selectedLLM === "gemini") {
            this.callGeminiAPI(apiKey, enhancedMessages, messages);
          } else if (selectedLLM === "openai") {
            this.callOpenAIAPI(apiKey, enhancedMessages, messages);
          } else if (selectedLLM === "anthropic") {
            this.callClaudeAPI(apiKey, enhancedMessages, messages);
          } else {
            this.setState({
              isLoading: false,
              error: "Unsupported LLM selected",
            });
          }
        });
      },

      callGeminiAPI: function (apiKey, enhancedMessages, originalMessages) {
        const url = `${LLM_CHATBOTS.gemini.apiBaseUrl}:generateContent?key=${apiKey}`;

        const contents = enhancedMessages.map((message) => ({
          role: message.role === "user" ? "user" : "model",
          parts: [
            {
              text: message.content,
            },
          ],
        }));

        const requestBody = {
          system_instruction: {
            parts: [
              {
                text: "You are Gemini, an AI assistant. Please format your response in lightweight markdown (no HTML tags).",
              },
            ],
          },
          contents: contents,
        };

        // Log the request for debugging (remove in production)
        console.log(
          "Gemini API Request:",
          JSON.stringify(requestBody, null, 2)
        );

        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            // Log the response for debugging (remove in production)
            console.log("Gemini API Response:", JSON.stringify(data, null, 2));

            if (
              data.candidates &&
              data.candidates[0] &&
              data.candidates[0].content
            ) {
              const assistantMessage = data.candidates[0].content.parts[0].text;
              const updatedMessages = [
                ...originalMessages,
                { role: "assistant", content: assistantMessage },
              ];

              // Extract total token count from usage metadata
              const totalTokenCount = data.usageMetadata?.totalTokenCount || 0;

              // Cache the updated messages for the current post
              const postKey = getCurrentPostKey();
              if (postKey) {
                setCachedChatResponses(
                  postKey,
                  updatedMessages,
                  totalTokenCount,
                  "gemini"
                );
              }

              this.setState({
                messages: updatedMessages,
                isLoading: false,
                totalTokenCount: totalTokenCount,
              });
            } else {
              throw new Error("Invalid response format from Gemini API");
            }
          })
          .catch((error) => {
            console.error("Error calling Gemini API:", error);
            this.setState({
              isLoading: false,
              error: error.message,
            });
          });
      },

      callOpenAIAPI: function (apiKey, enhancedMessages, originalMessages) {
        const url = LLM_CHATBOTS["openai"].apiBaseUrl;

        // Convert messages to OpenAI format
        const messages = enhancedMessages.map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        }));

        const requestBody = {
          model: "gpt-4o-mini",
          messages: messages,
          max_tokens: 4000,
          temperature: 0.7,
        };

        // Log the request for debugging (remove in production)
        console.log(
          "OpenAI API Request:",
          JSON.stringify(requestBody, null, 2)
        );

        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            // Log the response for debugging (remove in production)
            console.log("OpenAI API Response:", JSON.stringify(data, null, 2));

            if (data.choices && data.choices[0] && data.choices[0].message) {
              const assistantMessage = data.choices[0].message.content;
              const updatedMessages = [
                ...originalMessages,
                { role: "assistant", content: assistantMessage },
              ];

              // Extract total token count from usage
              const totalTokenCount = data.usage?.total_tokens || 0;

              // Cache the updated messages for the current post
              const postKey = getCurrentPostKey();
              if (postKey) {
                setCachedChatResponses(
                  postKey,
                  updatedMessages,
                  totalTokenCount,
                  "openai"
                );
              }

              this.setState({
                messages: updatedMessages,
                isLoading: false,
                totalTokenCount: totalTokenCount,
              });
            } else {
              throw new Error("Invalid response format from OpenAI API");
            }
          })
          .catch((error) => {
            console.error("Error calling OpenAI API:", error);
            this.setState({
              isLoading: false,
              error: error.message,
            });
          });
      },

      callClaudeAPI: function (apiKey, enhancedMessages, originalMessages) {
        const url = LLM_CHATBOTS["anthropic"].apiBaseUrl;
        // Anthropic expects a single string prompt, but supports message history in v1/messages
        // We'll convert our messages to Anthropic's format
        const systemPrompt =
          "You are Claude, an AI assistant. Please format your response in lightweight markdown (no HTML tags).";
        const messages = enhancedMessages.map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        }));
        const requestBody = {
          model: "claude-opus-4-20250514",
          max_tokens: 4000,
          temperature: 0.7,
          system: systemPrompt,
          messages: messages,
        };
        // Log the request for debugging (remove in production)
        console.log(
          "Claude API Request:",
          JSON.stringify(requestBody, null, 2)
        );
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(requestBody),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            // Log the response for debugging (remove in production)
            console.log("Claude API Response:", JSON.stringify(data, null, 2));
            if (
              data.content &&
              Array.isArray(data.content) &&
              data.content[0] &&
              data.content[0].text
            ) {
              const assistantMessage = data.content[0].text;
              const updatedMessages = [
                ...originalMessages,
                { role: "assistant", content: assistantMessage },
              ];
              // Anthropic does not return token usage in the same way
              const totalTokenCount = data.usage?.output_tokens || 0;
              // Cache the updated messages for the current post
              const postKey = getCurrentPostKey();
              if (postKey) {
                setCachedChatResponses(
                  postKey,
                  updatedMessages,
                  totalTokenCount,
                  "anthropic"
                );
              }
              this.setState({
                messages: updatedMessages,
                isLoading: false,
                totalTokenCount: totalTokenCount,
              });
            } else {
              throw new Error("Invalid response format from Claude API");
            }
          })
          .catch((error) => {
            console.error("Error calling Claude API:", error);
            this.setState({
              isLoading: false,
              error: error.message,
            });
          });
      },

      clearChat: function () {
        const postKey = getCurrentPostKey();
        if (postKey) {
          clearCachedChatResponses(postKey, this.state.selectedLLM);
        }
        this.setState({ messages: [], error: null, totalTokenCount: 0 });
      },

      loadCachedChatResponses: function () {
        const postKey = getCurrentPostKey();
        if (!postKey) return;

        const cachedData = getCachedChatResponses(
          postKey,
          this.state.selectedLLM
        );
        if (cachedData && cachedData.messages) {
          console.log("Loading cached chat responses for post:", postKey);
          this.setState({
            messages: cachedData.messages,
            totalTokenCount: cachedData.totalTokenCount || 0,
          });
        } else {
          this.setState({
            messages: [],
            totalTokenCount: 0,
          });
        }
      },

      clearPostsCache: function () {
        clearPostsCache();
        // Reload posts to get fresh data
        this.loadPosts();
      },

      loadPosts: function () {
        this.setState({ loadingPosts: true });

        // Check GitHub cache first
        const cachedPosts = getCachedPosts("github");
        if (cachedPosts) {
          console.log("Using cached GitHub posts list");
          this.setState({
            posts: cachedPosts,
            loadingPosts: false,
          });
          return;
        }

        // Try GitHub API first, then fallback to sitemap
        this.loadPostsFromGitHub()
          .then((posts) => {
            if (posts && posts.length > 0) {
              // Cache the results
              setCachedPosts(posts, "github");
              this.setState({
                posts: posts,
                loadingPosts: false,
              });
            } else {
              // Fallback to sitemap method
              this.loadPostsFromSitemap();
            }
          })
          .catch((error) => {
            console.warn("GitHub API failed, falling back to sitemap:", error);
            this.loadPostsFromSitemap();
          });
      },

      loadPostsFromGitHub: function () {
        const postPromises = postTypes.map((postType) => {
          return fetch(
            `${githubApiBaseUrl}/repos/${owner}/${repo}/contents/content/${postType}?ref=${branch}`
          )
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then((data) => {
              if (!Array.isArray(data)) return [];
              return data
                .filter((item) => item.type === "dir" && item.name !== "images")
                .map((item) => ({
                  url: `${rawGithubBaseUrl}/${owner}/${repo}/${branch}/content/${postType}/${item.name}/index.md`,
                  name: `[${postType}] ${item.name}`,
                  type: postType,
                  content: null,
                  lastmod: null,
                  path: `content/${postType}/${item.name}/index.md`,
                }));
            });
        });

        return Promise.all(postPromises).then((allPosts) => {
          return allPosts.flat();
        });
      },

      loadPostsFromSitemap: function () {
        // Check sitemap cache first
        const cachedSitemapPosts = getCachedPosts("sitemap");
        if (cachedSitemapPosts) {
          console.log("Using cached sitemap posts list");
          this.setState({
            posts: cachedSitemapPosts,
            loadingPosts: false,
          });
          return;
        }

        fetch(sitemapXmlPath)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then((xmlText) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const urls = xmlDoc.querySelectorAll("url");

            const posts = [];
            urls.forEach((url) => {
              const loc = url.querySelector("loc");
              const lastmod = url.querySelector("lastmod");

              if (loc) {
                const urlText = loc.textContent;

                // Check for project or blog pages
                const postType = postTypes.find((type) =>
                  urlText.includes(`/${type}/`)
                );

                if (postType) {
                  const postUrl = urlText;
                  const postName = postUrl
                    .split(`${postType}/`)[1]
                    .replace(/\/$/, "");

                  // Only include actual post pages (not categories or index pages)
                  if (
                    postName &&
                    postName !== "" &&
                    !postName.includes("categories")
                  ) {
                    posts.push({
                      url: postUrl,
                      name: `[${postType}] ${postName}`,
                      type: postType,
                      content: null,
                      lastmod: lastmod ? lastmod.textContent : null,
                    });
                  }
                }
              }
            });

            // Sort posts by lastmod date (newest first)
            posts.sort((a, b) => {
              if (!a.lastmod && !b.lastmod) return 0;
              if (!a.lastmod) return 1;
              if (!b.lastmod) return -1;
              return new Date(b.lastmod) - new Date(a.lastmod);
            });

            // Cache the sitemap results
            setCachedPosts(posts, "sitemap");
            this.setState({
              posts: posts,
              loadingPosts: false,
            });
          })
          .catch((error) => {
            console.error("Error loading posts from sitemap:", error);
            this.setState({
              loadingPosts: false,
              error: "Failed to load posts: " + error.message,
            });
          });
      },

      // Code samples loading methods
      loadRepositories: function () {
        const { username, includeForks } = this.state;
        this.setState({ loadingRepositories: true });

        // Check cache first
        const cachedRepositories = getCachedRepositories(username);
        if (cachedRepositories) {
          console.log("Using cached repositories list");
          this.setState({
            repositories: cachedRepositories,
            loadingRepositories: false,
          });
          return;
        }

        fetch(
          `${githubApiBaseUrl}/users/${username}/repos?sort=updated&per_page=100&type=${
            includeForks ? "all" : "owner"
          }`
        )
          .then((response) => {
            if (!response.ok) {
              if (response.status === 403) {
                throw new Error(
                  "GitHub API rate limit exceeded. Please try again later or use a GitHub token for higher limits."
                );
              } else if (response.status === 404) {
                throw new Error(`User '${username}' not found on GitHub.`);
              } else {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
            }
            return response.json();
          })
          .then((data) => {
            if (!Array.isArray(data)) {
              throw new Error("Invalid response from GitHub API");
            }

            const repositories = data
              .filter((repo) => (includeForks ? true : !repo.fork)) // Exclude forked repositories unless includeForks is true
              .map((repo) => ({
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description || "",
                language: repo.language || "Unknown",
                updatedAt: repo.updated_at,
                defaultBranch: repo.default_branch,
              }))
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            // Cache the results
            setCachedRepositories(username, repositories);
            this.setState({
              repositories: repositories,
              loadingRepositories: false,
            });
          })
          .catch((error) => {
            console.error("Error loading repositories:", error);
            this.setState({
              loadingRepositories: false,
              error: "Failed to load repositories: " + error.message,
            });
          });
      },

      loadRepositoryContent: function (repository, path) {
        const { username } = this.state;
        this.setState({ loadingRepositoryContent: true });

        const repoPath = `${username}/${repository}/${path}`;

        // Check cache first
        const cachedContent = getCachedRepositoryContent(repoPath);
        if (cachedContent) {
          console.log("Using cached repository content for:", repoPath);
          this.setState({
            repositoryContent: cachedContent,
            currentPath: path,
            loadingRepositoryContent: false,
          });
          return;
        }

        fetch(
          `${githubApiBaseUrl}/repos/${username}/${repository}/contents/${path}`
        )
          .then((response) => {
            if (!response.ok) {
              if (response.status === 403) {
                throw new Error(
                  "GitHub API rate limit exceeded. Please try again later or use a GitHub token for higher limits."
                );
              } else if (response.status === 404) {
                throw new Error(
                  `Path '${path}' not found in repository '${repository}'.`
                );
              } else {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
            }
            return response.json();
          })
          .then((data) => {
            let content = [];

            if (Array.isArray(data)) {
              // Directory contents
              content = data
                .filter((item) => item.type === "file" || item.type === "dir")
                .map((item) => ({
                  name: item.name,
                  type: item.type,
                  path: item.path,
                  size: item.size || 0,
                  downloadUrl: item.download_url,
                }))
                .sort((a, b) => {
                  // Directories first, then files, both alphabetically
                  if (a.type !== b.type) {
                    return a.type === "dir" ? -1 : 1;
                  }
                  return a.name.localeCompare(b.name);
                });
            } else {
              // Single file
              content = [
                {
                  name: data.name,
                  type: data.type,
                  path: data.path,
                  size: data.size || 0,
                  downloadUrl: data.download_url,
                },
              ];
            }

            // Cache the results
            setCachedRepositoryContent(repoPath, content);
            this.setState({
              repositoryContent: content,
              currentPath: path,
              loadingRepositoryContent: false,
            });
          })
          .catch((error) => {
            console.error("Error loading repository content:", error);
            this.setState({
              loadingRepositoryContent: false,
              error: "Failed to load repository content: " + error.message,
            });
          });
      },

      loadCodeFileContent: function (fileUrl) {
        return fetch(fileUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .catch((error) => {
            console.error("Error loading code file content:", error);
            return "";
          });
      },

      loadPostContent: function (postUrl) {
        // Determine source and check appropriate cache
        const source = postUrl.includes(rawGithubBaseUrl)
          ? "github"
          : "sitemap";
        const cachedContent = getCachedPostContent(postUrl, source);
        if (cachedContent) {
          console.log("Using cached content for:", postUrl);
          return Promise.resolve(cachedContent);
        }

        return fetch(postUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then((content) => {
            let processedContent;
            // Check if this is a GitHub raw markdown file or HTML content
            if (postUrl.includes(rawGithubBaseUrl)) {
              // This is markdown content from GitHub API
              processedContent = this.cleanMarkdownContent(content);
            } else {
              // This is HTML content from sitemap fallback
              processedContent = this.extractHtmlContent(content);
            }

            // Cache the processed content
            setCachedPostContent(postUrl, processedContent, source);
            return processedContent;
          })
          .catch((error) => {
            console.error("Error loading post content:", error);
            return "";
          });
      },

      cleanMarkdownContent: function (markdown) {
        // markdown content is considered already clean
        return markdown;
      },

      extractHtmlContent: function (html) {
        // Extract content from HTML (fallback method)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const contentElement = doc.querySelector(".post__content");
        if (!contentElement) return "";

        // Get the text content and clean up whitespace
        let content = contentElement.textContent;

        // Split by newlines, trim each line, filter out empty lines, and rejoin
        content = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("\n");

        return content;
      },

      // Renders just the code blocks inside <pre> tags
      renderSimpleMarkdown: function (content) {
        if (!content) return h("div", {}, "");

        // Split content into lines
        const lines = content.split("\n");
        const elements = [];
        let currentParagraph = [];
        let inCodeBlock = false;
        let codeBlockContent = [];
        let codeBlockIndex = 0;
        let codeLanguage = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Check for code block start/end
          if (trimmedLine.startsWith("```")) {
            if (inCodeBlock) {
              // End of code block
              const codeContent = codeBlockContent.join("\n");
              elements.push(
                h(
                  "pre",
                  { key: `code-${codeBlockIndex}` },
                  h(
                    "div",
                    { className: "code-block-header" },
                    h("span", {}, codeLanguage || "Code"),
                    h(
                      "button",
                      {
                        className: "copy-button",
                        onClick: (e) => {
                          const button = e.target;
                          this.copyToClipboardWithButton(codeContent, button);
                        },
                      },
                      "Copy"
                    )
                  ),
                  h("code", {}, codeContent)
                )
              );
              codeBlockIndex++;
              inCodeBlock = false;
              codeBlockContent = [];
              codeLanguage = "";
            } else {
              // Start of code block
              if (currentParagraph.length > 0) {
                elements.push(
                  h(
                    "p",
                    { key: `p-${elements.length}` },
                    this.renderInlineMarkdown(currentParagraph.join("\n"))
                  )
                );
                currentParagraph = [];
              }
              inCodeBlock = true;
              // Extract language from code block start (e.g., ```javascript -> javascript)
              codeLanguage = trimmedLine.slice(3).trim();
            }
            continue;
          }

          if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
          }

          // Handle regular lines
          if (trimmedLine === "") {
            if (currentParagraph.length > 0) {
              elements.push(
                h(
                  "p",
                  { key: `p-${elements.length}` },
                  this.renderInlineMarkdown(currentParagraph.join("\n"))
                )
              );
              currentParagraph = [];
            }
          } else {
            currentParagraph.push(line);
          }
        }

        // Handle any remaining content
        if (currentParagraph.length > 0) {
          elements.push(
            h(
              "p",
              { key: `p-${elements.length}` },
              this.renderInlineMarkdown(currentParagraph.join("\n"))
            )
          );
        }

        return h("div", { className: "markdown-content" }, elements);
      },

      renderInlineMarkdown: function (text) {
        if (!text) return "";
        // marked.parse() returns raw HTML which can't be rendered with h()
        // without using dangerouslySetInnerHTML
        // if (typeof marked === "function") {
        //   return marked(text);
        // } else if (
        //   typeof marked === "object" &&
        //   typeof marked.parse === "function"
        // ) {
        //   return marked.parse(text);
        // }
        return text;
      },

      copyToClipboard: function (text, buttonId) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            // Find the button and show copied state
            const button = document.querySelector(
              `[data-button-id="${buttonId}"]`
            );
            if (button) {
              const originalText = button.textContent;
              button.textContent = "Copied!";
              button.classList.add("copied");
              setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove("copied");
              }, 2000);
            } else {
              console.warn("Copy button not found:", buttonId);
            }
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
          });
      },

      copyToClipboardWithButton: function (text, button) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            // Update the button directly
            const originalText = button.textContent;
            button.textContent = "Copied!";
            button.classList.add("copied");
            setTimeout(() => {
              button.textContent = originalText;
              button.classList.remove("copied");
            }, 2000);
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
          });
      },

      handlePostSelection: function (e) {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedPostNames = selectedOptions.map((option) => option.value);

        this.setState({ selectedPosts: selectedPostNames });
      },

      togglePostSelector: function () {
        this.setState((prevState) => {
          const newShowPostSelector = !prevState.showPostSelector;

          // Load posts when showing the selector for the first time
          if (
            newShowPostSelector &&
            prevState.posts.length === 0 &&
            !prevState.loadingPosts
          ) {
            this.loadPosts();
          }

          return {
            showPostSelector: newShowPostSelector,
          };
        });
      },

      loadSelectedContent: function () {
        const {
          posts,
          selectedPosts,
          repositories,
          selectedRepository,
          selectedCodeFiles,
          repositoryContent,
        } = this.state;

        const contentPromises = [];

        // Load selected post content
        if (selectedPosts.length > 0) {
          contentPromises.push(
            Promise.resolve(
              "Here are some examples of my writing style from previous content:\n\n"
            )
          );

          const selectedContentObjects = posts.filter((post) =>
            selectedPosts.includes(post.name)
          );

          const postContentPromises = selectedContentObjects.map((post) =>
            this.loadPostContent(post.url)
          );

          contentPromises.push(
            Promise.all(postContentPromises).then((contents) => {
              return contents
                .filter((content) => content.length > 0)
                .map((content, index) => {
                  const contentObj = selectedContentObjects[index];
                  return `${contentObj.name}\n\`\`\`${content}\n\`\`\`\n---\n\n`;
                })
                .join("");
            })
          );
        }

        // Load selected code files
        if (selectedCodeFiles.length > 0 && selectedRepository) {
          contentPromises.push(
            Promise.resolve(
              "Here are some code files related to my prompt:\n\n"
            )
          );

          const selectedFileObjects = repositoryContent.filter((item) =>
            selectedCodeFiles.includes(item.name)
          );

          const codeContentPromises = selectedFileObjects.map((file) =>
            this.loadCodeFileContent(file.downloadUrl)
          );

          contentPromises.push(
            Promise.all(codeContentPromises).then((contents) => {
              return contents
                .filter((content) => content.length > 0)
                .map((content, index) => {
                  const fileObj = selectedFileObjects[index];
                  const filePath = fileObj.path;
                  const fileName = fileObj.name;
                  return `Code file: ${fileName} (${filePath})\n\`\`\`${this.getFileExtension(
                    fileName
                  )}\n${content}\n\`\`\`\n---\n\n`;
                })
                .join("");
            })
          );
        }

        return Promise.all(contentPromises).then((contents) => {
          return contents.join("");
        });
      },

      getFileExtension: function (fileName) {
        const parts = fileName.split(".");
        if (parts.length > 1) {
          return parts[parts.length - 1];
        }
        return "text";
      },

      formatFileSize: function (bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      },

      updateValue: function (value) {
        // Don't save anything to frontmatter - this widget is purely for content creation
        // and should not affect the content structure at all
      },

      render: function () {
        const {
          selectedLLM,
          apiKey,
          messages,
          currentMessage,
          isLoading,
          error,
          posts,
          selectedPosts,
          loadingPosts,
          showPostSelector,
          totalTokenCount,
          // Code samples state
          username,
          repositories,
          selectedRepository,
          currentPath,
          repositoryContent,
          selectedCodeFiles,
          loadingRepositories,
          loadingRepositoryContent,
          showCodeSamplesSelector,
          includeForks,
        } = this.state;

        return h(
          "div",
          { className: "ai-chat-widget" },

          // Post selection toggle button
          h(
            "div",
            { className: "post-toggle-section" },
            h(
              "button",
              {
                type: "button",
                onClick: this.togglePostSelector,
                className: "post-toggle-button",
              },
              showPostSelector
                ? "Hide Content Examples"
                : "Show Content Examples"
            ),
            selectedPosts.length > 0 &&
              h(
                "span",
                { className: "selected-count" },
                ` (${selectedPosts.length} selected)`
              )
          ),

          // Post selection dropdown (hidden by default)
          showPostSelector &&
            h(
              "div",
              { className: "post-selection-section" },
              h(
                "label",
                { htmlFor: this.props.forID + "-post-select" },
                "Select up to 3 posts as writing examples:"
              ),
              loadingPosts
                ? h("div", { className: "loading-posts" }, "Loading posts...")
                : h(
                    "select",
                    {
                      id: this.props.forID + "-post-select",
                      multiple: true,
                      size: Math.min(6, posts.length),
                      value: selectedPosts,
                      onChange: (e) => {
                        // Limit to 3 selections
                        const options = Array.from(
                          e.target.selectedOptions
                        ).map((opt) => opt.value);
                        if (options.length <= 3) {
                          this.handlePostSelection(e);
                        } else {
                          // Deselect the last selected if over limit
                          e.target.options[
                            e.target.selectedIndex
                          ].selected = false;
                        }
                      },
                      className: "post-dropdown",
                    },
                    posts.map((post) => {
                      const date = post.lastmod
                        ? new Date(post.lastmod).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "";
                      const displayText = date
                        ? `${post.name} (${date})`
                        : post.name;

                      return h(
                        "option",
                        { key: post.name, value: post.name },
                        displayText
                      );
                    })
                  ),
              h(
                "div",
                { className: "post-selection-note" },
                "(You can select up to 3 posts. These will be included as writing examples in the prompt.)"
              ),
              h(
                "div",
                { className: "cache-buttons" },
                h(
                  "button",
                  {
                    onClick: this.clearPostsCache,
                    disabled: isLoading,
                    className: "clear-cache-button",
                    title: "Clear cached content (refreshes from GitHub API)",
                  },
                  "Clear Post Cache"
                ),
                h(
                  "button",
                  {
                    onClick: clearAllChatResponseCaches,
                    disabled: isLoading,
                    className: "clear-chat-cache-button",
                    title: "Clear all chat response caches across all posts",
                  },
                  "Clear All Chat Caches"
                )
              )
            ),

          // Code samples toggle button
          h(
            "div",
            { className: "post-toggle-section" },
            h(
              "button",
              {
                type: "button",
                onClick: this.toggleCodeSamplesSelector,
                className: "post-toggle-button",
              },
              showCodeSamplesSelector
                ? "Hide Code Samples"
                : "Show Code Samples"
            ),
            selectedCodeFiles.length > 0 &&
              h(
                "span",
                { className: "selected-count" },
                ` (${selectedCodeFiles.length} selected)`
              )
          ),

          // Code samples selector (hidden by default)
          showCodeSamplesSelector &&
            h(
              "div",
              { className: "post-selection-section" },
              // Username input
              h(
                "div",
                { className: "username-section" },
                h(
                  "label",
                  { htmlFor: this.props.forID + "-username" },
                  "GitHub Username:"
                ),
                h("input", {
                  id: this.props.forID + "-username",
                  type: "text",
                  value: username,
                  onChange: this.handleUsernameChange,
                  placeholder: "Enter GitHub username",
                  className: "api-key-input",
                  style: { marginBottom: "12px" },
                }),
                // Include forks checkbox
                h(
                  "label",
                  {
                    style: {
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "13px",
                    },
                  },
                  h("input", {
                    type: "checkbox",
                    checked: includeForks,
                    onChange: (e) => {
                      this.setState(
                        { includeForks: e.target.checked },
                        this.loadRepositories
                      );
                    },
                    style: { marginRight: "6px" },
                  }),
                  "Include forked repositories"
                ),
                h(
                  "button",
                  {
                    onClick: this.loadRepositories,
                    disabled: loadingRepositories || !username.trim(),
                    className: "clear-cache-button",
                    style: { marginBottom: "16px" },
                  },
                  loadingRepositories ? "Loading..." : "Load Repositories"
                )
              ),

              // Repository selector
              repositories.length > 0 &&
                h(
                  "div",
                  { className: "repository-section" },
                  h(
                    "label",
                    { htmlFor: this.props.forID + "-repo-select" },
                    "Select Repository:"
                  ),
                  h(
                    "select",
                    {
                      id: this.props.forID + "-repo-select",
                      value: selectedRepository,
                      onChange: this.handleRepositoryChange,
                      className: "post-dropdown",
                      style: { marginBottom: "12px" },
                    },
                    h("option", { value: "" }, "Choose a repository..."),
                    repositories.map((repo) => {
                      const date = new Date(repo.updatedAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      );
                      const displayText = `${repo.name} (${repo.language}) - Updated ${date}`;

                      return h(
                        "option",
                        { key: repo.name, value: repo.name },
                        displayText
                      );
                    })
                  )
                ),

              // Repository content browser
              selectedRepository &&
                h(
                  "div",
                  { className: "repository-content-section" },
                  // Breadcrumb navigation
                  currentPath &&
                    h(
                      "div",
                      { className: "breadcrumb-section" },
                      h(
                        "button",
                        {
                          onClick: this.navigateUp,
                          className: "clear-cache-button",
                          style: { marginBottom: "8px", fontSize: "12px" },
                        },
                        "← Go Up"
                      ),
                      h(
                        "div",
                        { className: "current-path" },
                        `Current path: ${currentPath || "root"}`
                      )
                    ),

                  // File/directory list
                  h(
                    "div",
                    { className: "file-list-section" },
                    h(
                      "label",
                      { htmlFor: this.props.forID + "-file-select" },
                      "Select up to 10 code files:"
                    ),
                    loadingRepositoryContent
                      ? h(
                          "div",
                          { className: "loading-posts" },
                          "Loading files..."
                        )
                      : h(
                          "div",
                          { className: "file-list-container" },
                          // Directories first
                          repositoryContent
                            .filter((item) => item.type === "dir")
                            .map((item) =>
                              h(
                                "div",
                                {
                                  key: item.path,
                                  className: "file-item directory-item",
                                  onClick: () => this.navigateToPath(item.path),
                                },
                                h("span", { className: "file-icon" }, "📁"),
                                h("span", { className: "file-name" }, item.name)
                              )
                            ),
                          // Then files
                          h(
                            "select",
                            {
                              id: this.props.forID + "-file-select",
                              multiple: true,
                              size: Math.min(
                                8,
                                repositoryContent.filter(
                                  (item) => item.type === "file"
                                ).length + 1
                              ),
                              value: selectedCodeFiles,
                              onChange: this.handleCodeFileSelection,
                              className: "post-dropdown",
                            },
                            repositoryContent
                              .filter((item) => item.type === "file")
                              .map((item) => {
                                const size = ` (${this.formatFileSize(
                                  item.size
                                )})`;
                                const displayText = `📄 ${item.name}${size}`;

                                return h(
                                  "option",
                                  { key: item.path, value: item.name },
                                  displayText
                                );
                              })
                          )
                        )
                  )
                ),

              h(
                "div",
                { className: "post-selection-note" },
                "(You can select up to 10 code files. These will be included as code examples in the prompt.)"
              ),
              h(
                "div",
                { className: "cache-buttons" },
                h(
                  "button",
                  {
                    onClick: clearCodeSamplesCache,
                    disabled: isLoading,
                    className: "clear-cache-button",
                    title: "Clear cached repositories and file content",
                  },
                  "Clear Code Cache"
                )
              )
            ),

          // LLM Selection and API Key Input
          h(
            "div",
            { className: "api-key-section" },
            h(
              "div",
              { className: "llm-api-row" },
              h(
                "div",
                { className: "llm-selector" },
                h(
                  "label",
                  { htmlFor: this.props.forID + "-llm-select" },
                  "LLM:"
                ),
                h(
                  "select",
                  {
                    id: this.props.forID + "-llm-select",
                    value: selectedLLM,
                    onChange: this.handleLLMChange,
                    className: "llm-dropdown",
                  },
                  Object.keys(LLM_CHATBOTS).map((llmKey) => {
                    const llm = LLM_CHATBOTS[llmKey];
                    return h(
                      "option",
                      { key: llmKey, value: llmKey },
                      llm.name
                    );
                  })
                )
              ),
              h(
                "div",
                { className: "api-key-input-container" },
                h(
                  "label",
                  { htmlFor: this.props.forID + "-api-key" },
                  "API Key:"
                ),
                h("input", {
                  id: this.props.forID + "-api-key",
                  type: "password",
                  value: apiKey,
                  onChange: this.handleApiKeyChange,
                  placeholder: `Enter your ${
                    LLM_CHATBOTS[selectedLLM]?.name || "LLM"
                  } API key`,
                  className: "api-key-input",
                })
              )
            )
          ),

          // Chat Interface
          h(
            "div",
            { className: "chat-container" },
            // Conversation Header
            messages.length > 0 &&
              h(
                "div",
                { className: "conversation-header" },
                h(
                  "span",
                  { className: "message-count" },
                  `${messages.length} message${
                    messages.length !== 1 ? "s" : ""
                  } in conversation`
                ),
                totalTokenCount > 0 &&
                  h(
                    "span",
                    { className: "token-count" },
                    ` • ${totalTokenCount.toLocaleString()} tokens used`
                  )
              ),
            // Messages Area
            h(
              "div",
              { className: "messages-container" },
              messages.length === 0 &&
                h(
                  "div",
                  { className: "empty-state" },
                  h(
                    "p",
                    {},
                    "Start a conversation with AI. Enter your API key above and type a message below."
                  )
                ),
              messages.map((message, index) => {
                const isUser = message.role === "user";
                return h(
                  "div",
                  {
                    key: index,
                    className:
                      "message " +
                      (isUser ? "user-message" : "assistant-message"),
                  },
                  h(
                    "div",
                    { className: "message-content" },
                    isUser
                      ? message.content
                      : this.renderSimpleMarkdown(message.content)
                  )
                );
              }),
              isLoading &&
                h(
                  "div",
                  { className: "message assistant-message" },
                  h(
                    "div",
                    { className: "message-content loading" },
                    "Thinking..."
                  )
                )
            ),

            // Error Display
            error && h("div", { className: "error-message" }, error),

            // Input Area
            h(
              "div",
              { className: "input-area" },
              h("textarea", {
                value: currentMessage,
                onChange: this.handleMessageChange,
                onKeyPress: this.handleKeyPress,
                placeholder: "Type your message here...",
                disabled: isLoading || !apiKey.trim(),
                className: "message-input",
              }),
              h(
                "div",
                { className: "button-group" },
                h(
                  "button",
                  {
                    onClick: this.handleSendMessage,
                    disabled:
                      isLoading || !currentMessage.trim() || !apiKey.trim(),
                    className: "send-button",
                  },
                  "Send"
                ),
                h(
                  "button",
                  {
                    onClick: this.clearChat,
                    disabled: isLoading,
                    className: "clear-button",
                  },
                  "Clear Chat"
                )
              )
            )
          )
        );
      },
    });

    // Schema for the widget - empty since we don't save anything
    var schema = {
      properties: {},
    };

    // Register the widget
    CMS.registerWidget(
      "ai-chat",
      AiChatControl,
      null, // no preview
      schema
    );
  }

  // Start the registration process
  registerAiChatWidget();
})();
