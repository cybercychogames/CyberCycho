(() => {
  const $ = id => document.getElementById(id);
  const state = {origin:'', connected:false, busy:false, loading:false, next:null, selected:null, request:0, seen:new Set()};
  const provider = name => ({bailian:'百炼',codex:'Codex'}[name] || '未记录');
  const time = value => new Date(value).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false});
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
    $('gallery-refresh').disabled = !state.connected || state.loading;
    $('gallery-date').disabled = !state.connected || state.loading;
    $('gallery-more').disabled = state.loading;
    $('art-open').disabled = state.busy || !state.connected;
    $('art-open-hint').textContent = state.busy ? '正在生成新作品，请完成后再载入历史作品。' : '载入后仍需核对底纸，再确认打印。';
  }
  function roleLabel(job) {return job.role_id ? `${job.role_id} 号 · ${job.role_name || ''}` : '早期作品 · 未记录角色编号';}
  function card(job) {
    const button = document.createElement('button');
    button.className = 'art-card'; button.type = 'button'; button.dataset.job = job.id;
    const image = document.createElement('img'); image.src = state.origin + job.thumbnail_url;
    image.loading = 'lazy'; image.alt = job.title || roleLabel(job); image.width = 480; image.height = 480;
    const title = document.createElement('strong'); title.textContent = job.title || '未命名作品';
    const role = document.createElement('span'); role.textContent = roleLabel(job);
    const meta = document.createElement('small'); meta.textContent = `${time(job.created_at)} · ${job.provider_label}`;
    button.append(image,title,role,meta); button.addEventListener('click',()=>open(job.id));
    return button;
  }
  async function load(more=false) {
    if (!state.connected) return;
    const ticket = ++state.request, origin = state.origin;
    state.loading = true; controls();
    $('gallery-status').textContent = '正在读取本地作品…';
    try {
      const date = $('gallery-date').value;
      const data = await get(`/api/gallery?date=${encodeURIComponent(date)}&offset=${more ? state.next || 0 : 0}`);
      if (ticket !== state.request || origin !== state.origin) return;
      if (!more) {
        $('gallery-grid').replaceChildren(); state.seen.clear();
        const options = [new Option(`今天（${data.dates[data.today] || 0} 张）`,'today'),new Option(`全部日期（${data.all_total} 张）`,'all')];
        Object.keys(data.dates).sort().reverse().forEach(day => options.push(new Option(`${day}（${data.dates[day]} 张）`,day)));
        if (!['today','all'].includes(date) && !data.dates[date]) options.push(new Option(`${date}（0 张）`,date));
        $('gallery-date').replaceChildren(...options); $('gallery-date').value = date;
      }
      data.items.forEach(job => {if (!state.seen.has(job.id)) {$('gallery-grid').append(card(job)); state.seen.add(job.id);}});
      state.next = data.next_offset; $('gallery-more').hidden = state.next === null;
      $('gallery-status').textContent = data.total ? `已保存 ${data.total} 张，当前展示 ${state.seen.size} 张 · 按北京时间归档 · 点击作品查看详情` : '这一天还没有作品。生成完成后会自动保存，也可以选择“全部日期”查看以前的作品。';
    } catch (error) {
      if (ticket === state.request) $('gallery-status').textContent = `图库暂未读取：${error.message}。请确认 Tailscale 已连接后刷新。`;
    } finally {if (ticket === state.request) {state.loading = false; controls();}}
  }
  async function open(id) {
    const origin = state.origin;
    try {
      const {job} = await get(`/api/gallery/${id}`);
      if (origin !== state.origin || !state.connected) return;
      state.selected = job;
      $('art-title').textContent = job.title || '未命名作品';
      $('art-image').src = origin + job.image_url;
      $('art-image').alt = job.title || roleLabel(job);
      $('art-meta').textContent = `${time(job.created_at)} · ${job.provider_label} · ${job.seconds ?? '未记录'} 秒${job.preferred_provider ? ` · 首选 ${provider(job.preferred_provider)}` : ''}${job.fallback_used ? ' · 曾由备用服务接替' : ''}`;
      $('art-student').hidden = !job.author && !job.class_name;
      $('art-student').textContent = [job.class_name, job.author].filter(Boolean).join(' · ');
      $('art-reference-wrap').hidden = !job.reference_url;
      if (job.reference_url) $('art-reference').src = origin + job.reference_url;
      $('art-role').textContent = roleLabel(job);
      $('art-prompt').textContent = job.prompt || '该早期作品未记录变化要求。';
      $('art-caption').textContent = job.caption ? `纸上文字：${job.caption}` : '';
      $('art-generation-prompt').textContent = job.generation_prompt || '该早期作品未记录完整生图描述。';
      $('art-attempts').textContent = (job.attempts || []).map(item => `${provider(item.provider)}：${({completed:'完成',failed:'未完成'}[item.status] || item.status)}${item.error ? `（${item.error}）` : ''}`).join('\n') || '该早期作品未记录服务尝试过程。';
      $('art-download').href = origin + job.image_url;
      $('art-metadata').href = origin + job.metadata_url;
      $('art-pdf').hidden = !job.print_url;
      if (job.print_url) $('art-pdf').href = origin + job.print_url;
      controls(); $('art-dialog').showModal();
    } catch (error) {$('gallery-status').textContent = `作品读取失败：${error.message}`;}
  }
  window.addEventListener('a4-connection', event => {
    state.origin = event.detail.origin; state.connected = event.detail.connected;
    ++state.request; state.loading = false; state.selected = null;
    $('art-dialog').close(); controls();
    if (state.connected) load();
    else {
      $('gallery-grid').replaceChildren(); $('gallery-more').hidden = true;
      $('gallery-status').textContent = '连接 Mac mini 后，即可查看已保存的作品。';
    }
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
  $('gallery-refresh').addEventListener('click',()=>load());
  $('gallery-date').addEventListener('change',()=>load());
  $('gallery-more').addEventListener('click',()=>load(true));
  $('art-open').addEventListener('click',()=>{
    if (state.selected && !state.busy && state.connected) window.dispatchEvent(new CustomEvent('a4-open-archive',{detail:{job:state.selected,origin:state.origin}}));
  });
})();
