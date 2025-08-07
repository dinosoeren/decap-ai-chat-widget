import Control from "./control.js";
import { WIDGET_SETTINGS_CONFIG } from "./lib/constants.js";
import "./css/main.css";

const Schema = {
  properties: {},
};
// Every settings field can be overriden in the config.yml
Object.keys(WIDGET_SETTINGS_CONFIG).forEach((key) => {
  Schema.properties[key] = {
    type: WIDGET_SETTINGS_CONFIG[key].type,
  };
});

if (typeof window !== "undefined") {
  window.AiChatControl = Control;
  window.AiChatSchema = Schema;
}

export { Control as AiChatControl, Schema as AiChatSchema };

if (!import.meta.env.PROD) {
  console.log("[decap-cms-widget-ai-chat] Running in development mode...");
  import("./dev.js");
}
