// vision：能否读图，与 content.js 的 PROVIDERS 保持一致（DeepSeek 托管 API 不支持）。
const META = {
  deepseek: { name: 'DeepSeek', keys: 'https://platform.deepseek.com/api_keys',      url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash', vision: false },
  openai:   { name: 'OpenAI',   keys: 'https://platform.openai.com/api-keys',        url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5-mini', vision: true },
  grok:     { name: 'Grok',     keys: 'https://console.x.ai',                        url: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.3', vision: true },
  claude:   { name: 'Claude',   keys: 'https://console.anthropic.com/settings/keys', url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5', vision: true },
  gemini:   { name: 'Gemini',   keys: 'https://aistudio.google.com/app/apikey',       url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-3.5-flash-lite', vision: true },
  openrouter: { name: 'OpenRouter', keys: 'https://openrouter.ai/settings/keys',       url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openrouter/auto', vision: true },
};

function t(key, ...values) {
  return (chrome.i18n.getMessage(key) || key).replace(/\{(\d+)\}/g, (_, index) => values[index] ?? '');
}

document.documentElement.lang = chrome.i18n.getUILanguage();
document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel)); });
document.querySelectorAll('[data-i18n-title]').forEach((node) => { node.title = t(node.dataset.i18nTitle); });

const providerSel = document.getElementById('provider');
const providerButton = document.getElementById('providerButton');
const providerValue = document.getElementById('providerValue');
const providerMenu = document.getElementById('providerMenu');
const providerOptions = [...document.querySelectorAll('.provider-option')];
const styleOptions = [...document.querySelectorAll('.style-option')];
const keyInput = document.getElementById('key');
const keyLink = document.getElementById('keyLink');
const keyToggle = document.getElementById('keyToggle');
const testConnection = document.getElementById('testConnection');
const testLabel = document.getElementById('testLabel');
const modelInput = document.getElementById('model');
const voiceInput = document.getElementById('voice');
const visionSwitch = document.getElementById('visionSwitch');
const visionSub = document.getElementById('visionSub');
const status = document.getElementById('status');

let apiKeys = {};
let modelOverride = {};
let readImages = false;
let replyStyle = 'adaptive';
let activeProvider = 'deepseek';

chrome.storage.local.get(['provider', 'apiKeys', 'modelOverride', 'readImages', 'replyStyle', 'voiceProfile'], (r) => {
  apiKeys = r.apiKeys || {};
  modelOverride = r.modelOverride || {};
  readImages = !!r.readImages;
  replyStyle = r.replyStyle || 'adaptive';
  voiceInput.value = r.voiceProfile || '';
  providerSel.value = r.provider || 'deepseek';
  activeProvider = providerSel.value;
  render();
});

function render() {
  const p = providerSel.value;
  const m = META[p];
  providerValue.textContent = m.name;
  providerOptions.forEach((option) => option.setAttribute('aria-selected', String(option.dataset.value === p)));
  styleOptions.forEach((option) => option.setAttribute('aria-checked', String(option.dataset.style === replyStyle)));
  keyInput.value = apiKeys[p] || '';
  keyLink.href = m.keys;
  keyLink.textContent = t('getProviderKey', m.name);
  modelInput.value = modelOverride[p] || '';
  modelInput.placeholder = t('defaultModel', m.model);
  testLabel.textContent = t('testConnection');

  // 当前模型不支持读图 → 禁用开关并说明
  if (m.vision) {
    visionSwitch.disabled = false;
    visionSub.textContent = t(modelInput.value.trim() ? 'visionCustomModel' : 'visionModelEnabled');
  } else {
    visionSwitch.disabled = true;
    visionSub.textContent = t('visionUnsupported', m.name);
  }
  visionSwitch.setAttribute('aria-checked', String(m.vision && readImages));
}

modelInput.addEventListener('input', () => {
  if (META[providerSel.value].vision) {
    visionSub.textContent = t(modelInput.value.trim() ? 'visionCustomModel' : 'visionModelEnabled');
  }
  saveSettings();
});

function changeProvider(provider) {
  apiKeys[activeProvider] = keyInput.value.trim();
  modelOverride[activeProvider] = modelInput.value.trim();
  providerSel.value = provider;
  activeProvider = provider;
  render();
  setMenuOpen(false);
  saveSettings();
}

function setMenuOpen(open) {
  providerMenu.hidden = !open;
  providerButton.setAttribute('aria-expanded', String(open));
}

providerSel.addEventListener('change', () => changeProvider(providerSel.value));
providerButton.addEventListener('click', () => setMenuOpen(providerMenu.hidden));
providerOptions.forEach((option) => option.addEventListener('click', () => {
  changeProvider(option.dataset.value);
  providerButton.focus();
}));
document.addEventListener('click', (event) => {
  if (!providerMenu.hidden && !providerButton.contains(event.target) && !providerMenu.contains(event.target)) setMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !providerMenu.hidden) {
    setMenuOpen(false);
    providerButton.focus();
  }
});

styleOptions.forEach((option) => option.addEventListener('click', () => {
  replyStyle = option.dataset.style;
  styleOptions.forEach((item) => item.setAttribute('aria-checked', String(item === option)));
  saveSettings();
}));

keyInput.addEventListener('input', saveSettings);
voiceInput.addEventListener('input', saveSettings);

keyToggle.addEventListener('click', () => {
  const show = keyInput.type === 'password';
  keyInput.type = show ? 'text' : 'password';
  keyToggle.setAttribute('aria-pressed', String(show));
  keyToggle.setAttribute('aria-label', t(show ? 'hideKey' : 'showKey'));
  keyToggle.title = t(show ? 'hideKey' : 'showKey');
});

visionSwitch.addEventListener('click', () => {
  if (visionSwitch.disabled) return;
  readImages = !readImages;
  visionSwitch.setAttribute('aria-checked', String(readImages));
  saveSettings();
});

testConnection.addEventListener('click', async () => {
  const provider = providerSel.value;
  const cfg = META[provider];
  const key = keyInput.value.trim();
  const model = modelInput.value.trim() || cfg.model;
  if (!key) { testLabel.textContent = t('keyRequired'); return; }
  saveSettings();

  testConnection.disabled = true;
  testLabel.textContent = t('testing');
  try {
    const isClaude = provider === 'claude';
    const body = isClaude
      ? { model, max_tokens: 16, thinking: { type: 'disabled' }, messages: [{ role: 'user', content: 'Reply OK' }] }
      : { model, messages: [{ role: 'user', content: 'Reply OK' }], ...(provider === 'openai' ? { max_completion_tokens: 64 } : { max_tokens: 16 }) };
    if (provider === 'openai' && model === cfg.model) body.reasoning_effort = 'minimal';
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: isClaude
        ? { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await readApiError(res));
    testLabel.textContent = t('connectionOk');
    testConnection.title = '';
  } catch (error) {
    testLabel.textContent = t('connectionFailed', error.message.slice(0, 36));
    testConnection.title = error.message;
  } finally {
    testConnection.disabled = false;
  }
});

async function readApiError(response) {
  const raw = await response.text();
  try {
    const data = JSON.parse(raw);
    return data.error?.message || data.message || `HTTP ${response.status}`;
  } catch {
    return raw.slice(0, 80) || `HTTP ${response.status}`;
  }
}

function saveSettings() {
  const p = providerSel.value;
  apiKeys[p] = keyInput.value.trim();
  modelOverride[p] = modelInput.value.trim();
  const voiceProfile = voiceInput.value.trim().slice(0, 1000);
  chrome.storage.local.set({ provider: p, apiKeys, modelOverride, readImages, replyStyle, voiceProfile }, () => {
    status.textContent = t(chrome.runtime.lastError ? 'saveFailed' : 'saved');
  });
}

document.getElementById('settings').addEventListener('submit', (event) => {
  event.preventDefault();
  saveSettings();
});
