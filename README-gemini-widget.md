# Gemini Chat Widget for Decap CMS

A custom widget that integrates Google's Gemini AI into your Decap CMS admin interface, enabling multi-turn conversations with the AI assistant.

## Features

- **Multi-turn Conversations**: Maintains conversation context across multiple messages
- **Secure API Key Storage**: Password field for secure API key input
- **Real-time Chat Interface**: Modern chat UI with scrollable message history
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Displays error messages for failed requests
- **Conversation Management**: Clear chat functionality
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key for use in the widget

2. **Widget Files**:
   - `gemini-chat-widget.js` - Main widget implementation
   - `gemini-chat-widget.css` - Styling for the widget
   - Both files are already included in `index.html`

3. **Configuration**:
   The widget is already configured in `config.yml` for both project and blog collections:
   ```yaml
   - { label: 'AI Chat', name: 'ai_chat', widget: 'gemini-chat' }
   ```

## Usage

1. **Access the CMS**: Navigate to your Decap CMS admin interface
2. **Create/Edit Content**: Open any project or blog post
3. **Find the AI Chat Field**: Look for the "AI Chat" field in the form
4. **Enter API Key**: Input your Gemini API key in the password field
5. **Start Chatting**: Type messages and press Enter or click Send
6. **Multi-turn Conversations**: The AI will remember previous messages in the conversation

## Data Structure

The widget stores data in this format:
```json
{
  "apiKey": "your-gemini-api-key",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    },
    {
      "role": "assistant",
      "content": "I'm doing well, thank you for asking!"
    },
    {
      "role": "user",
      "content": "What's the weather like?"
    },
    {
      "role": "assistant",
      "content": "I don't have access to real-time weather data..."
    }
  ]
}
```

## API Integration

The widget uses the Gemini 2.5 Flash model and sends the entire conversation history with each request:

```javascript
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "Hello"}]
    },
    {
      "role": "model",
      "parts": [{"text": "Great to meet you. What would you like to know?"}]
    },
    {
      "role": "user",
      "parts": [{"text": "I have two dogs in my house. How many paws are in my house?"}]
    }
  ]
}
```

## Security Notes

- API keys are stored in the CMS data (consider environment variables for production)
- The widget uses HTTPS for all API calls
- API keys are masked in the password input field

## Troubleshooting

- **"No API key configured"**: Enter your Gemini API key in the password field
- **API errors**: Check your API key and ensure you have sufficient quota
- **Network errors**: Verify your internet connection and API endpoint accessibility

## Customization

You can customize the widget by modifying:
- `gemini-chat-widget.css` - Styling and appearance
- `gemini-chat-widget.js` - Functionality and behavior
- `config.yml` - Widget configuration and field settings

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires fetch API support
- Tested on Chrome, Firefox, Safari, and Edge
