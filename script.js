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

  linkEl.textContent = "";
  const link = document.createElement("a");
  link.href = url;
  link.textContent = "Link to original article";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  linkEl.appendChild(link);

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

  return response.text();
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
