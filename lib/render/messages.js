import { iconClipboardFill, iconClipboardCheckFill } from "./icons.js";

export function renderSimpleMarkdown(content) {
  if (!content) return h("div", {}, "");

  const lines = content.split("\n");
  const elements = [];
  let currentParagraph = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockOuterContent = [];
  let codeBlockIndex = 0;
  let codeLanguage = []; // Stack renders nested code blocks separately

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      if (inCodeBlock) {
        codeBlockOuterContent.push("```");
        const language = codeLanguage[codeLanguage.length - 1];
        const codeContent = codeBlockContent.join("\n");
        const copyText =
          language === "markdown" || language === "md"
            ? codeContent // For markdown, copy only the inner content
            : codeBlockOuterContent.join("\n"); // Otherwise, copy the whole block
        elements.push(
          codeBlockContent.length > 0 &&
            h(
              "pre",
              { key: `code-${codeBlockIndex}` },
              h(
                "div",
                { className: "code-block-header" },
                h("span", {}, language || "Code"),
                h(
                  "button",
                  {
                    className: "copy-button",
                    onClick: (e) => {
                      const button = e.target;
                      copyToClipboardWithButton(copyText, button);
                    },
                  },
                  h("span", { className: "copy-icon" }, iconClipboardFill()),
                  h(
                    "span",
                    { className: "copied-icon" },
                    iconClipboardCheckFill()
                  )
                )
              ),
              h("code", {}, codeContent)
            )
        );
        codeBlockIndex++;
        const lang = trimmedLine.slice(3).trim();
        if (!lang) {
          codeBlockOuterContent = [];
          codeLanguage.pop();
          if (codeLanguage.length === 0) {
            inCodeBlock = false;
          }
        } else {
          codeLanguage.push(lang);
          codeBlockOuterContent = [trimmedLine];
        }
        codeBlockContent = [];
      } else {
        if (currentParagraph.length > 0) {
          elements.push(
            h(
              "p",
              { key: `p-${elements.length}` },
              renderInlineMarkdown(currentParagraph.join("\n"))
            )
          );
          currentParagraph = [];
        }
        inCodeBlock = true;
        codeBlockOuterContent.push(trimmedLine);
        codeLanguage.push(trimmedLine.slice(3).trim());
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      codeBlockOuterContent.push(line);
      continue;
    }

    if (trimmedLine === "") {
      if (currentParagraph.length > 0) {
        elements.push(
          h(
            "p",
            { key: `p-${elements.length}` },
            renderInlineMarkdown(currentParagraph.join("\n"))
          )
        );
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(line);
    }
  }

  if (currentParagraph.length > 0) {
    elements.push(
      h(
        "p",
        { key: `p-${elements.length}` },
        renderInlineMarkdown(currentParagraph.join("\n"))
      )
    );
  }

  return h("div", { className: "markdown-content" }, elements);
}

function renderInlineMarkdown(text) {
  if (!text) return "";
  let htmlString = text;
  if (typeof marked === "function") {
    htmlString = marked(text);
  } else if (typeof marked === "object" && typeof marked.parse === "function") {
    htmlString = marked.parse(text);
  } else {
    console.warn(`Failed to parse markdown with marked: ${typeof marked}`);
  }
  if (
    typeof DOMPurify === "function" &&
    typeof DOMPurify.sanitize === "function"
  ) {
    return h("div", {
      dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(htmlString) },
    });
  } else {
    console.warn(
      `Failed to sanitize markdown with DomPurify: ${typeof DOMPurify}`
    );
  }
  return text;
}

export function copyToClipboardWithButton(text, target) {
  const button = target.closest(".copy-button");
  if (!button) {
    console.error("No copy button found for the target element.");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      button.classList.add("copied");
      setTimeout(() => {
        button.classList.remove("copied");
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}
