const form = document.querySelector("#extractor");
const urlInput = document.querySelector("#url");
const submitButton = document.querySelector("#submit");
const statusEl = document.querySelector("#status");
const resultEl = document.querySelector("#result");
const titleEl = document.querySelector("#article-title");
const bodyEl = document.querySelector("#article-body");
const linkEl = document.querySelector("#article-link");

const titleSelectors = [
  'meta[property="mol:headline"]',
  'meta[property="og:title"]',
  'meta[name="twitter:title"]',
  'meta[name="headline"]',
  'h1',
  'title'
];

const paragraphSelectors = [
  "p.mol-para-with-font",
  "article p",
  "main p",
  '[role="main"] p',
  ".article p",
  ".story p"
];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function getText(documentNode, selectors) {
  for (const selector of selectors) {
    const node = documentNode.querySelector(selector);
    const text = node?.content || node?.textContent;
    if (text?.trim()) {
      return text.trim();
    }
  }

  return "";
}

function getParagraphs(documentNode) {
  for (const selector of paragraphSelectors) {
    const paragraphs = [...documentNode.querySelectorAll(selector)]
      .map((paragraph) => paragraph.textContent.trim().replace(/\s+/g, " "))
      .filter((text) => text.length > 0);

    if (paragraphs.length > 0) {
      return paragraphs;
    }
  }

  return [];
}

function renderArticle(title, paragraphs, url) {
  titleEl.textContent = title || "Untitled article";
  bodyEl.textContent = "";

  linkEl.textContent = "";
  const link = document.createElement("a");
  link.href = url;
  link.textContent = "Link to original article";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  linkEl.appendChild(link);

  if (paragraphs.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No readable paragraphs were found with the current selectors.";
    bodyEl.appendChild(empty);
  } else {
    for (const text of paragraphs) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      bodyEl.appendChild(paragraph);
    }
  }

  resultEl.classList.add("visible");
}

function normalizeArticleUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Please enter a valid article URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS article URLs are supported.");
  }

  return parsedUrl.toString();
}

function updateShareUrl(url) {
  const pageUrl = new URL(window.location.href);

  if (url) {
    pageUrl.searchParams.set("url", url);
  } else {
    pageUrl.searchParams.delete("url");
  }

  window.history.replaceState({}, "", pageUrl);
}

function getMetaCharset(bytes) {
  const preview = new TextDecoder("windows-1252").decode(bytes.subarray(0, 1024));

  for (const meta of preview.matchAll(/<meta\b[^>]*>/gi)) {
    const charset = meta[0].match(/\bcharset\s*=\s*["']?\s*([^\s"'/>;]+)/i);
    if (charset) {
      return charset[1];
    }
  }

  return "";
}

function decodeHtml(bytes, contentType) {
  const encodings = [];

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encodings.push("utf-8");
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encodings.push("utf-16le");
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encodings.push("utf-16be");
  }

  encodings.push(
    contentType.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1],
    getMetaCharset(bytes),
    "utf-8"
  );

  for (const encoding of encodings) {
    if (!encoding) {
      continue;
    }

    try {
      return new TextDecoder(encoding).decode(bytes);
    } catch {
      continue;
    }
  }

  return new TextDecoder().decode(bytes);
}

async function fetchArticle(url) {
  const corsfix = "https://feeds.davecross.co.uk/url/";
  console.log(corsfix + url);
  const response = await fetch(corsfix + url, {
    method: "GET",
    mode: "cors",
    credentials: "omit"
  });

  if (!response.ok) {
    throw new Error(`The page returned HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error("That URL did not return an HTML page.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return decodeHtml(bytes, contentType);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const rawUrl = urlInput.value.trim();
  if (!rawUrl) {
    return;
  }

  let url;

  try {
    url = normalizeArticleUrl(rawUrl);
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  urlInput.value = url;
  updateShareUrl(url);
  resultEl.classList.remove("visible");
  submitButton.disabled = true;
  setStatus("Fetching the page...");

  try {
    const html = await fetchArticle(url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const title = getText(doc, titleSelectors);
    const paragraphs = getParagraphs(doc);

    renderArticle(title, paragraphs, url);
    setStatus(`Found ${paragraphs.length} paragraph${paragraphs.length === 1 ? "" : "s"}.`);
  } catch (error) {
    setStatus(`${error.message} Browser security may block this URL unless the site allows cross-origin requests.`, true);
  } finally {
    submitButton.disabled = false;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const sharedUrl = new URL(window.location.href).searchParams.get("url");
  if (!sharedUrl) {
    return;
  }

  try {
    urlInput.value = normalizeArticleUrl(sharedUrl);
    form.requestSubmit();
  } catch (error) {
    updateShareUrl("");
    setStatus(error.message, true);
  }
}, { once: true });
