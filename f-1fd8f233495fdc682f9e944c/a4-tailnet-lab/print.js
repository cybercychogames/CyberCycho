(() => {
  const $ = id => document.getElementById(id);
  let selected = null, selectedOrigin = '', file = null, blobUrl = '', loading = false, sharing = false, controller = null;
  const updateButton = () => {$('print-second').disabled = !file || !$('confirm-paper').checked || sharing;};
  function reset() {
    controller?.abort(); controller = null;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    file = null; blobUrl = ''; loading = false;
    $('confirm-paper').checked = false;
    $('open-print-pdf').hidden = true;
    $('retry-print-file').hidden = true;
    updateButton();
  }
  async function prepare() {
    if (!selected?.print_url || loading || file) return;
    const id = selected.id, origin = selectedOrigin;
    loading = true; controller = new AbortController();
    const current = controller;
    const timeout = setTimeout(() => current.abort(), 30000);
    $('print-status').textContent = '正在下载完整 A4 补印 PDF…';
    $('retry-print-file').hidden = true;
    try {
      const response = await fetch(origin + selected.print_url, {cache:'no-store', signal:current.signal});
      if (!response.ok) throw new Error(`下载失败 ${response.status}`);
      const blob = await response.blob();
      if (!blob.size || !(await blob.slice(0,5).text()).startsWith('%PDF-')) throw new Error('返回的文件不是有效 PDF');
      if (selected?.id !== id || selectedOrigin !== origin) return;
      file = new File([blob], `A4-二次补印-${id.slice(0,8)}.pdf`, {type:'application/pdf'});
      blobUrl = URL.createObjectURL(file);
      $('open-print-pdf').href = blobUrl;
      $('open-print-pdf').hidden = false;
      $('print-status').textContent = '补印 PDF 已下载到本页。保持 iPad 与打印机连接，即可核对后点“二次打印”；稍后打印可先保存到“文件”。';
    } catch (error) {
      if (selected?.id !== id || selectedOrigin !== origin) return;
      $('print-status').textContent = `补印文件尚未下载：${error.message}。连接 Mac 后重试。`;
      $('retry-print-file').hidden = false;
    } finally {
      clearTimeout(timeout);
      if (controller === current) {loading = false; updateButton();}
    }
  }
  window.addEventListener('a4-job', event => {
    const {job, origin} = event.detail;
    if (selected?.id !== job?.id || origin !== selectedOrigin) reset();
    selected = job; selectedOrigin = origin;
    if (job?.status === 'completed' && job.print_url) prepare();
    else if (job?.print_error) $('print-status').textContent = job.print_error;
    else $('print-status').textContent = '生成完成后，自动准备 A4 右侧补印文件。';
  });
  $('connect-printer').addEventListener('click', () => $('printer-dialog').showModal());
  $('confirm-paper').addEventListener('change', updateButton);
  $('retry-print-file').addEventListener('click', prepare);
  $('print-second').addEventListener('click', async () => {
    if (!file || !$('confirm-paper').checked || sharing) return;
    sharing = true; updateButton();
    try {
      if (navigator.share && navigator.canShare?.({files:[file]})) {
        await navigator.share({files:[file]});
        $('print-status').textContent = '已交给 iPad 分享菜单。请在 Epson App 中确认打印；本页无法读取打印机回执。';
      } else {
        window.open(blobUrl, '_blank', 'noopener');
        $('print-status').textContent = '已打开 A4 补印 PDF。请用分享菜单交给 Epson App，或保存到“文件”后从 App 打开。';
      }
    } catch (error) {
      $('print-status').textContent = error.name === 'AbortError' ? '已取消分享，补印文件仍在本页。' : '未能打开分享菜单，请使用下方“打开 / 保存 A4 补印 PDF”。';
    } finally {sharing = false; updateButton();}
  });
})();
