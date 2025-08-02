import {
  setCachedCodeSettings,
  getCachedCodeSettings,
  clearCachedCodeAndSettings,
  clearCachedPosts,
  setCachedChatResponses,
  getCachedChatResponses,
  clearCachedChatResponses,
  clearAllChatResponseCaches,
  addChatToHistory,
  getCachedChatHistory,
  setCachedChatHistory,
  clearChatHistory,
  getAllChatHistory,
  getCachedApiKey,
  getCachedSelectedModel,
  getCachedMetaPrompt,
  setCachedMetaPrompt,
  getCachedIncludeMetaPrompt,
  setCachedIncludeMetaPrompt,
  getCachedGithubToken,
  setCachedGithubToken,
  getCachedWidgetSettings,
  setCachedWidgetSettings,
  getCachedOpenRouterModels,
  setCachedOpenRouterModels,
} from "./cache.js";
import {
  fetchPostsFromGitHub,
  fetchRepositories,
  fetchRepositoryContent,
  fetchPostContent,
  fetchCodeFileContent,
} from "./api/github.js";
import { fetchPostsFromSitemap } from "./api/sitemap.js";
import { fetchOpenRouterModels } from "./api/chat.js";
import { WIDGET_SETTINGS_CONFIG, LLM_PROVIDERS } from "./constants.js";

export function GET_INITIAL_STATE() {
  const selectedProvider = "google";
  const selectedLLM = Object.keys(LLM_PROVIDERS[selectedProvider].models)[0];

  return {
    activeTab: "chat",
    isFullscreen: false,
    isCollapsed: true,
    // chat tab state
    selectedProvider,
    selectedLLM,
    apiKey: "",
    apiKeyInput: "",
    showApiKeySection: true,
    messages: [],
    currentMessage: "",
    isLoading: false,
    totalTokenCount: 0,
    error: null,
    focusedMessageIndex: -1,
    chatHistory: [],
    openRouterModels: [],
    // posts tab state
    metaPrompt: "",
    includeMetaPrompt: true,
    posts: [],
    selectedPosts: [],
    loadingPosts: false,
    postsError: null,
    // code tab state
    username: "",
    githubToken: "",
    repositories: [],
    selectedRepository: "",
    currentPath: "",
    repositoryContent: [],
    selectedCodeFiles: [],
    loadingRepositories: false,
    repositoriesError: null,
    loadingRepositoryContent: false,
    repositoryContentError: null,
    includeForks: false,
    // settings tab state
    widgetSettings: {},
  };
}

export class ChatStateManager {
  constructor(component) {
    this.component = component;
  }

  onMount = () => {
    this.loadWidgetSettings().then(() => {
      const { widgetSettings } = this.getState();
      this.setState({ username: widgetSettings.owner }, () => {
        this.loadCachedCodeSettings();
        this.loadCachedGithubToken();
      });
    });
    this.loadCachedSelectedModel().then(() => {
      if (this.getState().selectedProvider === "openrouter") {
        this.loadOpenRouterModels();
      }
      this.loadCachedApiKeys();
      this.loadCachedChatResponses();
      this.loadChatHistory();
    });
    this.loadCachedMetaPrompt();
    this.loadCachedIncludeMetaPrompt();
  };

  setState = (updater, callback) => {
    this.component.setState(updater, callback);
  };

  getState = () => {
    return this.component.state;
  };

  getProviderIds = () => {
    return Object.keys(LLM_PROVIDERS).sort((a, b) => {
      return LLM_PROVIDERS[a].name.localeCompare(LLM_PROVIDERS[b].name);
    });
  };

  getProviderOrDefault = (id = "") => {
    if (!id || !LLM_PROVIDERS[id]) {
      id = "google";
    }
    const provider = { id, name: LLM_PROVIDERS[id].name, models: [] };
    if (id === "openrouter") {
      provider.models = this.getState().openRouterModels;
    } else {
      // Convert models to array format for consistency
      provider.models = Object.keys(LLM_PROVIDERS[id].models).map((key) => ({
        id: key,
        ...LLM_PROVIDERS[id].models[key],
      }));
    }
    provider.models.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    return provider;
  };

  getModelOrDefault = (provider, model = "") => {
    const models = this.getProviderOrDefault(provider).models;
    const modelData = { name: "Unknown Model", id: model };
    const found = models.find((m) => m.id === model);
    if (found) {
      modelData.name = found.name;
    } else if (models.length > 0) {
      modelData.id = models[0].id;
      modelData.name = models[0].name || "Unknown Model";
    }
    return modelData;
  };

