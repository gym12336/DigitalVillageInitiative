// src/modules/builder/editor/chartRenderer.js

const COLORS = [
  '#2f80ed', '#56ccf2', '#6fcf97', '#f2c94c',
  '#9b51e0', '#eb5757', '#f2994a', '#2c7da0',
  '#6fcf97', '#5d9cec',
]

export function parseCSVMultiSeries(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { labels: [], series: [], totals: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  if (labelIdx === -1) return { labels: [], series: [], totals: [] }

  const seriesNames = headers.filter((_, i) => i !== labelIdx)
  if (seriesNames.length === 0) return { labels: [], series: [], totals: [] }

  const series = seriesNames.map(name => ({ name, values: [] }))
  const labels = []
  const totals = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    labels.push(cols[labelIdx] || '')
    let total = 0
    seriesNames.forEach((sname, si) => {
      const colIdx = headers.indexOf(sname)
      const val = parseFloat(cols[colIdx]) || 0
      series[si].values.push(val)
      total += val
    })
    totals.push(total)
  }

  return { labels, series, totals }
}

export function parseCSVDumbbell(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  const startIdx = headers.indexOf('start')
  const endIdx = headers.indexOf('end')
  if (labelIdx === -1 || startIdx === -1 || endIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      label: cols[labelIdx] || '',
      start: parseFloat(cols[startIdx]) || 0,
      end: parseFloat(cols[endIdx]) || 0,
    }
  })
}

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
    bars += `<text x="${bx + barW / 2}" y="${by - 6}" text-anchor="middle" font-size="11" fill="#627586">${d.value}</text>`
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#687b8b">${d.label}</text>`
  })

  // Y axis
  const yTicks = 4
  let yAxis = ''
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxVal / yTicks) * i)
    const yy = pad.top + chartH - (i / yTicks) * chartH
    yAxis += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#687b8b">${val}</text>`
    yAxis += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="rgba(101,126,152,0.12)" stroke-dasharray="3,3"/>`
  }

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
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
    legend += `<text x="${lx + 15}" y="${ly}" font-size="10" fill="#627586">${d.label} (${d.value})</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
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
    dots += `<text x="${px}" y="${py - 10}" text-anchor="middle" font-size="10" fill="#627586">${d.value}</text>`
  })

  // X labels
  let xLabels = ''
  data.forEach((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    xLabels += `<text x="${px}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#687b8b">${d.label}</text>`
  })

  // Grid
  const yTicks = 4
  let grid = ''
  for (let i = 0; i <= yTicks; i++) {
    const yy = pad.top + chartH - (i / yTicks) * chartH
    grid += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="rgba(101,126,152,0.12)" stroke-dasharray="3,3"/>`
  }

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${grid}
    <polyline points="${points}" fill="none" stroke="${COLORS[0]}" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}
    ${xLabels}
  </svg>`
}

export function renderStackedBarChart(data, w, h, { title = '' } = {}) {
  const { labels, series, totals } = data
  const pad = { top: 40, right: 20, bottom: 50, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxTotal = Math.max(...totals, 1)
  const barGap = 8
  const barW = Math.max(4, (chartW - barGap * (labels.length + 1)) / labels.length)

  let bars = ''
  labels.forEach((label, i) => {
    const bx = pad.left + barGap + i * (barW + barGap)
    let yStack = 0
    series.forEach((s, si) => {
      const bh = (s.values[i] / maxTotal) * chartH
      if (bh <= 0) return
      const by = pad.top + chartH - yStack - bh
      const isTop = si === series.length - 1 || series.slice(si + 1).every(ss => ss.values[i] === 0)
      bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" fill="${COLORS[si % COLORS.length]}" rx="${isTop ? '3' : '0'}"/>`
      if (bh > 16) {
        bars += `<text x="${bx + barW / 2}" y="${by + bh / 2 + 4}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${s.values[i]}</text>`
      }
      yStack += bh
    })
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH - yStack - 5}" text-anchor="middle" font-size="10" fill="#627586" font-weight="600">${totals[i]}</text>`
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#687b8b">${label}</text>`
  })

  // Y axis + grid
  const yTicks = 4
  let yAxis = ''
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxTotal / yTicks) * i)
    const yy = pad.top + chartH - (i / yTicks) * chartH
    yAxis += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#687b8b">${val}</text>`
    yAxis += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="rgba(101,126,152,0.12)" stroke-dasharray="3,3"/>`
  }

  // Legend
  let legend = ''
  series.forEach((s, i) => {
    const lx = pad.left + i * 110
    const ly = 28
    legend += `<rect x="${lx}" y="${ly - 6}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 14}" y="${ly + 2}" font-size="10" fill="#627586">${s.name}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${legend}
    ${yAxis}
    ${bars}
  </svg>`
}

export function renderDumbbellChart(data, w, h, { title = '' } = {}) {
  const n = data.length
  const rowH = Math.min(60, (h - 80) / Math.max(n, 1))
  const startY = 55
  const leftPad = 120
  const rightPad = 80
  const chartW = w - leftPad - rightPad

  const allVals = data.flatMap(d => [d.start, d.end])
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)
  const range = maxVal - minVal || 1

  const toX = (val) => leftPad + ((val - minVal) / range) * chartW

  let rows = ''
  data.forEach((d, i) => {
    const cy = startY + i * rowH + rowH / 2
    const x1 = toX(d.start)
    const x2 = toX(d.end)
    const change = d.start !== 0 ? ((d.end - d.start) / d.start * 100) : 0
    const changeStr = (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
    const changeColor = change >= 0 ? '#6fcf97' : '#eb5757'
    const arrow = change >= 0 ? '▲' : '▼'

    rows += `<text x="${leftPad - 10}" y="${cy + 4}" text-anchor="end" font-size="12" fill="#627586">${d.label}</text>`
    rows += `<circle cx="${x1}" cy="${cy}" r="7" fill="#a0c4d8" stroke="#fff" stroke-width="2"/>`
    rows += `<line x1="${x1 + 7}" y1="${cy}" x2="${x2 - 7}" y2="${cy}" stroke="rgba(101,126,152,0.35)" stroke-width="2.5" stroke-dasharray="4,3"/>`
    rows += `<circle cx="${x2}" cy="${cy}" r="9" fill="#2c7da0" stroke="#fff" stroke-width="2"/>`
    rows += `<text x="${x1}" y="${cy - 12}" text-anchor="middle" font-size="10" fill="#687b8b">${d.start}</text>`
    rows += `<text x="${x2}" y="${cy - 14}" text-anchor="middle" font-size="12" fill="#1c2834" font-weight="600">${d.end}</text>`
    rows += `<text x="${w - 10}" y="${cy + 4}" text-anchor="end" font-size="12" font-weight="600" fill="${changeColor}">${arrow} ${changeStr}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${rows}
  </svg>`
}

export function renderChartSvg(component) {
  const { props, width, height } = component
  const data = parseCSV(props.csvText)
  if (!data.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f8fbfd"/>
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
    </svg>`
  }
  switch (props.chartType) {
    case 'pie':  return renderPieChart(data, width, height, { title: props.title })
    case 'line': return renderLineChart(data, width, height, { title: props.title })
    case 'bar':
    default:     return renderBarChart(data, width, height, { title: props.title })
  }
}
