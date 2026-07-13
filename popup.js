// vision：能否读图，与 content.js 的 PROVIDERS 保持一致（DeepSeek 托管 API 不支持）。
const META = {
  deepseek: { name: 'DeepSeek', keys: 'https://platform.deepseek.com/api_keys',          model: 'deepseek-chat',   vision: false },
  openai:   { name: 'OpenAI',   keys: 'https://platform.openai.com/api-keys',            model: 'gpt-4o',          vision: true  },
  grok:     { name: 'Grok',     keys: 'https://console.x.ai',                            model: 'grok-4.5',        vision: true  },
  claude:   { name: 'Claude',   keys: 'https://console.anthropic.com/settings/keys',     model: 'claude-opus-4-8', vision: true  },
};

const providerSel = document.getElementById('provider');
const keyInput = document.getElementById('key');
const keyLabel = document.getElementById('keyLabel');
const hint = document.getElementById('hint');
const ok = document.getElementById('ok');
const modelInput = document.getElementById('model');
const visionSwitch = document.getElementById('visionSwitch');
const visionSub = document.getElementById('visionSub');

let apiKeys = {};
let modelOverride = {};
let readImages = false;

chrome.storage.local.get(['provider', 'apiKeys', 'modelOverride', 'readImages'], (r) => {
  apiKeys = r.apiKeys || {};
  modelOverride = r.modelOverride || {};
  readImages = !!r.readImages;
  providerSel.value = r.provider || 'deepseek';
  render();
});

function render() {
  const p = providerSel.value;
  const m = META[p];
  keyLabel.textContent = m.name + ' API Key';
  keyInput.value = apiKeys[p] || '';
  hint.innerHTML = `<a href="${m.keys}" target="_blank">获取 ${m.name} key →</a>`;
  modelInput.value = modelOverride[p] || '';
  modelInput.placeholder = `默认 ${m.model}`;

  // 当前模型不支持读图 → 禁用开关并说明
  if (m.vision) {
    visionSwitch.disabled = false;
    visionSub.textContent = '让模型看懂配图再回';
  } else {
    visionSwitch.disabled = true;
    readImages = false;
    visionSub.textContent = `${m.name} 不支持读图，换 OpenAI / Grok / Claude`;
  }
  visionSwitch.setAttribute('aria-checked', String(readImages));
}

providerSel.addEventListener('change', render);

visionSwitch.addEventListener('click', () => {
  if (visionSwitch.disabled) return;
  readImages = !readImages;
  visionSwitch.setAttribute('aria-checked', String(readImages));
});

document.getElementById('save').addEventListener('click', () => {
  const p = providerSel.value;
  apiKeys[p] = keyInput.value.trim();
  modelOverride[p] = modelInput.value.trim();
  chrome.storage.local.set({ provider: p, apiKeys, modelOverride, readImages }, () => {
    ok.textContent = '已保存';
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 1600);
  });
});
