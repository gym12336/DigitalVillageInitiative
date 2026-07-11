// src/modules/builder/editor/sensorRenderer.js

const STATUS_COLORS = {
  normal: '#6fcf97',
  warning: '#f2c94c',
  error: '#eb5757',
}

const STATUS_LABELS = {
  normal: '正常',
  warning: '注意',
  error: '异常',
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderSensorMarkup(component) {
  const { props, width, height } = component
  const { title, sensors } = props

  const sensorCards = sensors.map((s) => {
    const color = STATUS_COLORS[s.status] || STATUS_COLORS.normal
    const label = STATUS_LABELS[s.status] || s.status
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(230,249,242,0.08);border-radius:12px;border:1px solid rgba(165,215,228,0.06);">
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:500;color:rgba(255,255,255,0.7);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.name)}</div>
          <span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 10px;border-radius:999px;color:${color};background:${hexToRgba(color, 0.15)};">${label}</span>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px;">
          <span style="font-size:24px;font-weight:700;color:#ffffff;line-height:1;">${s.value}</span>
          <span style="font-size:13px;color:rgba(255,255,255,0.45);margin-left:3px;">${esc(s.unit)}</span>
        </div>
      </div>`
  }).join('')

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;overflow:hidden;background:linear-gradient(135deg, rgba(7,35,49,0.96), rgba(18,74,93,0.92));border-radius:18px;box-shadow:inset 0 0 0 1px rgba(165,215,228,0.08);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:10px;font-weight:700;color:#a5d7e4;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;">SENSORS / DATA</span>
        <span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 10px;border-radius:999px;color:#c8e8f0;background:rgba(165,215,228,0.12);">手动</span>
      </div>
      <h3 style="margin:0 0 14px;font-size:17px;font-weight:800;color:#ffffff;letter-spacing:0.02em;line-height:1.3;">${esc(title)}</h3>
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;overflow-y:auto;">
        ${sensorCards}
      </div>
    </div>`
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
