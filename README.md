# Content Assistant - AI Chat Widget for Decap CMS

A custom widget for Decap CMS that provides an AI chat interface with content-aware prompting, chat history, and deep integration with your site's content and code repositories.

## Quick Setup Guide

1. Add the submodule in your `admin/widgets` directory:

```bash
git submodule add https://github.com/dinosoeren/decap-ai-chat-widget.git static/admin/widgets/ai-chat/
```

2. Update `constants.js` with the values for your site:

- `owner` - GitHub username
- `repo` - site repo on GitHub
- `branch` - branch to fetch posts from
- `contentPath` - URL path to posts
- `postTypes` - posts to fetch within the content path
- `sitemapXmlPath` - relative path to `sitemap.xml`

3. Add the script and style to your `admin/index.html`:

```html
<!-- Content Assistant - AI Chat Widget -->
<script type="module" src="widgets/ai-chat/index.js"></script>
<link rel="stylesheet" href="widgets/ai-chat/css/main.css" />
```

4. Add the widget as a field to the `collections` you want to use it for in Decap config:

```yaml
# admin/config.yml
collections:
  - name: 'blog'
    fields:
      - { label: 'Title', name: 'title', widget: 'string' }
      # ... other fields ...
      - { label: 'AI Chat', name: 'ai_chat', widget: 'ai-chat', required: false }
      - { label: 'Body', name: 'body', widget: 'markdown' }
```

## Features

The widget is organized into three main tabs: **Chat**, **Posts**, and **Files**.

### UI & Navigation

- **Responsive Design**: Fully responsive for chatting on mobile and desktop.
- **Tabbed Interface**: Easily switch between the chat, post selection, and file selection views.
- **Fullscreen & Collapsible**: Expand the widget for a focused chat experience or collapse it to save space.
- **Keyboard Navigation**: Use the up/down arrow keys to quickly navigate between messages in the chat view.
- **Message Actions**: Copy AI responses and code blocks to your clipboard with a single click.

### Meta Prompting & Content Examples

- **Meta Prompt**: Define a persistent writing style guide or instruction set that gets automatically injected into the first message of a new conversation.
- **Post Selection**: Browse and select up to 3 posts from your site to use as writing examples.
- **Dynamic Loading**: Automatically loads post content from the GitHub API with a sitemap fallback.
- **Cache Refresh**: Use the "Refresh Posts" button to clear the local cache and fetch the latest post list.

### Code-Aware Context

- **GitHub Integration**: Browse any public GitHub user's repositories, and your own private repos.
- **Repository Navigation**: Navigate through the full directory structure of a selected repository.
- **Fork Visibility**: Choose to include or exclude forked repositories in your search.
- **File Selection**: Select up to 10 code files to include as context in your prompt.
- **File Metadata**: The browser displays file sizes to help you make informed selections.
- **Cache Refresh**: Use the "Refresh Repositories" button to clear cached repository and file data.

### AI Integration & Chat

- **Multi-Provider Support**: Switch between LLM providers (Gemini, OpenAI).
- **Context-Aware Prompts**: Automatically injects selected posts, code files, and the meta prompt into your conversation.
- **Attachment Indicators**: Icons (💡, 📄, 📂) appear on your messages to confirm which context was included.
- **Token Tracking**: Keep an eye on your token usage with a live counter.
- **Chat History**: Conversations are automatically saved per-post.
  - **History Dropdown**: Restore previous conversations from the current post session.
  - **New Chat**: Start a fresh conversation at any time.
  - **Clear History**: Erase the chat history for the current post or for all posts entirely.

## Usage

1.  **Configure Context (Optional)**:
    - Go to the **Posts** tab to select writing examples and set your meta prompt.
    - Go to the **Files** tab to select code samples from GitHub repositories.
2.  **Start Chatting**:
    - In the **Chat** tab, select your desired AI model.
    - Enter your API key (it gets cached for future use).
    - Start your conversation!

## API Keys

- **Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/settings/keys)

API keys are cached locally in your browser per model.

> **Note**: Never commit API keys to version control.

## Caching

The widget implements intelligent caching to improve performance and reduce API calls.

- **Post & Repository Cache**: Post lists, post content, repository lists, and file contents are cached for **24 hours**.
- **Chat Cache**:
  - The active conversation is saved automatically as you chat.
  - Past conversations are stored in the **History** dropdown, scoped to the post you are currently editing.
- **Settings Cache**: Your selected model, meta prompt, and code selection settings are cached indefinitely.
- **Cache Clearing**: Use the "Refresh Posts" and "Refresh Repositories" buttons to manually clear the relevant cache and fetch fresh data. The "Erase History" and "Erase All History" buttons manage the chat conversation cache.

## GitHub API Limits

The widget uses the GitHub API to fetch repositories and file content. Unauthenticated requests are limited to 60 requests per hour.

API responses are cached locally in your browser for 24-hours to help mitigate these limits. For higher limits (up to 5000 requests per hour) and access to your private repositories, use a GitHub personal access token.

## Troubleshooting

- **Rate limit errors**: Wait an hour or use cached data.
- **User not found**: Check the GitHub username spelling.
- **Repository not found**: Ensure the repository exists and is public.
- **File loading errors**: Check if the file is accessible via GitHub's raw URLs. Very large files may cause performance issues.
