import { LLM_PROVIDERS } from "../constants.js";

export function callChatAPI(
  apiKey,
  selectedProvider,
  selectedLLM,
  enhancedMessages
) {
  const provider = LLM_PROVIDERS[selectedProvider];
  if (!provider) {
    return Promise.reject(new Error("Unsupported LLM provider selected"));
  }

  const model = {
    apiBaseUrl: provider.apiBaseUrl,
    id: selectedLLM,
  };

  if (selectedProvider === "google") {
    return callGeminiAPI(apiKey, enhancedMessages, model);
  } else if (selectedProvider === "openai") {
    return callOpenAIAPI(apiKey, enhancedMessages, model);
  } else if (selectedProvider === "anthropic") {
    return callClaudeAPI(apiKey, enhancedMessages, model);
  } else if (selectedProvider === "openrouter") {
    return callOpenRouterAPI(apiKey, enhancedMessages, model);
  } else {
    return Promise.reject(new Error("Unsupported LLM selected"));
  }
}

function callGeminiAPI(apiKey, enhancedMessages, model) {
  const url = `${model.apiBaseUrl}${model.id}:generateContent?key=${apiKey}`;

  const contents = enhancedMessages.map((message) => ({
    role: message.role === "user" ? "user" : "model",
    parts: [
      {
        text: message.content,
      },
    ],
  }));

  const requestBody = {
    system_instruction: {
      parts: [
        {
          text: "You are Gemini, an AI assistant. Please format your response in lightweight markdown (no HTML tags).",
        },
      ],
    },
    contents: contents,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          `Error [${response.status}] calling Gemini API: ${response}`
        );
        throw new Error(
          `HTTP error! [${response.status}] ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const assistantMessage = data.candidates[0].content.parts[0].text;
        const totalTokenCount = data.usageMetadata?.totalTokenCount || 0;
        return { assistantMessage, totalTokenCount };
      } else {
        throw new Error("Invalid response format from Gemini API");
      }
    });
}

function callOpenAIAPI(apiKey, enhancedMessages, model) {
  const url = model.apiBaseUrl;

  const messages = enhancedMessages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }));

  const requestBody = {
    model: model.id,
    messages: messages,
    max_tokens: 4000,
    temperature: 0.7,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          `Error [${response.status}] calling OpenAI API: ${response}`
        );
        throw new Error(
          `HTTP error! [${response.status}] ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const assistantMessage = data.choices[0].message.content;
        const totalTokenCount = data.usage?.total_tokens || 0;
        return { assistantMessage, totalTokenCount };
      } else {
        throw new Error("Invalid response format from OpenAI API");
      }
    });
}

function callClaudeAPI(apiKey, enhancedMessages, model) {
  const url = model.apiBaseUrl;

  const systemPrompt =
    "You are Claude, an AI assistant. Please format your response in lightweight markdown (no HTML tags).";

  const messages = enhancedMessages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }));

  const requestBody = {
    model: model.id,
    max_tokens: 4000,
    temperature: 0.7,
    system: systemPrompt,
    messages: messages,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-dangerous-direct-browser-access": "true",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          `Error [${response.status}] calling Claude API: ${response}`
        );
        throw new Error(
          `HTTP error! [${response.status}] ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (
        data.content &&
        Array.isArray(data.content) &&
        data.content[0] &&
        data.content[0].text
      ) {
        const assistantMessage = data.content[0].text;
        const totalTokenCount = data.usage?.output_tokens || 0;
        return { assistantMessage, totalTokenCount };
      } else {
        throw new Error("Invalid response format from Claude API");
      }
    });
}

function callOpenRouterAPI(apiKey, enhancedMessages, model) {
  const url = `${model.apiBaseUrl}/chat/completions`;

  const messages = enhancedMessages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }));

  const requestBody = {
    model: model.id,
    messages: messages,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          `Error [${response.status}] calling OpenRouter API: ${response.statusText}`
        );
        throw new Error(
          `HTTP error! [${response.status}] ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const assistantMessage = data.choices[0].message.content;
        const totalTokenCount = data.usage?.total_tokens || 0;
        return { assistantMessage, totalTokenCount };
      } else {
        throw new Error("Invalid response format from OpenRouter API");
      }
    });
}

export function fetchOpenRouterModels() {
  const apiBaseUrl = LLM_PROVIDERS.openrouter.apiBaseUrl;
  return fetch(`${apiBaseUrl}/models`)
    .then((response) => {
      if (!response.ok) {
        console.error(
          `Error [${response.status}] fetching OpenRouter models: ${response}`
        );
        throw new Error(
          `HTTP error! [${response.status}] ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.data) {
        return data.data.reduce((acc, model) => {
          acc.push({
            id: model.id,
            name: model.name,
          });
          return acc;
        }, []);
      } else {
        throw new Error("Invalid response format from OpenRouter API");
      }
    });
}
