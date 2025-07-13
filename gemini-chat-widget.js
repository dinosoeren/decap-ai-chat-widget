// Custom Gemini Chat Widget for Decap CMS
// Wait for CMS to be available before registering the widget
(function () {
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Build the conversation history for multi-turn chat
        const contents = messages.map((message) => ({
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
            console.log("Gemini API Response:", JSON.stringify(data, null, 2));

            if (
              data.candidates &&
              data.candidates[0] &&
              data.candidates[0].content
            ) {
              const assistantMessage = data.candidates[0].content.parts[0].text;
              const updatedMessages = [
                ...messages,
                { role: "assistant", content: assistantMessage },
              ];

              this.setState({
                messages: updatedMessages,
                isLoading: false,
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
      },

      clearChat: function () {
        this.setState({ messages: [], error: null });
      },

      updateValue: function (value) {
        // Don't save anything to frontmatter - this widget is purely for content creation
        // and should not affect the content structure at all
      },

      render: function () {
        const { apiKey, messages, currentMessage, isLoading, error } =
          this.state;

        return h(
          "div",
          { className: "gemini-chat-widget" },
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
