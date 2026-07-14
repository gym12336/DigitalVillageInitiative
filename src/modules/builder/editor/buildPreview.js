// src/modules/builder/editor/buildPreview.js
export function buildAndOpen(state) {
  const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 8)
  window.__previewState = window.__previewState || {}
  window.__previewState[id] = state
  window.open('#' + '/builder/preview?id=' + id, '_blank')
}
