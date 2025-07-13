// Custom Gemini Chat Widget for Decap CMS
// Wait for CMS to be available before registering the widget
(function () {
  const owner = "dinosoeren";
  const repo = "walls.dev";
  const branch = "main";
  const postTypes = ["project", "blog"];
  const sitemapXmlPath = "../sitemap.xml";
  const githubApiBaseUrl = "https://api.github.com";
  const rawGithubBaseUrl = "https://raw.githubusercontent.com";
  const geminiApiBaseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";

  // Cache configuration
  const CACHE_EXPIRY_HOURS = 24;
  const CACHE_KEYS = {
    POSTS_LIST_GITHUB: "gemini_chat_posts_list_github",
    POSTS_LIST_SITEMAP: "gemini_chat_posts_list_sitemap",
    POST_CONTENT_GITHUB: "gemini_chat_post_content_github_",
    POST_CONTENT_SITEMAP: "gemini_chat_post_content_sitemap_",
    CACHE_TIMESTAMP: "gemini_chat_cache_timestamp",
    CHAT_RESPONSES: "gemini_chat_responses_",
  };

  // Cache utility functions
  function isCacheValid() {
    try {
      const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      if (!timestamp) return false;

      const cacheTime = new Date(parseInt(timestamp));
      const now = new Date();
      const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

      return hoursDiff < CACHE_EXPIRY_HOURS;
    } catch (error) {
      console.warn("Cache validation failed:", error);
      return false;
    }
  }

  function setCacheTimestamp() {
    try {
      localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.warn("Failed to set cache timestamp:", error);
    }
  }

  function getCachedPosts(source = "github") {
    try {
      if (!isCacheValid()) return null;
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
      setCacheTimestamp();
    } catch (error) {
      console.warn("Failed to cache posts:", error);
    }
  }

  function getCachedPostContent(postUrl, source = "github") {
    try {
      if (!isCacheValid()) return null;
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
      setCacheTimestamp();
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

  // Clear all Gemini chat responses across all posts
  function clearAllChatResponseCaches() {
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

  function getCachedChatResponses(postKey) {
    try {
      if (!postKey) return null;
      const key = CACHE_KEYS.CHAT_RESPONSES + postKey;
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn("Failed to get cached chat responses:", error);
      return null;
    }
  }

  function setCachedChatResponses(postKey, messages, totalTokenCount) {
    try {
      if (!postKey) return;
      const key = CACHE_KEYS.CHAT_RESPONSES + postKey;
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

  function clearCachedChatResponses(postKey) {
    try {
      if (!postKey) return;
      const key = CACHE_KEYS.CHAT_RESPONSES + postKey;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to clear cached chat responses:", error);
    }
  }

  let retryCount = 0;
  const maxRetries = 5;

  function registerGeminiChatWidget() {
    if (typeof CMS === "undefined") {
      // If CMS is not available yet, try again in a moment (up to maxRetries times)
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(registerGeminiChatWidget, 100);
      } else {
        console.warn(
          "Gemini Chat widget: CMS not available after",
          maxRetries,
          "retries. Widget registration failed."
        );
      }
      return;
    }

    // Control component for the widget
    var GeminiChatControl = createClass({
      getInitialState: function () {
        return {
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
        };
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

        // Call Gemini API with the updated conversation history
        this.callGeminiAPI(userMessage, updatedMessages);
      },

      handleKeyPress: function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      },

      callGeminiAPI: function (userMessage, messages) {
        const apiKey = this.state.apiKey;
        const url = `${geminiApiBaseUrl}:generateContent?key=${apiKey}`;

        // Load content from selected projects/blog posts and build enhanced prompt
        this.loadSelectedContent().then((postContent) => {
          // Build the conversation history for multi-turn chat
          let enhancedMessages = [...messages];

          // If this is the first message and we have post content, add it as context
          if (messages.length === 1 && postContent) {
            const contextMessage = {
              role: "user",
              content: `Here are some examples of my writing style from previous content:\n\n${postContent}\n\nNow, please respond to my prompt: ${userMessage}`,
            };
            enhancedMessages = [contextMessage];
          }

          const contents = enhancedMessages.map((message) => ({
            role: message.role === "user" ? "user" : "model",
            parts: [
              {
                text: message.content,
              },
            ],
          }));

          const requestBody = {
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
              console.log(
                "Gemini API Response:",
                JSON.stringify(data, null, 2)
              );

              if (
                data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content
              ) {
                const assistantMessage =
                  data.candidates[0].content.parts[0].text;
                const updatedMessages = [
                  ...messages,
                  { role: "assistant", content: assistantMessage },
                ];

                // Extract total token count from usage metadata
                const totalTokenCount =
                  data.usageMetadata?.totalTokenCount || 0;

                // Cache the updated messages for the current post
                const postKey = getCurrentPostKey();
                if (postKey) {
                  setCachedChatResponses(
                    postKey,
                    updatedMessages,
                    totalTokenCount
                  );
                }

                this.setState({
                  messages: updatedMessages,
                  isLoading: false,
                  totalTokenCount: totalTokenCount,
                });
                // Don't save messages to frontmatter
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
        });
      },

      clearChat: function () {
        const postKey = getCurrentPostKey();
        if (postKey) {
          clearCachedChatResponses(postKey);
        }
        this.setState({ messages: [], error: null, totalTokenCount: 0 });
      },

      loadCachedChatResponses: function () {
        const postKey = getCurrentPostKey();
        if (!postKey) return;

        const cachedData = getCachedChatResponses(postKey);
        if (cachedData && cachedData.messages) {
          console.log("Loading cached chat responses for post:", postKey);
          this.setState({
            messages: cachedData.messages,
            totalTokenCount: cachedData.totalTokenCount || 0,
          });
        }
      },

      clearPostsCache: function () {
        clearPostsCache();
        // Reload posts to get fresh data
        this.loadPosts();
      },

      componentDidMount: function () {
        this.loadCachedChatResponses();
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

        // For now, just return the text as-is
        // In a more complex implementation, we could parse and render inline markdown
        // but for simplicity, we'll keep it as plain text
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
        const { posts, selectedPosts } = this.state;

        if (selectedPosts.length === 0) {
          return Promise.resolve("");
        }

        const selectedContentObjects = posts.filter((post) =>
          selectedPosts.includes(post.name)
        );

        const contentPromises = selectedContentObjects.map((post) =>
          this.loadPostContent(post.url)
        );

        return Promise.all(contentPromises).then((contents) => {
          return contents
            .filter((content) => content.length > 0)
            .map((content, index) => {
              const contentObj = selectedContentObjects[index];
              return `${contentObj.name}\n\`\`\`${content}\n\`\`\`\n---\n\n`;
            })
            .join("");
        });
      },

      updateValue: function (value) {
        // Don't save anything to frontmatter - this widget is purely for content creation
        // and should not affect the content structure at all
      },

      render: function () {
        const {
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
        } = this.state;

        return h(
          "div",
          { className: "gemini-chat-widget" },

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

          // API Key Input
          h(
            "div",
            { className: "api-key-section" },
            h(
              "label",
              { htmlFor: this.props.forID + "-api-key" },
              "Gemini API Key:"
            ),
            h("input", {
              id: this.props.forID + "-api-key",
              type: "password",
              value: apiKey,
              onChange: this.handleApiKeyChange,
              placeholder: "Enter your Gemini API key",
              className: "api-key-input",
            })
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
                    "Start a conversation with Gemini AI. Enter your API key above and type a message below."
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
      "gemini-chat",
      GeminiChatControl,
      null, // no preview
      schema
    );
  }

  // Start the registration process
  registerGeminiChatWidget();
})();
