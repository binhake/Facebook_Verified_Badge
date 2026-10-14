/*!
 * Verified Badge for Facebook — shared settings & i18n
 * Loaded by both the content script and the options page; exposes globalThis.FBVB.
 */
(function (root) {
  'use strict';

  const SETTINGS_KEY = 'settings';
  const LANGUAGES_KEY = 'languages';
  const FALLBACK_LANGUAGE = 'en';
  const LANGUAGE_CODE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

  const ROOT_DOMAIN = 'facebook.com';
  const RULE_MODES = ['auto', 'profile', 'home', 'off'];
  const MAX_URL_RULES = 30;
  const MAX_PATTERN_LENGTH = 200;

  // Always active, cannot be edited, removed or added again
  const DEFAULT_URL_RULES = Object.freeze([
    Object.freeze({ pattern: 'www.facebook.com/*', mode: 'auto', locked: true }),
    Object.freeze({ pattern: 'web.facebook.com/*', mode: 'auto', locked: true })
  ]);

  // Single path segment that is not a profile
  const RESERVED_PATHS = new Set([
    'home.php', 'groups', 'watch', 'marketplace', 'gaming', 'events', 'pages', 'friends',
    'messages', 'notifications', 'bookmarks', 'saved', 'reel', 'reels', 'stories', 'search',
    'settings', 'login', 'hashtag', 'memories', 'fundraisers', 'videos', 'live', 'photos',
    'privacy', 'policies', 'help', 'business', 'feeds', 'news', 'onthisday', 'games'
  ]);
  const USERNAME_RE = /^[A-Za-z0-9.]{5,50}$/;

  const DEFAULT_SETTINGS = {
    enabled: true,
    onlyOwnProfile: true,
    debug: false,
    language: 'auto',
    intervalMs: 1000,
    badgeSizeHome: 12,
    badgeSizeProfile: 24,
    homeEnabled: true,
    profileEnabled: true,
    urlRules: []
  };

  const LIMITS = {
    intervalMs: { min: 250, max: 10000 },
    badgeSizeHome: { min: 8, max: 48 },
    badgeSizeProfile: { min: 8, max: 64 }
  };

  const BUILTIN_LANGUAGES = {
    en: {
      name: 'English',
      messages: {
        badgeTitle: 'Verified account',
        optionsTitle: 'Verified Badge for Facebook',
        optionsSubtitle: 'Cosmetic badge, visible only in your browser.',
        sectionGeneral: 'General',
        enabledLabel: 'Enable badge',
        enabledHint: 'Turn off to remove the badge without uninstalling.',
        onlyOwnProfileLabel: 'Only on my own profile',
        onlyOwnProfileHint: 'When off, the badge appears on every profile you open.',
        debugLabel: 'Debug logging',
        debugHint: 'Print [FBVB] logs in the DevTools console.',
        sectionAppearance: 'Badge & timing',
        badgeSizeHomeLabel: 'Home badge size (px)',
        badgeSizeProfileLabel: 'Profile badge size (px)',
        intervalLabel: 'Re-check interval (ms)',
        intervalHint: 'Lower shows the badge faster after navigation; higher uses less CPU.',
        sectionLanguage: 'Language',
        languageLabel: 'Display language',
        languageAuto: 'Automatic (browser language)',
        languageBuiltIn: 'Built-in',
        languageImported: 'Imported',
        importLanguage: 'Import language file',
        exportTemplate: 'Download template',
        importHint: 'Download the template, translate the values, then import the .json file.',
        removeLanguage: 'Remove',
        noImportedLanguages: 'No imported languages yet.',
        importSuccess: 'Imported language: {name}',
        importError: 'Invalid language file: {reason}',
        removeConfirm: 'Remove language "{name}"?',
        sectionPages: 'Pages',
        homeEnabledLabel: 'Home page',
        homeEnabledHint: 'Badge next to your name in the left sidebar.',
        profileEnabledLabel: 'Profile pages',
        profileEnabledHint: 'facebook.com/username and profile.php?id=…',
        urlRulesLabel: 'URLs',
        urlRulesHint: 'Add any URL on facebook.com. Use * as a wildcard in the path, e.g. www.facebook.com/username/*. Your URLs are checked before the defaults.',
        rulePlaceholder: 'www.facebook.com/username/*',
        ruleDefaultTag: 'Default',
        ruleModeAuto: 'Automatic',
        ruleModeProfile: 'Profile',
        ruleModeHome: 'Home',
        ruleModeOff: 'Off',
        addRule: 'Add',
        ruleAdded: 'Added {pattern}',
        ruleErrorEmpty: 'Enter a URL.',
        ruleErrorInvalid: 'Not a valid URL.',
        ruleErrorDomain: 'Only URLs on facebook.com are allowed.',
        ruleErrorDuplicate: '{pattern} is already in the list.',
        ruleErrorLimit: 'You can add up to {max} URLs.',
        testUrlLabel: 'Test a URL',
        testUrlPlaceholder: 'https://www.facebook.com/username',
        testModeHome: 'Badge in the home sidebar',
        testModeProfile: 'Badge in the profile header',
        testModeNone: 'No badge',
        testReasonBuiltin: 'automatic detection via {pattern}',
        testReasonRule: 'forced by {pattern}',
        testReasonOff: 'disabled by {pattern}',
        testReasonTypeOff: 'this page type is turned off',
        testReasonUnsupported: 'not a home or profile page',
        testReasonNoRule: 'URL is not in the list',
        testReasonDisabled: 'the badge is turned off',
        testReasonInvalid: 'not a valid URL',
        resetDefaults: 'Reset to defaults',
        resetConfirm: 'Reset all settings to their defaults?',
        saved: 'Saved',
        footerNote: 'Changes apply to open Facebook tabs immediately.'
      }
    },
    vi: {
      name: 'Tiếng Việt',
      messages: {
        badgeTitle: 'Tài khoản đã xác minh',
        optionsTitle: 'Verified Badge for Facebook',
        optionsSubtitle: 'Hiển thị huy hiệu đã xác minh bên cạnh tên Facebook của bạn',
        sectionGeneral: 'Chung',
        enabledLabel: 'Bật huy hiệu',
        enabledHint: 'Tắt để gỡ huy hiệu mà không cần gỡ extension.',
        onlyOwnProfileLabel: 'Chỉ trên trang cá nhân của tôi',
        onlyOwnProfileHint: 'Khi tắt, huy hiệu hiện trên mọi trang cá nhân bạn mở.',
        debugLabel: 'Ghi log gỡ lỗi',
        debugHint: 'In log [FBVB] ra Console của DevTools.',
        sectionAppearance: 'Huy hiệu & thời gian',
        badgeSizeHomeLabel: 'Cỡ huy hiệu trang chủ (px)',
        badgeSizeProfileLabel: 'Cỡ huy hiệu trang cá nhân (px)',
        intervalLabel: 'Chu kỳ kiểm tra (ms)',
        intervalHint: 'Nhỏ hơn thì huy hiệu hiện nhanh hơn khi chuyển trang; lớn hơn thì nhẹ máy hơn.',
        sectionLanguage: 'Ngôn ngữ',
        languageLabel: 'Ngôn ngữ hiển thị',
        languageAuto: 'Tự động (theo trình duyệt)',
        languageBuiltIn: 'Có sẵn',
        languageImported: 'Đã import',
        importLanguage: 'Import file ngôn ngữ',
        exportTemplate: 'Tải file mẫu',
        importHint: 'Tải file mẫu, dịch phần giá trị rồi import lại file .json.',
        removeLanguage: 'Xoá',
        noImportedLanguages: 'Chưa import ngôn ngữ nào.',
        importSuccess: 'Đã import ngôn ngữ: {name}',
        importError: 'File ngôn ngữ không hợp lệ: {reason}',
        removeConfirm: 'Xoá ngôn ngữ "{name}"?',
        sectionPages: 'Trang hoạt động',
        homeEnabledLabel: 'Trang chủ',
        homeEnabledHint: 'Huy hiệu cạnh tên bạn ở cột trái.',
        profileEnabledLabel: 'Trang cá nhân',
        profileEnabledHint: 'facebook.com/username và profile.php?id=…',
        urlRulesLabel: 'Danh sách URL',
        urlRulesHint: 'Thêm URL bất kỳ thuộc facebook.com. Dùng * làm ký tự đại diện trong đường dẫn, vd www.facebook.com/username/*. URL của bạn được xét trước URL mặc định.',
        rulePlaceholder: 'www.facebook.com/username/*',
        ruleDefaultTag: 'Mặc định',
        ruleModeAuto: 'Tự động',
        ruleModeProfile: 'Trang cá nhân',
        ruleModeHome: 'Trang chủ',
        ruleModeOff: 'Tắt',
        addRule: 'Thêm',
        ruleAdded: 'Đã thêm {pattern}',
        ruleErrorEmpty: 'Hãy nhập URL.',
        ruleErrorInvalid: 'URL không hợp lệ.',
        ruleErrorDomain: 'Chỉ chấp nhận URL thuộc facebook.com.',
        ruleErrorDuplicate: '{pattern} đã có trong danh sách.',
        ruleErrorLimit: 'Chỉ thêm được tối đa {max} URL.',
        testUrlLabel: 'Thử một URL',
        testUrlPlaceholder: 'https://www.facebook.com/username',
        testModeHome: 'Gắn huy hiệu ở cột trái trang chủ',
        testModeProfile: 'Gắn huy hiệu ở header trang cá nhân',
        testModeNone: 'Không gắn huy hiệu',
        testReasonBuiltin: 'nhận dạng tự động qua {pattern}',
        testReasonRule: 'bắt buộc bởi {pattern}',
        testReasonOff: 'bị tắt bởi {pattern}',
        testReasonTypeOff: 'loại trang này đang tắt',
        testReasonUnsupported: 'không phải trang chủ hay trang cá nhân',
        testReasonNoRule: 'URL không có trong danh sách',
        testReasonDisabled: 'huy hiệu đang tắt',
        testReasonInvalid: 'URL không hợp lệ',
        resetDefaults: 'Khôi phục mặc định',
        resetConfirm: 'Đưa mọi tuỳ chọn về mặc định?',
        saved: 'Đã lưu',
        footerNote: 'Thay đổi được áp dụng ngay cho các tab Facebook đang mở.'
      }
    }
  };

  // ===== Storage =====

  function hasStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  }

  function clamp(value, key) {
    const number = Math.round(Number(value));
    const limit = LIMITS[key];
    if (!Number.isFinite(number)) {
      return DEFAULT_SETTINGS[key];
    }
    return Math.min(limit.max, Math.max(limit.min, number));
  }

  function normalizeSettings(raw) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, raw || {});
    for (const key of Object.keys(LIMITS)) {
      settings[key] = clamp(settings[key], key);
    }
    settings.enabled = Boolean(settings.enabled);
    settings.onlyOwnProfile = Boolean(settings.onlyOwnProfile);
    settings.debug = Boolean(settings.debug);
    settings.homeEnabled = Boolean(settings.homeEnabled);
    settings.profileEnabled = Boolean(settings.profileEnabled);
    settings.language = typeof settings.language === 'string' ? settings.language : 'auto';
    settings.urlRules = normalizeUrlRules(settings.urlRules);
    return settings;
  }

  async function loadSettings() {
    if (!hasStorage()) {
      return normalizeSettings();
    }
    const data = await chrome.storage.sync.get(SETTINGS_KEY);
    return normalizeSettings(data[SETTINGS_KEY]);
  }

  async function saveSettings(settings) {
    const normalized = normalizeSettings(settings);
    await chrome.storage.sync.set({ [SETTINGS_KEY]: normalized });
    return normalized;
  }

  // Imported languages can be large, so they live in storage.local (sync has an 8 KB/item quota)
  async function loadImportedLanguages() {
    if (!hasStorage()) {
      return {};
    }
    const data = await chrome.storage.local.get(LANGUAGES_KEY);
    return data[LANGUAGES_KEY] || {};
  }

  async function saveImportedLanguages(languages) {
    await chrome.storage.local.set({ [LANGUAGES_KEY]: languages });
  }

  // ===== Languages =====

  function getAllLanguages(imported) {
    return Object.assign({}, BUILTIN_LANGUAGES, imported || {});
  }

  function getBrowserLanguage() {
    try {
      return chrome.i18n.getUILanguage();
    } catch (err) {
      return navigator.language || FALLBACK_LANGUAGE;
    }
  }

  // "vi-VN" -> "vi-VN" if available, else "vi", else English
  function resolveLanguageCode(setting, languages) {
    const wanted = setting === 'auto' ? getBrowserLanguage() : setting;
    if (languages[wanted]) {
      return wanted;
    }
    const base = String(wanted).split(/[-_]/)[0].toLowerCase();
    return languages[base] ? base : FALLBACK_LANGUAGE;
  }

  function createTranslator(setting, imported) {
    const languages = getAllLanguages(imported);
    const code = resolveLanguageCode(setting, languages);
    const messages = languages[code].messages;
    const fallback = BUILTIN_LANGUAGES[FALLBACK_LANGUAGE].messages;

    function translate(key, params) {
      const template = messages[key] || fallback[key] || key;
      return template.replace(/\{(\w+)\}/g, function (match, name) {
        return params && name in params ? String(params[name]) : match;
      });
    }

    translate.code = code;
    return translate;
  }

  // Accepts { code, name, messages } — the same shape the template export produces
  function parseLanguageFile(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('not valid JSON');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('expected a JSON object');
    }
    if (typeof data.code !== 'string' || !LANGUAGE_CODE_RE.test(data.code)) {
      throw new Error('"code" must look like "fr" or "pt-BR"');
    }
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error('"name" is required');
    }
    if (!data.messages || typeof data.messages !== 'object') {
      throw new Error('"messages" object is required');
    }

    const knownKeys = Object.keys(BUILTIN_LANGUAGES[FALLBACK_LANGUAGE].messages);
    const messages = {};
    for (const key of knownKeys) {
      if (typeof data.messages[key] === 'string' && data.messages[key].trim()) {
        messages[key] = data.messages[key];
      }
    }
    if (!Object.keys(messages).length) {
      throw new Error('no known message keys found');
    }

    return {
      code: data.code,
      name: data.name.trim().slice(0, 60),
      messages: messages
    };
  }

  function createLanguageTemplate() {
    return {
      code: 'xx',
      name: 'Language name',
      messages: Object.assign({}, BUILTIN_LANGUAGES[FALLBACK_LANGUAGE].messages)
    };
  }

  // ===== URL rules =====

  function createRuleError(code, params) {
    const err = new Error(code);
    err.code = code;
    err.params = params || {};
    return err;
  }

  function isFacebookHost(host) {
    return host === ROOT_DOMAIN || host.endsWith('.' + ROOT_DOMAIN);
  }

  function parseUrl(input) {
    let text = String(input || '').trim();
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
      text = 'https://' + text;
    }
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new TypeError('Unsupported protocol');
    }
    return url;
  }

  // "https://WWW.facebook.com/binhake/" -> "www.facebook.com/binhake", bare host -> "host/*"
  function normalizeUrlPattern(input) {
    if (!String(input || '').trim()) {
      throw createRuleError('ruleErrorEmpty');
    }

    let url;
    try {
      url = parseUrl(input);
    } catch (err) {
      throw createRuleError('ruleErrorInvalid');
    }

    const host = url.hostname.toLowerCase();
    if (!isFacebookHost(host)) {
      throw createRuleError('ruleErrorDomain');
    }

    const path = url.pathname.replace(/\/+$/, '') || '/*';
    const pattern = host + path;
    if (pattern.length > MAX_PATTERN_LENGTH) {
      throw createRuleError('ruleErrorInvalid');
    }
    return pattern;
  }

  // Validates a pattern against the defaults and the other user rules (skipIndex = the rule being edited)
  function validateUrlRule(input, rules, skipIndex) {
    const pattern = normalizeUrlPattern(input);
    const taken = DEFAULT_URL_RULES.concat(rules).some(function (rule, index) {
      const ruleIndex = index - DEFAULT_URL_RULES.length;
      return ruleIndex !== skipIndex && rule.pattern === pattern;
    });

    if (taken) {
      throw createRuleError('ruleErrorDuplicate', { pattern: pattern });
    }
    if (skipIndex === undefined && rules.length >= MAX_URL_RULES) {
      throw createRuleError('ruleErrorLimit', { max: MAX_URL_RULES });
    }
    return pattern;
  }

  function normalizeUrlRules(raw) {
    const rules = [];
    for (const item of Array.isArray(raw) ? raw : []) {
      if (!item || rules.length >= MAX_URL_RULES) {
        continue;
      }
      try {
        rules.push({
          pattern: validateUrlRule(item.pattern, rules, -1),
          mode: RULE_MODES.indexOf(item.mode) === -1 ? 'auto' : item.mode
        });
      } catch (err) {
        // Invalid or duplicate rules from older data are dropped silently
      }
    }
    return rules;
  }

  function patternToRegExp(pathPattern) {
    const source = pathPattern
      .split('*')
      .map(function (part) {
        return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('.*');
    return new RegExp('^' + source + '$', 'i');
  }

  function matchUrlRule(rule, url) {
    const slash = rule.pattern.indexOf('/');
    const host = rule.pattern.slice(0, slash);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return url.hostname.toLowerCase() === host && patternToRegExp(rule.pattern.slice(slash)).test(path);
  }

  function detectBuiltinMode(url) {
    const path = url.pathname.replace(/\/+$/, '');

    if (path === '' || path === '/home.php') {
      return 'home';
    }

    if (path === '/profile.php') {
      return new URLSearchParams(url.search).get('id') ? 'profile' : null;
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

  // User rules first (top to bottom), then the locked defaults.
  // Returns { mode: 'home' | 'profile' | null, reason, rule }
  function resolvePageMode(url, settings) {
    if (!settings.enabled) {
      return { mode: null, reason: 'disabled', rule: null };
    }

    const rules = settings.urlRules.concat(DEFAULT_URL_RULES);
    for (const rule of rules) {
      if (!matchUrlRule(rule, url)) {
        continue;
      }
      if (rule.mode === 'off') {
        return { mode: null, reason: 'off', rule: rule };
      }
      if (rule.mode !== 'auto') {
        return { mode: rule.mode, reason: 'rule', rule: rule };
      }

      const mode = detectBuiltinMode(url);
      if (!mode) {
        return { mode: null, reason: 'unsupported', rule: rule };
      }
      if ((mode === 'home' && !settings.homeEnabled) || (mode === 'profile' && !settings.profileEnabled)) {
        return { mode: null, reason: 'typeOff', rule: rule };
      }
      return { mode: mode, reason: 'builtin', rule: rule };
    }

    return { mode: null, reason: 'noRule', rule: null };
  }

  root.FBVB = {
    SETTINGS_KEY: SETTINGS_KEY,
    LANGUAGES_KEY: LANGUAGES_KEY,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    DEFAULT_URL_RULES: DEFAULT_URL_RULES,
    RULE_MODES: RULE_MODES,
    LIMITS: LIMITS,
    BUILTIN_LANGUAGES: BUILTIN_LANGUAGES,
    normalizeSettings: normalizeSettings,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadImportedLanguages: loadImportedLanguages,
    saveImportedLanguages: saveImportedLanguages,
    getAllLanguages: getAllLanguages,
    createTranslator: createTranslator,
    parseLanguageFile: parseLanguageFile,
    createLanguageTemplate: createLanguageTemplate,
    parseUrl: parseUrl,
    validateUrlRule: validateUrlRule,
    resolvePageMode: resolvePageMode
  };
})(globalThis);
