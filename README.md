# Reader

A lightweight, single-page article extractor. Paste any article URL and the
page will pull out the likely title and readable paragraphs.

## How it works

1. You enter a URL in the input field.
2. The page fetches the remote HTML through a CORS proxy
   (`https://feeds.davecross.co.uk/url/`).
3. The fetched HTML is parsed in the browser using `DOMParser`.
4. A set of CSS selectors is tried in order to locate the article title and
   body paragraphs.
5. The extracted content is rendered on the same page.

## Usage

Open `index.html` in any modern browser — no build step or server required.
Because the fetch is proxied, pages that block direct cross-origin requests
can still be read as long as the proxy itself can reach them.

## Files

| File | Description |
|------|-------------|
| `index.html` | The entire application — HTML, CSS, and JavaScript in one file |

## Limitations

- Works only for pages the CORS proxy is able to reach.
- Paragraph extraction depends on well-known CSS selectors; unusual page
  structures may yield no results.
