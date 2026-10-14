/*!
 * Facebook Verified Badge — content script
 * https://github.com/binhake/Facebook_Verified_Badge
 *
 * Adds a cosmetic verified badge next to a name on Facebook:
 *   - Home feed (/):        the signed-in user's name, 12px badge
 *   - Profile (/username):  the profile header name, 24px badge
 *
 * The badge only exists in the local browser's DOM. Nothing is sent to Facebook.
 */
(function () {
  'use strict';

  const ONLY_OWN_PROFILE = false;
  const DEBUG = false;
  const RUN_INTERVAL_MS = 1000;
  const VIEWER_MAX_TRIES = 10;

  const LOG_PREFIX = '[FBVB]';
  const NAME_SELECTOR = 'span.x1lliihq';
  const FALLBACK_NAME_SELECTOR = 'span, h1, h2, a, strong';
  const ALT_NAME_SELECTOR = ':scope > span.x1q74xe4.x1fcty0u';
  const EXCLUDED_AREA_SELECTOR = '[role="article"], [role="dialog"], [role="feed"]';
  const PATCHED_ATTR = 'data-fbvb';
  const BADGE_ATTR = 'data-fbvb-badge';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NBSP = '\u00a0';

  const BADGE_TITLE = getMessage('badgeTitle', 'Verified account');
  const BADGE_PATH = 'M8.004 1.183a1.5 1.5 0 0 1 2.049-.55L12 1.759 13.947.634a1.5 1.5 0 0 1 2.05.549L17.045 3H19.5A1.5 1.5 0 0 1 21 4.5v2.453l1.817 1.05a1.5 1.5 0 0 1 .55 2.049L22.241 12l1.124 1.947a1.5 1.5 0 0 1-.55 2.05L21 17.044V19.5a1.5 1.5 0 0 1-1.5 1.5h-2.454l-1.05 1.817a1.5 1.5 0 0 1-2.048.549L12 22.241l-1.948 1.125a1.5 1.5 0 0 1-2.049-.549L6.955 21H4.5A1.5 1.5 0 0 1 3 19.5v-2.455l-1.817-1.049a1.5 1.5 0 0 1-.549-2.049L1.758 12 .634 10.053a1.5 1.5 0 0 1 .549-2.05L3 6.954V4.5A1.5 1.5 0 0 1 4.5 3h2.454l1.05-1.817zm9.703 9.024a1 1 0 0 0-1.414-1.414l-5.44 5.44a.5.5 0 0 1-.707 0l-2.439-2.44a1 1 0 0 0-1.414 1.414l2.44 2.44a2.5 2.5 0 0 0 3.535 0l5.44-5.44z';
  const BADGE_SIZE = {
    home: 12,
    profile: 24
  };

  const RESERVED_PATHS = new Set([
    'home.php', 'groups', 'watch', 'marketplace', 'gaming', 'events', 'pages', 'friends',
    'messages', 'notifications', 'bookmarks', 'saved', 'reel', 'reels', 'stories', 'search',
    'settings', 'login', 'hashtag', 'memories', 'fundraisers', 'videos', 'live', 'photos',
    'privacy', 'policies', 'help', 'business', 'feeds', 'news', 'onthisday', 'games'
  ]);
  const USERNAME_RE = /^[A-Za-z0-9.]{5,50}$/;
  const VIEWER_NAME_RE = /"CurrentUserInitialData",\[\],\{[^{}]*?"NAME":"((?:[^"\\]|\\.)*)"/;
  const VIEWER_ID_RE = /"CurrentUserInitialData",\[\],\{[^{}]*?"USER_ID":"(\d+)"/;

  const appState = {
    lastUrl: '',
    timerId: 0,
    viewer: null,
    viewerTries: 0,
    lastLog: ''
  };

  // ===== Utilities =====

  function getMessage(key, fallback) {
    try {
      return chrome.i18n.getMessage(key) || fallback;
    } catch (err) {
      return fallback;
    }
  }

  // Deduplicated so a 1s interval does not flood the console
  function log(message) {
    if (!DEBUG || message === appState.lastLog) {
      return;
    }
    appState.lastLog = message;
    console.log(LOG_PREFIX + ' ' + message);
  }

  function normalizeText(text) {
    return text.replace(/[\u00a0\s]+/g, ' ').trim();
  }

  // Direct text nodes only, so a nested " (nickname)" span is ignored
  function getOwnText(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.data;
      }
    }
    return normalizeText(text);
  }

  function isVisible(el) {
    return el.getClientRects().length > 0;
  }

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function decodeJsonString(raw) {
    try {
      return JSON.parse('"' + raw + '"');
    } catch (err) {
      return raw;
    }
  }

  // ===== Signed-in user =====

  function getViewer() {
    if (appState.viewer || appState.viewerTries >= VIEWER_MAX_TRIES) {
      return appState.viewer;
    }
    appState.viewerTries++;

    for (const script of document.scripts) {
      const text = script.textContent;
      if (!text || text.indexOf('CurrentUserInitialData') === -1) {
        continue;
      }

      const nameMatch = text.match(VIEWER_NAME_RE);
      if (!nameMatch) {
        continue;
      }

      const idMatch = text.match(VIEWER_ID_RE);
      appState.viewer = {
        id: idMatch ? idMatch[1] : readCookie('c_user'),
        name: normalizeText(decodeJsonString(nameMatch[1]))
      };
      log('Signed in as "' + appState.viewer.name + '" (' + appState.viewer.id + ')');
      return appState.viewer;
    }

    log('Signed-in user not found yet (attempt ' + appState.viewerTries + '/' + VIEWER_MAX_TRIES + ')');
    return null;
  }

  // ===== Page detection =====

  function detectMode() {
    const path = location.pathname.replace(/\/+$/, '');

    if (path === '' || path === '/home.php') {
      return 'home';
    }

    if (path === '/profile.php') {
      return new URLSearchParams(location.search).get('id') ? 'profile' : null;
    }

    const segments = path.split('/').filter(Boolean);
    if (segments.length !== 1) {
      return null;
    }

    const username = segments[0];
    if (!USERNAME_RE.test(username) || RESERVED_PATHS.has(username.toLowerCase())) {
      return null;
    }

    return 'profile';
  }

  // "(3) Jane Doe | Facebook" -> "Jane Doe"
  function getNameFromTitle() {
    const name = normalizeText(document.title
      .replace(/^\(\d+\+?\)\s*/, '')
      .replace(/\s*\|\s*Facebook\s*$/i, ''));
    return name.toLowerCase() === 'facebook' ? '' : name;
  }

  // ===== Target lookup =====

  function findByName(name) {
    for (const selector of [NAME_SELECTOR, FALLBACK_NAME_SELECTOR]) {
      const found = Array.from(document.querySelectorAll(selector)).filter(function (el) {
        return getOwnText(el) === name && !el.closest(EXCLUDED_AREA_SELECTOR) && isVisible(el);
      });
      if (found.length) {
        return found;
      }
    }
    return [];
  }

  function findHomeTarget() {
    const viewer = getViewer();

    if (viewer && viewer.name) {
      const found = findByName(viewer.name);
      const inNavigation = found.find(function (el) {
        return el.closest('[role="navigation"]');
      });
      if (inNavigation || found[0]) {
        return inNavigation || found[0];
      }
      log('Home: no element with text "' + viewer.name + '"');
      return null;
    }

    return Array.from(document.querySelectorAll(NAME_SELECTOR)).find(function (span) {
      return getOwnText(span) && !span.closest(EXCLUDED_AREA_SELECTOR) && isVisible(span);
    }) || null;
  }

  function findProfileNameEl(name) {
    const found = findByName(name);
    const inHeading = found.find(function (el) {
      return el.closest('h1');
    });
    const inMain = found.find(function (el) {
      return el.closest('[role="main"]');
    });
    return inHeading || inMain || null;
  }

  // Scoped to [role="main"]: the banner also holds a hidden h1 such as "Chats"
  function findProfileHeading() {
    return Array.from(document.querySelectorAll('[role="main"] h1, [role="main"] h1 *')).find(function (el) {
      return getOwnText(el) && isVisible(el);
    }) || null;
  }

  function isOwnProfile(titleName) {
    const viewer = getViewer();
    if (!viewer) {
      return false;
    }
    const profileId = new URLSearchParams(location.search).get('id');
    return (profileId && profileId === viewer.id)
      || titleName === viewer.name
      || Boolean(findProfileNameEl(viewer.name));
  }

  function logProfileMiss() {
    const viewer = getViewer();
    const headings = Array.from(document.querySelectorAll('h1')).map(function (h1) {
      return '"' + normalizeText(h1.textContent).slice(0, 60) + '"' + (isVisible(h1) ? '' : ' (hidden)');
    });
    log('Profile: name not found'
      + ' | title = "' + document.title + '"'
      + ' | viewer = ' + (viewer ? '"' + viewer.name + '"' : '(unknown)')
      + ' | h1 = [' + headings.join(', ') + ']'
      + ' | ' + NAME_SELECTOR + ' = ' + document.querySelectorAll(NAME_SELECTOR).length);
  }

  // Facebook does not always update <title> on SPA navigation (it may stay "(1) Facebook"),
  // so several strategies are tried in order of reliability.
  function findProfileTarget() {
    const titleName = getNameFromTitle();
    const viewer = getViewer();

    if (ONLY_OWN_PROFILE && !isOwnProfile(titleName)) {
      log('Profile: not the signed-in user, skipped');
      return null;
    }

    const byTitle = titleName ? findProfileNameEl(titleName) : null;
    if (byTitle) {
      return byTitle;
    }

    const byViewer = viewer && viewer.name ? findProfileNameEl(viewer.name) : null;
    if (byViewer) {
      return byViewer;
    }

    const altName = document.querySelector(NAME_SELECTOR + ' > span.x1q74xe4.x1fcty0u');
    if (altName && getOwnText(altName.parentElement)) {
      return altName.parentElement;
    }

    const heading = findProfileHeading();
    if (heading) {
      return heading;
    }

    logProfileMiss();
    return null;
  }

  // ===== Badge =====

  function createEl(tag, attrs, children) {
    const isSvg = tag === 'svg' || tag === 'path' || tag === 'title';
    const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);

    for (const [name, value] of Object.entries(attrs || {})) {
      el.setAttribute(name, value);
    }
    for (const child of children || []) {
      el.append(child);
    }
    return el;
  }

  // Mirrors Facebook's own badge markup so it inherits the native styling.
  // Built with DOM APIs instead of innerHTML to stay compatible with Trusted Types.
  function createBadge(size) {
    const svg = createEl('svg', {
      'viewBox': '0 0 24 24',
      'width': String(size),
      'height': String(size),
      'fill': 'currentColor',
      'role': 'img',
      'title': BADGE_TITLE,
      'class': 'x14rh7hd x1lliihq x1tzjh5l x1k90msu x2h7rmj x1qfuztq',
      'style': '--x-color: var(--accent);'
    }, [
      createEl('title', {}, [BADGE_TITLE]),
      createEl('path', { 'd': BADGE_PATH })
    ]);

    return createEl('span', { [BADGE_ATTR]: '' }, [
      createEl('div', { 'class': 'x1rg5ohu' }, [
        createEl('span', { 'class': 'xjp7ctv' }, [
          createEl('div', { 'tabindex': '0' }, [
            createEl('span', { 'class': 'x3nfvp2 x11njtxf' }, [svg])
          ])
        ])
      ])
    ]);
  }

  // ===== Patching =====

  // React owns these text nodes: edit them in place rather than replacing the element.
  function patchName(el, size) {
    const name = getOwnText(el);
    const textNodes = Array.from(el.childNodes).filter(function (node) {
      return node.nodeType === Node.TEXT_NODE;
    });
    const nameNode = textNodes.find(function (node) {
      return normalizeText(node.data);
    });

    if (nameNode) {
      nameNode.data = name + NBSP;
      textNodes
        .filter(function (node) {
          return node !== nameNode;
        })
        .forEach(function (node) {
          node.data = '';
        });
    }

    el.insertBefore(createBadge(size), el.querySelector(ALT_NAME_SELECTOR));
    el.setAttribute(PATCHED_ATTR, '');
    log('Badge (' + size + 'px) added next to "' + name + '"');
  }

  // A React re-render can drop the badge while keeping the marked element
  function isAlreadyPatched() {
    const el = document.querySelector('[' + PATCHED_ATTR + ']');
    if (!el) {
      return false;
    }
    if (el.querySelector('[' + BADGE_ATTR + ']')) {
      return true;
    }
    el.removeAttribute(PATCHED_ATTR);
    return false;
  }

  function resetPatches() {
    document.querySelectorAll('[' + BADGE_ATTR + ']').forEach(function (badge) {
      badge.remove();
    });
    document.querySelectorAll('[' + PATCHED_ATTR + ']').forEach(function (el) {
      el.removeAttribute(PATCHED_ATTR);
    });
  }

  function run() {
    try {
      if (location.href !== appState.lastUrl) {
        appState.lastUrl = location.href;
        resetPatches();
      }

      const mode = detectMode();
      if (!mode) {
        log('Unsupported page: ' + location.pathname);
        return;
      }
      if (isAlreadyPatched()) {
        return;
      }

      const target = mode === 'home' ? findHomeTarget() : findProfileTarget();
      if (target) {
        patchName(target, BADGE_SIZE[mode]);
      }
    } catch (err) {
      console.error(LOG_PREFIX, err);
    }
  }

  // ===== Bootstrap =====

  function init() {
    log('Loaded on ' + location.href);
    run();
    appState.timerId = setInterval(run, RUN_INTERVAL_MS);
  }

  init();
})();
