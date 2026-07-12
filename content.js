// Quip · 一键妙回复 —— content script
// 逻辑：当你点进回复框（评论框），在它的工具栏那排图标旁加一个「AI回复」按钮。
// 点它 → 读被回复的推文 → 调 DeepSeek → 把回复真正写进评论框（placeholder 消失、Reply 变亮）。你手点发。

const BTN_CLASS = 'xqr-inline-btn';

// ---- 找回复编辑框 ----
function findComposer() {
  return document.querySelector('div[data-testid^="tweetTextarea_"][contenteditable="true"]');
}

// ---- 找被回复的推文文本 ----
function findTweetText() {
  const article = document.querySelector('article[data-testid="tweet"]');
  if (!article) return '';
  const textEl = article.querySelector('div[data-testid="tweetText"]');
  return textEl ? textEl.innerText.trim() : '';
}

// ---- 关键：把文字真正写进 X 的富文本编辑器 ----
// X 现在用 Lexical/DraftJS，execCommand('insertText') 只画在表层、不触发 React state，
// 所以 placeholder 不消失、Reply 不亮。可靠做法是模拟一次“粘贴”，编辑器有 paste 监听。
// 最佳实践：把文本放进系统剪贴板，再派发一个带真实 clipboardData 的 paste 事件。
// Lexical 会把它当成用户真实粘贴来处理 —— 数据层和渲染层同步，不再出现“框里看不到”。
// 覆盖旧内容：先用 execCommand('selectAll') 让 Lexical 选中全部（同步它的内部选区），
// paste 落在非折叠选区上时会“替换”而不是“追加”。全程不调 delete（delete 会打乱渲染）。
async function insertText(composer, text) {
  composer.focus();

  // 让编辑器自己全选（Lexical 认这个，选区会同步）
  document.execCommand('selectAll', false, null);

  // 写进系统剪贴板（最佳实践的关键：用真实剪贴板内容喂 paste）
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // 某些情况下 writeText 需要聚焦，已 focus，失败就继续用 DataTransfer 兜底
  }

  // 构造带真实文本的 paste 事件，派发给编辑框（替换掉刚才全选的内容）
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  composer.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: dt, bubbles: true, cancelable: true
  }));
}

// ---- 支持的模型商（OpenAI 兼容接口，统一处理）----
const PROVIDERS = {
  deepseek: { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', name: 'DeepSeek' },
  openai:   { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o',       name: 'OpenAI' },
  grok:     { url: 'https://api.x.ai/v1/chat/completions',       model: 'grok-4.5',     name: 'Grok' },
  claude:   { url: 'https://api.anthropic.com/v1/messages',      model: 'claude-opus-4-8', name: 'Claude' },
};

// 读取当前选定的模型商 + 对应 key
function getConfig() {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      reject(new Error('插件上下文已失效（多半是刚重载过扩展）。请刷新这个 X 页面(F5)再试。'));
      return;
    }
    chrome.storage.local.get(['provider', 'apiKeys'], (r) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message + '（请刷新页面 F5 再试）'));
        return;
      }
      const provider = r.provider || 'deepseek';
      const key = (r.apiKeys || {})[provider] || '';
      resolve({ provider, key });
    });
  });
}

