# Contributing

Keep changes small and preserve ordinary YouTube content. Prefer verified destinations and dedicated renderers over fuzzy text matching. Add a regression fixture when fixing a selector or navigation bug.

Run `npm ci` and `npm test` before submitting a change.

## Manual browser checklist

Load the `extension/` folder as an unpacked extension and check:

- Home, search, subscriptions, channels, and watch-page recommendations.
- Direct `/shorts/VIDEO_ID` navigation and channel Shorts tabs.
- SPA navigation, browser back/forward, and infinite scrolling.
- Ordinary results mentioning “shorts” and shelves mixing ordinary videos with Shorts.
- Search chips, including a selected Shorts chip and an unavailable All fallback.
- Logged-in and logged-out pages, and at least one non-English locale.
- Console errors and responsiveness while scrolling a long page.

## Reporting a problem

Include browser and extension versions, page URL (remove private query data), locale, whether you were signed in, expected behavior, and reproduction steps. A small HTML excerpt around the affected card or control helps; remove personal information before sharing.

## Releasing an update

GitHub Actions runs tests and validates the ZIP on pushes to `main` and pull requests. Pushing a version tag also publishes a GitHub release with `youtube-shorts-blocker.zip` attached. No manual ZIP upload or extra secret is needed.

1. Update `extension/manifest.json` to the new version (for example `1.0.2`).
2. Run `npm version 1.0.2 --no-git-tag-version` to update `package.json` and `package-lock.json`.
3. Commit and push the changes to `main`.
4. Tag that commit and push the tag:

```sh
git tag v1.0.2
git push origin v1.0.2
```

The tag must match the manifest and package versions. A failing check prevents publication. Use a new version for each release; existing releases are not overwritten. Follow the run in the repository’s **Actions** tab. The README’s download link points to the latest release asset.

For a local packaging check, run `python3 scripts/package.py` (Python 3 required). It writes `dist/youtube-shorts-blocker.zip` containing runtime files, the license, and installation instructions.
