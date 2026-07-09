// src/modules/builder/editor/sensorRenderer.js

const STATUS_COLORS = {
  normal: '#6b8c5c',
  warning: '#d4a373',
  error: '#e07a5f',
}

const STATUS_LABELS = {
  normal: '正常',
  warning: '注意',
  error: '异常',
}

export function renderSensorMarkup(component) {
  const { props, width, height } = component
  const { title, sensors } = props

  const sensorCards = sensors.map((s, i) => {
    const color = STATUS_COLORS[s.status] || STATUS_COLORS.normal
    const label = STATUS_LABELS[s.status] || s.status
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9f7f3;border-radius:8px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:2px;">${esc(s.name)}</div>
          <span style="font-size:11px;padding:1px 8px;border-radius:50px;color:#fff;background:${color};">${label}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:22px;font-weight:700;color:#333;">${s.value}</span>
          <span style="font-size:13px;color:#888;margin-left:2px;">${esc(s.unit)}</span>
        </div>
      </div>`
  }).join('')

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;overflow:hidden;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#4d6b3e;">${esc(title)}</h3>
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;overflow-y:auto;">
        ${sensorCards}
      </div>
    </div>`
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
