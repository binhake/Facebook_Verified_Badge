<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Facebook Verified Badge icon">

# Facebook Verified Badge

A lightweight browser extension that shows a **cosmetic verified badge** next to your name on Facebook — on the home feed and on profile pages.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0866ff)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![No permissions](https://img.shields.io/badge/permissions-none-brightgreen)
![Chromium](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Brave-supported-blue)

English · [Tiếng Việt](README.vi.md)

</div>

> [!IMPORTANT]
> The badge is **purely visual and local**. It only modifies the page inside *your* browser — your account is **not** verified, and nobody else will see the badge. Do not use it to impersonate verified accounts or mislead other people.

---

## Table of contents

- [Preview](#preview)
- [Features](#features)
- [How it works](#how-it-works)
- [Installation](#installation)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Privacy](#privacy)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Preview

![Before and after: profile header and home sidebar](docs/images/preview.png)

| Page | Where the badge goes | Size |
|---|---|---|
| Home — `www.facebook.com/` or `web.facebook.com/` (query strings allowed) | Your name in the left sidebar | 12 px |
| Profile — `facebook.com/<username>` or `profile.php?id=<id>` | The name in the profile header, before the ` (nickname)` if there is one | 24 px |

## Features

- **Zero permissions.** Only a content script on `www.facebook.com` and `web.facebook.com`; no background worker, no storage, no network requests.
- **Native look.** The injected markup mirrors Facebook's own badge (same classes, `--accent` colour), so it follows light/dark mode automatically.
- **Works for anyone who installs it.** The signed-in user's name is read from the data Facebook embeds in the page, so nothing is hard-coded.
- **SPA aware.** Facebook never reloads the page when you navigate; the extension re-checks every second, removes stale badges on URL change and re-adds the badge if React re-renders the name.
- **React safe.** Existing text nodes are edited in place instead of replacing elements, and the badge is built with DOM APIs (no `innerHTML`), so it plays well with React and Trusted Types.
- **Localised.** Extension name, description and badge tooltip are available in English and Vietnamese (`_locales/`).

## How it works

![Flow: timer, detect page, find name, insert badge](docs/images/how-it-works.svg)

1. **Detect the page** from `location.pathname`:
   - `/` or `/home.php` → *home*
   - a single path segment that looks like a username (5–50 chars of `A–Z a–z 0–9 .`), or `/profile.php?id=…` → *profile*
   - reserved paths such as `/groups`, `/watch`, `/marketplace`, `/reels`, … are ignored.
2. **Find the name element.** Only elements whose *own* text equals the name are considered, and anything inside posts, the feed or dialogs (`[role="article"]`, `[role="feed"]`, `[role="dialog"]`) is skipped.

   | Page | Strategy (in order) |
   |---|---|
   | Home | 1. Signed-in user's name (from `CurrentUserInitialData`), preferring the left navigation · 2. Fallback: first visible `span.x1lliihq` with text |
   | Profile | 1. Name from `<title>` (`(3) Jane Doe \| Facebook`) · 2. Signed-in user's name inside `h1` / `[role="main"]` · 3. A `span.x1lliihq` containing the nickname span · 4. Any visible text inside `[role="main"] h1` |

   Several strategies are needed because Facebook does not always update `<title>` during in-app navigation (it can stay `(1) Facebook`), and its DOM varies between accounts and A/B tests.
3. **Insert the badge.** The name text becomes `Name&nbsp;`, and the badge is inserted before the nickname span (or at the end):

   ```html
   <span class="x1lliihq" data-fbvb="">
     Jane Doe&nbsp;
     <span data-fbvb-badge="">
       <div class="x1rg5ohu"><span class="xjp7ctv"><div tabindex="0">
         <span class="x3nfvp2 x11njtxf">
           <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" role="img" …>
             <title>Verified account</title><path d="…"/>
           </svg>
         </span>
       </div></span></div>
     </span>
     <span class="x1q74xe4 x1fcty0u"> (janedoe)</span>
   </span>
   ```

   `data-fbvb` / `data-fbvb-badge` mark what was patched so the badge is never added twice.

## Installation

The extension is not on the Chrome Web Store; install it in developer mode. It works in any Chromium-based browser (Chrome, Edge, Brave, Opera, Cốc Cốc, …).

1. **Get the code**
   ```bash
   git clone https://github.com/binhake/Facebook_Verified_Badge.git
   ```
   or download the ZIP from GitHub (**Code → Download ZIP**) and extract it.
2. **Open the extensions page**
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder that contains `manifest.json`.
5. Open or reload Facebook.

To update: pull the latest code (or extract the new ZIP over the old folder), then click **Reload** on the extension card and refresh Facebook.

> [!NOTE]
> Load the **folder**, not a `.crx` file. Chromium browsers disable `.crx` extensions that do not come from an official store.

## Configuration

Settings are constants at the top of [`src/content.js`](src/content.js). Edit, then click **Reload** on `chrome://extensions`.

| Constant | Default | Description |
|---|---|---|
| `ONLY_OWN_PROFILE` | `false` | `true` shows the badge only on the signed-in user's own profile. `false` shows it on every profile page you open. |
| `DEBUG` | `false` | Logs each step to the DevTools console with the `[FBVB]` prefix. |
| `RUN_INTERVAL_MS` | `1000` | How often (ms) the page is re-checked. Lower = the badge appears faster after navigation; higher = less work. |
| `VIEWER_MAX_TRIES` | `10` | How many checks are spent trying to read the signed-in user's name before giving up for that page load. |
| `BADGE_SIZE` | `{ home: 12, profile: 24 }` | Badge size in pixels per page type. |

## Troubleshooting

**The badge does not appear**

1. Confirm the extension is enabled and was reloaded after any change.
2. Make sure the URL is a supported page (see [Preview](#preview)); `m.facebook.com` and paths like `/username/photos` are not supported.
3. Set `DEBUG = true`, reload the extension, refresh Facebook, open DevTools (<kbd>F12</kbd>) → **Console** and filter by `FBVB`:

   | Log | Meaning |
   |---|---|
   | *(nothing)* | The content script is not running — check that the extension is enabled. |
   | `Unsupported page: /…` | The URL is not a home or profile page. |
   | `Signed-in user not found yet …` | Facebook's embedded user data could not be read; the home page falls back to the first name span. |
   | `Profile: name not found …` | No matching element. The log lists the title, the viewer name and all `h1`s — please include it in an issue. |
   | `Badge (24px) added next to "…"` | Working as intended. |

**Diagnostic snippet**

If you open an issue, run this in the Console on the page where the badge is missing and paste the result (it is copied to your clipboard). It only reads the page and sends nothing anywhere.

```js
(() => {
  const norm = t => t.replace(/[\u00a0\s]+/g, ' ').trim();
  const own = el => norm([...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join(''));
  const path = el => {
    const p = [];
    for (let e = el; e && e !== document.body && p.length < 8; e = e.parentElement) {
      p.push(e.tagName.toLowerCase()
        + (e.getAttribute('role') ? '[role=' + e.getAttribute('role') + ']' : '')
        + (e.classList.contains('x1lliihq') ? '.x1lliihq' : ''));
    }
    return p.reverse().join(' > ');
  };
  let viewer = null;
  for (const s of document.scripts) {
    const m = s.textContent.match(/"CurrentUserInitialData",\[\],\{[^{}]*?"NAME":"((?:[^"\\]|\\.)*)"/);
    if (m) { viewer = JSON.parse('"' + m[1] + '"'); break; }
  }
  const lines = [
    'URL: ' + location.href,
    'title: ' + document.title,
    'viewer: ' + viewer,
    'h1 count: ' + document.querySelectorAll('h1').length,
    ...[...document.querySelectorAll('h1')].map(h =>
      '  ' + path(h) + ' | visible=' + (h.getClientRects().length > 0) + ' | ' + h.outerHTML.slice(0, 400))
  ];
  if (viewer) {
    const hits = [...document.querySelectorAll('body *')].filter(e => own(e) === norm(viewer));
    lines.push('elements whose text = viewer name: ' + hits.length);
    hits.slice(0, 15).forEach(e =>
      lines.push('  ' + path(e) + ' | visible=' + (e.getClientRects().length > 0) + ' | ' + e.outerHTML.slice(0, 300)));
  }
  const report = lines.join('\n');
  console.log(report);
  copy(report);
})();
```

> [!TIP]
> Chrome may ask you to type `allow pasting` before it accepts pasted code in the Console. Facebook also prints a large "Stop!" warning there — that warning is about scripts that steal accounts; always read a snippet before running it.

## Project structure

```
Facebook_Verified_Badge/
├── manifest.json          # Manifest V3, content script only
├── src/
│   └── content.js         # All logic: page detection, lookup, badge injection
├── _locales/
│   ├── en/messages.json   # English strings (default)
│   └── vi/messages.json   # Vietnamese strings
├── icons/                 # 16 / 48 / 128 px extension icons
├── docs/images/           # README illustrations
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Privacy

- No permissions are requested; the content script runs only on `www.facebook.com` and `web.facebook.com`.
- The signed-in user's name and ID are read from the current page in memory, used only to locate the name on screen, and never stored or transmitted.
- No analytics, no remote code, no network requests.

## Limitations

- Relies on Facebook's markup (e.g. `span.x1lliihq`, `role` attributes). Facebook changes its front end frequently, so a future update may require new selectors — please open an issue with the diagnostic output.
- On **other people's** profiles the name is found through `<title>` or the page heading; if Facebook leaves the title as `Facebook` and the name is not in an `h1`, no badge is shown there.
- The mobile site (`m.facebook.com`), Messenger, Pages/Groups and sub-pages like `/username/about` are not supported.
- The badge is cosmetic: it does not appear on other devices, in other browsers, or for other people.

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a branch: `git checkout -b fix/profile-selector`.
2. Keep the extension permission-free and dependency-free.
3. Follow the existing code style (2-space indent, single quotes, function declarations; see `.editorconfig`).
4. Test on both `/` and a `/username` page, with `DEBUG = true`, before opening a PR.
5. Describe what changed and, for selector fixes, include the diagnostic output that motivated it.

## License

[MIT](LICENSE) © 2026 Nguyễn Trọng Bình ([@binhake](https://github.com/binhake))

---

<sub>This project is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. "Facebook" is a trademark of Meta Platforms, Inc.</sub>
