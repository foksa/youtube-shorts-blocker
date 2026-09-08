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
