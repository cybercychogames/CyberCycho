(() => {
  const $ = id => document.getElementById(id);
  const state = {origin:'', connected:false, busy:false, loading:false, next:null, selected:null, request:0, seen:new Set(), bundled:[], remote:new Map(), dates:[], catalogError:null};
  const provider = name => ({bailian:'百炼',codex:'Codex'}[name] || '未记录');
  const time = value => new Date(value).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false});
  const dayOf = value => new Date(value).toLocaleDateString('en-CA', {timeZone:'Asia/Shanghai'});
  const asset = (job, path) => job.bundled ? new URL(path, new URL('gallery-assets/', location.href)).href : state.origin + path;
  const catalogReady = fetch('gallery-assets/catalog.json', {cache:'no-store'}).then(response => {
    if (!response.ok) throw new Error('图片目录暂时不可用');
    return response.json();
  }).then(items => {
    state.bundled = items.map(item => ({...item, bundled:true, image_url:item.image, thumbnail_url:item.thumbnail,
      metadata_url:'catalog.json', provider_label:'Codex · AI生成', reference_url:item.role_id ? `../roles/${item.role_id}.png` : null}));
  }).catch(error => {state.catalogError = error.message;});
  function render() {
    const date = $('gallery-date').value;
    const today = dayOf(Date.now());
    const days = new Set([...state.dates, ...state.bundled.map(job => dayOf(job.created_at))]);
    if (!['today','all'].includes(date)) days.add(date);
    $('gallery-date').replaceChildren(new Option('今天','today'), new Option('全部日期','all'),
      ...[...days].sort().reverse().map(day => new Option(day,day)));
    $('gallery-date').value = date;
    const jobs = new Map(state.bundled.map(job => [job.id,job]));
    state.remote.forEach((job,id) => jobs.set(id,job));
    const visible = [...jobs.values()].filter(job => date === 'all' || dayOf(job.created_at) === (date === 'today' ? today : date))
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    state.seen = new Set(visible.map(job => job.id));
    $('gallery-grid').replaceChildren(...visible.map(card));
    $('gallery-more').hidden = state.next === null || !state.connected;
    $('gallery-status').textContent = visible.length ? `当前展示 ${visible.length} 张 · 按北京时间归档 · 点击作品查看详情` : '这一天还没有作品，可以选择“全部日期”查看以前的作品。';
    if (!state.connected) $('gallery-status').textContent += ' 连接 Mac mini 可读取更多本地作品。';
    if (state.catalogError) $('gallery-status').textContent += ` 图片目录读取失败：${state.catalogError}，请刷新页面重试。`;
  }
  async function get(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(state.origin + path, {cache:'no-store', signal:controller.signal});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '图库读取失败');
      return data;
    } finally { clearTimeout(timer); }
  }
  function controls() {
    $('gallery-refresh').disabled = state.loading;
    $('gallery-date').disabled = state.loading;
    $('gallery-more').disabled = state.loading;
    $('art-open').hidden = !!state.selected?.bundled;
    $('art-open').disabled = state.busy || !state.connected;
    $('art-open-hint').hidden = !!state.selected?.bundled;
    $('art-open-hint').textContent = state.busy ? '正在生成新作品，请完成后再载入历史作品。' : '载入后仍需核对底纸，再确认打印。';
  }
  function roleLabel(job) {return job.role_id ? `${job.role_id} 号 · ${job.role_name || ''}` : (job.bundled ? '原创角色' : '早期作品 · 未记录角色编号');}
  function card(job) {
    const button = document.createElement('button');
    button.className = 'art-card'; button.type = 'button'; button.dataset.job = job.id;
    const image = document.createElement('img'); image.src = asset(job, job.thumbnail_url);
    image.loading = 'lazy'; image.alt = job.title || roleLabel(job); image.width = 480; image.height = 480;
    const title = document.createElement('strong'); title.textContent = job.title || '未命名作品';
    const role = document.createElement('span'); role.textContent = roleLabel(job);
    const meta = document.createElement('small'); meta.textContent = `${time(job.created_at)} · ${job.provider_label}`;
    button.append(image,title,role,meta); button.addEventListener('click',()=>open(job.id));
    return button;
  }
  async function load(more=false) {
    const ticket = ++state.request, origin = state.origin;
    state.loading = true; controls();
    await catalogReady;
    if (ticket !== state.request) return;
    if (!more) {state.remote.clear(); state.next = null;}
    render();
    if (!state.connected) {state.loading = false; controls(); return;}
    try {
      const date = $('gallery-date').value;
      const data = await get(`/api/gallery?date=${encodeURIComponent(date)}&offset=${more ? state.next || 0 : 0}`);
      if (ticket !== state.request || origin !== state.origin) return;
      data.items.forEach(job => state.remote.set(job.id,job));
      state.dates = Object.keys(data.dates);
      state.next = data.next_offset;
      render();
    } catch (error) {
      if (ticket === state.request) {
        render();
        $('gallery-status').textContent += ` Mac 图库暂未读取：${error.message}。请确认 Tailscale 已连接后刷新。`;
      }
    } finally {if (ticket === state.request) {state.loading = false; controls();}}
  }
  async function open(id) {
    const origin = state.origin;
    try {
      const bundled = !state.remote.has(id) && state.bundled.find(item => item.id === id);
      const job = bundled || (await get(`/api/gallery/${id}`)).job;
      if (origin !== state.origin || (!bundled && !state.connected)) return;
      state.selected = job;
      $('art-title').textContent = job.title || '未命名作品';
      $('art-image').src = asset(job, job.image_url);
      $('art-image').alt = job.title || roleLabel(job);
      $('art-meta').textContent = `${time(job.created_at)} · ${job.provider_label} · ${job.seconds ?? '未记录'} 秒${job.preferred_provider ? ` · 首选 ${provider(job.preferred_provider)}` : ''}${job.fallback_used ? ' · 曾由备用服务接替' : ''}`;
      $('art-student').hidden = !job.author && !job.class_name;
      $('art-student').textContent = [job.class_name, job.author].filter(Boolean).join(' · ');
      $('art-reference-wrap').hidden = !job.reference_url;
      if (job.reference_url) $('art-reference').src = asset(job, job.reference_url);
      $('art-role').textContent = roleLabel(job);
      $('art-prompt').textContent = job.prompt || '该早期作品未记录变化要求。';
      $('art-caption').textContent = job.caption ? `纸上文字：${job.caption}` : '';
      $('art-generation-prompt').textContent = job.generation_prompt || '该早期作品未记录完整生图描述。';
      $('art-attempts').textContent = (job.attempts || []).map(item => `${provider(item.provider)}：${({completed:'完成',failed:'未完成'}[item.status] || item.status)}${item.error ? `（${item.error}）` : ''}`).join('\n') || '该早期作品未记录服务尝试过程。';
      $('art-download').href = asset(job, job.image_url);
      $('art-metadata').href = asset(job, job.metadata_url);
      $('art-pdf').hidden = !job.print_url;
      if (job.print_url) $('art-pdf').href = asset(job, job.print_url);
      controls(); $('art-dialog').showModal();
    } catch (error) {$('gallery-status').textContent = `作品读取失败：${error.message}`;}
  }
  window.addEventListener('a4-connection', event => {
    state.origin = event.detail.origin; state.connected = event.detail.connected;
    ++state.request; state.loading = false; state.selected = null;
    $('art-dialog').close(); controls();
    state.dates = [];
    load();
  });
  let lastCompleted = '';
  window.addEventListener('a4-job', event => {
    const job = event.detail.job;
    state.busy = job?.status === 'generating'; controls();
    if (job?.status === 'completed' && job.id !== lastCompleted && !job.archived) {
      lastCompleted = job.id;
      // The worker writes job status immediately before finishing its local archive.
      setTimeout(() => load(), 1500);
    }
  });
  load();
  $('gallery-refresh').addEventListener('click',()=>load());
  $('gallery-date').addEventListener('change',()=>load());
  $('gallery-more').addEventListener('click',()=>load(true));
  $('art-open').addEventListener('click',()=>{
    if (state.selected && !state.selected.bundled && !state.busy && state.connected) window.dispatchEvent(new CustomEvent('a4-open-archive',{detail:{job:state.selected,origin:state.origin}}));
  });
})();
