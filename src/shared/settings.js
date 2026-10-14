/*!
 * Facebook Verified Badge — shared settings & i18n
 * Loaded by both the content script and the options page; exposes globalThis.FBVB.
 */
(function (root) {
  'use strict';

  const SETTINGS_KEY = 'settings';
  const LANGUAGES_KEY = 'languages';
  const FALLBACK_LANGUAGE = 'en';
  const LANGUAGE_CODE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

  const DEFAULT_SETTINGS = {
    enabled: true,
    onlyOwnProfile: false,
    debug: false,
    language: 'auto',
    intervalMs: 1000,
    badgeSizeHome: 12,
    badgeSizeProfile: 24
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
        optionsTitle: 'Facebook Verified Badge',
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
        optionsTitle: 'Facebook Verified Badge',
        optionsSubtitle: 'Huy hiệu trang trí, chỉ hiển thị trên trình duyệt của bạn.',
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
    settings.language = typeof settings.language === 'string' ? settings.language : 'auto';
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

  root.FBVB = {
    SETTINGS_KEY: SETTINGS_KEY,
    LANGUAGES_KEY: LANGUAGES_KEY,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
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
    createLanguageTemplate: createLanguageTemplate
  };
})(globalThis);
