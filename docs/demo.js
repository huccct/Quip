// 落地页的演示：点「生成回复」后，逐字打出一条示例回复。
// 纯前端演示，不调真 API —— 让访客直观感受"有梗"的效果。
const REPLY = '7000到10000这段最难熬，互关来的粉大多是僵尸，真到万了你会发现活人还是那几百个 😅';

const btn = document.getElementById('genBtn');
const box = document.getElementById('replyBox');

btn.addEventListener('click', () => {
  btn.disabled = true;
  btn.style.opacity = '.5';
  box.classList.remove('empty');
  box.innerHTML = '<span class="cursor"></span>';

  let i = 0;
  const timer = setInterval(() => {
    i++;
    box.innerHTML = REPLY.slice(0, i) + '<span class="cursor"></span>';
    if (i >= REPLY.length) {
      clearInterval(timer);
      box.innerHTML = REPLY;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.querySelector('svg').nextSibling.textContent = ' 再来一条';
    }
  }, 45);
});
