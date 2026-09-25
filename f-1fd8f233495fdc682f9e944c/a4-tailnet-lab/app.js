(() => {
  const $ = id => document.getElementById(id);
  const state = { connected: false };

  function endpoint() {
    return $('backend').value.trim().replace(/\/+$/, '');
  }

  function setStatus(kind, text) {
    $('status').className = `status ${kind}`;
    $('status').querySelector('span').textContent = text;
    state.connected = kind === 'online';
    $('send-btn').disabled = !state.connected;
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${endpoint()}${path}`, {
        ...options,
        signal: controller.signal,
        cache: 'no-store',
        targetAddressSpace: 'local',
        headers: {'Content-Type':'application/json', ...(options.headers || {})}
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function connect() {
    setStatus('checking', '正在通过 Tailscale 连接…');
    localStorage.setItem('a4-tailnet-backend', endpoint());
    $('private-link').href = `${endpoint()}/`;
    try {
      const data = await request('/api/status');
      if (data.mode !== 'tailnet-relay') throw new Error('目标不是受限报文接收器');
      const ai = data.bailian?.authenticated ? `百炼 ${data.bailian.model}` : '百炼待检查';
      const printer = data.printer?.online ? '打印机在线' : '打印机待检查';
      setStatus('online', `Mac mini 已连接 · ${ai} · ${printer}`);
    } catch (error) {
      const detail = error.name === 'AbortError' ? '连接超时' : error.message;
      setStatus('error', `${detail}；请打开 Tailscale，并允许 CyberCycho 访问本地网络`);
    }
  }

  async function send() {
    const text = $('message').value.trim();
    if (!text) return;
    $('send-btn').disabled = true;
    $('send-btn').textContent = '发送中…';
    try {
      const data = await request('/api/messages', {
        method: 'POST',
        body: JSON.stringify({client:'iPad Tailnet Lab', text})
      });
      const item = data.message;
      $('receipt-id').textContent = item.id;
      $('receipt-time').textContent = item.received_at;
      $('receipt-reply').textContent = item.reply;
      $('receipt-ai').textContent = `${item.processor.bailian.model} · ${item.processor.bailian.authenticated ? '已登录' : '待检查'}`;
      const printer = item.processor.printer;
      $('receipt-printer').textContent = `${printer.name} · ${printer.online ? (printer.idle ? '在线且空闲' : '在线') : '离线'}`;
      $('empty').hidden = true;
      $('receipt').hidden = false;
      $('receipt').scrollIntoView({behavior:'smooth', block:'center'});
    } catch (error) {
      setStatus('error', `发送失败：${error.name === 'AbortError' ? '连接超时' : error.message}`);
    } finally {
      $('send-btn').textContent = '发送给 Mac mini';
      $('send-btn').disabled = !state.connected;
    }
  }

  const saved = localStorage.getItem('a4-tailnet-backend');
  if (saved) $('backend').value = saved;
  $('connect-btn').addEventListener('click', connect);
  $('send-btn').addEventListener('click', send);
  $('backend').addEventListener('change', () => {
    $('private-link').href = `${endpoint()}/`;
    setStatus('checking', '地址已改变，请重新连接');
  });
  connect();
})();