  loadOpenRouterModels = () => {
    const cachedModels = getCachedOpenRouterModels();
    if (cachedModels) {
      this.setState({ openRouterModels: cachedModels });
      return Promise.resolve();
    }

    return fetchOpenRouterModels()
      .then((models) => {
        this.setState({ openRouterModels: models });
        setCachedOpenRouterModels(models);
      })
      .catch((error) => {
        console.error("Error loading OpenRouter models:", error);
      });
  };

  scrollToBottom = () => {
    const chatContainer = document.querySelector(
      ".ai-chat-widget .messages-container"
    );
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  scrollToMessage = (index) => {
    const messageToScroll = document.querySelector(
      `.ai-chat-widget .messages-container .message:nth-child(${index + 1})`
    );
    if (messageToScroll) {
      messageToScroll.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  scrollToFocusedMessage = () => {
    const { messages, focusedMessageIndex } = this.getState();
    if (
      messages.length === 0 ||
      focusedMessageIndex === -1 ||
      focusedMessageIndex > messages.length - 1
    ) {
      this.scrollToBottom();
    } else {
      this.scrollToMessage(focusedMessageIndex);
    }
  };

  navigateToPath = (path) => {
    const { selectedRepository } = this.getState();
    if (selectedRepository) {
      this.loadRepositoryContent(selectedRepository, path);
    }
    this.setState({ currentPath: path }, this.persistCodeSettingsSelection);
  };

  navigateUp = () => {
    const { currentPath } = this.getState();
    if (currentPath) {
      const parentPath = currentPath.split("/").slice(0, -1).join("/");
      this.navigateToPath(parentPath);
    }
  };

  toggleFullscreen = () => {
    this.setState(
      (prevState) => ({
        isFullscreen: !prevState.isFullscreen,
      }),
      this.scrollToFocusedMessage
    );
  };

  toggleCollapse = () => {
    this.setState(
      (prevState) => ({
        isCollapsed: !prevState.isCollapsed,
      }),
      this.scrollToFocusedMessage
    );
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });

    if (tab === "content") {
      const { posts, loadingPosts } = this.getState();
      if (posts.length === 0 && !loadingPosts) {
        this.loadPosts();
      }
    } else if (tab === "code") {
      const { repositories, loadingRepositories } = this.getState();
      if (repositories.length === 0 && !loadingRepositories) {
        this.loadRepositories();
      }
    }
  };

  clearHistory = () => {
    if (
      window.confirm(
        `Are you sure you want to erase all chat history for this post? This action cannot be undone.`
      )
    ) {
      clearChatHistory();
      this.loadChatHistory();
    }
  };

  clearAllHistory = () => {
    const { chatHistory } = this.getState();
    if (
      !window.confirm(
        `Are you sure you want to erase ALL chat history across all posts (${chatHistory.length} chats)? This action cannot be undone.`
      )
    ) {
      return;
    }
    clearAllChatResponseCaches();
    this.setState({
      messages: [],
      totalTokenCount: 0,
      chatHistory: [],
    });
  };

  newChat = () => {
    const { messages, totalTokenCount } = this.getState();

    if (messages.length > 0) {
      const currentChat = {
        messages,
        totalTokenCount,
        timestamp: messages[messages.length - 1].timestamp || Date.now(),
      };
      addChatToHistory(currentChat);
      this.loadChatHistory(); // Refresh history in state
    }

    clearCachedChatResponses();
    this.setState({
      messages: [],
      totalTokenCount: 0,
      focusedMessageIndex: -1,
    });
  };

  loadCachedApiKeys = () => {
    const { selectedProvider } = this.getState();
    const apiKey = getCachedApiKey(selectedProvider);
    if (apiKey) {
      this.setState({
        apiKey,
        apiKeyInput: apiKey,
        showApiKeySection: false,
      });
    }
  };

  loadCachedChatResponses = () => {
    const cachedData = getCachedChatResponses();
    if (cachedData && cachedData.messages) {
      this.setState(
        {
          messages: cachedData.messages,
          totalTokenCount: cachedData.totalTokenCount || 0,
          focusedMessageIndex: cachedData.messages.length,
        },
        this.scrollToBottom
      );
    } else {
      this.setState({
        messages: [],
        totalTokenCount: 0,
        focusedMessageIndex: -1,
      });
    }
  };

  loadChatHistory = () => {
    const history = getAllChatHistory();
    this.setState({ chatHistory: history });
  };

  restoreChatFromHistory = (chatData) => {
    // Archive the current chat if it's not empty
    this.newChat();

    // Restore the selected chat into the current post's cache
    setCachedChatResponses(chatData.messages, chatData.totalTokenCount);
    this.loadCachedChatResponses(); // Load the restored chat into state

    // Remove the restored chat from the specific post's history to avoid duplicates
    if (chatData.postKey) {
      const historyForPost = getCachedChatHistory(chatData.postKey).filter(
        (item) => item.timestamp !== chatData.timestamp
      );
      setCachedChatHistory(historyForPost, chatData.postKey);
    }
    this.loadChatHistory();
  };

  loadCachedSelectedModel = () => {
    return new Promise((resolve) => {
      const cachedModel = getCachedSelectedModel();
      if (cachedModel && cachedModel.selectedProvider) {
        this.setState(
          {
            selectedProvider: cachedModel.selectedProvider,
            selectedLLM: cachedModel.selectedLLM,
          },
          resolve
        );
      } else {
        resolve();
      }
    });
  };

  loadCachedMetaPrompt = () => {
    const metaPrompt = getCachedMetaPrompt();
    if (metaPrompt) {
      this.setState({ metaPrompt });
    }
  };

  updateMetaPrompt = (metaPrompt) => {
    this.setState({ metaPrompt });
    setCachedMetaPrompt(metaPrompt);
  };

  loadCachedIncludeMetaPrompt = () => {
    const includeMetaPrompt = getCachedIncludeMetaPrompt();
    this.setState({ includeMetaPrompt });
  };

  toggleIncludeMetaPrompt = () => {
    this.setState(
      (prevState) => ({
        includeMetaPrompt: !prevState.includeMetaPrompt,
      }),
      () => {
        setCachedIncludeMetaPrompt(this.getState().includeMetaPrompt);
      }
    );
  };

  loadCachedGithubToken = () => {
    const token = getCachedGithubToken();
    if (token) {
      this.setState({ githubToken: token });
    }
  };

  updateGithubToken = (token) => {
    this.setState({ githubToken: token });
    setCachedGithubToken(token);
  };

  clearCodeCache = () => {
    const { username } = this.getState();
    clearCachedCodeAndSettings(username);
    this.setState({
      repositories: [],
      selectedRepository: "",
      currentPath: "",
      repositoryContent: [],
      selectedCodeFiles: [],
    });
    this.loadRepositories();
  };

  loadCachedCodeSettings = () => {
    const { widgetSettings } = this.getState();
    const cached = getCachedCodeSettings();
    if (cached && cached.selectedRepository) {
      this.setState(
        {
          username: cached.username || widgetSettings.owner || "",
          selectedRepository: cached.selectedRepository,
          currentPath: cached.currentPath || "",
          selectedCodeFiles: cached.selectedCodeFiles || [],
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
  };

  persistCodeSettingsSelection = () => {
    setCachedCodeSettings({
      username: this.getState().username,
      selectedRepository: this.getState().selectedRepository,
      currentPath: this.getState().currentPath,
      selectedCodeFiles: this.getState().selectedCodeFiles,
      includeForks: this.getState().includeForks,
    });
  };

  clearPostsCache = () => {
    clearCachedPosts();
    this.loadPosts();
  };

  loadPosts = () => {
    const { widgetSettings } = this.getState();
    this.setState({ loadingPosts: true, postsError: null });

    fetchPostsFromGitHub(widgetSettings)
      .then((posts) => {
        if (posts && posts.length > 0) {
          this.setState({
            posts: posts,
            loadingPosts: false,
          });
        } else {
          this.loadPostsFromSitemap();
        }
      })
      .catch((error) => {
        const githubError = `GitHub API failed: ${error.message}. Falling back to sitemap...`;
        console.warn(githubError);
        this.setState({ postsError: githubError });
        this.loadPostsFromSitemap();
      });
  };

  loadPostsFromSitemap = () => {
    const { widgetSettings } = this.getState();
    fetchPostsFromSitemap(widgetSettings)
      .then((posts) => {
        this.setState({
          posts: posts,
          loadingPosts: false,
        });
      })
      .catch((error) => {
        console.error("Error loading posts from sitemap:", error);
        const { postsError } = this.getState(); // Get the existing error
        const sitemapError = `Sitemap also failed: ${error.message}`;
        this.setState({
          loadingPosts: false,
          postsError: postsError
            ? `${postsError} ${sitemapError}`
            : `Failed to load posts: ${error.message}`,
        });
      });
  };

  loadRepositories = () => {
    const { username, includeForks } = this.getState();
    this.setState({ loadingRepositories: true, repositoriesError: null });

    fetchRepositories(username, includeForks)
      .then((repositories) => {
        this.setState({
          repositories: repositories,
          loadingRepositories: false,
        });
      })
      .catch((error) => {
        console.error("Error loading repositories:", error);
        this.setState({
          loadingRepositories: false,
          repositoriesError: "Failed to load repositories: " + error.message,
        });
      });
  };

  loadRepositoryContent = (repository, path) => {
    const { username } = this.getState();
    this.setState({
      loadingRepositoryContent: true,
      repositoryContentError: null,
    });

    fetchRepositoryContent(username, repository, path)
      .then((content) => {
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
          repositoryContentError:
            "Failed to load repository content: " + error.message,
        });
      });
  };

  loadSelectedContent = () => {
    const {
      posts,
      selectedPosts,
      selectedRepository,
      selectedCodeFiles,
      repositoryContent,
      metaPrompt,
      includeMetaPrompt,
      messages,
      widgetSettings,
    } = this.getState();

    const contentPromises = [];
    const attachments = {
      metaPrompt: false,
      posts: [],
      codeFiles: [],
    };

    if (includeMetaPrompt && metaPrompt && messages.length === 0) {
      contentPromises.push(Promise.resolve(metaPrompt + "\n\n"));
      attachments.metaPrompt = true;
    }

    if (selectedPosts.length > 0) {
      contentPromises.push(
        Promise.resolve(
          "Here are some examples of my writing style from previous content:\n\n"
        )
      );

      const selectedContentObjects = posts.filter((post) =>
        selectedPosts.includes(post.name)
      );
      attachments.posts = selectedContentObjects.map((p) => p.name);

      const postContentPromises = selectedContentObjects.map((post) =>
        fetchPostContent(post.url, widgetSettings)
      );

      contentPromises.push(
        Promise.all(postContentPromises).then((contents) => {
          return contents
            .filter((content) => content.length > 0)
            .map((content, index) => {
              const contentObj = selectedContentObjects[index];
              return `<writing-sample>\n${contentObj.name}\n\`\`\`${content}\n\`\`\`\n</writing-sample>\n\n`;
            })
            .join("");
        })
      );
    }

    if (selectedCodeFiles.length > 0 && selectedRepository) {
      const repo = selectedRepository;
      contentPromises.push(
        Promise.resolve(`Here are some files from the ${repo} repo:\n\n`)
      );

      const selectedFileObjects = repositoryContent.filter((item) =>
        selectedCodeFiles.includes(item.name)
      );
      attachments.codeFiles = selectedFileObjects.map(
        (f) => `${repo}/${f.path}`
      );

      const codeContentPromises = selectedFileObjects.map((file) =>
        fetchCodeFileContent(file.downloadUrl)
      );

      contentPromises.push(
        Promise.all(codeContentPromises).then((contents) => {
          return contents
            .filter((content) => content.length > 0)
            .map((content, index) => {
              const fileObj = selectedFileObjects[index];
              const filePath = fileObj.path;
              const fileName = fileObj.name;
              return `<code-sample>\n${fileName} (${repo}/${filePath})\n\`\`\`${getFileExtension(
                fileName
              )}\n${content}\n\`\`\`\n</code-sample>\n\n`;
            })
            .join("");
        })
      );
    }

    return Promise.all(contentPromises).then((contents) => {
      return {
        content: contents.join(""),
        attachments,
      };
    });
  };

  loadWidgetSettings = () => {
    return new Promise((resolve) => {
      const settings = getCachedWidgetSettings();
      Object.keys(WIDGET_SETTINGS_CONFIG).forEach((key) => {
        if (
          settings[key] === undefined &&
          WIDGET_SETTINGS_CONFIG[key].defaultValue !== undefined
        ) {
          settings[key] = WIDGET_SETTINGS_CONFIG[key].defaultValue;
        }
      });
      this.setState({ widgetSettings: settings }, resolve);
    });
  };

  updateWidgetSettings = (key, value) => {
    this.setState(
      (prevState) => ({
        widgetSettings: {
          ...prevState.widgetSettings,
          [key]: value,
        },
      }),
      () => {
        setCachedWidgetSettings(this.getState().widgetSettings);
        if (key === "owner" && value !== this.getState().username) {
          this.setState({ username: value }, () => {
            this.persistCodeSettingsSelection();
          });
        }
      }
    );
  };
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "text";
}
