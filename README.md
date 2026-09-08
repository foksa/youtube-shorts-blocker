# YouTube Shorts Blocker

A lightweight Manifest V3 Chrome extension that hides YouTube Shorts cards, shelves, and navigation controls, and redirects Shorts pages to YouTube home or the parent channel.

No runtime dependencies, accounts, telemetry, or network requests. The extension runs only on `www.youtube.com` and `m.youtube.com` and uses the storage permission only to remember your preference locally.

## Install locally

1. Download or clone this repository and extract it if needed.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder containing `manifest.json`.
4. Refresh existing YouTube tabs.

After changing extension files, reload the extension on `chrome://extensions` and refresh YouTube.

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

## Development

The unpacked extension needs no build step. For regression tests, install Node.js 18 or newer and run:

```sh
npm ci
npm test
```

Tests use jsdom to exercise DOM behavior; they do not replace live browser checks. See [CONTRIBUTING.md](CONTRIBUTING.md) for the manual checklist.

## Distribution

For Chrome Web Store submission, create a ZIP with `manifest.json`, `content.js`, and `content.css`, `popup.html`, `popup.css`, and `popup.js` at its root, and the `icons/` directory (only `icon-*.png` is required). Exclude development dependencies, tests, and private keys. See [Chrome’s publishing documentation](https://developer.chrome.com/docs/webstore/publish/).

Chrome’s **Pack extension** workflow creates a `.crx` and a private `.pem` signing key. Keep that key private and outside the repository.

## Privacy

The extension inspects page markup and URLs locally to identify Shorts. It does not collect, store, or transmit browsing data. Development dependencies are used only to run tests and are not shipped in the extension.

## License

[MIT](LICENSE).
