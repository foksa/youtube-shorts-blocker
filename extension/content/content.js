(() => {
  const BLOCKED_ATTRIBUTE = "data-yt-shorts-blocked";
  const ROOT_SHORTS_PATH = "/";
  const SEARCH_RESULTS_PATH = "/results";
  const URL_CHANGE_POLL_MS = 750;
  // Base arrays — each element appears in exactly one array.
  const VIDEO_RENDERERS = [
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-rich-item-renderer",
    "ytd-rich-grid-media",
    "ytm-rich-item-renderer",
    "ytm-compact-video-renderer",
    "ytm-video-with-context-renderer"
  ];
  const REEL_RENDERERS = [
    "ytd-reel-item-renderer",
    "ytm-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model-v2"
  ];
  const NAV_CONTROLS = [
    "ytd-guide-entry-renderer",
    "ytd-mini-guide-entry-renderer",
    "tp-yt-paper-tab",
    "yt-tab-shape",
    "yt-tab-shape-view-model",
    "yt-chip-cloud-chip-renderer",
    "ytm-pivot-bar-item-renderer"
  ];

  const KNOWN_SHORTS_RENDERERS = [
    "ytd-reel-shelf-renderer", "ytm-reel-shelf-renderer",
    "ytd-rich-shelf-renderer[is-shorts]", ...REEL_RENDERERS
  ].join(", ");
  const CONTROL_SELECTOR = NAV_CONTROLS.join(", ");
  const CARD_SELECTOR = VIDEO_RENDERERS.join(", ");
  const CANDIDATE_SELECTOR = [
    CARD_SELECTOR, CONTROL_SELECTOR, KNOWN_SHORTS_RENDERERS, "a[href]",
    `[${BLOCKED_ATTRIBUTE}]`
  ].join(", ");
  const SELECTED_SELECTOR = '[aria-selected="true"], [aria-pressed="true"]';
  const pending = new Set();
  let sweepQueued = false;
  let lastUrl = location.href;
  let recoveryAttempted = false;
  let redirectShorts = true;
  let settingsReady = false;
  let settingsRevision = 0;

  function getSafeDestination(value) {
    let url;
    try { url = new URL(value, location.origin); } catch { return null; }
    if (url.protocol !== "https:" ||
        !["www.youtube.com", "m.youtube.com", "youtube.com"].includes(url.hostname) ||
        url.port) return null;
    const path = url.pathname;
    if (/^\/shorts(?:\/[^/]+)?\/?$/.test(path)) return ROOT_SHORTS_PATH;
    const channel = path.match(/^(\/@[^/]+|\/(?:channel|c|user)\/[^/]+)\/shorts\/?$/);
    return channel ? channel[1] : null;
  }

  function exactLabel(element, label) {
    const normalize = (text) => (text || "").replace(/\s+/g, " ").trim().toLowerCase();
    return [element.textContent, element.getAttribute("aria-label"), element.getAttribute("title")]
      .some((text) => normalize(text) === label);
  }

  function shortsLink(link) {
    return getSafeDestination(link.getAttribute("href")) !== null;
  }

  function isShortsControl(element) {
    const links = Array.from(element.querySelectorAll("a[href]"));
    // A real destination takes precedence over a possibly ambiguous label.
    if (links.length) return links.some(shortsLink);
    return exactLabel(element, "shorts") ||
      Array.from(element.querySelectorAll("button, [role=tab]"))
        .some((child) => exactLabel(child, "shorts"));
  }

  function shouldHide(element) {
    if (element.matches(KNOWN_SHORTS_RENDERERS)) return true;
    if (element.matches(CONTROL_SELECTOR)) return isShortsControl(element);
    if (element.matches(CARD_SELECTOR)) {
      // Inspect card destinations, not links in descriptions or other metadata.
      return Array.from(element.querySelectorAll('a#thumbnail[href], a#video-title[href], a#video-title-link[href]'))
        .some(shortsLink);
    }
    return element.matches("a[href]") && shortsLink(element);
  }

  function updateElement(element) {
    if (shouldHide(element)) {
      if (!element.hasAttribute(BLOCKED_ATTRIBUTE)) element.setAttribute(BLOCKED_ATTRIBUTE, "");
    } else {
      element.removeAttribute(BLOCKED_ATTRIBUTE);
    }
  }

  function sweep(root) {
    if (root instanceof Element && root.matches(CANDIDATE_SELECTOR)) updateElement(root);
    root.querySelectorAll(CANDIDATE_SELECTOR).forEach(updateElement);
  }

  function resetSelectedShortsSearch() {
    if (location.pathname !== SEARCH_RESULTS_PATH) return;
    const chips = Array.from(document.querySelectorAll("yt-chip-cloud-chip-renderer"));
    const selected = chips.find((chip) => isShortsControl(chip) &&
      (chip.matches(SELECTED_SELECTOR) || chip.querySelector(SELECTED_SELECTOR)));
    if (!selected) { recoveryAttempted = false; return; }
    if (recoveryAttempted) return;
    // Stay within the same chip row, and never guess another filter or reload.
    const fallback = Array.from(selected.parentElement?.querySelectorAll("yt-chip-cloud-chip-renderer button") || [])
      .find((button) => exactLabel(button, "all") && !button.disabled &&
        button.getAttribute("aria-disabled") !== "true");
    if (fallback) {
      recoveryAttempted = true;
      fallback.click();
    }
  }

  function queueSweep(root = document) {
    pending.add(root);
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(() => {
      sweepQueued = false;
      const roots = Array.from(pending);
      pending.clear();
      for (const node of roots) {
        if (node !== document && !node.isConnected) continue;
        if (roots.some((other) => other !== node && other.contains(node))) continue;
        sweep(node);
      }
      resetSelectedShortsSearch();
    });
  }

  function redirectIfNeeded() {
    if (!settingsReady || !redirectShorts) return;
    const destination = getSafeDestination(location.href);
    if (destination !== null) location.replace(new URL(destination, location.origin).href);
  }

  function handleUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    recoveryAttempted = false;
    redirectIfNeeded();
    queueSweep();
  }

  function init() {
    sweep(document);
    resetSelectedShortsSearch();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        if (!target) continue;
        // Recheck the nearest enclosing card/control when a descendant changes.
        let root = target;
        for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (ancestor.matches([CARD_SELECTOR, CONTROL_SELECTOR, KNOWN_SHORTS_RENDERERS].join(", "))) root = ancestor;
        }
        queueSweep(root);
      }
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ["href", "aria-label", "title", "aria-selected", "aria-pressed", "disabled", "aria-disabled", "id", "is-shorts"]
    });
    window.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(CONTROL_SELECTOR);
      const link = event.target.closest("a[href]");
      if (!(control && isShortsControl(control)) && !(link && shortsLink(link))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
    window.addEventListener("yt-navigate-finish", () => { handleUrlChange(); queueSweep(); });
    window.addEventListener("yt-page-data-updated", () => queueSweep());
    window.addEventListener("popstate", handleUrlChange);
    setInterval(handleUrlChange, URL_CHANGE_POLL_MS);
  }

  // Read preferences before redirecting, including on a fresh direct navigation.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.redirectShorts) return;
    settingsRevision++;
    redirectShorts = changes.redirectShorts.newValue !== false;
    settingsReady = true;
    redirectIfNeeded();
  });
  const initialRevision = settingsRevision;
  chrome.storage.local.get({ redirectShorts: true }).then((settings) => {
    if (settingsRevision !== initialRevision) return;
    redirectShorts = settings.redirectShorts !== false;
    settingsReady = true;
    redirectIfNeeded();
  }).catch(() => {
    // Leave navigation alone if the saved preference cannot be read.
    // DOM hiding still works; never redirect against an unread preference.
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
