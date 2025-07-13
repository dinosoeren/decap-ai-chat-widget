// Custom Gemini Chat Widget for Decap CMS
// Wait for CMS to be available before registering the widget
(function () {
  const owner = "dinosoeren";
  const repo = "walls.dev";
  const branch = "main";
  const sitemapXmlPath = "../sitemap.xml";
  const githubApiBaseUrl = "https://api.github.com";
  const rawGithubBaseUrl = "https://raw.githubusercontent.com";
  const geminiApiBaseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";

  // Cache configuration
  const CACHE_EXPIRY_HOURS = 24;
  const CACHE_KEYS = {
    POSTS_LIST: "gemini_chat_posts_list",
    POST_CONTENT: "gemini_chat_post_content_",
    CACHE_TIMESTAMP: "gemini_chat_cache_timestamp",
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

  function getCachedPosts() {
    try {
      if (!isCacheValid()) return null;
      const cached = localStorage.getItem(CACHE_KEYS.POSTS_LIST);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn("Failed to get cached posts:", error);
      return null;
    }
  }

  function setCachedPosts(posts) {
    try {
      localStorage.setItem(CACHE_KEYS.POSTS_LIST, JSON.stringify(posts));
      setCacheTimestamp();
    } catch (error) {
      console.warn("Failed to cache posts:", error);
    }
  }

  function getCachedPostContent(postUrl) {
    try {
      if (!isCacheValid()) return null;
      const key =
        CACHE_KEYS.POST_CONTENT + btoa(postUrl).replace(/[^a-zA-Z0-9]/g, "");
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn("Failed to get cached post content:", error);
      return null;
    }
  }

  function setCachedPostContent(postUrl, content) {
    try {
      const key =
        CACHE_KEYS.POST_CONTENT + btoa(postUrl).replace(/[^a-zA-Z0-9]/g, "");
      localStorage.setItem(key, JSON.stringify(content));
      setCacheTimestamp();
    } catch (error) {
      console.warn("Failed to cache post content:", error);
    }
  }

  function clearCache() {
    try {
      // Clear all cache keys
      Object.values(CACHE_KEYS).forEach((key) => {
        if (key !== CACHE_KEYS.POST_CONTENT) {
          localStorage.removeItem(key);
        }
      });

      // Clear all post content cache entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_KEYS.POST_CONTENT)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear cache:", error);
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
        this.setState({ messages: [], error: null, totalTokenCount: 0 });
      },

      clearCache: function () {
        clearCache();
        console.log("Cache cleared");
        // Optionally reload posts to get fresh data
        this.loadPosts();
      },

      componentDidMount: function () {
        this.loadPosts();
      },

      loadPosts: function () {
        this.setState({ loadingPosts: true });

        // Check cache first
        const cachedPosts = getCachedPosts();
        if (cachedPosts) {
          console.log("Using cached posts list");
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
              setCachedPosts(posts);
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
        // Get project posts
        const projectPromise = fetch(
          `${githubApiBaseUrl}/repos/${owner}/${repo}/contents/content/project?ref=${branch}`
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
                url: `${rawGithubBaseUrl}/${owner}/${repo}/${branch}/content/project/${item.name}/index.md`,
                name: `[project] ${item.name}`,
                type: "project",
                content: null,
                lastmod: null,
                path: `content/project/${item.name}/index.md`,
              }));
          });

        // Get blog posts
        const blogPromise = fetch(
          `${githubApiBaseUrl}/repos/${owner}/${repo}/contents/content/blog?ref=${branch}`
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
                url: `${rawGithubBaseUrl}/${owner}/${repo}/${branch}/content/blog/${item.name}/index.md`,
                name: `[blog] ${item.name}`,
                type: "blog",
                content: null,
                lastmod: null,
                path: `content/blog/${item.name}/index.md`,
              }));
          });

        return Promise.all([projectPromise, blogPromise]).then(
          ([projectPosts, blogPosts]) => {
            return [...projectPosts, ...blogPosts];
          }
        );
      },

      loadPostsFromSitemap: function () {
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
                let postType = urlText.includes("/project/") ? "project" : "";
                if (!postType)
                  postType = urlText.includes("/blog/") ? "blog" : "";

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
        // Check cache first
        const cachedContent = getCachedPostContent(postUrl);
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
            setCachedPostContent(postUrl, processedContent);
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

      handlePostSelection: function (e) {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedPostNames = selectedOptions.map((option) => option.value);

        this.setState({ selectedPosts: selectedPostNames });
      },

      togglePostSelector: function () {
        this.setState((prevState) => ({
          showPostSelector: !prevState.showPostSelector,
        }));
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
              // const contentObj = selectedContentObjects[index];
              return `${content}\n\n---\n\n`;
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
              messages.map(function (message, index) {
                const isUser = message.role === "user";
                return h(
                  "div",
                  {
                    key: index,
                    className:
                      "message " +
                      (isUser ? "user-message" : "assistant-message"),
                  },
                  h("div", { className: "message-content" }, message.content)
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
                ),
                h(
                  "button",
                  {
                    onClick: this.clearCache,
                    disabled: isLoading,
                    className: "clear-cache-button",
                    title: "Clear cached content (refreshes from GitHub API)",
                  },
                  "Clear Cache"
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
