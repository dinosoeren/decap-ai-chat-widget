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

  handleClickChangeLLM = () => {
    this.stateManager.setState({ showApiKeySection: true });
  };

  handleLLMChange = (e) => {
    const selectedLLM = e.target.value;
    const apiKey = getCachedApiKey(selectedLLM);
    this.stateManager.setState(
      {
        selectedLLM,
        apiKey: apiKey || "",
        apiKeyInput: apiKey || "",
      },
      () => {
        this.stateManager.loadCachedChatResponses();
        setCachedSelectedModel(selectedLLM);
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

    setCachedApiKey(selectedLLM, apiKeyInput);
  };

  handleMessageChange = (e) => {
    this.stateManager.setState({ currentMessage: e.target.value });
  };

  handleSendMessage = () => {
    const { currentMessage, apiKey, messages, selectedLLM } =
      this.stateManager.getState();
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
      const enhancedMessages = [...updatedMessages];

      if (postContent) {
        const contextMessage = {
          role: "user",
          content: `${postContent}\n\nNow, please respond to my prompt: ${userMessage}`,
        };
        enhancedMessages.pop();
        enhancedMessages.push(contextMessage);
      }

      callChatAPI(apiKey, selectedLLM, enhancedMessages)
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
            },
            this.stateManager.persistCodeSettingsSelection
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
}
