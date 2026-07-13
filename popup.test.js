const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

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

function loadPopup(fetchResponse = { ok: true }) {
  const ids = Object.fromEntries([
    'provider', 'providerButton', 'providerValue', 'providerMenu', 'key', 'keyLabel', 'keyLink', 'keyToggle', 'testConnection', 'testLabel', 'model', 'visionSwitch',
    'visionSub', 'save', 'saveLabel', 'status', 'settings',
  ].map((id) => [id, new Element()]));
  const options = ['deepseek', 'openai', 'grok', 'claude'].map((value) => {
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
    storage: { local: {
      get: (_, done) => done({
        provider: 'deepseek',
        apiKeys: { deepseek: 'deep-key', openai: 'open-key' },
        modelOverride: {},
        readImages: true,
        replyStyle: 'adaptive',
      }),
      set: (value, done) => { writes.push(value); done(); },
    } },
  };
  vm.runInNewContext(fs.readFileSync('popup.js', 'utf8'), {
    chrome,
    document: { getElementById: (id) => ids[id], querySelectorAll: (selector) => selector === '.provider-option' ? options : styles, addEventListener() {} },
    fetch: async (url, request) => { requests.push({ url, body: JSON.parse(request.body) }); return fetchResponse; },
    setTimeout: () => 1,
    clearTimeout() {},
  });
  return { ids, options, styles, writes, requests };
}

test('keeps provider drafts and saves a coherent image setting', () => {
  const { ids, options, styles, writes } = loadPopup();
  ids.key.value = 'edited-deep-key';
  options[1].listeners.click();
  assert.equal(ids.key.value, 'open-key');
  assert.equal(ids.visionSwitch.attrs['aria-checked'], 'true');
  assert.equal(ids.providerValue.textContent, 'OpenAI');

  ids.visionSwitch.listeners.click();
  styles[1].listeners.click();
  ids.settings.listeners.submit({ preventDefault() {} });
  assert.equal(writes[0].apiKeys.deepseek, 'edited-deep-key');
  assert.equal(writes[0].readImages, false);
  assert.equal(writes[0].replyStyle, 'funny');
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
  assert.equal(ids.testLabel.textContent, '连接正常 ✓');
});

test('shows a readable connection error', async () => {
  const { ids } = loadPopup({ ok: false, status: 401, text: async () => '{"error":{"message":"Invalid API key"}}' });
  await ids.testConnection.listeners.click();
  assert.match(ids.testLabel.textContent, /Invalid API key/);
});
