// vision：能否读图，与 content.js 的 PROVIDERS 保持一致（DeepSeek 托管 API 不支持）。
const META = {
  deepseek: { name: 'DeepSeek', keys: 'https://platform.deepseek.com/api_keys',      url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash', vision: false },
  openai:   { name: 'OpenAI',   keys: 'https://platform.openai.com/api-keys',        url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5-mini', vision: true },
  grok:     { name: 'Grok',     keys: 'https://console.x.ai',                        url: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.3', vision: true },
  claude:   { name: 'Claude',   keys: 'https://console.anthropic.com/settings/keys', url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5', vision: true },
};

const providerSel = document.getElementById('provider');
const providerButton = document.getElementById('providerButton');
const providerValue = document.getElementById('providerValue');
const providerMenu = document.getElementById('providerMenu');
const providerOptions = [...document.querySelectorAll('.provider-option')];
const styleOptions = [...document.querySelectorAll('.style-option')];
const keyInput = document.getElementById('key');
const keyLabel = document.getElementById('keyLabel');
const keyLink = document.getElementById('keyLink');
const keyToggle = document.getElementById('keyToggle');
const testConnection = document.getElementById('testConnection');
const testLabel = document.getElementById('testLabel');
const modelInput = document.getElementById('model');
const visionSwitch = document.getElementById('visionSwitch');
const visionSub = document.getElementById('visionSub');
const save = document.getElementById('save');
const saveLabel = document.getElementById('saveLabel');
const status = document.getElementById('status');

let apiKeys = {};
let modelOverride = {};
let readImages = false;
let replyStyle = 'adaptive';
let activeProvider = 'deepseek';
let feedbackTimer;

chrome.storage.local.get(['provider', 'apiKeys', 'modelOverride', 'readImages', 'replyStyle'], (r) => {
  apiKeys = r.apiKeys || {};
  modelOverride = r.modelOverride || {};
  readImages = !!r.readImages;
  replyStyle = r.replyStyle || 'adaptive';
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
  keyLabel.textContent = m.name + ' API Key';
  keyInput.value = apiKeys[p] || '';
  keyLink.href = m.keys;
  keyLink.textContent = `获取 ${m.name} Key →`;
  modelInput.value = modelOverride[p] || '';
  modelInput.placeholder = `默认 ${m.model}`;
  testLabel.textContent = '测试连接';

  // 当前模型不支持读图 → 禁用开关并说明
  if (m.vision) {
    visionSwitch.disabled = false;
    visionSub.textContent = modelInput.value.trim() ? '请确认自定义模型支持图片' : '让模型看懂配图再回';
  } else {
    visionSwitch.disabled = true;
    visionSub.textContent = `${m.name} 暂不支持读图`;
  }
  visionSwitch.setAttribute('aria-checked', String(m.vision && readImages));
}

modelInput.addEventListener('input', () => {
  if (META[providerSel.value].vision) {
    visionSub.textContent = modelInput.value.trim() ? '请确认自定义模型支持图片' : '让模型看懂配图再回';
  }
});

function changeProvider(provider) {
  apiKeys[activeProvider] = keyInput.value.trim();
  modelOverride[activeProvider] = modelInput.value.trim();
  providerSel.value = provider;
  activeProvider = provider;
  render();
  setMenuOpen(false);
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
}));

keyToggle.addEventListener('click', () => {
  const show = keyInput.type === 'password';
  keyInput.type = show ? 'text' : 'password';
  keyToggle.setAttribute('aria-pressed', String(show));
  keyToggle.setAttribute('aria-label', show ? '隐藏 API Key' : '显示 API Key');
  keyToggle.title = show ? '隐藏 API Key' : '显示 API Key';
});

visionSwitch.addEventListener('click', () => {
  if (visionSwitch.disabled) return;
  readImages = !readImages;
  visionSwitch.setAttribute('aria-checked', String(readImages));
});

testConnection.addEventListener('click', async () => {
  const provider = providerSel.value;
  const cfg = META[provider];
  const key = keyInput.value.trim();
  const model = modelInput.value.trim() || cfg.model;
  if (!key) { testLabel.textContent = '请先填写 Key'; return; }

  testConnection.disabled = true;
  testLabel.textContent = '测试中…';
  try {
    const isClaude = provider === 'claude';
    const body = isClaude
      ? { model, max_tokens: 1, thinking: { type: 'disabled' }, messages: [{ role: 'user', content: 'Hi' }] }
      : { model, messages: [{ role: 'user', content: 'Hi' }], ...(provider === 'openai' ? { max_completion_tokens: 1 } : { max_tokens: 1 }) };
    if (provider === 'openai' && model === cfg.model) body.reasoning_effort = 'minimal';
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: isClaude
        ? { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await readApiError(res));
    testLabel.textContent = '连接正常 ✓';
  } catch (error) {
    testLabel.textContent = `失败：${error.message.slice(0, 24)}`;
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

document.getElementById('settings').addEventListener('submit', (event) => {
  event.preventDefault();
  const p = providerSel.value;
  apiKeys[p] = keyInput.value.trim();
  modelOverride[p] = modelInput.value.trim();
  readImages = META[p].vision && readImages;
  chrome.storage.local.set({ provider: p, apiKeys, modelOverride, readImages, replyStyle }, () => {
    clearTimeout(feedbackTimer);
    const failed = chrome.runtime.lastError;
    save.classList.toggle('error', !!failed);
    save.classList.toggle('saved', !failed);
    saveLabel.textContent = failed ? '保存失败，请重试' : '已保存';
    status.textContent = saveLabel.textContent;
    feedbackTimer = setTimeout(() => {
      save.classList.remove('saved', 'error');
      saveLabel.textContent = '保存设置';
    }, 1600);
  });
});
