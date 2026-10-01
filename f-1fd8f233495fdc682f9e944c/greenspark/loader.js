'use strict';
(async () => {
  const box = document.getElementById('loading');
  const message = document.getElementById('message');
  const progress = document.getElementById('progress');
  const retry = document.getElementById('retry');
  retry.addEventListener('click', () => location.reload());
  let ready = false;
  let failed = false;
  function fail(error) {
    failed = true;
    box.hidden = false;
    document.querySelector('h1').textContent = '冒险还没加载成功';
    message.textContent = error instanceof Error ? error.message : String(error);
    progress.hidden = true;
    retry.hidden = false;
  }
  try {
    if (!('DecompressionStream' in globalThis)) throw new Error('请使用较新版本的 Safari、Chrome 或 Edge 打开。');
    const missing = Engine.getMissingFeatures({ threads: false });
    if (missing.length) throw new Error('此浏览器缺少游戏运行功能：' + missing.join('、') + '。请换用支持 WebGL 2 的浏览器。');
    // Compressed engine stays below the static host's individual-file limit.
    // Only this one engine request is intercepted. All other fetches are unchanged.
    const originalFetch = globalThis.fetch.bind(globalThis);
    const wasmURL = new URL('game.wasm', location.href).href;
    globalThis.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input, location.href).href;
      if (url !== wasmURL) return originalFetch(input, options);
      const response = await originalFetch('game.wasm.gz', options);
      if (!response.ok) throw new Error('游戏引擎下载失败（' + response.status + '），请检查网络后重试。');
      // Read the magic bytes as CDNs may already apply Content-Encoding: gzip.
      const bytes = new Uint8Array(await response.arrayBuffer());
      const gzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
      const body = gzip ? new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')) : bytes;
      return new Response(body, { headers: { 'Content-Type': 'application/wasm' } });
    };
    const engine = new Engine({
      executable: 'game', mainPack: 'game.pck', canvas: document.getElementById('canvas'),
      canvasResizePolicy: 2, focusCanvas: true, persistentPaths: [],
      args: ['--', '--festival-autostart'],
      onProgress(current, total) {
        if (total > 0) { progress.max = total; progress.value = current; }
      },
      onPrintError(text) {
        console.error(text);
        if (/SCRIPT ERROR|Failed to load|Parse Error/.test(text)) fail(new Error('游戏资源加载异常，请重新加载。'));
      },
      onExit(code) { if (ready) fail(new Error('游戏已结束（' + code + '），可重新加载开始。')); }
    });
    await engine.startGame();
    if (failed) return;
    ready = true;
    box.hidden = true;
    document.getElementById('canvas').focus();
  } catch (error) { fail(error); }
})();
