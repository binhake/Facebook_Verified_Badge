# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
