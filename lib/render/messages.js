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
  let codeLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      if (inCodeBlock) {
        codeBlockOuterContent.push(trimmedLine);
        const copyText = codeBlockOuterContent.join("\n");
        elements.push(
          h(
            "pre",
            { key: `code-${codeBlockIndex}` },
            h(
              "div",
              { className: "code-block-header" },
              h("span", {}, codeLanguage || "Code"),
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
            h("code", {}, codeBlockContent.join("\n"))
          )
        );
        codeBlockIndex++;
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockOuterContent = [];
        codeLanguage = "";
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
        codeLanguage = trimmedLine.slice(3).trim();
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
