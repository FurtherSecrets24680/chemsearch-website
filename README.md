# ChemSearch Website

Static website for [ChemSearch Android](https://github.com/FurtherSecrets24680/chemsearch-android), a chemistry lookup and study app for Android 8+.

The site gives regular users the short version: search compounds, inspect structures, save records offline, compare results, and use the built-in chemistry tools without sending app data through a ChemSearch server.

## What It Shows

- Compound lookup by name, formula, CAS number, or PubChem CID
- 2D and 3D structure views, with source labels and fallbacks
- Offline compound saves with identifiers, structures, descriptions, synonyms, safety data, and source notes
- Side-by-side compound comparison
- GHS safety cards when PubChem provides hazard data
- 13 chemistry tools plus a 659-entry built-in reference database
- Settings for layout, themes, cache size, optional AI providers, and update checks

## Site Features

- `index.html` is the main landing page.
- `faq.html` answers app questions without exposing developer-only details.
- `styles.css` contains the full responsive design, dark/light themes, animated lab background, glowing hover states, and reduced-motion fallbacks.
- `script.js` handles theme switching, mobile navigation, carousel controls, lightbox previews, page transitions, hover motion, and the generated lab backdrop.

No build step is required. The site is plain HTML, CSS, and JavaScript.

## Run Locally

Use any static server from the repo root:

```powershell
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

You can also open `index.html` directly, but a local server is better for testing navigation and browser behavior.

## Project Files

```text
ChemSearch/
├── index.html
├── faq.html
├── script.js
├── styles.css
├── chemsearch-logo.png
├── favicon.png
├── LICENSE
└── README.md
```

## Content Sources

The app details come from the ChemSearch Android repository and the app screenshots hosted there. Keep the website copy user-facing: say "Android 8+" instead of API names, explain features by outcome, and avoid build-system details outside contributor notes.

## Design Notes

The current design keeps ChemSearch's blue Material-inspired palette, then adds a darker lab-style surface: molecule silhouettes, flask/test-tube shapes, soft glows, tactile buttons, screenshot previews, and motion that backs off for users who prefer reduced motion.

## License

See [LICENSE](LICENSE).
