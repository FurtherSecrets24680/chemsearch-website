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
- `styles.css` contains the responsive design, dark/light themes, screenshot layout, and mobile spacing.
- `script.js` handles theme switching, mobile navigation, direct APK download links, carousel controls, and lightbox previews.
- `PRODUCT.md` captures the design direction used by Impeccable.
- `.impeccable/live/config.json` configures Impeccable live mode for `index.html`.

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
├── script.js
├── styles.css
├── PRODUCT.md
├── chemsearch-logo.png
├── favicon.png
├── LICENSE
├── .impeccable/
└── README.md
```

## Content Sources

The app details come from the ChemSearch Android repository and the app screenshots hosted there. Keep the website copy user-facing: say "Android 8+" instead of API names, explain features by outcome, and avoid build-system details outside contributor notes.

## Design Notes

The current design keeps ChemSearch's blue Material-inspired palette, with a dark lab-style surface, real app screenshots, readable mobile sections, and restrained motion for low-end devices. Impeccable is configured for future audit, polish, and live visual iteration passes.

## License

See [LICENSE](LICENSE).
