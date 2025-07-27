import { sitemapXmlPath } from "../constants.js";

export function fetchPostsFromSitemap() {
  return fetch(sitemapXmlPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then((xmlText) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const urls = xmlDoc.querySelectorAll("url");

      const posts = [];
      urls.forEach((url) => {
        const loc = url.querySelector("loc");
        const lastmod = url.querySelector("lastmod");

        if (loc) {
          const urlText = loc.textContent;

          const postType = postTypes.find((type) =>
            urlText.includes(`/${type}/`)
          );

          if (postType) {
            const postUrl = urlText;
            const postName = postUrl
              .split(`${postType}/`)[1]
              .replace(/\/$/, "");

            if (
              postName &&
              postName !== "" &&
              !postName.includes("categories")
            ) {
              posts.push({
                url: postUrl,
                name: `[${postType}] ${postName}`,
                type: postType,
                content: null,
                lastmod: lastmod ? lastmod.textContent : null,
              });
            }
          }
        }
      });

      posts.sort((a, b) => {
        if (!a.lastmod && !b.lastmod) return 0;
        if (!a.lastmod) return 1;
        if (!b.lastmod) return -1;
        return new Date(b.lastmod) - new Date(a.lastmod);
      });

      return posts;
    });
}
