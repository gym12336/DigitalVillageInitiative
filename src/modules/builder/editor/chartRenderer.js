// src/modules/builder/editor/chartRenderer.js

const COLORS = [
  '#6b8c5c', '#d4a373', '#4a8fbf', '#e07a5f', '#8a9a5b',
  '#b07d62', '#5b8a9a', '#c9a86a', '#9a5b8a', '#6b9a5b',
]

export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  const valueIdx = headers.indexOf('value')
  if (labelIdx === -1 || valueIdx === -1) return []
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      label: cols[labelIdx] || '',
      value: parseFloat(cols[valueIdx]) || 0,
    }
  })
}

export function renderBarChart(data, w, h, { title = '' } = {}) {
  const pad = { top: 40, right: 20, bottom: 50, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barGap = 8
  const barW = Math.max(4, (chartW - barGap * (data.length + 1)) / data.length)

  let bars = ''
  data.forEach((d, i) => {
    const bh = (d.value / maxVal) * chartH
    const bx = pad.left + barGap + i * (barW + barGap)
    const by = pad.top + chartH - bh
    bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" fill="${COLORS[i % COLORS.length]}" rx="2"/>`
    bars += `<text x="${bx + barW / 2}" y="${by - 6}" text-anchor="middle" font-size="11" fill="#666">${d.value}</text>`
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#888">${d.label}</text>`
  })

  // Y axis
  const yTicks = 4
  let yAxis = ''
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxVal / yTicks) * i)
    const yy = pad.top + chartH - (i / yTicks) * chartH
    yAxis += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#999">${val}</text>`
    yAxis += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="#eee" stroke-dasharray="3,3"/>`
  }

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    ${titleSvg}
    ${yAxis}
    ${bars}
  </svg>`
}

export function renderPieChart(data, w, h, { title = '' } = {}) {
  const cx = w / 2
  const cy = h / 2 + (title ? 12 : 0)
  const r = Math.min(w, h) / 2 - 40
  const total = data.reduce((s, d) => s + d.value, 0) || 1

  let paths = ''
  let startAngle = -Math.PI / 2
  data.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2
    const endAngle = startAngle + angle
    const largeArc = angle > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${COLORS[i % COLORS.length]}" stroke="#fff" stroke-width="1"/>`
    // Label at mid-angle
    const mid = startAngle + angle / 2
    const lx = cx + (r * 0.65) * Math.cos(mid)
    const ly = cy + (r * 0.65) * Math.sin(mid)
    const pct = Math.round((d.value / total) * 100)
    if (pct >= 5) {
      paths += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${pct}%</text>`
    }
    startAngle = endAngle
  })

  // Legend
  let legend = ''
  data.forEach((d, i) => {
    const lx = 12
    const ly = 16 + i * 18
    legend += `<rect x="${lx}" y="${ly - 8}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 15}" y="${ly}" font-size="10" fill="#666">${d.label} (${d.value})</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    ${titleSvg}
    ${paths}
    ${legend}
  </svg>`
}

export function renderLineChart(data, w, h, { title = '' } = {}) {
  const pad = { top: 40, right: 20, bottom: 50, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)

  const points = data.map((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    const py = pad.top + chartH - (d.value / maxVal) * chartH
    return `${px},${py}`
  }).join(' ')

  let dots = ''
  data.forEach((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    const py = pad.top + chartH - (d.value / maxVal) * chartH
    dots += `<circle cx="${px}" cy="${py}" r="4" fill="${COLORS[0]}"/>`
    dots += `<text x="${px}" y="${py - 10}" text-anchor="middle" font-size="10" fill="#666">${d.value}</text>`
  })

  // X labels
  let xLabels = ''
  data.forEach((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    xLabels += `<text x="${px}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#888">${d.label}</text>`
  })

  // Grid
  const yTicks = 4
  let grid = ''
  for (let i = 0; i <= yTicks; i++) {
    const yy = pad.top + chartH - (i / yTicks) * chartH
    grid += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="#eee" stroke-dasharray="3,3"/>`
  }

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    ${titleSvg}
    ${grid}
    <polyline points="${points}" fill="none" stroke="${COLORS[0]}" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}
    ${xLabels}
  </svg>`
}

export function renderChartSvg(component) {
  const { props, width, height } = component
  const data = parseCSV(props.csvText)
  if (!data.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#faf8f5"/>
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14" fill="#999">无数据</text>
    </svg>`
  }
  switch (props.chartType) {
    case 'pie':  return renderPieChart(data, width, height, { title: props.title })
    case 'line': return renderLineChart(data, width, height, { title: props.title })
    case 'bar':
    default:     return renderBarChart(data, width, height, { title: props.title })
  }
}
