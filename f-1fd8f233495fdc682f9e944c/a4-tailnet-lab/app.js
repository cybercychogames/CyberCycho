(() => {
  const $ = id => document.getElementById(id);
  const privateOrigin = 'https://huangchengs-mac-mini.tailecea0a.ts.net:8776';
  const isPrivate = location.origin === privateOrigin || ['localhost', '127.0.0.1'].includes(location.hostname);
  const state = {ready:false, busy:false, job:null, timer:null};
  const endpoint = () => $('backend').value.trim().replace(/\/+$/, '');
  const storageKey = () => `a4-codex-task:${endpoint()}`;
  function status(kind, text) {
    $('status').className = `status ${kind}`;
    $('status').querySelector('span').textContent = text;
    $('send-btn').disabled = !state.ready || state.busy;
  }
  async function request(path, options={}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint()+path, {...options, signal:controller.signal, cache:'no-store', headers:{'Content-Type':'application/json'}});
      const data = await response.json();
      if (!response.ok) { const error = new Error(data.error || `请求失败 ${response.status}`); error.httpStatus = response.status; throw error; }
      return data;
    } finally { clearTimeout(timer); }
  }
  function showJob(job) {
    state.job = job;
    state.busy = job.status === 'generating';
    $('job-id').textContent = `任务 ${job.id} · ${job.model || 'Codex 内置生图（订阅）'}`;
    $('job-status').textContent = ({generating:'Codex 正在作画，可以暂时离开页面，回来后查询进度。', completed:`图片已完成，用时 ${job.seconds} 秒。`,failed:job.error, interrupted:job.error})[job.status] || '等待确认任务状态';
    $('refresh-job').hidden = false;
    $('result-image').hidden = !job.image_url;
    $('download-image').hidden = !job.image_url;
    if (job.image_url) {
      $('result-image').src = endpoint()+job.image_url;
      $('download-image').href = endpoint()+job.image_url;
    }
    $('send-btn').disabled = !state.ready || state.busy;
    $('send-btn').textContent = state.busy ? '正在生成…' : '用 Codex 生成一张';
    clearTimeout(state.timer);
    if (state.busy) state.timer = setTimeout(refresh, 3000);
  }
  async function refresh() {
    if (!state.job) return;
    try { showJob((await request(`/api/codex/jobs/${state.job.id}`)).job); }
    catch(e) { $('job-status').textContent = `进度暂未取得：${e.message}。请点击查询进度，避免重复提交。`; }
  }
  async function connect() {
    state.ready = false;
    status('checking','正在连接 Mac mini…');
    $('private-link').href = endpoint()+'/';
    try {
      const data = await request('/api/status');
      if(data.mode !== 'tailnet-relay') throw new Error('目标不是生图接收器');
      state.ready = Boolean(data.codex?.configured);
      status(state.ready ? 'online' : 'error', state.ready ? 'Mac mini 已连接 · Codex 订阅已登录' : 'Mac mini 已连接 · 请在 Mac 上登录 Codex（ChatGPT）');
      const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
      if(saved) { state.job = saved; await refresh(); }
    } catch(e) {status('error',`连接未完成：${e.message}。请开启 Tailscale，或打开下方私网页。`);}
  }
  async function send() {
    const prompt = $('message').value.trim();
    if(!prompt || state.busy) return;
    const job = {id:crypto.randomUUID().replaceAll('-',''),status:'generating',model:'Codex 内置生图（订阅）'};
    localStorage.setItem(storageKey(),JSON.stringify(job));
    showJob(job);
    try {
      const data = await request('/api/codex/jobs',{method:'POST',body:JSON.stringify({request_id:job.id,prompt})});
      showJob(data.job);
    } catch(e) {
      clearTimeout(state.timer);
      $('job-status').textContent = `提交未确认：${e.message}。点击查询进度确认，避免重复生成。`;
      // Retain task ID: a timed-out POST may already have been accepted.
      try {showJob((await request(`/api/codex/jobs/${job.id}`)).job);} catch(_) {
        if(e.httpStatus) { state.busy=false; localStorage.removeItem(storageKey()); $('send-btn').disabled=!state.ready; $('send-btn').textContent='用 Codex 生成一张'; }
      }
    }
  }
  if(isPrivate) {
    $('backend').value=location.origin;
    document.querySelector('.lead').textContent='通过 Tailscale 连接 Mac mini，发送画面描述并查看 Codex 结果。';
    $('private-link').hidden=true;
  }
  $('backend').addEventListener('change',()=>{state.ready=false;state.job=null;clearTimeout(state.timer);status('checking','地址已变化，请连接 Mac mini');});
  $('connect-btn').addEventListener('click',connect);
  $('send-btn').addEventListener('click',send);
  $('refresh-job').addEventListener('click',refresh);
  if(isPrivate) connect();
})();
