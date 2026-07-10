// 低代码可视化平台 · 导出层
// toJSON(work)            —— 作品对象原样序列化（免费副产品）
// toStaticSite(rendered)  —— 把渲染描述打包成自带 HTML/CSS 的单文件静态页（脱离平台可展示）
//
// 关键：toStaticSite 消费的是 renderer.renderWork 的输出（渲染描述），
// 与工作台里 Vue 消费的是同一棵树——「一套渲染逻辑，两个消费端」。
// 这里只做「渲染描述 → HTML 字符串」的摆放，不含任何派生计算（都在 renderer 里算完了）。

/** 作品 JSON 序列化。 */
export function toJSON(work, pretty = true) {
  return JSON.stringify(work, null, pretty ? 2 : 0)
}

/** HTML 转义，防注入（作品文字可能来自用户/AI）。 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 生成单文件静态站点 HTML 字符串。
 * @param {object} rendered - renderWork 的输出 { title, cols, nodes }
 * @returns 完整 HTML 文档字符串（双击即可用浏览器打开）
 */
export function toStaticSite(rendered) {
  const r = rendered || { title: '未命名成果', cols: 12, nodes: [] }
  const cols = r.cols || 12
  const body = (r.nodes || []).map((n) => renderNode(n, cols)).join('\n')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(r.title)}</title>
<style>${STATIC_CSS(cols)}</style>
</head>
<body>
<main class="work">
${body}
</main>
</body>
</html>`
}

/** 一个组件节点 → 一个栅格格子的 HTML。 */
function renderNode(node, cols) {
  const g = node.grid || { x: 0, y: 0, w: cols, h: 1 }
  const style = `grid-column:${g.x + 1} / span ${Math.min(g.w, cols)};`
  return `<section class="cell" style="${style}">${renderInner(node)}</section>`
}

function renderInner(node) {
  const v = node.view || {}
  switch (node.type) {
    case 'heading': {
      const tag = ['h1', 'h2', 'h3'].includes(v.level) ? v.level : 'h2'
      const c = v.color ? `;color:${esc(v.color)}` : ''
      return `<${tag} class="c-heading" style="text-align:${v.align || 'left'}${c}">${esc(v.text)}</${tag}>`
    }
    case 'text': {
      const size = { small: '.82rem', large: '1.15rem' }[v.size] || '.9rem'
      const c = v.color ? `;color:${esc(v.color)}` : ''
      return `<p class="c-text" style="text-align:${v.align || 'left'};font-size:${size}${c}">${esc(v.content)}</p>`
    }
    case 'image': {
      const radius = { none: '0', large: '18px' }[v.radius] ?? '10px'
      return v.src
        ? `<figure class="c-image"><img src="${esc(v.src)}" alt="${esc(v.alt)}" style="object-fit:${v.fit === 'contain' ? 'contain' : 'cover'};border-radius:${radius}"/>${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ''}</figure>`
        : `<div class="c-image placeholder">图片待补充</div>`
    }
    case 'kpiGrid':
      return card(v.title, v.missing, kpiInner(v.items, v.accent))
    case 'beforeAfter':
      return card(v.title, v.missing, beforeAfterInner(v.items, v.accent))
    case 'timeline':
      return card(v.title, v.missing, timelineInner(v.events, v.accent))
    case 'peopleWall':
      return card(v.title, v.missing, peopleInner(v.people, v.columns))
    case 'mapPoint':
      return card(v.title, v.missing, mapInner(v.place, v.accent))
    default:
      return ''
  }
}

/** 大组件统一卡片外壳 + 缺失兜底。 */
function card(title, missing, inner) {
  const head = title ? `<h3 class="card-title">${esc(title)}</h3>` : ''
  if (missing) return `<div class="card">${head}<p class="待补充">该组件的数据源为空，待补充。</p></div>`
  return `<div class="card">${head}${inner}</div>`
}

function kpiInner(items, accent) {
  const c = accent ? ` style="color:${esc(accent)}"` : ''
  return `<div class="kpi-grid">${(items || [])
    .map((k) => `<div class="kpi${k.isHighlight ? ' hi' : ''}"><span class="kpi-num"${c}>${esc(k.value)}<i>${esc(k.unit)}</i></span><span class="kpi-label">${esc(k.name)}</span>${k.insight ? `<span class="kpi-insight">${esc(k.insight)}</span>` : ''}</div>`)
    .join('')}</div>`
}

function beforeAfterInner(items, accent) {
  const c = accent ? `;background:${esc(accent)}` : ''
  return `<div class="cmp-list">${(items || [])
    .map(
      (m) => `<div class="cmp-row"><div class="cmp-head"><span>${esc(m.name)}</span><span class="${m.up ? 'up' : m.down ? 'down' : ''}">${esc(m.deltaLabel)}</span></div>
${m.insight ? `<p class="cmp-insight">${esc(m.insight)}</p>` : ''}
<div class="bar-line"><span class="bar-tag">前</span><div class="bar-track"><div class="bar before" style="width:${m.beforePct}%"></div></div><span>${esc(m.before)}${esc(m.unit)}</span></div>
<div class="bar-line"><span class="bar-tag">后</span><div class="bar-track"><div class="bar after" style="width:${m.afterPct}%${c}"></div></div><span>${esc(m.after)}${esc(m.unit)}</span></div></div>`,
    )
    .join('')}</div>`
}

function timelineInner(events, accent) {
  const c = accent ? ` style="background:${esc(accent)}"` : ''
  return `<ol class="timeline">${(events || [])
    .map((t) => `<li><span class="tl-dot"${c}></span><div><p class="tl-name">${esc(t.name)}</p>${t.summary ? `<p class="tl-note">${esc(t.summary)}</p>` : (t.note ? `<p class="tl-note">${esc(t.note)}</p>` : '')}<span class="tl-type">${esc(t.theme || t.type)}</span></div></li>`)
    .join('')}</ol>`
}

function peopleInner(people, columns) {
  const grid = columns && columns >= 2 ? ` style="grid-template-columns:repeat(${columns},1fr)"` : ''
  return `<div class="people-wall"${grid}>${(people || [])
    .map((p) => `<article class="person"><div class="avatar" style="background:${esc(p.color)}">${esc(p.initial)}</div><p class="person-name">${esc(p.name)}${p.role ? `<span class="person-role"> · ${esc(p.role)}</span>` : ''}</p>${p.highlight ? `<span class="person-tag">${esc(p.highlight)}</span>` : ''}${p.story ? `<p class="person-story">${esc(p.story)}</p>` : (p.quote ? `<p class="person-quote">“${esc(p.quote)}”</p>` : '')}</article>`)
    .join('')}</div>`
}

function mapInner(place, accent) {
  const c = accent ? ` style="color:${esc(accent)}"` : ''
  return `<div class="map-point"><span class="map-pin">📍</span><span class="map-place"${c}>${esc(place)}</span></div>`
}

/** 内联样式：栅格 + 暖绿主题的静态精简版（脱离平台自包含）。 */
function STATIC_CSS(cols) {
  return `
