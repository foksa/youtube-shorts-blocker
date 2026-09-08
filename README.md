# YouTube Shorts Blocker

A lightweight Manifest V3 Chrome extension that hides YouTube Shorts cards, shelves, and navigation controls, and redirects Shorts pages to YouTube home or the parent channel.

No runtime dependencies, accounts, telemetry, or network requests. The extension runs only on `www.youtube.com` and `m.youtube.com` and uses the storage permission only to remember your preference locally.

## Download and install

**[Download the extension ZIP](https://github.com/foksa/youtube-shorts-blocker/releases/latest/download/youtube-shorts-blocker.zip)** — no Git or build tools needed.

1. Extract the ZIP into a folder you will keep, such as `Documents/YouTube Shorts Blocker`.
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Refresh any open YouTube tabs.

Keep the extracted folder in place—Chrome loads the extension from it. The ZIP is a manual installation, so Developer mode is required.

To open settings, click Chrome’s puzzle-piece **Extensions** button, then **YouTube Shorts Blocker**. You can pin it for easier access.

### Updating

Download the latest ZIP, extract it, and replace the contents of your existing extension folder. Click **Reload** for the extension on `chrome://extensions`, then refresh YouTube. Updates are manual.

## Redirect preference

Click the extension icon to open its popup. **Redirect Shorts links** defaults to on. Turn it off to open shared or pasted Shorts URLs without being redirected. Shorts remain hidden in feeds, search, and navigation. The preference is saved locally and applies to open tabs; turning it on while viewing a Shorts URL redirects that tab immediately.

## How it works

- CSS immediately hides dedicated Shorts renderers.
- JavaScript validates YouTube link destinations and hides matching cards and controls.
- DOM changes are batched, and changed elements are reevaluated so reused cards can become visible again.
- Direct `/shorts` routes redirect to home. Channel Shorts tabs redirect to their parent channel.
- Selected Shorts search chips switch to an identifiable **All** button when available. The extension never reloads search to guess a fallback.

## Limitations

YouTube changes its markup regularly and may serve different layouts by account, region, or experiment. Unknown card layouts may have only their Shorts link hidden, leaving a gap. Generic mixed shelves are preserved to avoid hiding ordinary videos.

Text-only control detection recognizes the exact English label “Shorts”; automatic search recovery recognizes “All”. Other languages rely on links and dedicated renderers. If a safe search fallback is unavailable, switch filters manually or start a new search.

This hides Shorts UI and redirects Shorts routes. It does not classify video duration, block media downloads, or block the same video on a regular `/watch` URL. Matching the mobile website does not imply support for installing extensions in mobile Chrome. Only the top-level page is covered.

## Project layout

```text
extension/            Unpacked extension for developers
  manifest.json
  content/            YouTube blocking logic and styles
  popup/              Settings popup HTML, styles, and logic
  icons/              Chrome-sized PNG icons
test/                 Regression tests
scripts/              Release packaging helper
docs/
  CONTRIBUTING.md     Contribution guide and manual test checklist
  design/             Original icon and generation notes
README.md
LICENSE
package.json
package-lock.json
```

## Development

To work from source, load the repository’s `extension/` folder in Chrome. The unpacked extension needs no build step. For regression tests, install Node.js 18 or newer and run:

```sh
npm ci
npm test
```

Tests use jsdom to exercise DOM behavior; they do not replace live browser checks. See [contribution guide](docs/CONTRIBUTING.md) for the manual checklist.

## Privacy

The extension inspects page markup and URLs locally to identify Shorts. It does not collect, store, or transmit browsing data. Development dependencies are used only to run tests and are not shipped in the extension.

## License

[MIT](LICENSE).
