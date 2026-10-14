<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Verified Badge for Facebook icon">

# Verified Badge for Facebook

<sub>Repository: Facebook_Verified_Badge</sub>

A lightweight browser extension that shows a **cosmetic verified badge** next to your name on Facebook — on the home feed and on profile pages.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0866ff)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Permissions: storage](https://img.shields.io/badge/permissions-storage%20only-brightgreen)
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
- [Settings](#settings)
- [URLs](#urls)
- [Languages](#languages)
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

- **Settings UI.** Click the toolbar icon to toggle the badge, change sizes and timing, enable debug logs or switch language — changes apply to open Facebook tabs instantly.
- **Custom languages.** Ships with English and Vietnamese; download a template, translate it and import any other language as a `.json` file.
- **Custom URLs.** `www.facebook.com` and `web.facebook.com` are built in; add any other URL on `facebook.com` (with `*` wildcards) and choose how it is handled.
- **Minimal permissions.** Only `storage` (to remember your settings) and a content script on `facebook.com`; no background worker, no network requests.
- **Native look.** The injected markup mirrors Facebook's own badge (same classes, `--accent` colour), so it follows light/dark mode automatically.
- **Works for anyone who installs it.** The signed-in user's name is read from the data Facebook embeds in the page, so nothing is hard-coded.
- **SPA aware.** Facebook never reloads the page when you navigate; the extension re-checks every second, removes stale badges on URL change and re-adds the badge if React re-renders the name.
- **React safe.** Existing text nodes are edited in place instead of replacing elements, and the badge is built with DOM APIs (no `innerHTML`), so it plays well with React and Trusted Types.
- **Auto language.** By default the settings page and the badge tooltip follow your browser language, falling back to English.

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
   | Profile | 1. Name from `<title>` (`(3) Nguyễn Trọng Bình \| Facebook`) · 2. Signed-in user's name inside `h1` / `[role="main"]` · 3. A `span.x1lliihq` containing the nickname span · 4. Any visible text inside `[role="main"] h1` |

   Several strategies are needed because Facebook does not always update `<title>` during in-app navigation (it can stay `(1) Facebook`), and its DOM varies between accounts and A/B tests.
3. **Insert the badge.** The name text becomes `Name&nbsp;`, and the badge is inserted before the nickname span (or at the end):

   ```html
   <span class="x1lliihq" data-fbvb="">
     Nguyễn Trọng Bình&nbsp;
     <span data-fbvb-badge="">
       <div class="x1rg5ohu"><span class="xjp7ctv"><div tabindex="0">
         <span class="x3nfvp2 x11njtxf">
           <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" role="img" …>
             <title>Verified account</title><path d="…"/>
           </svg>
         </span>
       </div></span></div>
     </span>
     <span class="x1q74xe4 x1fcty0u"> (binhake)</span>
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
6. Optional: pin the extension from the puzzle-piece menu so its settings are one click away.

To update: pull the latest code (or extract the new ZIP over the old folder), then click **Reload** on the extension card and refresh Facebook.

> [!NOTE]
> Load the **folder**, not a `.crx` file. Chromium browsers disable `.crx` extensions that do not come from an official store.

## Settings

Click the extension icon in the toolbar (pin it from the puzzle-piece menu first), or open **Details → Extension options** on `chrome://extensions`. Every change is saved automatically and applied to open Facebook tabs right away — no reload needed.

![Settings page in light (Vietnamese) and dark (English) themes](docs/images/options.png)

| Option | Default | Description |
|---|---|---|
| Enable badge | On | Turn off to remove every badge without uninstalling the extension. |
| Only on my own profile | On | On: the badge appears only on the signed-in user's profile. Off: on every profile page you open. |
| Debug logging | Off | Logs each step to the DevTools console with the `[FBVB]` prefix (see [Troubleshooting](#troubleshooting)). |
| Profile badge size | `24` px | Range 8–64. |
| Home badge size | `12` px | Range 8–48. |
| Re-check interval | `1000` ms | Range 250–10000. Lower = the badge appears faster after navigation; higher = less work. |
| Home page | On | Badge on the home feed (`/`). |
| Profile pages | On | Badge on `/username` and `/profile.php?id=…`. |
| URLs | 2 defaults | Where the extension runs — see [URLs](#urls). |
| Display language | Automatic | Language of the settings page and the badge tooltip. *Automatic* follows the browser language. |
| Reset to defaults | — | Restores the options above and removes your custom URLs. Imported languages are kept. |

Settings are stored with `chrome.storage.sync`, so they follow your browser profile if sync is enabled.

## URLs

The **Pages → URLs** list decides where the badge may appear.

| URL | Mode | |
|---|---|---|
| `www.facebook.com/*` | Automatic | 🔒 Default — cannot be edited, removed or added again |
| `web.facebook.com/*` | Automatic | 🔒 Default — cannot be edited, removed or added again |
| *your URLs* | Automatic / Profile / Home / Off | Editable and removable, up to 30 |

**Adding a URL**

- Type a URL and click **Add**. `https://` is optional; a bare host such as `vi-vn.facebook.com` becomes `vi-vn.facebook.com/*`.
- Only `facebook.com` and its subdomains are accepted — `google.com` or `facebook.com.example.net` are rejected.
- `*` matches any characters in the path: `www.facebook.com/binhake/*` covers `/binhake/about`, `/binhake/photos`, …
- Duplicates (including the two defaults, in any spelling) are rejected.

**Modes**

| Mode | Behaviour |
|---|---|
| Automatic | Detects the page type: `/` → home, `/username` or `/profile.php?id=…` → profile, anything else → no badge. Respects the **Home page** / **Profile pages** switches. |
| Profile | Always looks for the name in the profile header (e.g. `/binhake/about`). |
| Home | Always looks for the signed-in user's name in the left sidebar. |
| Off | Never shows a badge on matching pages (e.g. a friend's profile). |

Your URLs are checked top to bottom **before** the defaults, so a specific rule like `www.facebook.com/someone` → *Off* wins over `www.facebook.com/*`. Use **Test a URL** to see which rule applies and what will happen.

> [!NOTE]
> Other subdomains (e.g. `m.facebook.com`, `mbasic.facebook.com`) can be added, but their markup differs from the desktop site, so the name may not be found there.

## Languages

The settings page and the badge tooltip (`title` of the badge) are translatable. English and Vietnamese are built in; any other language can be added from the settings page:

1. Click **Download template** — you get `fbvb-language-template.json` with every English string.
2. Set `code` (an [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) code, optionally with a region such as `pt-BR`) and `name`, then translate the values in `messages`. Keep the keys and `{placeholders}` unchanged.
3. Click **Import language file** and pick your `.json`. The language appears in the **Display language** list and under **Imported**, where it can be removed later.

```json
{
  "code": "fr",
  "name": "Français",
  "messages": {
    "badgeTitle": "Compte vérifié",
    "optionsSubtitle": "Badge décoratif, visible uniquement dans votre navigateur.",
    "importSuccess": "Langue importée : {name}"
  }
}
```

- Missing keys fall back to English, so a partial translation is fine.
- Unknown keys are ignored and only plain-text values are kept; nothing in the file is ever executed, and strings are inserted as text, not HTML.
- Importing a language whose `code` matches a built-in one (`en`, `vi`) overrides it; removing the import restores the built-in version.
- Imported languages are stored locally (`chrome.storage.local`) on the current browser.

Want your translation shipped with the extension? Open a pull request adding it to `BUILTIN_LANGUAGES` in [`src/shared/settings.js`](src/shared/settings.js).

> [!NOTE]
> When the settings are opened as the toolbar popup, **Import language file** opens the full settings tab instead, because a file picker would close the popup.

## Troubleshooting

**The badge does not appear**

1. Confirm the extension is enabled, **Enable badge** is on, and the extension was reloaded after any code change.
2. Paste the page address into **Test a URL** in the settings: it tells you whether a badge is expected and which rule decided it. Add a URL rule if needed (see [URLs](#urls)).
3. Turn on **Debug logging** in the settings, refresh Facebook, open DevTools (<kbd>F12</kbd>) → **Console** and filter by `FBVB`:

   | Log | Meaning |
   |---|---|
   | *(nothing)* | The content script is not running — check that the extension is enabled. |
   | `Skipped <url>: <reason> (<rule>)` | No badge on this page. Reasons: `noRule` (URL not in the list), `off` (disabled by a rule), `typeOff` (Home/Profile switch is off), `unsupported` (not a home or profile page), `disabled` (badge turned off). |
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
├── manifest.json            # Manifest V3: content script, popup, options page
├── src/
│   ├── content.js           # Page detection, name lookup, badge injection
│   ├── shared/
│   │   └── settings.js      # Defaults, storage helpers, built-in languages, language import
│   └── options/
│       ├── options.html     # Settings UI (toolbar popup + options tab)
│       ├── options.css
│       └── options.js
├── _locales/                # Extension name/description for the browser (en, vi)
├── icons/                 # 16 / 48 / 128 px extension icons
├── docs/images/           # README illustrations
├── CHANGELOG.md
├── PRIVACY.md
├── LICENSE
├── README.md
└── README.vi.md
```

## Privacy

- The only permission is `storage`, used for your settings and imported languages. The content script is loaded on `*.facebook.com` and does nothing unless the page matches a URL in your list.
- The signed-in user's name and ID are read from the current page in memory, used only to locate the name on screen, and never stored or transmitted.
- No analytics, no remote code, no network requests.
- Full policy: [PRIVACY.md](PRIVACY.md).

## Limitations

- Relies on Facebook's markup (e.g. `span.x1lliihq`, `role` attributes). Facebook changes its front end frequently, so a future update may require new selectors — please open an issue with the diagnostic output.
- On **other people's** profiles the name is found through `<title>` or the page heading; if Facebook leaves the title as `Facebook` and the name is not in an `h1`, no badge is shown there.
- Only the desktop markup is supported. The mobile site (`m.facebook.com`), Messenger and Pages/Groups can be added as URLs but will usually not show a badge.
- The badge is cosmetic: it does not appear on other devices, in other browsers, or for other people.

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a branch: `git checkout -b fix/profile-selector`.
2. Keep the extension dependency-free and avoid new permissions.
3. Follow the existing code style (2-space indent, single quotes, function declarations; see `.editorconfig`).
4. Test on both `/` and a `/username` page with **Debug logging** on before opening a PR.
5. New UI strings go into every language in `BUILTIN_LANGUAGES` (English is the fallback).
6. Describe what changed and, for selector fixes, include the diagnostic output that motivated it.

## License

[MIT](LICENSE) © 2026 Nguyễn Trọng Bình ([@binhake](https://github.com/binhake))

---

<sub>This project is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. "Facebook" is a trademark of Meta Platforms, Inc.</sub>
