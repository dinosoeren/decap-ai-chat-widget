import { owner } from "./constants.js";
import {
  getCurrentPostKey,
  setCachedCodeSamples,
  getCachedPosts,
  setCachedPosts,
  getCachedChatResponses,
  getCachedCodeSamples,
  clearCachedChatResponses,
  clearCachedPosts,
  getCachedApiKey,
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
    selectedLLM: "gemini",
    apiKey: "",
    apiKeyInput: "",
    showApiKeySection: true,
    messages: [],
    currentMessage: "",
    isLoading: false,
    error: null,
    posts: [],
    selectedPosts: [],
    loadingPosts: false,
    showPostSelector: false,
    totalTokenCount: 0,
    username: owner,
    repositories: [],
    selectedRepository: "",
    currentPath: "",
    repositoryContent: [],
    selectedCodeFiles: [],
    loadingRepositories: false,
    loadingRepositoryContent: false,
    showCodeSamplesSelector: false,
    includeForks: false,
    isFullscreen: false,
    isCollapsed: true,
  };
}

export class ChatStateManager {
  constructor(component) {
    this.component = component;
  }

  onMount = () => {
    this.loadCachedApiKeys();
    this.loadCachedChatResponses();
    this.loadCachedCodeSamples();
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
    this.setState({ currentPath: path }, this.persistCodeSamplesSelection);
  };

  navigateUp = () => {
    const { currentPath } = this.getState();
    if (currentPath) {
      const parentPath = currentPath.split("/").slice(0, -1).join("/");
      this.navigateToPath(parentPath);
    }
  };

  clearChat = () => {
    const postKey = getCurrentPostKey();
    if (postKey) {
      clearCachedChatResponses(postKey, this.getState().selectedLLM);
    }
    this.setState({
      messages: [],
      error: null,
      totalTokenCount: 0,
    });
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

  togglePostSelector = () => {
    this.setState((prevState) => {
      const newShowPostSelector = !prevState.showPostSelector;

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
  };

  toggleCodeSamplesSelector = () => {
    this.setState((prevState) => {
      const newShowCodeSamplesSelector = !prevState.showCodeSamplesSelector;

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
  };

  clearPostsCache = () => {
    clearCachedPosts();
    this.loadPosts();
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
    const postKey = getCurrentPostKey();
    if (!postKey) return;

    const cachedData = getCachedChatResponses(
      postKey,
      this.getState().selectedLLM
    );
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

  loadCachedCodeSamples = () => {
    const postKey = getCurrentPostKey();
    if (!postKey) return;
    const cached = getCachedCodeSamples(postKey);
    if (cached && cached.selectedRepository) {
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
  };

  persistCodeSamplesSelection = () => {
    const postKey = getCurrentPostKey();
    if (!postKey) return;
    setCachedCodeSamples(postKey, {
      selectedRepository: this.getState().selectedRepository,
      currentPath: this.getState().currentPath,
      selectedCodeFiles: this.getState().selectedCodeFiles,
      showCodeSamplesSelector: this.getState().showCodeSamplesSelector,
      includeForks: this.getState().includeForks,
    });
  };

  loadPosts = () => {
    this.setState({ loadingPosts: true });

    const cachedPosts = getCachedPosts("github");
    if (cachedPosts) {
      this.setState({
        posts: cachedPosts,
        loadingPosts: false,
      });
      return;
    }

    fetchPostsFromGitHub()
      .then((posts) => {
        if (posts && posts.length > 0) {
          setCachedPosts(posts, "github");
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
              return `${contentObj.name}\n\`\`\`${content}\n\`\`\`\n---\n\n`;
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
              return `Code file: ${fileName} (${filePath})\n\`\`\`${getFileExtension(
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
  };
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "text";
}
