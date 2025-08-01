import {
  setCachedChatResponses,
  getCachedApiKey,
  setCachedApiKey,
  setCachedSelectedModel,
} from "./cache.js";
import { callChatAPI } from "./api/chat.js";

export class ChatEventsHandler {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  handleSettingChange = (key, value) => {
    this.stateManager.updateWidgetSettings(key, value);
  };

  handleClickChangeLLM = () => {
    this.stateManager.setState({ showApiKeySection: true });
  };

  handleProviderChange = (e) => {
    const selectedProvider = e.target.value;
    let loadModels = Promise.resolve.bind(Promise);
    if (selectedProvider === "openrouter") {
      loadModels = this.stateManager.loadOpenRouterModels;
    }
    loadModels().then(() => {
      const selectedLLM =
        this.stateManager.getModelOrDefault(selectedProvider).id;
      const apiKey = getCachedApiKey(selectedProvider);

      this.stateManager.setState(
        {
          selectedProvider,
          selectedLLM,
          apiKey: apiKey || "",
          apiKeyInput: apiKey || "",
        },
        () => {
          this.stateManager.loadChatHistory();
          this.stateManager.loadCachedChatResponses();
          setCachedSelectedModel({ selectedProvider, selectedLLM });
        }
      );
    });
  };

  handleLLMChange = (e) => {
    const selectedLLM = e.target.value;
    const { selectedProvider } = this.stateManager.getState();
    const apiKey = getCachedApiKey(selectedProvider);
    this.stateManager.setState(
      {
        selectedLLM,
        apiKey: apiKey || "",
        apiKeyInput: apiKey || "",
      },
      () => {
        this.stateManager.loadChatHistory();
        this.stateManager.loadCachedChatResponses();
        setCachedSelectedModel({ selectedProvider, selectedLLM });
      }
    );
  };

  handleApiKeyChange = (e) => {
    this.stateManager.setState({ apiKeyInput: e.target.value });
  };

  handleConfirmApiKey = () => {
    const { apiKeyInput, selectedProvider } = this.stateManager.getState();
    if (!apiKeyInput.trim()) return;

    this.stateManager.setState({
      apiKey: apiKeyInput,
      showApiKeySection: false,
    });

    setCachedApiKey(selectedProvider, apiKeyInput);
  };

  handleMessageChange = (e) => {
    this.stateManager.setState({ currentMessage: e.target.value });
  };

  handleSendMessage = () => {
    const {
      currentMessage,
      apiKey,
      messages,
      selectedProvider,
      selectedLLM,
      widgetSettings,
    } = this.stateManager.getState();
    if (!currentMessage.trim() || !apiKey.trim()) {
      return;
    }

    const userMessageContent = currentMessage;

    this.stateManager.setState(
      {
        currentMessage: "",
        isLoading: true,
        error: null,
      },
      this.stateManager.scrollToBottom
    );

    this.stateManager
      .loadSelectedContent()
      .then(({ content: postContent, attachments }) => {
        const enhancedContent = postContent
          ? `${postContent}\n\nNow, please respond to my prompt: ${userMessageContent}`
          : userMessageContent;

        const userMessage = {
          role: "user",
          content: userMessageContent,
          enhancedContent: enhancedContent, // Store enhanced content for API calls
          attachments,
        };

        const updatedMessages = [...messages, userMessage];

        this.stateManager.setState(
          {
            messages: updatedMessages,
            focusedMessageIndex: updatedMessages.length,
          },
          this.stateManager.scrollToBottom
        );

        // Prepare messages for the API, using enhanced content for user messages
        const apiMessages = updatedMessages.map(
          ({ role, content, enhancedContent }) => ({
            role,
            content: role === "user" ? enhancedContent : content,
          })
        );

        callChatAPI(
          apiKey,
          selectedProvider,
          selectedLLM,
          apiMessages,
          widgetSettings
        )
          .then(({ assistantMessage, totalTokenCount }) => {
            const newMessages = [
              ...updatedMessages,
              { role: "assistant", content: assistantMessage },
            ];
            setCachedChatResponses(newMessages, totalTokenCount, selectedLLM);
            this.stateManager.setState(
              {
                messages: newMessages,
                isLoading: false,
                totalTokenCount: totalTokenCount,
                selectedPosts: [],
                selectedCodeFiles: [],
                focusedMessageIndex: newMessages.length,
              },
              () => {
                this.stateManager.persistCodeSettingsSelection();
                this.stateManager.scrollToBottom();
              }
            );
          })
          .catch((error) => {
            console.error(`Error calling ${selectedLLM} API:`, error);
            this.stateManager.setState({
              isLoading: false,
              error: error.message,
            });
          });
      });
  };

  handleMessageInputKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  };

  handleMessageContainerKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.handleScrollToPreviousMessage();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.handleScrollToNextMessage();
    }
  };

  handleWidgetContainerKeyDown = (e) => {
    const { isFullscreen, isCollapsed } = this.stateManager.getState();
    if (e.key === "Escape") {
      if (isFullscreen) {
        this.stateManager.toggleFullscreen();
      } else if (!isCollapsed) {
        this.stateManager.toggleCollapse();
      }
    }
  };

  handleMessageClick = (index) => {
    // Avoid triggering component re-render if text is being selected
    const selected = window.getSelection();
    if (selected && selected.toString().length) return;
    this.stateManager.setState({ focusedMessageIndex: index });
  };

  handleScrollToPreviousMessage = () => {
    const { messages, focusedMessageIndex } = this.stateManager.getState();
    if (messages.length === 0) return;

    const newIndex =
      focusedMessageIndex <= 0 || focusedMessageIndex >= messages.length
        ? messages.length - 1
        : focusedMessageIndex - 1;

    this.stateManager.setState({ focusedMessageIndex: newIndex });
    this.stateManager.scrollToMessage(newIndex);
  };

  handleScrollToNextMessage = () => {
    const { messages, focusedMessageIndex } = this.stateManager.getState();
    if (messages.length === 0) return;

    if (focusedMessageIndex === messages.length - 1) {
      this.stateManager.setState({ focusedMessageIndex: messages.length });
      this.stateManager.scrollToBottom();
    } else if (focusedMessageIndex >= messages.length) {
      this.stateManager.setState({ focusedMessageIndex: 0 });
      this.stateManager.scrollToMessage(0);
    } else {
      const newIndex = focusedMessageIndex < 0 ? 0 : focusedMessageIndex + 1;
      this.stateManager.setState({ focusedMessageIndex: newIndex });
      this.stateManager.scrollToMessage(newIndex);
    }
  };

  handleUsernameChange = (e) => {
    const username = e.target.value;
    this.stateManager.setState(
      { username },
      this.stateManager.persistCodeSettingsSelection
    );
  };

  handleGithubTokenChange = (e) => {
    this.stateManager.updateGithubToken(e.target.value);
  };

  handleRepositoryChange = (e) => {
    const selectedRepository = e.target.value;
    this.stateManager.setState(
      {
        selectedRepository,
        currentPath: "",
        repositoryContent: [],
        selectedCodeFiles: [],
      },
      () => {
        if (selectedRepository) {
          this.stateManager.loadRepositoryContent(selectedRepository, "");
        }
        this.stateManager.persistCodeSettingsSelection();
      }
    );
  };

  handleCodeFileSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedFileNames = selectedOptions.map((option) => option.value);

    if (selectedFileNames.length > 10) {
      e.target.options[e.target.selectedIndex].selected = false;
      return;
    }

    this.stateManager.setState(
      { selectedCodeFiles: selectedFileNames },
      this.stateManager.persistCodeSettingsSelection
    );
  };

  handlePostSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedPostNames = selectedOptions.map((option) => option.value);

    this.stateManager.setState({ selectedPosts: selectedPostNames });
  };

  handleMetaPromptChange = (e) => {
    this.stateManager.updateMetaPrompt(e.target.value);
  };

  handleIncludeMetaPromptChange = (e) => {
    this.stateManager.toggleIncludeMetaPrompt();
  };
}
