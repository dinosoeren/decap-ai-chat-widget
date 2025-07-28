import { owner } from "./constants.js";
import {
  setCachedCodeSettings,
  getCachedCodeSettings,
  clearCachedCodeAndSettings,
  clearCachedPosts,
  getCachedChatResponses,
  clearCachedChatResponses,
  clearAllChatResponseCaches,
  getCachedApiKey,
  getCachedSelectedModel,
} from "./cache.js";
import {
  fetchPostsFromGitHub,
  fetchRepositories,
  fetchRepositoryContent,
  fetchPostContent,
  fetchCodeFileContent,
} from "./api/github.js";
import { fetchPostsFromSitemap } from "./api/sitemap.js";

export function GET_INITIAL_STATE() {
  return {
    activeTab: "chat",
    isFullscreen: false,
    isCollapsed: true,
    // chat tab state
    selectedLLM: "gemini",
    apiKey: "",
    apiKeyInput: "",
    showApiKeySection: true,
    messages: [],
    currentMessage: "",
    isLoading: false,
    totalTokenCount: 0,
    error: null,
    // posts tab state
    posts: [],
    selectedPosts: [],
    loadingPosts: false,
    // code tab state
    username: owner,
    repositories: [],
    selectedRepository: "",
    currentPath: "",
    repositoryContent: [],
    selectedCodeFiles: [],
    loadingRepositories: false,
    loadingRepositoryContent: false,
    includeForks: false,
  };
}

export class ChatStateManager {
  constructor(component) {
    this.component = component;
  }

  onMount = () => {
    this.loadCachedSelectedModel().then(() => {
      this.loadCachedApiKeys();
      this.loadCachedChatResponses();
    });
    this.loadCachedCodeSettings();
  };

  setState = (updater, callback) => {
    this.component.setState(updater, callback);
  };

  getState = () => {
    return this.component.state;
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
    this.setState((prevState) => ({
      isFullscreen: !prevState.isFullscreen,
    }));
  };

  toggleCollapse = () => {
    this.setState((prevState) => ({
      isCollapsed: !prevState.isCollapsed,
    }));
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

  clearPostsCache = () => {
    clearCachedPosts();
    this.loadPosts();
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
  };

  clearAllChats = () => {
    clearAllChatResponseCaches();
    this.setState({
      messages: [],
      totalTokenCount: 0,
    });
  };

  clearChat = () => {
    clearCachedChatResponses(this.getState().selectedLLM);
    this.setState({
      messages: [],
      totalTokenCount: 0,
    });
  };

  loadCachedApiKeys = () => {
    const { selectedLLM } = this.getState();
    const apiKey = getCachedApiKey(selectedLLM);
    if (apiKey) {
      this.setState({
        apiKey,
        apiKeyInput: apiKey,
        showApiKeySection: false,
      });
    }
  };

  loadCachedChatResponses = () => {
    const cachedData = getCachedChatResponses(this.getState().selectedLLM);
    if (cachedData && cachedData.messages) {
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
  };

  loadCachedSelectedModel = () => {
    return new Promise((resolve) => {
      const cachedModel = getCachedSelectedModel();
      if (cachedModel) {
        this.setState({ selectedLLM: cachedModel }, resolve);
      } else {
        resolve();
      }
    });
  };

  loadCachedCodeSettings = () => {
    const cached = getCachedCodeSettings();
    if (cached && cached.selectedRepository) {
      this.setState(
        {
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
      selectedRepository: this.getState().selectedRepository,
      currentPath: this.getState().currentPath,
      selectedCodeFiles: this.getState().selectedCodeFiles,
      includeForks: this.getState().includeForks,
    });
  };

  loadPosts = () => {
    this.setState({ loadingPosts: true });

    fetchPostsFromGitHub()
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
        console.warn("GitHub API failed, falling back to sitemap:", error);
        this.loadPostsFromSitemap();
      });
  };

  loadPostsFromSitemap = () => {
    fetchPostsFromSitemap()
      .then((posts) => {
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
  };

  loadRepositories = () => {
    const { username, includeForks } = this.getState();
    this.setState({ loadingRepositories: true });

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
          error: "Failed to load repositories: " + error.message,
        });
      });
  };

  loadRepositoryContent = (repository, path) => {
    const { username } = this.getState();
    this.setState({ loadingRepositoryContent: true });

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
          error: "Failed to load repository content: " + error.message,
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
    } = this.getState();

    const contentPromises = [];

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
        fetchPostContent(post.url)
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
      contentPromises.push(
        Promise.resolve("Here are some code files related to my prompt:\n\n")
      );

      const selectedFileObjects = repositoryContent.filter((item) =>
        selectedCodeFiles.includes(item.name)
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
              return `<code-sample>\n${fileName} (${filePath})\n\`\`\`${getFileExtension(
                fileName
              )}\n${content}\n\`\`\`\n</code-sample>\n\n`;
            })
            .join("");
        })
      );
    }

    return Promise.all(contentPromises).then((contents) => {
      return contents.join("");
    });
  };
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "text";
}
