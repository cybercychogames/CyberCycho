(function(root) {
  // Keep delayed model responses from replacing a newer idea or a child's edits.
  function create(options) {
    let pending = null, lastKey = '', revision = 0;
    const manual = {title:false, caption:false};
    const keyOf = value => JSON.stringify([value.origin, value.role_id, value.prompt.trim()]);
    return {
      edit(field) { manual[field] = true; },
      changed() { lastKey = ''; for (const field of ['title','caption']) if (!manual[field]) options.fill(field, ''); },
      snapshot() { return {...manual}; },
      restore(flags={title:true,caption:true}) {
        revision++; lastKey = keyOf(options.read());
        manual.title = flags.title === true; manual.caption = flags.caption === true;
      },
      async suggest(force=false) {
        const value = options.read(), key = keyOf(value), ticket = revision;
        if (!value.role_id || !value.prompt.trim() || !value.connected) return false;
        if (pending) { options.report('文案正在提炼，请稍候。'); return false; }
        if (!force && key === lastKey) return true;
        if (!force && manual.title && manual.caption) return true;
        const request = options.request({role_id:value.role_id, prompt:value.prompt.trim()});
        pending = request; options.busy(true); options.report('正在从你的想法提炼作品名和一句话…');
        // A forced refresh replaces existing text only if it wasn't edited after clicking.
        if (force) {manual.title = false; manual.caption = false;}
        try {
          const result = await request;
          if (ticket !== revision || key !== keyOf(options.read())) {
            options.report('想法已变化，完成输入后会重新提炼。'); return false;
          }
          for (const field of ['title', 'caption']) {
            if (!manual[field]) options.fill(field, result[field]);
          }
          lastKey = key;
          options.report('已提炼好，可以修改；这些文字会印在作品上。');
          return true;
        } catch (_) {
          options.report('智能提炼暂不可用，请手动填写作品名和一句话，或点击“重新提炼”。');
          return false;
        } finally { pending = null; options.busy(false); }
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {create};
  else root.WorkCopy = {create};
})(typeof window !== 'undefined' ? window : globalThis);
