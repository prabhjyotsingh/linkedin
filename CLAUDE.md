# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome extension (Manifest V3) that auto-likes and auto-reposts LinkedIn posts on configured company pages and user activity pages, either on a weekly schedule or on manual trigger. No build system, no dependencies, no tests — pure vanilla JS + HTML loaded directly by Chrome.

## Common commands

There is no build, lint, or test toolchain. The workflow is:

- **Load the extension locally**: Chrome → `chrome://extensions` → enable Developer Mode → "Load unpacked" → select this directory.
- **Reload after edits**: Click the refresh icon on the extension card in `chrome://extensions`. Content-script changes additionally require reloading any open LinkedIn tab.
- **Package for distribution**: `./make_zip.sh` — produces `linkedin-post-automator-fixed.zip` at the repo root (gitignored). Note: the script has a dead `rm -rf temp_package/` line before the copy that looks destructive but runs inside `temp_package/`, so it's a no-op; don't "fix" it without testing.
- **Debug the service worker**: `chrome://extensions` → extension card → "Inspect views: service worker". Service workers in MV3 are ephemeral — they sleep and wake on events, so stale local variables cannot be relied on across alarm fires.
- **Debug content scripts**: Open DevTools on a LinkedIn tab — `content.js` logs are prefixed `LinkedIn Post Automator:`.

## Architecture

Three runtime contexts, coordinated only by `chrome.runtime.sendMessage` and `chrome.storage.sync`:

1. **`background.js` (service worker)** — owns scheduling and orchestration. Registers per-day weekly alarms via `chrome.alarms` in `setupScheduledAlarms()`. On fire (or on manual "runNow"), `runAutomation()` iterates the configured `companyPages` and `userPages`, navigating a single reused LinkedIn tab to each URL and awaiting a `thisProcessingComplete` message before moving on. The `waitForProcessingComplete()` → `processingComplete` / `thisProcessingComplete` handshake is how the async sequential loop is coordinated across contexts — the content script sends *two* messages on completion, one for history logging and one to unblock the loop.

2. **`content.js` (content script)** — injected only on `linkedin.com/company/*/posts/` and `linkedin.com/in/*/recent-activity/all/` per `manifest.json`. Branches on `location.pathname`:
   - **Company branch**: clicks the `#sort-dropdown-trigger` to switch ordering to "Recent" (second `<li>` in the dropdown menu) before finding posts via `div.feed-shared-update-v2` with `data-urn` and scaffold-scroll fallbacks. Calls both `likePost` and `repostPost`.
   - **User activity branch**: queries `.scaffold-finite-scroll__content > ul > li` directly; repost is intentionally commented out.
   - `findPosts()`, `likePost()`, and `repostPost()` all use layered selector strategies (XPath → class selectors → structural fallback) because LinkedIn class names are hashed/volatile. When a selector breaks, prefer adding a new fallback over replacing existing ones.

3. **`popup.js` + `popup.html`** — the toolbar popup. Shows last-run time and a 5-item slice of `runHistory`, and sends `{action: 'runNow'}` to the background script.

4. **`options.js` + `options.html`** — the options page. Edits `companyPages`, `userPages`, `postsToProcess`, `enableLike`, `enableRepost`, `autoProcess`, `scheduleTime`, `scheduleDays`. On save, writes to `chrome.storage.sync` and sends `{action: 'updateConfig'}` so the service worker can tear down and recreate alarms.

## State model

All persistent state lives in `chrome.storage.sync` (cross-device, ~100KB quota). Keys: `companyPages`, `userPages`, `postsToProcess`, `enableLike`, `enableRepost`, `autoProcess`, `scheduleTime`, `scheduleDays`, `lastRun`, `runHistory` (capped at 20 entries in `handleProcessingComplete`). Defaults are defined in `DEFAULT_CONFIG` in `background.js` and re-declared in `options.js` / `popup.js` defaults — if you add a key, update all three.

## Gotchas when modifying

- **MV3 service worker lifecycle**: `background.js` is not a long-lived background page. Don't hold state in module-level variables across events; persist to `chrome.storage`.
- **Alarm minimum period**: Chrome enforces a 1-minute minimum for `periodInMinutes`; the weekly schedule uses `7 * 24 * 60`.
- **DOM timing**: Much of `content.js` depends on `await delay(ms)` between clicks because LinkedIn animates menus and async-renders repost dialogs. Lowering these delays tends to silently break the flow rather than error.
- **Host permission scope**: `manifest.json` grants `https://www.linkedin.com/*` and matches content scripts narrowly to two URL patterns. Adding a new automation surface requires updating both `host_permissions` (if needed) and `content_scripts.matches`.
