{
// 落地页演示：轮播多组「推文 → Quip 回复」，每组展示一种钩子，
// 顺带秀出「跟随语言」「看调性不硬玩梗」。纯前端，不调真 API。
const EXAMPLES = [
  {
    name: 'Tunan', handle: '@orion_c29', time: '2h', color: '#1d2939', av: 'O',
    stats: ['149', '12', '70'],
    text: '做了个浏览器插件，本来只想自己用，结果每天用得最勤的还是我。',
    hook: { zh: '具体回扣', en: 'Specific callback' },
    reply: '最稳定的 PMF：先把自己服务明白',
  },
  {
    name: 'Tunan', handle: '@orion_c29', time: '5h', color: '#1d2939', av: 'O',
    stats: ['88', '9', '512'],
    text: 'shipped my side project after 3 months. 0 users so far lol',
    hook: { zh: '跟随原推语言', en: 'Matches the language' },
    reply: '0 users on day one is just called "launching". the scary part is day 30 with the same number',
  },
  {
    name: 'Tunan', handle: '@orion_c29', time: '1h', color: '#1d2939', av: 'O',
    stats: ['23', '3', '41'],
    text: '连续加班两周，今天终于把项目上线了，结果没人用，有点想放弃。',
    hook: { zh: '看调性·不硬玩梗', en: 'Tone-aware' },
    reply: '先别拿发布当天，给两周的努力判死刑',
  },
  {
    name: 'Tunan', handle: '@orion_c29', time: '3h', color: '#1d2939', av: 'O',
    stats: ['205', '48', '1.2K'],
    text: 'AIってもう人間の仕事全部奪うんじゃない？',
    hook: { zh: '意外角度', en: 'Unexpected angle' },
    reply: '奪うっていうか、面倒な部分だけ持ってって、責任は全部こっちに残していく感じ',
  },
];

const av = document.getElementById('twAv');
const nameEl = document.getElementById('twName');
const handleEl = document.getElementById('twHandle');
const timeEl = document.getElementById('twTime');
const textEl = document.getElementById('twText');
const stR = document.getElementById('stR');
const stT = document.getElementById('stT');
const stL = document.getElementById('stL');
const hookTag = document.getElementById('hookTag');
const box = document.getElementById('replyBox');
const btn = document.getElementById('genBtn');
const genLabel = document.getElementById('genLabel');

const COPY = {
  en: { empty: 'Click below to see how Quip replies', generate: 'Generate reply', again: 'Another one →' },
  zh: { empty: '点下面的按钮，看 Quip 怎么接', generate: '生成回复', again: '再来一条 →' },
};
let language = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
let idx = language === 'zh' ? 0 : 1;

function loadExample(i) {
  const e = EXAMPLES[i];
  av.innerHTML = '<img src="avatar.png" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
  av.style.background = 'transparent';
  nameEl.textContent = e.name;
  handleEl.textContent = e.handle;
  timeEl.textContent = e.time;
  textEl.textContent = e.text;
  stR.textContent = e.stats[0];
  stT.textContent = e.stats[1];
  stL.textContent = e.stats[2];
  hookTag.textContent = '';
  box.classList.add('empty');
  box.innerHTML = `${COPY[language].empty}<span class="cursor"></span>`;
  genLabel.textContent = COPY[language].generate;
}

function typeReply(text) {
  btn.disabled = true;
  btn.style.opacity = '.5';
  box.classList.remove('empty');
  box.innerHTML = '<span class="cursor"></span>';
  let i = 0;
  const timer = setInterval(() => {
    i++;
    box.innerHTML = text.slice(0, i) + '<span class="cursor"></span>';
    if (i >= text.length) {
      clearInterval(timer);
      box.innerHTML = text;
      hookTag.textContent = EXAMPLES[idx].hook[language];
      btn.disabled = false;
      btn.style.opacity = '1';
      genLabel.textContent = COPY[language].again;
    }
  }, 42);
}

btn.addEventListener('click', () => {
  const shown = box.classList.contains('empty');
  if (shown) {
    // 还没生成 → 生成当前这条
    typeReply(EXAMPLES[idx].reply);
  } else {
    // 已生成 → 换下一组
    idx = (idx + 1) % EXAMPLES.length;
    loadExample(idx);
  }
});

window.setDemoLanguage = (next) => {
  language = next;
  idx = language === 'zh' ? 0 : 1;
  loadExample(idx);
};

loadExample(idx);
}
