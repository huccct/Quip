const META = {
  deepseek: { name: 'DeepSeek', keys: 'https://platform.deepseek.com/api_keys' },
  openai:   { name: 'OpenAI',   keys: 'https://platform.openai.com/api-keys' },
  grok:     { name: 'Grok',     keys: 'https://console.x.ai' },
  claude:   { name: 'Claude',   keys: 'https://console.anthropic.com/settings/keys' },
};

const providerSel = document.getElementById('provider');
const keyInput = document.getElementById('key');
const keyLabel = document.getElementById('keyLabel');
const hint = document.getElementById('hint');
const ok = document.getElementById('ok');

let apiKeys = {};

chrome.storage.local.get(['provider', 'apiKeys'], (r) => {
  apiKeys = r.apiKeys || {};
  providerSel.value = r.provider || 'deepseek';
  render();
});

function render() {
  const p = providerSel.value;
  keyLabel.textContent = META[p].name + ' API Key';
  keyInput.value = apiKeys[p] || '';
  hint.innerHTML = `<a href="${META[p].keys}" target="_blank">获取 ${META[p].name} key →</a>`;
}

providerSel.addEventListener('change', () => {
  render();
});

document.getElementById('save').addEventListener('click', () => {
  const p = providerSel.value;
  apiKeys[p] = keyInput.value.trim();
  chrome.storage.local.set({ provider: p, apiKeys }, () => {
    ok.textContent = '已保存';
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 1600);
  });
});
