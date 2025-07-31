import { githubApiBaseUrl, rawGithubBaseUrl } from "../constants.js";
import {
  getCachedPostContent,
  setCachedPostContent,
  getCachedPosts,
  setCachedPosts,
  getCachedRepositories,
  setCachedRepositories,
  getCachedRepositoryContent,
  setCachedRepositoryContent,
  getCachedGithubToken,
} from "../cache.js";

function getGithubHeaders() {
  const token = getCachedGithubToken();
  const headers = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  return headers;
}

export function fetchPostsFromGitHub(settings) {
  const { owner, repo, branch, postTypes, contentPath } = settings;
  const cachedPosts = getCachedPosts("github");
  if (cachedPosts) {
    return Promise.resolve(cachedPosts);
  }

  const postPromises = postTypes.map((postType) => {
    return fetch(
      `${githubApiBaseUrl}/repos/${owner}/${repo}/contents/${contentPath}/${postType}?ref=${branch}`,
      { headers: getGithubHeaders() }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return [];
        return data
          .filter((item) => item.type === "dir" && item.name !== "images")
          .map((item) => ({
            url: `${rawGithubBaseUrl}/${owner}/${repo}/${branch}/${contentPath}/${postType}/${item.name}/index.md`,
            name: `[${postType}] ${item.name}`,
            type: postType,
            content: null,
            lastmod: null,
            path: `${contentPath}/${postType}/${item.name}/index.md`,
          }));
      });
  });

  return Promise.all(postPromises).then((allPosts) => {
    const posts = allPosts.flat();
    setCachedPosts(posts, "github");
    return posts;
  });
}

export function fetchRepositories(username, includeForks) {
  const cached = getCachedRepositories(username, includeForks);
  if (cached) {
    return Promise.resolve(cached);
  }
  let path = `users/${username}/repos`;
  if (getCachedGithubToken()) {
    path = `user/repos`; // Use authenticated endpoint if token is available
  }
  return fetch(
    `${githubApiBaseUrl}/${path}?sort=updated&per_page=100&type=${
      includeForks ? "all" : "owner"
    }`,
    { headers: getGithubHeaders() }
  )
    .then((response) => {
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "GitHub API rate limit exceeded. Please try again later or use a GitHub token for higher limits."
          );
        } else if (response.status === 404) {
          throw new Error(`User '${username}' not found on GitHub.`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error("Invalid response from GitHub API");
      }

      const repositories = data
        .filter((repo) => (includeForks ? true : !repo.fork))
        .map((repo) => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || "",
          language: repo.language || "Unknown",
          updatedAt: repo.updated_at,
          defaultBranch: repo.default_branch,
        }))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setCachedRepositories(username, repositories, includeForks);
      return repositories;
    });
}

export function fetchRepositoryContent(username, repository, path) {
  const cached = getCachedRepositoryContent(username, repository, path);
  if (cached) {
    return Promise.resolve(cached);
  }

  return fetch(
    `${githubApiBaseUrl}/repos/${username}/${repository}/contents/${path}`,
    { headers: getGithubHeaders() }
  )
    .then((response) => {
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "GitHub API rate limit exceeded. Please try again later or use a GitHub token for higher limits."
          );
        } else if (response.status === 404) {
          throw new Error(
            `Path '${path}' not found in repository '${repository}'.`
          );
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      return response.json();
    })
    .then((data) => {
      let content = [];

      if (Array.isArray(data)) {
        content = data
          .filter((item) => item.type === "file" || item.type === "dir")
          .map((item) => ({
            name: item.name,
            type: item.type,
            path: item.path,
            size: item.size || 0,
            downloadUrl: item.download_url,
          }))
          .sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "dir" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
      } else {
        content = [
          {
            name: data.name,
            type: data.type,
            path: data.path,
            size: data.size || 0,
            downloadUrl: data.download_url,
          },
        ];
      }
      setCachedRepositoryContent(username, repository, path, content);
      return content;
    });
}

export function fetchCodeFileContent(fileUrl) {
  const source = fileUrl.includes(rawGithubBaseUrl) ? "github" : "sitemap";
  const headers = source === "github" ? getGithubHeaders() : {};

  if (source === "github" && headers["Authorization"]) {
    const apiUrl = getPrivateGithubApiUrl(fileUrl);
    return fetch(apiUrl, { headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GitHub API error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.content) {
          return atob(data.content);
        }
        throw new Error("Empty content from GitHub API");
      })
      .catch((error) => {
        console.error("Error fetching code file content:", error);
        return "";
      });
  }

  return fetch(fileUrl, { headers })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .catch((error) => {
      console.error("Error fetching code file content:", error);
      return "";
    });
}

export function fetchPostContent(postUrl) {
  const source = postUrl.includes(rawGithubBaseUrl) ? "github" : "sitemap";
  const cachedContent = getCachedPostContent(postUrl, source);
  if (cachedContent) {
    return Promise.resolve(cachedContent);
  }

  let fetchPromise;
  const headers = source === "github" ? getGithubHeaders() : {};

  if (source === "github" && headers["Authorization"]) {
    const apiUrl = getPrivateGithubApiUrl(fileUrl);

    fetchPromise = fetch(apiUrl, { headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GitHub API error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.content) {
          return atob(data.content); // returns decoded content
        }
        throw new Error("Empty content from GitHub API");
      });
  } else {
    fetchPromise = fetch(postUrl, { headers }).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    });
  }

  return fetchPromise.then((content) => {
    let processedContent;
    if (source === "github") {
      processedContent = cleanMarkdownContent(content);
    } else {
      processedContent = extractHtmlContent(content);
    }

    setCachedPostContent(postUrl, processedContent, source);
    return processedContent;
  });
}

function cleanMarkdownContent(markdown) {
  return markdown;
}

function extractHtmlContent(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const contentElement = doc.querySelector(".post__content");
  if (!contentElement) return "";

  let content = contentElement.textContent;

  content = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return content;
}

// Files in private repositories are accessed via the GitHub API
function getPrivateGithubApiUrl(fileUrl) {
  const urlParts = fileUrl.substring(rawGithubBaseUrl.length + 1).split("/");
  const owner = urlParts.shift();
  const repo = urlParts.shift();
  const branch = urlParts.shift();
  const path = urlParts.join("/");
  return `${githubApiBaseUrl}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
}
