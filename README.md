# ChemSearch Landing Page

Marketing/landing page for the **ChemSearch Android app**.

- Android app source: [FurtherSecrets24680/chemsearch-android](https://github.com/FurtherSecrets24680/chemsearch-android)
- Live release feed: GitHub Releases API (shown in header)

![ChemSearch landing preview](./screenshots/01-search-view-dark.png)

## What this page includes

- Hero section focused on the Android app value proposition
- Mobile-first responsive layout with collapsible navigation
- Light and dark theme toggle
- Feature section, tools section, and "Under the hood" section
- Screenshot carousel with:
  - horizontal scroll + snap
  - previous/next arrows
  - dot navigation + slide counter
  - keyboard support
  - full-size lightbox preview
- Tool search/filter with keyboard shortcut (`/` or `Ctrl/Cmd + K`)

## Run locally

Use any static server from the project root:

```bash
npx serve .
```

Then open:

- `http://localhost:3000/`

You can also open `index.html` directly in a browser.

## Project structure

```text
chemsearch/
├── index.html          # Main landing page (all styles + JS in one file)
├── chemsearch-logo.png # Brand logo used in header
├── favicon.png         # Browser icon
├── screenshots/        # App screenshots used in gallery/carousel
├── LICENSE
└── README.md
```

## Data/source references used in page copy

- PubChem PUG REST
- PubChem PUG View
- Wikipedia REST API
- Gemini API / Groq API (optional app-side AI summaries)
- GitHub Releases API

## License

Open-source. See `LICENSE` for details.
