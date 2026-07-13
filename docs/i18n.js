const ZH = {
  navHow: '怎么用',
  badge: '读懂上下文 · 四种风格 · 多模型 · 开源',
  heroTitle: '在 X 上，<br>回一句<em>值得发</em>的话',
  heroText: 'Quip 会结合正文、配图和引用推文，一键生成贴合语境、像真人的回复。自适应、幽默、真诚或犀利，由你选。',
  download: '下载插件', source: '看源码', generated: 'Quip 生成',
  demoNote: '示例效果，帮你感受风格。实际回复由你选的模型现场生成。',
  whyKicker: '为什么不一样', whyTitle: '先从不同角度起草，再只留最自然的一句',
  whyLead: 'Quip 先理解原推的语言、意图和情绪，再用<b>写手 × 编辑双视角自审</b>淘汰误读、复述、废话和尬梗，最后只输出一条可直接修改的草稿。',
  styleTitle: '四种回复风格', styleText: '自适应、幽默、真诚、犀利；同一条推文，也能选择不同表达。',
  languageTitle: '跟随原推语言', languageText: '中文推回中文，英文推回英文，自动判断。',
  contextTitle: '理解图片与引用推文', contextText: '结合配图、视频封面和嵌套引用理解上下文，并明确提示图片是否随请求发送。',
  modelsTitle: '模型任选', modelsText: 'DeepSeek、OpenAI、Grok、Claude，填自己的 Key，回复走你的额度。',
  controlTitle: '发不发你说了算', controlText: '只把草稿填进回复框，由你修改和发送。',
  howKicker: '怎么用', howTitle: '三步装好，一下就会',
  step1Title: '下载并加载', step1Text: '下载 zip 并解压。打开 chrome://extensions，开启开发者模式，点击加载已解压的扩展程序，再选择文件夹。',
  step2Title: '选模型、风格，填 Key', step2Text: '点 Quip 图标，选择模型和回复风格，填入对应 API Key，保存。',
  step3Title: '点开推文，一键回', step3Text: '回复框工具栏会出现 ✦ 按钮，点它生成，修改后由你手动发送。',
  footerName: 'Quip · 一键妙回复',
};

const nodes = [...document.querySelectorAll('[data-i18n]')];
const EN = Object.fromEntries(nodes.map((node) => [node.dataset.i18n, node.innerHTML]));
const toggle = document.getElementById('langToggle');
const description = document.querySelector('meta[name="description"]');
let language = localStorage.getItem('quip-language') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

function setLanguage(next) {
  language = next === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  nodes.forEach((node) => { node.innerHTML = (language === 'zh' ? ZH : EN)[node.dataset.i18n]; });
  document.title = language === 'zh' ? 'Quip · 一键妙回复' : 'Quip · AI Reply Assistant for X';
  description.content = language === 'zh'
    ? '理解推文、配图与引用内容，一键生成可选风格、像真人的回复。'
    : 'Generate natural, context-aware replies on X using your preferred AI model.';
  toggle.textContent = language === 'zh' ? 'English' : '中文';
  localStorage.setItem('quip-language', language);
  window.setDemoLanguage?.(language);
}

toggle.addEventListener('click', () => setLanguage(language === 'zh' ? 'en' : 'zh'));
setLanguage(language);
