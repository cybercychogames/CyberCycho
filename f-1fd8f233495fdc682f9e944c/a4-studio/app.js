(() => {
  const $ = id => document.getElementById(id);
  const state = { mode: 'checking', roles: [], record: null, bailian: null };
  const fields = ['work-id','class-name','author','role-id','colors','keep','place','action','original-words','title'];
  const fieldMap = {
    'work-id':'work_id','class-name':'class_name',author:'author','role-id':'role_id',colors:'colors',keep:'keep',
    place:'place',action:'action','original-words':'original_words',title:'title'
  };

  function message(text, error = false) {
    $('message').textContent = text;
    $('message').style.color = error ? 'var(--red)' : '';
  }

  function setMode(mode, status) {
    state.mode = mode;
    state.bailian = status?.bailian || null;
    $('connection').className = `connection ${mode}`;
    $('connection').querySelector('b').textContent = mode === 'local'
      ? `${status.printer.name} · ${status.printer.idle ? '空闲' : '已连接'}`
      : '公网演示模式';
    if (mode === 'demo') {
      $('mode-note').hidden = false;
      $('mode-note').innerHTML = '<b>当前是公网预览。</b>可以试填并查看提示词；现场请在 iPad 打开 Mac 启动后显示的局域网地址，才能保存文件、接收成图和打印。';
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {'Content-Type':'application/json', ...(options.headers || {})},
      cache: 'no-store'
    });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error('现场后台没有连接');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
    return data;
  }

  async function detectMode() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/status', {signal: controller.signal, cache:'no-store'});
      clearTimeout(timer);
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.includes('application/json')) throw new Error();
      const status = await response.json();
      if (status.mode !== 'local') throw new Error();
      setMode('local', status);
      const aiReady = status.bailian?.authenticated;
      message(status.printer.online && aiReady
        ? `现场后台、百炼 ${status.bailian.model} 和 Epson 打印机均已连接。`
        : status.printer.online ? '现场后台和打印机已连接，百炼需要检查。' : '现场后台已连接，打印机需要检查。',
      !(status.printer.online && aiReady));
    } catch (_) {
      setMode('demo', null);
      message('公网预览已打开。现场打印功能只在 Mac 局域网操作台中启用。');
    }
  }

  async function loadRoles() {
    try {
      const data = state.mode === 'local' ? await api('/api/roles') : await fetch('roles.json').then(r => r.json());
      state.roles = data.roles || data;
      const select = $('role-id');
      state.roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = `${role.id} · ${role.name}`;
        select.appendChild(option);
      });
    } catch (error) {
      message(`角色列表载入失败：${error.message}`, true);
    }
  }

  function selectedRole() {
    return state.roles.find(role => role.id === $('role-id').value);
  }

  function values() {
    return Object.fromEntries(fields.map(id => [fieldMap[id], $(id).value.trim()]));
  }

  function buildPrompt(data, role) {
    if (!role) return '选择角色并填写内容后，这里会显示完整提示词。班级和作者不会交给 AI。';
    return `为小学科技节创作一张原创像素风插画。主角是${role.name}，主要颜色是${data.colors || '孩子实际选择的颜色'}，有${role.feature.replace(' · ','、')}，正在${data.action || '展开冒险'}，地点是${data.place || '孩子选择的场景'}。必须清楚保留${data.keep || '孩子指定的关键细节'}。方形构图，主体完整、居中、四周留白，适合打印在 A4 右侧方框内。不要文字、签名、水印或其他角色。`;
  }

  function updateDraft() {
    const role = selectedRole();
    if (role) {
      $('role-card').innerHTML = `<span>角色 ${role.id} · ${role.source}</span><b>${role.name}</b><small>观察重点：${role.feature}</small>`;
    } else {
      $('role-card').innerHTML = '<span>角色信息</span><b>选择角色后显示</b><small>观察重点会自动带入 AI 提示词</small>';
    }
    $('prompt-preview').textContent = buildPrompt(values(), role);
  }

  function requireForm() {
    const form = $('work-form');
    if (!form.reportValidity()) throw new Error('请先补齐作品记录');
    return values();
  }

  function applyRecord(record) {
    state.record = record;
    $('work-status').textContent = record.status;
    $('prompt-preview').textContent = record.prompt;
    $('target-file').textContent = record.expected_image_file || '等待后台分配';
    const generating = record.status === '生成中';
    const failed = record.status === '生成失败';
    $('ai-title').textContent = generating ? '百炼正在生成图片'
      : failed ? '本次生成失败'
      : record.urls?.image ? '图片已经就位' : '可以一键生成图片';
    $('ai-help').textContent = generating ? '请等待当前任务完成，页面每 5 秒自动刷新。'
      : failed ? `${record.generation_error || '请检查百炼状态后手动重试。'} 系统不会自动扣费重试。`
      : record.urls?.image ? '请让孩子查看图片，然后进入下一步核对。'
      : '点击“一键百炼生图”即可自动生成并回填；也可以继续使用 iPad ChatGPT 或手动选择图片。';
    $('bailian-generate-btn').disabled = generating || state.mode !== 'local' || !state.bailian?.authenticated;
    $('base-strip').hidden = !record.urls?.base_preview;
    if (record.urls?.base_preview) {
      $('base-preview').src = `${record.urls.base_preview}?v=${Date.now()}`;
      $('base-preview-wrap').hidden = false;
    }
    if (record.urls?.image) {
      $('result-image').src = `${record.urls.image}?v=${Date.now()}`;
      $('result-image').hidden = false;
      $('image-placeholder').hidden = true;
      $('image-wrap').classList.remove('empty');
    }
    if (record.urls?.overlay_preview) {
      $('overlay-preview').src = `${record.urls.overlay_preview}?v=${Date.now()}`;
      $('overlay-preview-wrap').hidden = false;
      $('overlay-pdf').href = record.urls.overlay;
      $('overlay-pdf').hidden = false;
      $('confirm-box').hidden = false;
    }
  }

  async function saveWork(scroll = true) {
    const data = requireForm();
    if (state.mode === 'demo') {
      const role = selectedRole();
      const record = {...data, role_name:role.name, feature:role.feature, prompt:buildPrompt(data, role), status:'演示记录', urls:{}};
      localStorage.setItem('a4-console-demo', JSON.stringify(record));
      applyRecord(record);
      message('演示记录已保存在这台设备的浏览器中。现场模式会同时生成 AI 请求和底纸预览。');
      if (scroll) $('generate').scrollIntoView();
      return record;
    }
    const payload = {...data};
    if (state.record?.work_id === data.work_id) payload.replace = true;
    const result = await api('/api/works', {method:'POST', body:JSON.stringify(payload)});
    applyRecord(result.record);
    message(`作品 ${result.record.work_id} 已保存，可以一键调用百炼生图。`);
    if (scroll) $('generate').scrollIntoView();
    return result.record;
  }

  async function refreshWork() {
    if (!state.record?.work_id) throw new Error('请先保存作品记录');
    if (state.mode === 'demo') {
      message('公网预览不会连接本地图片目录。现场模式下 AI 图片生成或导入后会显示在这里。');
      return;
    }
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}`);
    const hadImage = Boolean(state.record.urls?.image);
    applyRecord(result.record);
    message(!hadImage && result.record.urls?.image ? '检测到 AI 成图，可以和孩子核对了。' : `当前状态：${result.record.status}`);
  }

  async function uploadImage(file) {
    if (!state.record?.work_id) throw new Error('请先保存作品记录');
    if (state.mode !== 'local') throw new Error('公网预览不能上传现场作品');
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}/image`, {
      method:'POST', body:JSON.stringify({data_url:dataUrl, filename:file.name})
    });
    applyRecord(result.record);
    message('成图已经放入当前作品，请和孩子一起核对。');
    $('review').scrollIntoView();
  }

  async function generateWithBailian() {
    if (!state.record?.work_id) throw new Error('请先保存作品记录');
    if (state.mode !== 'local') throw new Error('公网预览不能调用百炼');
    if (!state.bailian?.authenticated) throw new Error('百炼尚未登录');
    if (state.record.urls?.image && !window.confirm('这会重新生成一张图片并替换当前成图，继续吗？')) return;
    $('bailian-generate-btn').disabled = true;
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}/generate`, {
      method:'POST', body:'{}'
    });
    applyRecord(result.record);
    message(`百炼 ${result.generation.model} 已开始生成 1 张图片。请稍候，失败后不会自动重试。`);
  }

  async function copyPrompt() {
    const role = selectedRole();
    if (!role) throw new Error('请先选择角色');
    const prompt = state.record?.prompt || buildPrompt(values(), role);
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      if (!document.execCommand('copy')) throw new Error('复制失败，请长按提示词手动复制');
      textarea.remove();
    }
    message('提示词已复制。请在 iPad ChatGPT 中粘贴并生图，保存图片后回到这里选择成图。');
  }

  async function review() {
    if (!state.record?.work_id) throw new Error('请先保存作品记录');
    const reviewKeep = $('review-keep').value.trim();
    const reviewChange = $('review-change').value.trim();
    if (!reviewKeep || !reviewChange) throw new Error('请各记录一项保留和变化');
    if (state.mode === 'demo') {
      message('演示核对已记录。现场模式会把结果写入作品记录。');
      $('print').scrollIntoView();
      return;
    }
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}/review`, {
      method:'POST', body:JSON.stringify({review_keep:reviewKeep, review_change:reviewChange})
    });
    applyRecord(result.record);
    message('孩子的核对结果已保存，可以生成右侧补印预览。');
    $('print').scrollIntoView();
  }

  async function prepareOverlay() {
    if (!state.record?.work_id) throw new Error('请先保存作品记录');
    if (state.mode !== 'local') throw new Error('公网预览不会生成现场打印文件');
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}/overlay`, {method:'POST', body:'{}'});
    applyRecord(result.record);
    message('右侧补印 PDF 已生成。请先看完整预览，再重新放入同一张纸。');
  }

  function overlayChecksReady() {
    const checks = [...document.querySelectorAll('[data-print-check]')];
    $('overlay-print-btn').disabled = !(checks.every(item => item.checked) && $('confirmation').value.trim() === '确认打印');
  }

  async function printOverlay() {
    if (state.mode !== 'local') throw new Error('公网预览不能提交打印');
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}/print`, {
      method:'POST', body:JSON.stringify({kind:'overlay', confirmed:true, confirmation:$('confirmation').value.trim()})
    });
    applyRecord(result.record);
    message(`右侧补印已提交：${result.job}。系统不会自动重复提交。`);
    $('overlay-print-btn').disabled = true;
  }

  function confirmDialog(title, copy) {
    const dialog = $('print-dialog');
    $('dialog-title').textContent = title;
    $('dialog-copy').textContent = copy;
    $('dialog-check').checked = false;
    $('dialog-confirmation').value = '';
    $('dialog-submit').disabled = true;
    dialog.showModal();
    return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once:true}));
  }

  function updateDialogButton() {
    $('dialog-submit').disabled = !($('dialog-check').checked && $('dialog-confirmation').value.trim() === '确认打印');
  }

  async function printBase() {
    if (!state.record?.work_id) throw new Error('请先保存作品记录');
    if (state.mode !== 'local') throw new Error('公网预览不能提交打印');
    const ok = await confirmDialog(
      `打印角色 ${state.record.role_id} · ${state.record.role_name}`,
      '请确认打印机中放的是空白 A4，预览右上角半箭头存在，中缝没有箭头。'
    );
    if (!ok) return;
    const result = await api(`/api/works/${encodeURIComponent(state.record.work_id)}/print`, {
      method:'POST', body:JSON.stringify({kind:'base', confirmed:true, confirmation:$('dialog-confirmation').value.trim()})
    });
    applyRecord(result.record);
    message(`角色底纸已提交：${result.job}。`);
  }

  async function guarded(action) {
    try { await action(); } catch (error) { message(error.message, true); }
  }

  function restoreDemo() {
    if (state.mode !== 'demo') return;
    try {
      const record = JSON.parse(localStorage.getItem('a4-console-demo') || 'null');
      if (!record) return;
      Object.entries(fieldMap).forEach(([id,key]) => { if (record[key]) $(id).value = record[key]; });
      updateDraft();
      applyRecord(record);
    } catch (_) {}
  }

  async function init() {
    await detectMode();
    await loadRoles();
    restoreDemo();
    fields.forEach(id => $(id).addEventListener(id === 'role-id' ? 'change' : 'input', updateDraft));
    document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => $(button.dataset.jump).scrollIntoView()));
    $('work-form').addEventListener('submit', event => { event.preventDefault(); guarded(() => saveWork(true)); });
    $('base-preview-btn').addEventListener('click', () => guarded(async () => {
      if (state.mode === 'demo') {
        const role = selectedRole();
        if (!role) throw new Error('请先选择角色');
        window.open(`A4共同创作-40角色底纸.pdf#page=${Number(role.id)}`, '_blank', 'noopener');
        message(`已打开 40 角色底纸的第 ${Number(role.id)} 页。`);
        return;
      }
      await saveWork(false);
    }));
    $('base-print-btn').addEventListener('click', () => guarded(printBase));
    $('refresh-btn').addEventListener('click', () => guarded(refreshWork));
    $('bailian-generate-btn').addEventListener('click', () => guarded(generateWithBailian));
    $('copy-prompt-btn').addEventListener('click', () => guarded(copyPrompt));
    $('image-input').addEventListener('change', event => guarded(() => uploadImage(event.target.files[0])));
    $('review-btn').addEventListener('click', () => guarded(review));
    $('overlay-btn').addEventListener('click', () => guarded(prepareOverlay));
    document.querySelectorAll('[data-print-check]').forEach(item => item.addEventListener('change', overlayChecksReady));
    $('confirmation').addEventListener('input', overlayChecksReady);
    $('overlay-print-btn').addEventListener('click', () => guarded(printOverlay));
    $('dialog-check').addEventListener('change', updateDialogButton);
    $('dialog-confirmation').addEventListener('input', updateDialogButton);
    updateDraft();
    setInterval(() => {
      if (state.mode === 'local' && state.record?.work_id && (state.record.status === '生成中' || !state.record.urls?.image)) guarded(refreshWork);
    }, 5000);
  }

  init();
})();
