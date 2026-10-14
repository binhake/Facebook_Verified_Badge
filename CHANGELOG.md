# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-10-15

### Added
- **Pages** section in the settings: separate switches for the home page and profile pages.
- URL list: `www.facebook.com` and `web.facebook.com` are locked defaults; any other `facebook.com` URL can be added with `*` wildcards and a mode (Automatic, Profile, Home, Off), then edited or removed.
- **Test a URL** field showing whether a badge will appear and which rule decided it.

### Changed
- The content script is loaded on `*.facebook.com` and only acts on URLs in the list.
- Page detection moved to `src/shared/settings.js` so the content script and the settings page share it.
- "Only on my own profile" is now on by default.

## [1.3.0] - 2026-10-15

### Added
- Settings UI, available from the toolbar popup and the extension options page: enable/disable, only-own-profile, debug logging, badge sizes, re-check interval, display language, reset to defaults.
- Custom languages: download a JSON template, translate it and import it; imported languages can be removed. Missing keys fall back to English.
- Settings apply live to open Facebook tabs through `chrome.storage.onChanged`.
- Settings page screenshot in the README; illustrations now use the author's name.

### Changed
- Settings moved from constants in `src/content.js` to `chrome.storage` (new `storage` permission).
- Badge tooltip translations moved from `_locales/` to the shared language system (`src/shared/settings.js`), so it follows the language chosen in the settings.

## [1.2.0] - 2026-10-15

### Added
- English and Vietnamese localisation (`_locales/`) for the extension name, description and badge tooltip.
- Extension icons (16, 48, 128 px).
- README (English and Vietnamese) with illustrations, MIT license, `.editorconfig`, `.gitattributes`.

### Changed
- Content script moved to `src/content.js` and wrapped in an IIFE with strict mode.
- Code comments and debug logs rewritten in English; `DEBUG` is now off by default.

## [1.1.1] - 2026-10-15

### Fixed
- Profile pages where Facebook leaves `<title>` as `(1) Facebook`: the name is now located through the signed-in user's name inside `h1` / `[role="main"]`.
- The `h1` fallback is limited to `[role="main"]`, so hidden banner headings such as "Chats" are never badged.

### Changed
- Re-check interval lowered from 3000 ms to 1000 ms.

## [1.1.0] - 2026-10-15

### Changed
- The name is located from the signed-in user's data (`CurrentUserInitialData`) instead of relying on the first `span.x1lliihq`, so the extension works across accounts and Facebook A/B variants.
- Names inside posts, the feed and dialogs are ignored.

### Added
- `ONLY_OWN_PROFILE` and `DEBUG` options, with deduplicated `[FBVB]` console logs.

## [1.0.0] - 2026-10-15

### Added
- Initial release: badge on the home page (12 px) and on profile pages (24 px), SPA navigation support.
