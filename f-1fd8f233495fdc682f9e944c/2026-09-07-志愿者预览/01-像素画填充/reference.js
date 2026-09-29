(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const roles = JSON.parse($('role-data').textContent);
  const byId = new Map(roles.map(role => [role.id, role]));
  let selected = null, currentImage = null;
  const normalize = value => {
    const text = String(value).trim().replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xFF10));
    return /^(?:0?[1-9]|[1-3][0-9]|40)$/.test(text) ? text.padStart(2, '0') : null;
  };
  function remember(id) {
    try {
      const url = new URL(location.href);
      if (id) url.searchParams.set('role', id); else url.searchParams.delete('role');
      history.replaceState(null, '', url);
    } catch (_) { /* Local-file previews can still work without history. */ }
  }
  function message(text, error=false) {
    $('lookup-status').textContent = text;
    $('lookup-status').className = 'status' + (error ? ' error' : '');
    $('role-number').setAttribute('aria-invalid', String(error));
  }
  function clearSelection() {
    selected = null; currentImage = null;
    $('preview').hidden = true; $('open-image').hidden = true;
    $('role-select').value = '';
    document.querySelectorAll('[data-role]').forEach(card => card.removeAttribute('aria-current'));
    remember(null);
  }
  function loadImage(role) {
    const picture = new Image(800, 800);
    currentImage = picture;
    picture.id = 'preview-image'; picture.alt = `${role.id} 号 ${role.name}，与底纸对应的彩色效果图`;
    picture.hidden = true;
    $('preview-image').replaceWith(picture);
    $('image-status').hidden = false;
    $('image-status').textContent = `正在载入 ${role.id} 号效果图…`;
    $('retry-image').hidden = true; $('open-image').hidden = true;
    picture.onload = () => {
      if (currentImage !== picture || selected !== role.id) return;
      picture.hidden = false; $('image-status').hidden = true; $('open-image').hidden = false;
    };
    picture.onerror = () => {
      if (currentImage !== picture || selected !== role.id) return;
      $('image-status').textContent = `${role.id} 号图片暂未载入，请检查网络后重试。`;
      $('retry-image').hidden = false;
    };
    const path = '../../a4-tailnet-lab/' + role.image;
    $('open-image').href = path; picture.src = path;
  }
  function choose(value, scroll=true) {
    const id = normalize(value), role = byId.get(id);
    if (!role) {
      clearSelection();
      message('请输入底纸上的 01–40 号角色编号，例如 7 或 07。', true);
      return false;
    }
    selected = id; $('role-number').value = id; $('role-select').value = id;
    $('preview-title').textContent = `${id} 号 · ${role.name}`;
    $('preview-feature').textContent = `认一认轮廓：${role.feature}。配色可以自由改变。`;
    $('preview').hidden = false;
    document.querySelectorAll('[data-role]').forEach(card => {
      if (card.dataset.role === id) card.setAttribute('aria-current', 'true'); else card.removeAttribute('aria-current');
    });
    message(`已找到 ${id} 号 ${role.name}，请核对孩子手上的底纸。`);
    remember(id); loadImage(role);
    if (scroll) { $('role-number').blur(); $('preview').scrollIntoView({block:'start'}); }
    return true;
  }
  $('lookup-form').addEventListener('submit', event => { event.preventDefault(); choose($('role-number').value); });
  $('role-select').addEventListener('change', event => {
    if (event.target.value) choose(event.target.value);
    else { clearSelection(); $('role-number').value = ''; message('请选择孩子底纸上的编号。'); }
  });
  $('role-number').addEventListener('input', () => {
    if (selected && normalize($('role-number').value) !== selected) clearSelection();
    message('输入底纸编号后，点“看效果图”。');
  });
  document.querySelectorAll('[data-role]').forEach(card => card.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); choose(card.dataset.role);
  }));
  $('retry-image').addEventListener('click', () => { if (selected) loadImage(byId.get(selected)); });
  function reset() {
    clearSelection(); $('role-number').value = '';
    message('下一位来啦，请重新核对底纸编号。');
    $('lookup-title').scrollIntoView({block:'start'}); $('role-number').focus({preventScroll:true});
  }
  $('next-child').addEventListener('click', reset);
  $('change-role').addEventListener('click', reset);
  document.querySelector('a[href="#all-roles"]').addEventListener('click', () => { $('all-roles').open = true; });
  const initial = new URLSearchParams(location.search).get('role');
  if (initial !== null) choose(initial, false);
})();
