// src/modules/builder/editor/timelineRenderer.js

const COLORS = [
  '#2f80ed', '#56ccf2', '#6fcf97', '#f2c94c',
  '#9b51e0', '#eb5757', '#f2994a', '#2c7da0',
  '#6fcf97', '#5d9cec',
]

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderTimelineMarkup(component) {
  const { props, width, height } = component
  const { title, events } = props

  if (!events || events.length === 0) {
    return `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);color:#687b8b;font-size:14px;">
        暂无事件
      </div>`
  }

  const n = events.length
  const lineY = height * 0.38
  const cardW = Math.min(200, (width - 40) / Math.max(n, 1) - 16)
  const stepX = (width - 20) / Math.max(n, 1)

  let eventHtml = ''
  events.forEach((ev, i) => {
    const cx = 10 + stepX * i + stepX / 2
    const isAbove = i % 2 === 0
    const color = COLORS[i % COLORS.length]
    const cardTop = isAbove ? 12 : lineY + 28
    const cardH = Math.min(80, (height - lineY - 40))

    eventHtml += `
      <div class="timeline-event" style="position:absolute;left:${cx}px;top:0;width:0;height:100%;pointer-events:none;">
        <!-- connector line from dot to card -->
        <div style="position:absolute;left:0;top:${isAbove ? cardTop + cardH : lineY}px;width:1px;height:${isAbove ? lineY - cardTop - cardH : cardTop - lineY}px;background:${color};opacity:0.3;transform:translateX(-0.5px);"></div>
        <!-- dot on timeline -->
        <div style="position:absolute;left:-7px;top:${lineY - 7}px;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px ${color}22;pointer-events:auto;"></div>
        <!-- card -->
        <div style="position:absolute;left:${-cardW / 2}px;top:${cardTop}px;width:${cardW}px;background:rgba(44,125,160,0.03);border:1px solid rgba(44,125,160,0.06);border-radius:10px;padding:10px 12px;pointer-events:auto;">
          <div style="font-size:10px;color:#687b8b;margin-bottom:3px;">${esc(ev.date)}</div>
          <div style="font-size:13px;font-weight:700;color:#1c2834;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(ev.title)}</div>
          <div style="font-size:11px;color:#627586;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(ev.description)}</div>
        </div>
      </div>`
  })

  // 时间轴线
  const lineHtml = `<div style="position:absolute;left:20px;right:20px;top:${lineY}px;height:2px;background:#a5d7e4;border-radius:1px;"></div>`

  let titleHtml = ''
  if (title) {
    titleHtml = `<h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1c2834;padding:0 4px;">${esc(title)}</h3>`
  }

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:16px 20px;box-sizing:border-box;overflow:hidden;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);">
      ${titleHtml}
      <div style="flex:1;position:relative;min-height:0;">
        ${lineHtml}
        ${eventHtml}
      </div>
    </div>`
}
