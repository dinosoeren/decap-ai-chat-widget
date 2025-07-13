# AI Chat Widget for Decap CMS

A custom widget that integrates AI language models into your Decap CMS admin interface, enabling multi-turn conversations with AI assistants for content creation assistance.

## Features

- **Multi-turn Conversations**: Maintains conversation context across multiple messages
- **LLM Selection**: Dropdown to choose between different AI models (currently Gemini)
- **Secure API Key Storage**: Password field for secure API key input
- **Content Context**: Option to include previous blog posts/projects as writing examples
- **Real-time Chat Interface**: Modern chat UI with scrollable message history
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Displays error messages for failed requests
- **Conversation Management**: Clear chat functionality with per-post caching
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. **Get an API Key**:
   - For Gemini: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key for your chosen LLM
   - Copy the key for use in the widget

2. **Widget Files**:
   - `ai-chat-widget.js` - Main widget implementation
   - `ai-chat-widget.css` - Styling for the widget
   - Both files are already included in `index.html`

3. **Configuration**:
   The widget is already configured in `config.yml` for both project and blog collections:
   ```yaml
   - { label: 'AI Chat', name: 'ai_chat', widget: 'ai-chat' }
   ```

## Usage

1. **Access the CMS**: Navigate to your Decap CMS admin interface
2. **Create/Edit Content**: Open any project or blog post
3. **Find the AI Chat Field**: Look for the "AI Chat" field in the form
4. **Select LLM**: Choose your preferred AI model from the dropdown (currently only Gemini available)
5. **Enter API Key**: Input your API key in the password field
6. **Optional Content Examples**: Toggle "Show Content Examples" to include previous posts as writing style references
7. **Start Chatting**: Type messages and press Enter or click Send

## Supported LLMs

Currently supported:
- **Gemini 2.5 Flash** (default) - Google's latest language model

Future support planned:
- OpenAI GPT models
- Anthropic Claude
- Other LLMs can be easily added to the `LLM_CHATBOTS` configuration

## Data Structure

The widget does not save data to frontmatter - it's purely for content creation assistance. Chat history is cached locally per post for convenience.

## API Integration

The widget uses the selected LLM's API endpoint and maintains conversation context:

```javascript
// Example Gemini API call
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "User message"}]
    },
    {
      "role": "model",
      "parts": [{"text": "AI response"}]
    }
  ]
}
```

## Security Notes

- API keys are not stored in content files (only in session)
- The widget uses HTTPS for all API calls
- API keys are masked in the password input field

## Troubleshooting

- **"No API key configured"**: Enter your API key in the password field
- **"Selected LLM not found"**: Check the LLM_CHATBOTS configuration
- **API errors**: Check your API key and ensure you have sufficient quota
- **Network errors**: Verify your internet connection and API endpoint accessibility

## Customization

You can customize the widget by modifying:
- `ai-chat-widget.css` - Styling and appearance
- `ai-chat-widget.js` - Functionality, behavior, and LLM configuration
- `config.yml` - Widget configuration and field settings

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires fetch API support
- Tested on Chrome, Firefox, Safari, and Edge
