import { setCachedChatResponses, getCurrentPostKey } from "./cache.js";
import { callChatAPI } from "./api/chat.js";
import { CACHE_KEYS } from "./constants.js";

export class ChatEventsHandler {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  handleClickChangeLLM = () => {
    this.stateManager.setState({ showApiKeySection: true });
  };

  handleLLMChange = (e) => {
    const selectedLLM = e.target.value;
    const apiKeys = JSON.parse(localStorage.getItem(CACHE_KEYS.API_KEYS)) || {};
    this.stateManager.setState(
      {
        selectedLLM,
        apiKey: apiKeys[selectedLLM] || "",
        apiKeyInput: apiKeys[selectedLLM] || "",
      },
      () => {
        this.stateManager.loadCachedChatResponses();
      }
    );
  };

  handleApiKeyChange = (e) => {
    this.stateManager.setState({ apiKeyInput: e.target.value });
  };

  handleConfirmApiKey = () => {
    const { apiKeyInput, selectedLLM } = this.stateManager.getState();
    if (!apiKeyInput.trim()) return;

    this.stateManager.setState({
      apiKey: apiKeyInput,
      showApiKeySection: false,
    });

    const apiKeys = JSON.parse(localStorage.getItem(CACHE_KEYS.API_KEYS)) || {};
    apiKeys[selectedLLM] = apiKeyInput;
    localStorage.setItem(CACHE_KEYS.API_KEYS, JSON.stringify(apiKeys));
  };

  handleMessageChange = (e) => {
    this.stateManager.setState({ currentMessage: e.target.value });
  };

  handleSendMessage = () => {
    const { currentMessage, apiKey, messages } = this.stateManager.getState();
    if (!currentMessage.trim() || !apiKey.trim()) {
      return;
    }

    const userMessage = currentMessage;
    const updatedMessages = [
      ...messages,
      { role: "user", content: userMessage },
    ];

    this.stateManager.setState({
      currentMessage: "",
      messages: updatedMessages,
      isLoading: true,
      error: null,
    });

    this.stateManager.loadSelectedContent().then((postContent) => {
      let enhancedMessages = [...updatedMessages];

      if (updatedMessages.length === 1 && postContent) {
        const contextMessage = {
          role: "user",
          content: `${postContent}\n\nNow, please respond to my prompt: ${userMessage}`,
        };
        enhancedMessages = [contextMessage];
      }

      callChatAPI(
        apiKey,
        this.stateManager.getState().selectedLLM,
        enhancedMessages,
        updatedMessages
      )
        .then(({ assistantMessage, totalTokenCount }) => {
          const newMessages = [
            ...updatedMessages,
            { role: "assistant", content: assistantMessage },
          ];
          const postKey = getCurrentPostKey();
          if (postKey) {
            setCachedChatResponses(
              postKey,
              newMessages,
              totalTokenCount,
              this.stateManager.getState().selectedLLM
            );
          }
          this.stateManager.setState({
            messages: newMessages,
            isLoading: false,
            totalTokenCount: totalTokenCount,
          });
        })
        .catch((error) => {
          console.error(
            `Error calling ${this.stateManager.getState().selectedLLM} API:`,
            error
          );
          this.stateManager.setState({
            isLoading: false,
            error: error.message,
          });
        });
    });
  };

  handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  };

  handleUsernameChange = (e) => {
    const username = e.target.value;
    this.stateManager.setState({ username });
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
        this.stateManager.persistCodeSamplesSelection();
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
      this.stateManager.persistCodeSamplesSelection
    );
  };

  handlePostSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedPostNames = selectedOptions.map((option) => option.value);

    this.stateManager.setState({ selectedPosts: selectedPostNames });
  };
}
