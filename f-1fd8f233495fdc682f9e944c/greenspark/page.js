'use strict';
const screen = document.getElementById('game-screen');
const frame = document.getElementById('game');
const home = document.getElementById('home');
const start = document.getElementById('start');
function orientationHint() {
  document.getElementById('rotate').textContent = innerHeight > innerWidth
    ? '手机或平板请横屏游玩，按钮和画面会更大。'
    : '左侧摇杆移动 · SWORD 挥剑 · 按住 SHIELD 举盾 · DASH 冲刺 · 暂停后点 KEEP GOING 继续';
}
function openGame() {
  home.hidden = true;
  screen.hidden = false;
  frame.src = 'play.html';
  orientationHint();
}
start.addEventListener('click', openGame);
document.getElementById('restart').addEventListener('click', () => {
  if (confirm('结束本轮，为下一位玩家重新开始？')) frame.src = 'play.html';
});
document.getElementById('exit').addEventListener('click', () => {
  frame.src = 'about:blank';
  screen.hidden = true;
  home.hidden = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  start.focus();
});
document.getElementById('full').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (screen.requestFullscreen) await screen.requestFullscreen();
    else document.getElementById('rotate').textContent = '此浏览器请使用横屏，或添加到主屏幕后打开。';
  } catch {
    document.getElementById('rotate').textContent = '浏览器暂不支持全屏，请横屏游玩。';
  }
});
addEventListener('resize', orientationHint);
