const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

test('selects Chinese from the browser and toggles back to English', () => {
  const node = { dataset: { i18n: 'navHow' }, innerHTML: 'How it works' };
  const toggle = { textContent: '', addEventListener: (_, listener) => { toggle.click = listener; } };
  const meta = { content: '' };
  const storage = new Map();
  const document = {
    documentElement: { lang: 'en' }, title: '',
    querySelectorAll: () => [node],
    querySelector: () => meta,
    getElementById: () => toggle,
  };
  vm.runInNewContext(fs.readFileSync('docs/i18n.js', 'utf8'), {
    document, navigator: { language: 'zh-CN' }, window: {},
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  });

  assert.equal(node.innerHTML, '怎么用');
  assert.equal(document.documentElement.lang, 'zh-CN');
  toggle.click();
  assert.equal(node.innerHTML, 'How it works');
  assert.equal(document.documentElement.lang, 'en');
});
