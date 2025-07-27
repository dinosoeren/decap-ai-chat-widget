import { LLM_CHATBOTS } from "../constants.js";

export function callChatAPI(
  apiKey,
  selectedLLM,
  enhancedMessages,
  originalMessages
) {
  if (selectedLLM === "gemini" || selectedLLM === "geminipro") {
    return callGeminiAPI(
      apiKey,
      enhancedMessages,
      originalMessages,
      selectedLLM
    );
  } else if (selectedLLM === "openai") {
    return callOpenAIAPI(apiKey, enhancedMessages, originalMessages);
  } else if (selectedLLM === "anthropic") {
    return callClaudeAPI(apiKey, enhancedMessages, originalMessages);
  } else {
    return Promise.reject(new Error("Unsupported LLM selected"));
  }
}

function callGeminiAPI(
  apiKey,
  enhancedMessages,
  originalMessages,
  selectedLLM
) {
  const llmConfig = LLM_CHATBOTS[selectedLLM];
  const url = `${llmConfig.apiBaseUrl}:generateContent?key=${apiKey}`;

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
        throw new Error(`HTTP error! status: ${response.status}`);
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

function callOpenAIAPI(apiKey, enhancedMessages) {
  const url = LLM_CHATBOTS.openai.apiBaseUrl;

  const messages = enhancedMessages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }));

  const requestBody = {
    model: "gpt-4o-mini",
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
        throw new Error(`HTTP error! status: ${response.status}`);
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

function callClaudeAPI(apiKey, enhancedMessages) {
  const url = LLM_CHATBOTS.anthropic.apiBaseUrl;
  const systemPrompt =
    "You are Claude, an AI assistant. Please format your response in lightweight markdown (no HTML tags).";
  const messages = enhancedMessages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }));
  const requestBody = {
    model: "claude-opus-4-20250514",
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
