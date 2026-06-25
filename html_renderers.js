// Centralized trusted HTML sinks for receipt, print and report output.
(function(root){
  'use strict';

  function resolveTarget(target){
    if(!root.document) return null;
    if(typeof target === 'string') return root.document.getElementById(target);
    return target || null;
  }

  function setTrustedHtml(target, html){
    const el = resolveTarget(target);
    if(!el) return;
    el.innerHTML = html == null ? '' : String(html);
  }

  function setTrustedHtmlById(id, html){
    setTrustedHtml(id, html);
  }

  root.BK_HTML_RENDERERS = {
    setTrustedHtml,
    setTrustedHtmlById
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_HTML_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
