import { GET_INITIAL_STATE, ChatStateManager } from "./lib/state.js";
import { ChatEventsHandler } from "./lib/events.js";
import { Renderer } from "./lib/render.js";

(function () {
  let retryCount = 0;
  const maxRetries = 5;

  function registerAiChatWidget() {
    if (typeof CMS === "undefined") {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(registerAiChatWidget, 100);
      } else {
        console.warn(
          "AI Chat widget: CMS not available after",
          maxRetries,
          "retries. Widget registration failed."
        );
      }
      return;
    }

    const AiChatControl = createClass({
      init: function () {
        this.stateManager = new ChatStateManager(this);
        this.eventsHandler = new ChatEventsHandler(this.stateManager);
        this.renderer = new Renderer(this.stateManager, this.eventsHandler);
      },

      getInitialState: function () {
        return GET_INITIAL_STATE();
      },

      componentDidMount: function () {
        if (!this.stateManager) {
          this.init();
        }
        this.stateManager.onMount();
      },

      updateValue: function (value) {
        // Widget does not save to frontmatter
      },

      render: function () {
        if (!this.renderer) {
          this.init();
        }
        return this.renderer.render(this.props);
      },
    });

    const schema = {
      properties: {},
    };

    CMS.registerWidget("ai-chat", AiChatControl, null, schema);
  }

  registerAiChatWidget();
})();