:root{--green:#6b8c5c;--green-dark:#4d6b3e;--bg:#faf8f5;--card:#fff;--border:#ede8e0;--text:#1e1e1e;--muted:#5a5a5a;--accent:#e8c99b;--coral:#e07a5f}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.7}
.work{max-width:1080px;margin:0 auto;padding:2.4rem clamp(1rem,4vw,2rem);display:grid;grid-template-columns:repeat(${cols},1fr);gap:1.2rem}
.cell{min-width:0}
.card{padding:1.4rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.05);height:100%}
.card-title{margin:0 0 1rem;font-size:1.05rem;color:var(--green-dark)}
.待补充{color:#8a8a8a;font-size:.86rem}
.c-heading{color:var(--green-dark);margin:0}
.c-text{color:var(--muted);margin:0}
.c-image img{width:100%;border-radius:12px}
.c-image figcaption{font-size:.8rem;color:#8a8a8a;text-align:center;margin-top:.4rem}
.c-image.placeholder{display:grid;place-items:center;height:100%;min-height:120px;color:#8a8a8a;background:var(--card);border:1px dashed var(--border);border-radius:12px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.8rem}
.kpi{display:flex;flex-direction:column;gap:.3rem;padding:1rem .8rem;text-align:center;background:var(--bg);border-radius:12px}
.kpi.hi{background:var(--accent);box-shadow:inset 0 0 0 1px var(--green)}
.kpi-num{font-size:1.5rem;font-weight:700;color:var(--green-dark)}
.kpi-num i{font-size:.85rem;font-style:normal;color:#8a8a8a;margin-left:2px}
.kpi-label{font-size:.8rem;color:var(--muted)}
.kpi-insight{font-size:.72rem;color:var(--green-dark);line-height:1.4;margin-top:.2rem}
.cmp-insight{margin:0 0 .4rem;font-size:.78rem;color:var(--green-dark);line-height:1.5}
.person-tag{font-size:.68rem;color:#fff;background:var(--green);padding:.1rem .5rem;border-radius:50px}
.person-story{margin:.1rem 0 0;font-size:.78rem;color:var(--muted);line-height:1.5;text-align:left}
.cmp-list{display:flex;flex-direction:column;gap:1rem}
.cmp-head{display:flex;justify-content:space-between;font-size:.9rem;font-weight:600;margin-bottom:.4rem}
.cmp-head .up{color:var(--green)}.cmp-head .down{color:var(--coral)}
.bar-line{display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;font-size:.78rem;color:var(--muted)}
.bar-tag{width:1.4em;color:#8a8a8a}
.bar-track{flex:1;height:12px;background:var(--bg);border-radius:50px;overflow:hidden}
.bar{height:100%;border-radius:50px}
.bar.before{background:#cdd6c4}.bar.after{background:var(--green)}
.timeline{list-style:none;margin:0;padding:0}
.timeline li{position:relative;padding:0 0 1rem 1.4rem;border-left:2px solid var(--border)}
.timeline li:last-child{border-left-color:transparent;padding-bottom:0}
.tl-dot{position:absolute;left:-6px;top:3px;width:10px;height:10px;border-radius:50%;background:var(--green)}
.tl-name{margin:0;font-size:.9rem;font-weight:600}
.tl-note{margin:.2rem 0;font-size:.82rem;color:var(--muted)}
.tl-type{font-size:.72rem;color:var(--green);background:var(--accent);padding:.1rem .5rem;border-radius:50px}
.people-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.9rem}
.person{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:1rem .6rem;text-align:center;background:var(--bg);border-radius:12px}
.avatar{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;color:#fff;font-size:1.1rem;font-weight:700}
.person-name{margin:0;font-size:.88rem;font-weight:600}
.person-role{font-weight:400;color:#8a8a8a}
.person-quote{margin:0;font-size:.8rem;color:var(--muted)}
.map-point{display:flex;align-items:center;gap:.6rem;padding:1.2rem;background:var(--bg);border-radius:12px}
.map-pin{font-size:1.6rem}
.map-place{font-size:1.05rem;font-weight:600;color:var(--green-dark)}
@media(max-width:640px){.work{grid-template-columns:1fr}.cell{grid-column:1/-1 !important}}
`
}
