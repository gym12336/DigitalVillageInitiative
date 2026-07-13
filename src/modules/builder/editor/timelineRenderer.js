// src/modules/builder/editor/timelineRenderer.js

import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'
import { renderDatatableMarkup } from './datatableRenderer.js'

const COLORS = [
  '#2f80ed', '#56ccf2', '#6fcf97', '#f2c94c',
  '#9b51e0', '#eb5757', '#f2994a', '#2c7da0',
  '#6fcf97', '#5d9cec',
]

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderChildHtml(child, w, h) {
  if (!child) return ''
  const p = child.props || {}
  let inner = ''
  switch (child.type) {
    case 'text':
      inner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;font-size:${p.fontSize || 14}px;color:${p.color || '#1f2937'};font-weight:${p.fontWeight || 400};text-align:${p.textAlign || 'center'};background:${p.backgroundColor || 'transparent'};border-radius:4px;overflow:hidden;word-wrap:break-word;">${esc(p.text || '')}</div>`
      break
    case 'image':
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt || '')}" draggable="false" style="width:100%;height:100%;object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || 0}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2f6f8;color:#687b8b;font-size:12px;">图片占位</div>`
      }
      break
    case 'chart':
      inner = renderChartSvg({ type: 'chart', x: 0, y: 0, width: w, height: h, props: p })
      break
    case 'agri-sensor':
      inner = renderSensorMarkup({ type: 'agri-sensor', x: 0, y: 0, width: w, height: h, props: p })
      break
    case 'timeline':
      inner = renderTimelineMarkup({ type: 'timeline', x: 0, y: 0, width: w, height: h, props: p })
      break
    case 'datatable':
      inner = renderDatatableMarkup({ type: 'datatable', x: 0, y: 0, width: w, height: h, props: p })
      break
  }
  return inner
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

  const uid = Math.random().toString(36).slice(2, 8)

  let eventHtml = ''
  events.forEach((ev, i) => {
    const cx = 10 + stepX * i + stepX / 2
    const isAbove = i % 2 === 0
    const color = COLORS[i % COLORS.length]
    const cardTop = isAbove ? 12 : lineY + 28
    const cardH = Math.min(80, (height - lineY - 40))

    // Popup dimensions from event (with fallback)
    const popW = ev.popupWidth || 280
    const popH = ev.popupHeight || 200
    const hasChild = ev.child && ev.child.type

    // Popup: prefer right side; flip left if near right edge
    const popupGap = 12
    const popRightEdge = cx + cardW / 2 + popupGap + popW
    const flipLeft = popRightEdge > width - 20
    const popTop = cardTop - Math.max(0, (popH - cardH) / 2)

    // Hover zone: card-sized only (popup triggers on card hover, not zone hover)
    const zoneLeft = -cardW / 2
    const zoneTop = cardTop
    const zoneW = cardW
    const zoneH = cardH

    // Card at origin of zone
    const cardLeftInZone = 0
    const cardTopInZone = 0

    // Popup positioned relative to zone (card) edges
    const popupLeftInZone = flipLeft ? -popW - popupGap : cardW + popupGap
    const popupTopInZone = hasChild ? popTop - cardTop : 0

    let popupHtml = ''
    if (hasChild) {
      const childInner = renderChildHtml(ev.child, popW - 16, popH - 16)
      popupHtml = `
        <div class="tl-popup-${uid}" style="
          position:absolute;
          left:${popupLeftInZone}px;
          top:${popupTopInZone}px;
          width:${popW}px;
          height:${popH}px;
          background:#fff;
          border-radius:12px;
          box-shadow:0 4px 24px rgba(0,0,0,0.15);
          padding:8px;
          box-sizing:border-box;
          overflow:hidden;
          pointer-events:none;
          z-index:10;
        ">${childInner}</div>`
    }

    eventHtml += `
      <div class="timeline-event" style="position:absolute;left:${cx}px;top:0;width:0;height:100%;pointer-events:none;">
        <!-- connector line -->
        <div style="position:absolute;left:0;top:${isAbove ? cardTop + cardH : lineY}px;width:1px;height:${isAbove ? lineY - cardTop - cardH : cardTop - lineY}px;background:${color};opacity:0.3;transform:translateX(-0.5px);"></div>
        <!-- dot -->
        <div style="position:absolute;left:-7px;top:${lineY - 7}px;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px ${color}22;pointer-events:auto;"></div>
        <!-- card wrapper (popup is sibling) -->
        <div class="tl-hover-${uid}" style="position:absolute;left:${zoneLeft}px;top:${zoneTop}px;width:${zoneW}px;height:${zoneH}px;pointer-events:auto;z-index:1;">
          <!-- card -->
          <div class="tl-card-${uid}" style="position:absolute;left:${cardLeftInZone}px;top:${cardTopInZone}px;width:${cardW}px;background:rgba(44,125,160,0.03);border:1px solid rgba(44,125,160,0.06);border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#687b8b;margin-bottom:3px;">${esc(ev.date)}</div>
            <div style="font-size:13px;font-weight:700;color:#1c2834;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(ev.title)}</div>
            <div style="font-size:11px;color:#627586;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(ev.description)}</div>
          </div>
          ${popupHtml}
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
    <style>
      .tl-popup-${uid} { opacity: 0; transform: translateY(4px); transition: opacity 0.2s ease, transform 0.2s ease; pointer-events: none; }
      .tl-card-${uid}:hover ~ .tl-popup-${uid} { opacity: 1; transform: translateY(0); }
      .tl-card-${uid}:hover { border-color: rgba(44,125,160,0.18) !important; background: rgba(44,125,160,0.06) !important; }
    </style>
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:16px 20px;box-sizing:border-box;overflow:hidden;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);">
      ${titleHtml}
      <div style="flex:1;position:relative;min-height:0;">
        ${lineHtml}
        ${eventHtml}
      </div>
    </div>`
}
