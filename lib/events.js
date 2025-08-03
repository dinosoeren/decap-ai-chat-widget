export class ChatEventsHandler {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  handleSettingChange = (key, value) => {
    this.stateManager.updateWidgetSettings(key, value);
  };

  handleClickDeleteChat = (chatData) => {
    this.stateManager.deleteChat(chatData);
  };

  handleClickChangeLLM = () => {
    this.stateManager.setState({ showApiKeySection: true });
  };

  handleProviderChange = (e) => {
    this.stateManager.setProvider(e.target.value);
  };

  handleLLMChange = (e) => {
    this.stateManager.setModel(e.target.value);
  };

  handleApiKeyChange = (e) => {
    this.stateManager.setState({ apiKeyInput: e.target.value });
  };

  handleConfirmApiKey = () => {
    this.stateManager.setApiKey();
  };

  handleMessageChange = (e) => {
    this.stateManager.setState({ currentMessage: e.target.value });
  };

  handleSendMessage = () => {
    this.stateManager.sendCurrentMessage();
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

    this.stateManager.scrollToMessage(newIndex);
  };

  handleScrollToNextMessage = () => {
    const { messages, focusedMessageIndex } = this.stateManager.getState();
    if (messages.length === 0) return;

    if (focusedMessageIndex === messages.length - 1) {
      this.stateManager.scrollToBottom();
    } else if (focusedMessageIndex >= messages.length) {
      this.stateManager.scrollToMessage(0);
    } else {
      const newIndex = focusedMessageIndex < 0 ? 0 : focusedMessageIndex + 1;
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
