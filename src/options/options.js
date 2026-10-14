/*!
 * Facebook Verified Badge — options page (also used as the toolbar popup)
 */
(function (FBVB) {
  'use strict';

  const TOAST_MS = 2200;
  const TEMPLATE_FILENAME = 'fbvb-language-template.json';
  // A native file picker closes the toolbar popup, so importing is done from the full options tab
  const IS_POPUP = new URLSearchParams(location.search).has('popup');

  const appState = {
    settings: FBVB.normalizeSettings(),
    languages: {},
    translate: FBVB.createTranslator('auto'),
    toastTimer: 0
  };

  const dom = {};

  // ===== DOM helpers =====

  function cacheDom() {
    dom.settingInputs = Array.from(document.querySelectorAll('[data-setting]'));
    dom.i18nNodes = Array.from(document.querySelectorAll('[data-i18n]'));
    dom.previewBadges = Array.from(document.querySelectorAll('[data-preview]'));
    dom.languageSelect = document.getElementById('languageSelect');
    dom.languageList = document.getElementById('languageList');
    dom.languageEmpty = document.getElementById('languageEmpty');
    dom.importButton = document.getElementById('importButton');
    dom.importInput = document.getElementById('importInput');
    dom.templateButton = document.getElementById('templateButton');
    dom.resetButton = document.getElementById('resetButton');
    dom.toast = document.getElementById('toast');
  }

  function cloneTemplate(id) {
    const template = document.getElementById(id);
    if (!template) {
      throw new Error('Missing template #' + id);
    }
    return template.content.firstElementChild.cloneNode(true);
  }

  function showToast(message, isError) {
    clearTimeout(appState.toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.toggle('is-error', Boolean(isError));
    dom.toast.classList.add('is-visible');
    appState.toastTimer = setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, TOAST_MS);
  }

  // ===== Rendering =====

  function applyTranslations() {
    const t = appState.translate;
    document.documentElement.lang = t.code;
    document.title = t('optionsTitle');
    dom.i18nNodes.forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
  }

  function renderControls() {
    dom.settingInputs.forEach(function (input) {
      const key = input.dataset.setting;
      const limit = FBVB.LIMITS[key];
      if (limit) {
        input.min = limit.min;
        input.max = limit.max;
      }
      if (input.type === 'checkbox') {
        input.checked = appState.settings[key];
      } else if (key !== 'language') {
        input.value = appState.settings[key];
      }
    });
  }

  function createOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }

  function renderLanguageSelect() {
    const t = appState.translate;
    const imported = appState.languages;
    const select = dom.languageSelect;

    select.replaceChildren(createOption('auto', t('languageAuto')));

    const builtInGroup = document.createElement('optgroup');
    builtInGroup.label = t('languageBuiltIn');
    Object.keys(FBVB.BUILTIN_LANGUAGES).forEach(function (code) {
      if (!imported[code]) {
        builtInGroup.append(createOption(code, FBVB.BUILTIN_LANGUAGES[code].name));
      }
    });
    select.append(builtInGroup);

    const importedCodes = Object.keys(imported);
    if (importedCodes.length) {
      const importedGroup = document.createElement('optgroup');
      importedGroup.label = t('languageImported');
      importedCodes.forEach(function (code) {
        importedGroup.append(createOption(code, imported[code].name + ' (' + code + ')'));
      });
      select.append(importedGroup);
    }

    const all = FBVB.getAllLanguages(imported);
    select.value = all[appState.settings.language] ? appState.settings.language : 'auto';
  }

  function renderLanguageList() {
    const t = appState.translate;
    const codes = Object.keys(appState.languages);

    dom.languageList.replaceChildren();
    codes.forEach(function (code) {
      const item = cloneTemplate('tplLanguageItem');
      item.querySelector('.language-name').textContent = appState.languages[code].name;
      item.querySelector('.language-code').textContent = code;
      const remove = item.querySelector('.language-remove');
      remove.textContent = t('removeLanguage');
      remove.dataset.code = code;
      dom.languageList.append(item);
    });
    dom.languageEmpty.hidden = codes.length > 0;
  }

  function renderPreview() {
    dom.previewBadges.forEach(function (holder) {
      const size = appState.settings[holder.dataset.preview];
      const svg = holder.firstElementChild || holder.appendChild(cloneTemplate('tplBadge'));
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
    });
  }

  function render() {
    appState.translate = FBVB.createTranslator(appState.settings.language, appState.languages);
    applyTranslations();
    renderControls();
    renderLanguageSelect();
    renderLanguageList();
    renderPreview();
  }

  // ===== Actions =====

  async function updateSetting(key, value) {
    const previousLanguage = appState.settings.language;
    appState.settings = await FBVB.saveSettings(Object.assign({}, appState.settings, { [key]: value }));

    if (appState.settings.language !== previousLanguage) {
      render();
    } else {
      renderControls();
      renderPreview();
    }
    showToast(appState.translate('saved'));
  }

  function readInputValue(input) {
    if (input.type === 'checkbox') {
      return input.checked;
    }
    if (input.type === 'number') {
      return Number(input.value);
    }
    return input.value;
  }

  async function importLanguage(file) {
    const t = appState.translate;
    try {
      const language = FBVB.parseLanguageFile(await file.text());
      appState.languages[language.code] = {
        name: language.name,
        messages: language.messages
      };
      await FBVB.saveImportedLanguages(appState.languages);
      render();
      showToast(t('importSuccess', { name: language.name }));
    } catch (err) {
      showToast(t('importError', { reason: err.message }), true);
    }
  }

  async function removeLanguage(code) {
    const language = appState.languages[code];
    if (!language || !confirm(appState.translate('removeConfirm', { name: language.name }))) {
      return;
    }

    delete appState.languages[code];
    await FBVB.saveImportedLanguages(appState.languages);

    const all = FBVB.getAllLanguages(appState.languages);
    if (!all[appState.settings.language] && appState.settings.language !== 'auto') {
      appState.settings = await FBVB.saveSettings(Object.assign({}, appState.settings, { language: 'auto' }));
    }
    render();
  }

  function downloadTemplate() {
    const json = JSON.stringify(FBVB.createLanguageTemplate(), null, 2) + '\n';
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = TEMPLATE_FILENAME;
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function resetDefaults() {
    if (!confirm(appState.translate('resetConfirm'))) {
      return;
    }
    appState.settings = await FBVB.saveSettings(FBVB.DEFAULT_SETTINGS);
    render();
    showToast(appState.translate('saved'));
  }

  // ===== Events =====

  function bindEvents() {
    dom.settingInputs.forEach(function (input) {
      // Numbers save on commit (blur / Enter) so typing "1" on the way to "16" is not clamped
      input.addEventListener('change', function () {
        updateSetting(input.dataset.setting, readInputValue(input));
      });
    });

    dom.importButton.addEventListener('click', function () {
      if (IS_POPUP) {
        chrome.runtime.openOptionsPage();
        window.close();
        return;
      }
      dom.importInput.click();
    });

    dom.importInput.addEventListener('change', function () {
      const file = dom.importInput.files[0];
      dom.importInput.value = '';
      if (file) {
        importLanguage(file);
      }
    });

    dom.languageList.addEventListener('click', function (event) {
      const button = event.target.closest('.language-remove');
      if (button) {
        removeLanguage(button.dataset.code);
      }
    });

    dom.templateButton.addEventListener('click', downloadTemplate);
    dom.resetButton.addEventListener('click', resetDefaults);
  }

  // ===== Bootstrap =====

  async function init() {
    cacheDom();
    document.body.classList.toggle('is-popup', IS_POPUP);

    const [settings, languages] = await Promise.all([
      FBVB.loadSettings(),
      FBVB.loadImportedLanguages()
    ]);
    appState.settings = settings;
    appState.languages = languages;

    render();
    bindEvents();
  }

  init();
})(globalThis.FBVB);
