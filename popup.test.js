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
    this.classList = { toggle() {}, remove() {} };
  }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute(name, value) { this.attrs[name] = value; }
}

function loadPopup() {
  const ids = Object.fromEntries([
    'provider', 'key', 'keyLabel', 'keyLink', 'keyToggle', 'model', 'visionSwitch',
    'visionSub', 'save', 'saveLabel', 'status', 'settings',
  ].map((id) => [id, new Element()]));
  const writes = [];
  const chrome = {
    runtime: {},
    storage: { local: {
      get: (_, done) => done({
        provider: 'deepseek',
        apiKeys: { deepseek: 'deep-key', openai: 'open-key' },
        modelOverride: {},
        readImages: true,
      }),
      set: (value, done) => { writes.push(value); done(); },
    } },
  };
  vm.runInNewContext(fs.readFileSync('popup.js', 'utf8'), {
    chrome,
    document: { getElementById: (id) => ids[id] },
    setTimeout: () => 1,
    clearTimeout() {},
  });
  return { ids, writes };
}

test('keeps provider drafts and saves a coherent image setting', () => {
  const { ids, writes } = loadPopup();
  ids.key.value = 'edited-deep-key';
  ids.provider.value = 'openai';
  ids.provider.listeners.change();
  assert.equal(ids.key.value, 'open-key');
  assert.equal(ids.visionSwitch.attrs['aria-checked'], 'true');

  ids.visionSwitch.listeners.click();
  ids.settings.listeners.submit({ preventDefault() {} });
  assert.equal(writes[0].apiKeys.deepseek, 'edited-deep-key');
  assert.equal(writes[0].readImages, false);
});

test('toggles API Key visibility accessibly', () => {
  const { ids } = loadPopup();
  ids.keyToggle.listeners.click();
  assert.equal(ids.key.type, 'text');
  assert.equal(ids.keyToggle.attrs['aria-pressed'], 'true');
  assert.equal(ids.keyToggle.attrs['aria-label'], '隐藏 API Key');
});
