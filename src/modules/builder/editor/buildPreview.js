// src/modules/builder/editor/buildPreview.js
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderComponentHtml(c) {
  let inner = ''
  const p = c.props
  switch (c.type) {
    case 'text':
      inner = `<div style="width:100%;height:100%;display:flex;align-items:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};padding:12px;box-sizing:border-box;font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};text-align:${p.textAlign};background:${p.backgroundColor};border-radius:4px;overflow:hidden;word-wrap:break-word;">${esc(p.text)}</div>`
      break
    case 'image':
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" style="width:100%;height:100%;object-fit:${p.objectFit};border-radius:${p.borderRadius}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2ede4;color:#8a8a8a;font-size:13px;border-radius:${p.borderRadius}px;">图片占位</div>`
      }
      break
    case 'chart':
      inner = renderChartSvg(c)
      break
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
  }
  return `<div style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px;overflow:hidden;">${inner}</div>`
}

export function buildPreviewHtml(state) {
  const componentsHtml = state.components.map(c => renderComponentHtml(c)).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>成果预览</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "LXGW WenKai", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #e8e4dc; display: flex; justify-content: center; padding: 40px;
}
.stage {
  position: relative; width: ${state.pageWidth}px; height: ${state.pageHeight}px;
  background: ${state.pageBackground}; box-shadow: 0 12px 48px rgba(77,107,62,0.14);
  overflow: hidden;
}
</style>
</head>
<body>
<div class="stage">
${componentsHtml}
</div>
</body>
</html>`
}

export function buildAndOpen(state) {
  const html = buildPreviewHtml(state)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
