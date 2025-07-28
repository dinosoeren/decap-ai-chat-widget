import { LLM_CHATBOTS } from "../constants.js";
import { renderSimpleMarkdown, copyToClipboardWithButton } from "./messages.js";
import {
  iconFullscreen,
  iconExitFullscreen,
  iconChevronDown,
  iconChevronUp,
} from "./icons.js";

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export class Renderer {
  constructor(stateManager, eventsHandler) {
    this.stateManager = stateManager;
    this.eventsHandler = eventsHandler;
  }

  /** ‘h’ is an alias for React.createElement provided by decap-cms */
  render = (props) => {
    const { isFullscreen, isCollapsed, showApiKeySection } =
      this.stateManager.getState();

    const widgetClassName =
      "ai-chat-widget" +
      (isFullscreen ? " fullscreen" : "") +
      (!isFullscreen && isCollapsed ? " collapsed" : "") +
      (showApiKeySection ? " api-key-visible" : "");

    return h(
      "div",
      {
        className: widgetClassName,
        onKeyDown: this.eventsHandler.handleWidgetContainerKeyDown,
        tabIndex: -1,
      },
      this.#renderWidgetHeader(),
      h(
        "div",
        { className: "widget-body" },
        this.#renderTabs(),
        this.#renderTabContent(props)
      )
    );
  };

  #renderTabs() {
    const { activeTab, selectedPosts, selectedCodeFiles } =
      this.stateManager.getState();
    const postCount = selectedPosts.length ? ` (${selectedPosts.length})` : "";
    const fileCount = selectedCodeFiles.length
      ? ` (${selectedCodeFiles.length})`
      : "";
    const tabs = [
      { id: "chat", label: "Chat" },
      { id: "content", label: `Posts${postCount}` },
      { id: "code", label: `Files${fileCount}` },
    ];

    return h(
      "div",
      { className: "tabs-container" },
      tabs.map((tab) =>
        h(
          "button",
          {
            key: tab.id,
            className: `tab-button ${activeTab === tab.id ? "active" : ""}`,
            onClick: () => this.stateManager.setActiveTab(tab.id),
          },
          tab.label
        )
      )
    );
  }

  #renderTabContent(props) {
    const { activeTab } = this.stateManager.getState();

    const chatContent = h(
      "div",
      {
        className: "tab-content" + (activeTab === "chat" ? " active" : ""),
      },
      this.#renderChatContainer(props)
    );

    const contentExamplesContent = h(
      "div",
      {
        className: "tab-content" + (activeTab === "content" ? " active" : ""),
      },
      this.#renderContentExamplesSection(props)
    );

    const codeSamplesContent = h(
      "div",
      {
        className: "tab-content" + (activeTab === "code" ? " active" : ""),
      },
      this.#renderCodeSamplesSection(props)
    );

    return [chatContent, contentExamplesContent, codeSamplesContent];
  }

  #renderWidgetHeader() {
    const { isFullscreen, isCollapsed } = this.stateManager.getState();

    return h(
      "div",
      {
        className: "widget-header",
        onClick: (e) => {
          e.stopPropagation();
          if (isFullscreen) {
            this.stateManager.toggleFullscreen();
          } else {
            this.stateManager.toggleCollapse();
          }
        },
      },
      this.#renderFullScreenButton(),
      h("span", {}, "Content Assistant"),
      h("span", {}, isCollapsed ? "↑" : "↓")
    );
  }

  #renderContentExamplesSection(props) {
    const {
      metaPrompt,
      includeMetaPrompt,
      selectedPosts,
      loadingPosts,
      posts,
      isLoading,
    } = this.stateManager.getState();

    return h(
      "div",
      { className: "selection-container" },
      selectedPosts.length > 0 &&
        h(
          "div",
          { className: "selected-count" },

          h("span", null, ` (${selectedPosts.length} selected)`)
        ),
      h(
        "div",
        { className: "content-selection-section" },
        h("label", { htmlFor: "meta-prompt-textarea" }, "Meta Prompt:"),
        h("textarea", {
          id: "meta-prompt-textarea",
          value: metaPrompt,
          onChange: this.eventsHandler.handleMetaPromptChange,
          placeholder:
            "e.g., A writing style guide that is injected at the beginning of the first message in a conversation.",
          className: "message-input",
          rows: 3,
        }),
        h(
          "label",
          { className: "checkbox-label" },
          h("input", {
            type: "checkbox",
            checked: includeMetaPrompt,
            onChange: this.eventsHandler.handleIncludeMetaPromptChange,
            className: "checkbox-input",
          }),
          "Include meta prompt (only on first message)"
        ),
        h(
          "label",
          { htmlFor: props.forID + "-post-select" },
          "Select up to 3 posts as writing examples:"
        ),
        loadingPosts
          ? h("div", { className: "loading-posts" }, "Loading posts...")
          : h(
              "select",
              {
                id: props.forID + "-post-select",
                multiple: true,
                size: Math.min(6, posts.length),
                value: selectedPosts,
                onChange: (e) => {
                  const options = Array.from(e.target.selectedOptions).map(
                    (opt) => opt.value
                  );
                  if (options.length <= 3) {
                    this.eventsHandler.handlePostSelection(e);
                  } else {
                    e.target.options[e.target.selectedIndex].selected = false;
                  }
                },
                className: "dropdown",
              },
              posts.map((post) => {
                const date = post.lastmod
                  ? new Date(post.lastmod).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                const displayText = date ? `${post.name} (${date})` : post.name;

                return h(
                  "option",
                  { key: post.name, value: post.name },
                  displayText
                );
              })
            ),
        h(
          "div",
          { className: "content-selection-note" },
          "(You can select up to 3 posts. These will be included as writing examples in the prompt.)"
        ),
        h(
          "div",
          { className: "cache-buttons" },
          h(
            "button",
            {
              onClick: this.stateManager.clearPostsCache,
              disabled: isLoading,
              className: "sm-flex-button",
              title: "Clear cached content (refreshes from GitHub API)",
            },
            "Refresh Posts"
          )
        )
      )
    );
  }

  #renderCodeSamplesSection(props) {
    const { selectedCodeFiles, selectedRepository, isLoading } =
      this.stateManager.getState();

    return h(
      "div",
      { className: "selection-container" },
      selectedCodeFiles.length > 0 &&
        h(
          "div",
          { className: "selected-count" },
          h("span", null, ` (${selectedCodeFiles.length} selected)`)
        ),
      h(
        "div",
        { className: "content-selection-section files-selection" },
        this.#renderRepositorySelector(props),
        selectedRepository && this.#renderRepositoryContentBrowser(props),
        h(
          "div",
          { className: "content-selection-note" },
          "(You can select up to 10 code files. These will be included as code examples in the prompt.)"
        ),
        h(
          "div",
          { className: "cache-buttons" },
          h(
            "button",
            {
              onClick: this.stateManager.clearCodeCache,
              disabled: isLoading,
              className: "sm-flex-button",
              title: "Clear cached repositories and file content",
            },
            "Refresh Repositories"
          )
        )
      )
    );
  }

  #renderRepositorySelector(props) {
    const {
      username,
      includeForks,
      loadingRepositories,
      repositories,
      selectedRepository,
    } = this.stateManager.getState();

    return h(
      "div",
      { className: "username-section" },
      h("label", { htmlFor: props.forID + "-username" }, "GitHub Username:"),
      h("input", {
        id: props.forID + "-username",
        type: "text",
        value: username,
        onChange: this.eventsHandler.handleUsernameChange,
        placeholder: "Enter GitHub username",
        className: "text-input username-input",
      }),
      h(
        "label",
        { className: "checkbox-label" },
        h("input", {
          type: "checkbox",
          checked: includeForks,
          onChange: (e) => {
            this.stateManager.setState(
              { includeForks: e.target.checked },
              () => {
                this.stateManager.loadRepositories();
                this.stateManager.persistCodeSettingsSelection();
              }
            );
          },
          className: "checkbox-input",
        }),
        "Include forked repositories"
      ),
      h(
        "button",
        {
          onClick: this.stateManager.loadRepositories,
          disabled: loadingRepositories || !username.trim(),
          className: "post-toggle-button load-repositories",
        },
        loadingRepositories ? "Loading..." : "Load Repositories"
      ),
      repositories.length > 0 &&
        h(
          "div",
          { className: "repository-section" },
          h(
            "label",
            { htmlFor: props.forID + "-repo-select" },
            "Select Repository:"
          ),
          h(
            "select",
            {
              id: props.forID + "-repo-select",
              value: selectedRepository,
              onChange: this.eventsHandler.handleRepositoryChange,
              className: "dropdown",
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
        )
    );
  }

  #renderRepositoryContentBrowser(props) {
    const {
      currentPath,
      loadingRepositoryContent,
      repositoryContent,
      selectedCodeFiles,
    } = this.stateManager.getState();

    return h(
      "div",
      { className: "repository-content-section" },
      currentPath &&
        h(
          "div",
          { className: "breadcrumb-section" },
          h(
            "button",
            {
              onClick: this.stateManager.navigateUp,
              className: "sm-flex-button go-up-button",
            },
            "← Go Up"
          ),
          h(
            "div",
            { className: "current-path" },
            `Current path: ${currentPath || "root"}`
          )
        ),
      h(
        "div",
        { className: "file-list-section" },
        h(
          "label",
          { htmlFor: props.forID + "-file-select" },
          "Select up to 10 code files:"
        ),
        loadingRepositoryContent
          ? h("div", { className: "loading-posts" }, "Loading files...")
          : h(
              "div",
              { className: "file-list-container" },
              repositoryContent
                .filter((item) => item.type === "dir")
                .map((item) =>
                  h(
                    "div",
                    {
                      key: item.path,
                      className: "file-item directory-item",
                      onClick: () =>
                        this.stateManager.navigateToPath(item.path),
                    },
                    h("span", { className: "file-icon" }, "📁"),
                    h("span", { className: "file-name" }, item.name)
                  )
                ),
              h(
                "select",
                {
                  id: props.forID + "-file-select",
                  multiple: true,
                  size: Math.min(
                    8,
                    repositoryContent.filter((item) => item.type === "file")
                      .length + 1
                  ),
                  value: selectedCodeFiles,
                  onChange: this.eventsHandler.handleCodeFileSelection,
                  className: "dropdown",
                },
                repositoryContent
                  .filter((item) => item.type === "file")
                  .map((item) => {
                    const size = ` (${formatFileSize(item.size)})`;
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
    );
  }

  #renderApiKeySection(props) {
    const { selectedLLM, apiKeyInput } = this.stateManager.getState();
    return h(
      "div",
      { className: "api-key-section" },
      h(
        "div",
        { className: "llm-api-row" },
        h(
          "div",
          { className: "llm-selector" },
          h("label", { htmlFor: props.forID + "-llm-select" }, "Model:"),
          h(
            "select",
            {
              id: props.forID + "-llm-select",
              value: selectedLLM,
              onChange: this.eventsHandler.handleLLMChange,
              className: "llm-dropdown",
            },
            Object.keys(LLM_CHATBOTS).map((llmKey) => {
              const llm = LLM_CHATBOTS[llmKey];
              return h("option", { key: llmKey, value: llmKey }, llm.name);
            })
          )
        ),
        h(
          "div",
          { className: "api-key-container" },
          h("label", { htmlFor: props.forID + "-api-key" }, "API Key:"),
          h(
            "div",
            { className: "api-key-input-container" },
            h("input", {
              id: props.forID + "-api-key",
              type: "password",
              value: apiKeyInput,
              onChange: this.eventsHandler.handleApiKeyChange,
              onKeyPress: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  this.eventsHandler.handleConfirmApiKey();
                }
              },
              placeholder: `Enter your ${
                LLM_CHATBOTS[selectedLLM]?.name || "LLM"
              } API key`,
              className: "text-input",
            }),
            h(
              "button",
              {
                className: "confirm-api-key-button",
                onClick: this.eventsHandler.handleConfirmApiKey,
                disabled: !apiKeyInput.trim(),
              },
              "✓"
            )
          )
        )
      )
    );
  }

  #renderFullScreenButton() {
    const { isFullscreen } = this.stateManager.getState();
    return h(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          this.stateManager.toggleFullscreen();
        },
        className: "post-toggle-button fullscreen-toggle",
        title: isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
      },
      isFullscreen ? iconExitFullscreen() : iconFullscreen()
    );
  }

  #renderChangeLlmButton() {
    return h(
      "button",
      {
        className: "post-toggle-button change-llm-button",
        onClick: this.eventsHandler.handleClickChangeLLM,
      },
      "Change Model"
    );
  }

  #renderChatContainer(props) {
    const { error } = this.stateManager.getState();
    return h(
      "div",
      { className: "chat-container" },
      this.#renderConversationHeader(),
      this.#renderApiKeySection(props),
      this.#renderMessagesContainer(),
      this.#renderScrollButtons(),
      error && h("div", { className: "error-message" }, error),
      this.#renderInputArea()
    );
  }

  #renderConversationHeader() {
    const { messages, totalTokenCount, isFullscreen } =
      this.stateManager.getState();
    return h(
      "div",
      { className: "conversation-header" },
      h(
        "span",
        { className: "message-count" },
        `${messages.length} message${messages.length !== 1 ? "s" : ""}`
      ),
      totalTokenCount > 0 &&
        h(
          "span",
          { className: "token-count" },
          ` • ${totalTokenCount.toLocaleString()} tokens`
        ),
      this.#renderChangeLlmButton()
    );
  }

  #renderMessagesContainer() {
    const { messages, isLoading, selectedLLM, focusedMessageIndex } =
      this.stateManager.getState();
    const llmName = LLM_CHATBOTS[selectedLLM].name;
    return h(
      "div",
      { className: "messages-container" },
      messages.length === 0 &&
        h(
          "div",
          { className: "empty-state" },
          h(
            "p",
            {},
            `Start a conversation with ${llmName}. Enter your API key above and type a message below.`
          )
        ),
      messages.map((message, index) => {
        const isUser = message.role === "user";
        const isFocused = index === focusedMessageIndex;
        return h(
          "div",
          {
            key: index,
            className:
              "message " +
              (isUser ? "user-message" : "assistant-message") +
              (isFocused ? " focused" : ""),
          },
          isUser &&
            message.attachments &&
            this.#renderMessageAttachments(message.attachments),
          h(
            "div",
            { className: "message-content" },
            isUser
              ? null
              : h(
                  "div",
                  { className: "message-header" },
                  h(
                    "button",
                    {
                      className: "copy-button",
                      onClick: (e) => {
                        const button = e.target;
                        copyToClipboardWithButton(message.content, button);
                      },
                    },
                    "Copy"
                  )
                ),
            isUser ? message.content : renderSimpleMarkdown(message.content)
          )
        );
      }),
      isLoading &&
        h(
          "div",
          { className: "message assistant-message" },
          h("div", { className: "message-content loading" }, "Thinking...")
        )
    );
  }

  #renderScrollButtons() {
    const { messages } = this.stateManager.getState();
    if (messages.length < 1) return null;

    return h(
      "div",
      { className: "scroll-buttons" },
      h(
        "button",
        {
          onClick: this.eventsHandler.handleScrollToPreviousMessage,
          className: "scroll-button",
          title: "Previous Message",
        },
        iconChevronUp()
      ),
      h(
        "button",
        {
          onClick: this.eventsHandler.handleScrollToNextMessage,
          className: "scroll-button",
          title: "Next Message",
        },
        iconChevronDown()
      )
    );
  }

  #renderInputArea() {
    const {
      currentMessage,
      isLoading,
      apiKey,
      selectedLLM,
      selectedPosts,
      selectedCodeFiles,
      metaPrompt,
      includeMetaPrompt,
      messages,
    } = this.stateManager.getState();

    let hint = "";
    const hasContent = selectedPosts.length || selectedCodeFiles.length;
    const willInjectMetaPrompt =
      includeMetaPrompt && metaPrompt && messages.length === 0;

    if (hasContent || willInjectMetaPrompt) {
      const contentParts = [];
      if (willInjectMetaPrompt) {
        contentParts.push("the meta prompt");
      }
      if (selectedPosts.length) {
        const p = selectedPosts.length;
        contentParts.push(`${p} post${p > 1 ? "s" : ""}`);
      }
      if (selectedCodeFiles.length) {
        const f = selectedCodeFiles.length;
        contentParts.push(`${f} file${f > 1 ? "s" : ""}`);
      }
      hint = `The full prompt will include ${contentParts.join(
        ", "
      )} before your message`;
    }

    return h(
      "div",
      { className: "input-area" },
      hint ? h("div", { className: "prompt-hint" }, hint) : null,
      h("textarea", {
        value: currentMessage,
        onChange: this.eventsHandler.handleMessageChange,
        onKeyPress: this.eventsHandler.handleMessageInputKeyPress,
        placeholder: `Type your message to ${LLM_CHATBOTS[selectedLLM].name} here...`,
        disabled: isLoading || !apiKey.trim(),
        className: "message-input",
      }),
      h(
        "div",
        { className: "button-group" },
        h(
          "div",
          { className: "clear-chat-dropdown" },
          h(
            "button",
            {
              disabled: isLoading,
              className: "clear-button",
            },
            "Clear",
            iconChevronDown()
          ),
          h(
            "div",
            { className: "dropdown-content" },
            h(
              "button",
              {
                onClick: this.stateManager.clearChat,
                disabled: isLoading,
              },
              "Clear This Chat"
            ),
            h(
              "button",
              {
                onClick: this.stateManager.clearAllChats,
                disabled: isLoading,
                className: "clear-all",
              },
              "Erase All History"
            )
          )
        ),
        h(
          "button",
          {
            onClick: this.eventsHandler.handleSendMessage,
            disabled: isLoading || !currentMessage.trim() || !apiKey.trim(),
            className: "send-button",
          },
          "Send"
        )
      )
    );
  }

  #renderMessageAttachments(attachments) {
    if (!attachments) return null;

    const { metaPrompt, posts, codeFiles } = attachments;
    const postCount = posts.length;
    const fileCount = codeFiles.length;

    if (!metaPrompt && postCount === 0 && fileCount === 0) {
      return null;
    }

    return h(
      "div",
      { className: "message-attachments" },
      metaPrompt &&
        h(
          "span",
          { className: "attachment-icon", title: "Meta prompt included" },
          "💡 MP"
        ),
      postCount > 0 &&
        h(
          "span",
          {
            className: "attachment-icon",
            title: `${postCount} post(s) included: ${posts.join(", ")}`,
          },
          `📄 ${postCount}`
        ),
      fileCount > 0 &&
        h(
          "span",
          {
            className: "attachment-icon",
            title: `${fileCount} file(s) included: ${codeFiles.join(", ")}`,
          },
          `📂 ${fileCount}`
        )
    );
  }
}
