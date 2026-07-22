const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const ZH = JSON.parse(fs.readFileSync('_locales/zh_CN/messages.json', 'utf8'));
const EN = JSON.parse(fs.readFileSync('_locales/en/messages.json', 'utf8'));

class Element {
  constructor() {
    this.value = '';
    this.type = 'password';
    this.attrs = {};
    this.listeners = {};
    this.dataset = {};
    this.hidden = true;
    this.textContent = '';
    this.classList = { toggle() {}, remove() {} };
  }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute(name, value) { this.attrs[name] = value; }
  contains() { return false; }
  focus() {}
}

function loadPopup(fetchResponse = { ok: true }, locale = ZH) {
  const ids = Object.fromEntries([
    'provider', 'providerButton', 'providerValue', 'providerMenu', 'key', 'keyLink', 'keyToggle', 'testConnection', 'testLabel', 'model', 'voice', 'visionSwitch',
    'visionSub', 'status', 'settings',
  ].map((id) => [id, new Element()]));
  const options = ['deepseek', 'openai', 'grok', 'claude', 'gemini', 'openrouter'].map((value) => {
    const option = new Element();
    option.dataset.value = value;
    return option;
  });
  const styles = ['adaptive', 'funny', 'warm', 'sharp'].map((value) => {
    const option = new Element();
    option.dataset.style = value;
    return option;
  });
  const writes = [];
  const requests = [];
  const chrome = {
    runtime: {},
    i18n: { getMessage: (key) => locale[key]?.message || '', getUILanguage: () => locale === ZH ? 'zh-CN' : 'en' },
    storage: { local: {
      get: (_, done) => done({
        provider: 'deepseek',
        apiKeys: { deepseek: 'deep-key', openai: 'open-key' },
        modelOverride: {},
        readImages: true,
        replyStyle: 'adaptive',
        voiceProfile: 'Direct and concise',
      }),
      set: (value, done) => { writes.push(value); done(); },
    } },
  };
  vm.runInNewContext(fs.readFileSync('popup.js', 'utf8'), {
    chrome,
    document: {
      documentElement: {}, getElementById: (id) => ids[id],
      querySelectorAll: (selector) => selector === '.provider-option' ? options : selector === '.style-option' ? styles : [],
      addEventListener() {},
    },
    fetch: async (url, request) => { requests.push({ url, body: JSON.parse(request.body) }); return fetchResponse; },
    setTimeout: () => 1,
    clearTimeout() {},
  });
  return { ids, options, styles, writes, requests };
}

test('auto-saves provider, style, image, and writing preferences', () => {
  const { ids, options, styles, writes } = loadPopup();
  ids.key.value = 'edited-deep-key';
  ids.key.listeners.input();
  options[1].listeners.click();
  assert.equal(ids.key.value, 'open-key');
  assert.equal(ids.visionSwitch.attrs['aria-checked'], 'true');
  assert.equal(ids.providerValue.textContent, 'OpenAI');

  ids.visionSwitch.listeners.click();
  styles[1].listeners.click();
  ids.voice.value = 'Builder; warm but concise';
  ids.voice.listeners.input();
  const saved = writes.at(-1);
  assert.equal(saved.apiKeys.deepseek, 'edited-deep-key');
  assert.equal(saved.readImages, false);
  assert.equal(saved.replyStyle, 'funny');
  assert.equal(saved.voiceProfile, 'Builder; warm but concise');
});

test('toggles API Key visibility accessibly', () => {
  const { ids } = loadPopup();
  ids.keyToggle.listeners.click();
  assert.equal(ids.key.type, 'text');
  assert.equal(ids.keyToggle.attrs['aria-pressed'], 'true');
  assert.equal(ids.keyToggle.attrs['aria-label'], '隐藏 API Key');
});

test('tests the current key and default model', async () => {
  const { ids, requests } = loadPopup();
  await ids.testConnection.listeners.click();
  assert.equal(requests[0].body.model, 'deepseek-v4-flash');
  assert.equal(requests[0].body.max_tokens, 16);
  assert.equal(ids.testLabel.textContent, '连接正常 ✓');
});

test('offers Gemini and OpenRouter defaults', async () => {
  const { ids, options, requests } = loadPopup();
  options[4].listeners.click();
  ids.key.value = 'gemini-key';
  await ids.testConnection.listeners.click();
  assert.equal(requests[0].url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(requests[0].body.model, 'gemini-3.5-flash-lite');

  options[5].listeners.click();
  assert.equal(ids.model.placeholder, '默认 openrouter/auto');
});

test('shows a readable connection error', async () => {
  const { ids } = loadPopup({ ok: false, status: 401, text: async () => '{"error":{"message":"Invalid API key"}}' });
  await ids.testConnection.listeners.click();
  assert.match(ids.testLabel.textContent, /Invalid API key/);
  assert.equal(ids.testConnection.title, 'Invalid API key');
});

test('keeps English and Chinese locale keys aligned', () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(ZH).sort());
  const { ids } = loadPopup({ ok: true }, EN);
  ids.keyToggle.listeners.click();
  assert.equal(ids.keyToggle.attrs['aria-label'], 'Hide API Key');
});