// ---- 调模型 ----
async function generateReply(tweetText) {
  const { provider, key } = await getConfig();
  const cfg = PROVIDERS[provider];
  if (!key) {
    alert(`还没设置 ${cfg.name} key。点浏览器右上角插件图标填一下。`);
    return null;
  }

  // 语言硬规则：原推是什么语言就用什么语言回（中/英/日/韩/西…全部适用）。
  // 写得够硬，压过"整段 prompt 都是中文所以默认回中文"的干扰。
  const langRule = '⚠️ 语言铁律：先判断下面这条推是什么语言，然后【必须用完全相同的语言】回复。' +
    '日文推回日文，英文推回英文，韩文推回韩文，中文推回中文，以此类推。' +
    '不要因为这段指令是中文就回中文——回复语言只由原推决定。';

  // 内部双角色博弈：写手先写出带钩子的回复，刷推老哥用"会不会点赞"来毙掉无聊/尬，只输出终版。
  // 用和原推相同的语言回复（中文推回中文，英文推回英文）。
  const prompt = `${langRule}

你要在推特上回复下面这条推。目标不是"回得对"，而是"回得让人想点赞/截图"。在心里走完三步，【只输出第三步】。

【第一步 · 写手】先读懂原推真正在说什么，然后找一个【钩子】——不是同意也不是反对，而是一个能让人"欸有点意思"的角度。钩子可以是下面任意一种，挑最贴这条推调性的：
- 意外的第三视角：把原推的事重新框一下，角度别人没想到
- 反转：前半句顺着说，最后几个字翻掉
- 精准夸张：顺着原推的逻辑往荒谬推一步
- 可共鸣的具体：用"我"和一个具体的小画面/小细节，戳中"这不就是我"
- 一句反常识的真话：和大家默认想法相反、但一看就对
（如果原推是正经/难过/严肃的，别硬玩梗，就用"反常识真话"或"真诚的具体共鸣"，梗会翻车。）

【第二步 · 刷推老哥（你的对手）】换个身份：你在推特上刷到第一步那条回复。你很挑，手指划得飞快。问自己：这条我会点赞吗？会截图吗？还是划走？如果会划走，说清楚为什么——大概率是这两种病之一：
- 太无聊：正确的废话、泛泛附和、没有钩子、谁都能说
- 太用力/尬：硬玩梗、用烂大街的网络烂梗（yyds、绝绝子这种）、把笑点解释出来、抖机灵抖过头、油腻
只有"自然、又让人想点赞"才算过。

【第三步 · 定稿】根据老哥的毒评改到能过。硬要求：
- 短。一句，最好十几个字。留白，让人自己脑补，别解释你的梗。
- 口语，像真人随手打的，可带语气词但别硬塞。
- 钩子要藏在自然里，不能一看就是"我在努力搞笑"。
- 宁可平实有记忆点，也不要尬。

只输出第三步这一行回复正文。不要引号、不要解释、不要显示前两步、不要给多个选项。
${langRule}

这条推：${tweetText}`;

  // Claude 用 Anthropic 独有的接口格式；其余走 OpenAI 兼容格式
  let res;
  if (provider === 'claude') {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  } else {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 200
      })
    });
  }

  if (!res.ok) {
    const err = await res.text();
    alert(`${cfg.name} 报错：${res.status}\n${err.slice(0, 200)}`);
    return null;
  }
  const data = await res.json();
  // 两种格式的返回结构不同
  if (provider === 'claude') {
    return data.content?.[0]?.text?.trim() || null;
  }
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ---- 只在“回复场景”注入，不在“发原创推”场景注入 ----
// 判断依据：发送按钮的文字是 Reply（回复）而非 Post（发推）。
// X 的发送按钮 data-testid 是 tweetButton / tweetButtonInline，读它内部文字来区分。
function isReplyContext(toolbar) {
  // 从工具栏所在的表单容器里找发送按钮
  const container = toolbar.closest('div[role="dialog"]') || document;
  const sendBtn = container.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  if (!sendBtn) return false;
  const label = (sendBtn.innerText || '').trim().toLowerCase();
  // Reply / 回复 → 是回复场景；Post / Reply all 等含 reply 的也算
  return label.includes('reply') || label.includes('回复');
}

function findToolbar() {
  return document.querySelector('div[data-testid="toolBar"]') || null;
}

function injectInlineButton() {
  const composer = findComposer();
  if (!composer) return;
  const toolbar = findToolbar();
  if (!toolbar) return;
  if (!isReplyContext(toolbar)) return;          // 不是回复场景（如首页发推框）→ 不注入
  if (toolbar.querySelector('.' + BTN_CLASS)) return; // 已注入

  const btn = document.createElement('button');
  btn.className = BTN_CLASS;
  btn.type = 'button';
  btn.title = 'AI 生成回复';
  // 极简：做成和左边那排图片/GIF/emoji 图标同款 —— 圆形幽灵图标，X 蓝，hover 才有淡蓝圆底。
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>`;
  Object.assign(btn.style, {
    background: 'transparent', color: 'rgb(29,155,240)', border: 'none',
    borderRadius: '50%', width: '34px', height: '34px', padding: '0',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'background .15s', flex: '0 0 auto'
  });
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(29,155,240,.1)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const tweetText = findTweetText();
    if (!tweetText) { alert('没读到被回复的推文内容。'); return; }
    const live = findComposer();
    if (!live) { alert('没找到回复框。'); return; }

    // 生成中：图标旋转 + 变淡，保持圆形不塞文字
    btn.disabled = true;
    btn.style.opacity = '.5';
    const svg = btn.querySelector('svg');
    if (svg) { svg.style.transition = 'transform .8s linear'; svg.style.animation = 'xqr-spin 1s linear infinite'; }
    try {
      const reply = await generateReply(tweetText);
      if (reply) await insertText(live, reply);
    } catch (err) {
      alert('出错了：' + err.message);
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      if (svg) svg.style.animation = '';
    }
  });

  // 关键：插进左边那排图标的容器里（工具栏的第一个子元素通常是图标组），
  // 而不是 toolbar 根部（那样会跑到 Reply 右边）。
  const iconGroup = toolbar.firstElementChild;
  if (iconGroup && iconGroup.contains(toolbar.querySelector('[aria-label], button, [role="button"]'))) {
    iconGroup.appendChild(btn);
  } else {
    // 兜底：找不到图标组就退回工具栏，但插在最前，避免跑到 Reply 右边
    toolbar.insertBefore(btn, toolbar.firstChild);
  }
}

// 旋转动画
if (!document.getElementById('xqr-style')) {
  const style = document.createElement('style');
  style.id = 'xqr-style';
  style.textContent = '@keyframes xqr-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
}

// ---- X 是 SPA，持续盯 DOM ----
const observer = new MutationObserver(() => injectInlineButton());
observer.observe(document.body, { childList: true, subtree: true });
injectInlineButton();
