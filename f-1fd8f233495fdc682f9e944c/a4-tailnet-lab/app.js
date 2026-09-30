(() => {
  const $ = id => document.getElementById(id);
  const privateOrigin = 'https://huangchengs-mac-mini.tailecea0a.ts.net:8776';
  const isPrivate = location.origin === privateOrigin || ['localhost', '127.0.0.1'].includes(location.hostname);
  const state = {ready:false, busy:false, copyBusy:false, job:null, timer:null, roles:[], connecting:false, providers:{}};
  const endpoint = () => $('backend').value.trim().replace(/\/+$/, '');
  const storageKey = () => `a4-role-task:${endpoint()}`;
  const role = () => state.roles.find(item => item.id === $('role-id').value);
  const providerName = provider => ({codex:'Codex',bailian:'百炼'}[provider] || '未记录');
  const copy = WorkCopy.create({
    read: () => ({origin:endpoint(), connected:state.ready, role_id:$('role-id').value, prompt:$('message').value}),
    request: async body => (await request('/api/work-copy', {method:'POST',body:JSON.stringify(body)}, 45000)).copy,
    fill: (field, value) => {$('work-'+field).value = value;},
    busy: value => {state.copyBusy = value; updateControls();},
    report: text => {$('copy-status').textContent = text;}
  });
  function saveJob(job) {
    try { localStorage.setItem(storageKey(), JSON.stringify(job)); } catch (_) {}
  }
  function updateControls() {
    $('send-btn').disabled = !state.ready || state.busy || state.copyBusy || !role() || !$('message').value.trim();
    $('send-btn').textContent = state.busy ? '正在生成…' : '用所选角色生成一张';
    $('role-id').disabled = state.busy || !state.roles.length;
    $('backend').disabled = state.busy || state.connecting;
    $('preferred-provider').disabled = state.busy;
    $('connect-btn').disabled = state.busy || state.connecting;
    $('suggest-copy').disabled = !state.ready || state.busy || state.copyBusy || !role() || !$('message').value.trim();
    for (const id of ['message','work-title','work-caption']) $(id).disabled = state.busy;
    document.querySelectorAll('.role-choice').forEach(button => {button.disabled = state.busy;});
  }
  function status(kind, text) {
    $('status').className = `status ${kind}`;
    $('status').querySelector('span').textContent = text;
    updateControls();
  }
  function selectRole(id) {
    $('role-id').value = id;
    const selected = role();
    $('role-preview').hidden = !selected;
    if (selected) {
      $('role-image').src = selected.image;
      $('role-image').alt = `${selected.id} 号 ${selected.name}，本次参考图`;
      $('role-name').textContent = `${selected.id} 号 · ${selected.name}`;
      $('role-feature').textContent = `角色特征：${selected.feature}`;
    }
    $('role-hint').textContent = selected ? `已选 ${selected.id} 号 ${selected.name}，每次生成都会携带这张图片。` : '先选择一个角色，才能生成。';
    document.querySelectorAll('.role-choice').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.role === id)));
    updateControls();
  }
  async function loadRoles() {
    try {
      const response = await fetch('roles.json?v=roles-3', {cache:'no-store'});
      if (!response.ok) throw new Error('角色目录暂时不可用');
      state.roles = await response.json();
      $('role-id').replaceChildren(new Option('请选择底纸上的 01–40 号角色', ''));
      for (const item of state.roles) {
        $('role-id').add(new Option(`${item.id} · ${item.name}`, item.id));
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'role-choice'; button.dataset.role = item.id;
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `选择 ${item.id} 号 ${item.name}`);
        const image = document.createElement('img'); image.src = item.image; image.alt = ''; image.loading = 'lazy';
        const label = document.createElement('span'); label.textContent = `${item.id} ${item.name}`;
        button.append(image, label); button.addEventListener('click', () => {selectRole(item.id); copy.changed();});
        $('role-grid').append(button);
      }
      updateControls();
    } catch (error) { $('role-hint').textContent = `角色载入失败：${error.message}。请刷新页面后重试。`; }
  }
  async function request(path, options={}, timeoutMs=15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint()+path, {...options, signal:controller.signal, cache:'no-store', headers:{'Content-Type':'application/json'}});
      const data = await response.json();
      if (!response.ok) { const error = new Error(data.error || `请求失败 ${response.status}`); error.httpStatus = response.status; throw error; }
      return data;
    } finally { clearTimeout(timer); }
  }
  function showJob(job) {
    state.job = job;
    saveJob(job);
    window.dispatchEvent(new CustomEvent('a4-job', {detail:{job, origin:endpoint()}}));
    state.busy = job.status === 'generating';
    $('job-id').textContent = `任务 ${job.id} · 首选 ${providerName(job.preferred_provider)} · 当前 ${job.provider_label || providerName(job.provider)}${job.fallback_used ? '（已接替）' : ''}`;
    $('job-role').hidden = !job.role_id;
    $('job-role').textContent = job.role_id ? `本次作品使用 ${job.role_id} 号 · ${job.role_name || ''} 的参考图，请核对同编号的底纸。` : '';
    const registration = [job.class_name, job.author].filter(value => value && value !== '未填写');
    $('job-student').hidden = !registration.length;
    $('job-student').textContent = registration.join(' · ');
    $('job-status').textContent = ({generating:`${job.fallback_used ? (job.fallback_reason || '首选服务未完成') + '，已切换到' : ''}${providerName(job.phase || job.provider)}正在根据角色参考图作画…`, completed:`图片由${providerName(job.provider)}完成，用时 ${job.seconds} 秒。${job.fallback_used ? '首选服务未完成，备用服务已接替。' : ''}请核对角色和变化。`,failed:job.error || '本次生成失败，请确认后手动重试。', interrupted:job.error})[job.status] || '等待确认任务状态';
    $('refresh-job').hidden = false;
    $('result-image').hidden = !job.image_url;
    $('download-image').hidden = !job.image_url;
    if (job.image_url) {
      $('result-image').src = endpoint()+(job.print_preview_url || job.image_url);
      $('result-image').alt = job.print_preview_url ? '完整 A4 二次补印预览：左侧空白，右侧生成图' : 'AI 生成结果';
      $('download-image').href = endpoint()+job.image_url;
    }
    updateControls();
    clearTimeout(state.timer);
    if (state.busy) state.timer = setTimeout(refresh, 3000);
  }
  async function refresh() {
    if (!state.job) return;
    try {
      const archived = Boolean(state.job.archived);
      const data = await request(archived ? `/api/gallery/${state.job.id}` : `/api/image/jobs/${state.job.id}`);
      showJob({...data.job, archived});
    }
    catch(error) {
      if (error.httpStatus === 404) {
        state.busy = false;
        $('job-status').textContent = '后台未找到这个任务，可以重新提交。';
        updateControls();
      } else $('job-status').textContent = `进度暂未取得：${error.message}。请点击查询进度，避免重复提交。`;
    }
  }
  async function connect() {
    state.ready = false; state.connecting = true;
    status('checking','正在连接 Mac mini…');
    $('private-link').href = endpoint()+'/';
    try {
      const data = await request('/api/status');
      if(data.mode !== 'tailnet-relay' || !data.generation?.requires_role) throw new Error('服务尚未更新，请稍后重试');
      state.ready = Boolean(data.generation.configured);
      state.providers = data.generation.providers || {};
      window.dispatchEvent(new CustomEvent('a4-connection', {detail:{connected:true, origin:endpoint()}}));
      const lastCodex = data.generation.last_attempts?.codex;
      if (lastCodex?.error_code === 'moderation_blocked') $('provider-hint').textContent = 'Codex 最近一次实测被服务端审核拦截，原因未披露。建议先用百炼；普通调用失败可由另一家接替，审核拦截不自动切换。';
      status(state.ready ? 'online' : 'error', state.ready ? `Mac mini 已连接 · 百炼${state.providers.bailian ? '已登录' : '未登录'} · Codex${state.providers.codex ? '已登录' : '未登录'}` : 'Mac mini 已连接 · 请检查百炼和 Codex 登录状态');
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(storageKey()) || 'null'); } catch (_) {}
      if (data.generation.active_job) saved = {id:data.generation.active_job, status:'generating'};
      if (saved) {
        state.job = saved;
        if (saved.role_id) selectRole(saved.role_id);
        $('preferred-provider').value = saved.preferred_provider || 'bailian';
        if (saved.prompt) $('message').value = saved.prompt;
        $('work-title').value = saved.title || ''; $('work-caption').value = saved.caption || '';
        copy.restore(saved.copy_manual);
        state.busy = saved.status === 'generating';
        $('refresh-job').hidden = false;
        await refresh();
      }
    } catch(error) {window.dispatchEvent(new CustomEvent('a4-connection',{detail:{connected:false,origin:endpoint()}}));status('error',`连接未完成：${error.message}。请开启 Tailscale，或在“连接设置”里打开私网备用页。`);}
    finally {state.connecting = false; updateControls();}
  }
  async function send() {
    const prompt = $('message').value.trim(), selected = role();
    if (!state.ready || !prompt || !selected || state.busy || state.copyBusy) return;
    const preferred = $('preferred-provider').value;
    // Legacy backend requires nonempty registration; explicitly record that none was collected.
    const job = {id:crypto.randomUUID().replaceAll('-',''),status:'generating',model:`${providerName(preferred)}参考图生图`,provider:preferred,preferred_provider:preferred,role_id:selected.id,role_name:selected.name,prompt,author:'未填写',class_name:'未填写',title:$('work-title').value.trim(),caption:$('work-caption').value.trim(),copy_manual:copy.snapshot()};
    showJob(job);
    try {
      const data = await request('/api/image/jobs',{method:'POST',body:JSON.stringify({request_id:job.id,role_id:job.role_id,preferred_provider:preferred,prompt,title:job.title,caption:job.caption,author:job.author,class_name:job.class_name,copy_manual:job.copy_manual})});
      showJob(data.job);
    } catch(error) {
      clearTimeout(state.timer);
      if (error.httpStatus && error.httpStatus < 500) {
        showJob({...job,status:'failed',error:error.message});
      } else {
        $('job-status').textContent = `提交未确认：${error.message}。请查询进度，避免重复生成。`;
        await refresh();
      }
    }
  }
  if(isPrivate) { $('backend').value=location.origin; $('private-link').hidden=true; }
  window.addEventListener('a4-open-archive', event => {
    if (state.busy || state.connecting) return;
    const {job, origin} = event.detail;
    if (origin !== endpoint()) return;
    selectRole(job.role_id || '');
    $('preferred-provider').value = job.preferred_provider || 'bailian';
    $('message').value = job.prompt || '';
    $('work-title').value = job.title || ''; $('work-caption').value = job.caption || '';
    copy.restore(job.copy_manual);
    showJob({...job, archived:true});
    $('art-dialog').close();
    $('result-panel').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('role-id').addEventListener('change', () => selectRole($('role-id').value));
  $('role-id').addEventListener('change', () => copy.changed());
  $('message').addEventListener('input', () => {copy.changed(); updateControls();});
  $('suggest-copy').addEventListener('click', () => copy.suggest(true));
  for (const field of ['title','caption']) $('work-'+field).addEventListener('input', () => copy.edit(field));
  $('backend').addEventListener('change',()=>{state.ready=false;state.job=null;window.dispatchEvent(new CustomEvent('a4-connection',{detail:{connected:false,origin:endpoint()}}));window.dispatchEvent(new CustomEvent('a4-job',{detail:{job:null,origin:endpoint()}}));clearTimeout(state.timer);status('checking','地址已变化，请连接 Mac mini');});
  $('connect-btn').addEventListener('click',connect);
  $('send-btn').addEventListener('click',send);
  $('refresh-job').addEventListener('click',refresh);
  loadRoles().then(() => {if(isPrivate) connect();});
})();
