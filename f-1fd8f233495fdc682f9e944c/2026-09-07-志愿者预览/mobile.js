(() => {
  const $ = id => document.getElementById(id);
  const kind = document.body.dataset.activity;
  const bar = document.querySelector('.play-bar');
  function goTo(id) { $(id)?.scrollIntoView({block:'start',behavior:'instant'}); }
  document.querySelectorAll('[data-start-play], .tabs a[href="#demo"]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    document.body.classList.add('playing'); bar.hidden = false; goTo('demo');
  }));
  document.querySelector('[data-exit-play]').addEventListener('click', () => {
    document.body.classList.remove('playing'); bar.hidden = true;
    document.querySelector('.quick-start').scrollIntoView({block:'start'});
  });
  document.querySelector('[data-next-child]').addEventListener('click', () => {
    if (kind === 'pixel') $('pixel-reset').click();
    if (kind === 'monster') document.querySelector('[data-monster-reset]').click();
    if (kind === 'museum') $('next-game').click();
    goTo('demo');
  });
  if (kind === 'pixel') {
    const picker = $('pixel-region');
    picker.value = window.matchMedia('(max-width:760px)').matches ? '0' : 'all';
    window.applyPixelView = () => {
      const region = activity.reveal ? 'all' : picker.value;
      const enlarged = region !== 'all';
      const row = enlarged ? Math.floor(Number(region) / 2) * 8 : 0;
      const col = enlarged ? (Number(region) % 2) * 8 : 0;
      $('pixel-grid').classList.toggle('zoomed', enlarged);
      let first = null;
      document.querySelectorAll('[data-cell]').forEach(cell => {
        const i = Number(cell.dataset.cell), r = Math.floor(i / 16), c = i % 16;
        cell.hidden = enlarged && (r < row || r >= row + 8 || c < col || c >= col + 8);
        cell.tabIndex = -1;
        if (!first && !cell.hidden && (activity.mode === 'free' || activity.target[i])) first = cell;
      });
      if (first) first.tabIndex = 0;
      picker.disabled = activity.reveal;
      $('pixel-region-note').textContent = activity.reveal ? '正在查看完整效果；返回填色后恢复放大区域。' : enlarged ? `第 ${row+1}–${row+8} 行，第 ${col+1}–${col+8} 列；换区会保留已填颜色。` : '整幅预览；格子太小时，选一个区域放大再点。';
    };
    picker.addEventListener('change', () => window.applyPixelView());
    $('pixel-reset').addEventListener('click', () => {
      picker.value = window.matchMedia('(max-width:760px)').matches ? '0' : 'all';
      window.applyPixelView();
    });
    window.applyPixelView();
  }
  if (kind === 'museum') {
    // Load every local picture while connected, including the lazy thumbnails.
    GAMES.forEach(game => { const picture = new Image(); picture.src = game.image; });
    const link = document.createElement('a');
    link.className = 'museum-view-link'; link.textContent = '打开大图 / 双指放大';
    link.target = '_blank'; link.rel = 'noopener';
    link.addEventListener('click', () => { link.href = $('game-image').src; });
    window.updateMuseumLink = () => { link.href = $('game-image').src; };
    window.updateMuseumLink();
    document.querySelector('.game-caption').prepend(link);
    $('game-view').addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); const box = event.currentTarget.getBoundingClientRect();
      event.currentTarget.dispatchEvent(new MouseEvent('click', {clientX:box.left + box.width / 2,clientY:box.top + box.height / 2,bubbles:true}));
    });
  }
})();
