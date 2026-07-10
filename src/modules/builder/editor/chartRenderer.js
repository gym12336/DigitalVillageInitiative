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

export function parseCSVTrendBadge(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  const valueIdx = headers.indexOf('value')
  if (labelIdx === -1 || valueIdx === -1) return []
  const changeIdx = headers.indexOf('change')

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      label: cols[labelIdx] || '',
      value: cols[valueIdx] || '',
      change: changeIdx !== -1 ? (cols[changeIdx] || '') : '',
    }
  })
}

export function parseCSVRadar(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { labels: [], dimensions: [], series: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  if (labelIdx === -1) return { labels: [], dimensions: [], series: [] }

  const dimensions = headers.filter((_, i) => i !== labelIdx)
  if (dimensions.length < 2) return { labels: [], dimensions: [], series: [] }

  const labels = []
  const series = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    labels.push(cols[labelIdx] || '')
    const values = dimensions.map((_, di) => {
      const colIdx = headers.indexOf(dimensions[di])
      return parseFloat(cols[colIdx]) || 0
    })
    series.push({ name: cols[labelIdx] || '', values })
  }

  return { labels, dimensions, series }
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
    const ly = 34
    legend += `<rect x="${lx}" y="${ly - 6}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 14}" y="${ly + 2}" font-size="10" fill="#627586">${s.name}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
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
  // Responsive padding so the chart area doesn't vanish on narrow components
  const leftPad = Math.max(72, Math.min(120, w * 0.22))
  const rightPad = Math.max(52, Math.min(80, w * 0.16))
  const chartW = w - leftPad - rightPad

  let rows = ''
  data.forEach((d, i) => {
    const cy = startY + i * rowH + rowH / 2

    // Per-row independent scale so rows with disparate magnitudes all render legibly
    const rowMin = Math.min(d.start, d.end)
    const rowMax = Math.max(d.start, d.end)
    const rowRange = rowMax - rowMin || 1
    const padding = rowRange * 0.15
    const scaleMin = rowMin - padding
    const scaleMax = rowMax + padding

    const toX = (val) =>
      leftPad + ((val - scaleMin) / (scaleMax - scaleMin)) * chartW

    const x1 = toX(d.start)
    const x2 = toX(d.end)

    // Direction-aware line endpoints, each offset by its own circle's radius
    const dir = x1 < x2 ? 1 : -1
    const x1Edge = x1 + dir * 7   // start circle r=7
    const x2Edge = x2 - dir * 9   // end circle r=9

    const change = d.start !== 0
      ? ((d.end - d.start) / Math.abs(d.start) * 100)
      : 0
    const changeStr = (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
    const changeColor = change >= 0 ? COLORS[2] : COLORS[5]
    const arrow = change >= 0 ? '▲' : '▼'

    rows += `<text x="${leftPad - 10}" y="${cy + 4}" text-anchor="end" font-size="12" fill="#627586">${d.label}</text>`
    rows += `<circle cx="${x1}" cy="${cy}" r="7" fill="${COLORS[1]}" stroke="#fff" stroke-width="2"/>`
    rows += `<line x1="${x1Edge}" y1="${cy}" x2="${x2Edge}" y2="${cy}" stroke="rgba(101,126,152,0.35)" stroke-width="2.5" stroke-dasharray="4,3"/>`
    rows += `<circle cx="${x2}" cy="${cy}" r="9" fill="${COLORS[7]}" stroke="#fff" stroke-width="2"/>`
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

export function renderTrendBadge(data, w, h, { title = '' } = {}) {
  const n = data.length
  const cols = Math.min(n, 3)
  const cellW = (w - 16) / cols
  const rows = Math.ceil(n / cols)
  const cellH = (h - (title ? 30 : 0) - 8) / rows

  let badges = ''
  data.forEach((d, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = 8 + col * cellW
    const cy = (title ? 30 : 0) + 4 + row * cellH
    const isUp = d.change.startsWith('+')
    const isDown = d.change.startsWith('-')
    const trendColor = isUp ? COLORS[2] : isDown ? COLORS[5] : '#687b8b'
    const arrow = isUp ? '▲' : isDown ? '▼' : ''

    const valSize = n === 1
      ? Math.min(64, h * 0.38)
      : Math.min(36, cellH * 0.32)
    const changeSize = n === 1 ? 18 : 14

    badges += `
      <g transform="translate(${cx}, ${cy})">
        <rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" rx="12" fill="rgba(44,125,160,0.02)" stroke="rgba(44,125,160,0.06)"/>
        <text x="${cellW / 2}" y="${cellH * 0.32}" text-anchor="middle" font-size="12" fill="#687b8b">${d.label}</text>
        <text x="${cellW / 2}" y="${cellH * 0.32 + valSize + 4}" text-anchor="middle" font-size="${valSize}" font-weight="800" fill="#1c2834">${d.value}</text>
        <text x="${cellW / 2}" y="${cellH * 0.32 + valSize + changeSize + 14}" text-anchor="middle" font-size="${changeSize}" font-weight="600" fill="${trendColor}">${arrow} ${d.change}</text>
      </g>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${badges}
  </svg>`
}

export function renderRadarChart(data, w, h, { title = '' } = {}) {
  const { dimensions, series } = data
  const n = dimensions.length
  if (n < 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#f8fbfd"/>
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
    </svg>`
  }

  const cx = w / 2
  const cy = h / 2 + (title ? 14 : 0)
  const r = Math.min(w, h) / 2 - 52
  const innerR = r * 0.15
  const dataR = r - innerR
  const levels = 5
  const labelR = r + 18

  // 所有数据中的最大值，向上取整
  const allVals = series.flatMap(s => s.values)
  const maxVal = Math.max(...allVals, 1)
  const ceilMax = maxVal <= 1 ? 1
    : maxVal <= 10 ? Math.ceil(maxVal)
    : Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal)) - 1))
      * Math.pow(10, Math.floor(Math.log10(maxVal)) - 1)

  // 同心多边形环 (虚线)
  let rings = ''
  for (let level = 1; level <= levels; level++) {
    const lr = innerR + (dataR * level) / levels
    const pts = []
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      pts.push(`${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`)
    }
    rings += `<path d="M${pts.join(' L')} Z" fill="none" stroke="rgba(101,126,152,0.1)" stroke-dasharray="3,3"/>`
    // 刻度值——标在第一条轴左侧
    const val = Math.round((ceilMax / levels) * level)
    const labelAngle = -Math.PI / 2
    const lx = cx + (lr + 2) * Math.cos(labelAngle)
    const ly = cy + (lr + 2) * Math.sin(labelAngle)
    rings += `<text x="${lx - 8}" y="${ly + 4}" text-anchor="end" font-size="9" fill="#687b8b">${val}</text>`
  }

  // 轴线 (从 innerR 到 r)
  let axes = ''
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    axes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(101,126,152,0.2)" stroke-width="1"/>`
  }

  // 维度标签
  let dimLabels = ''
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    const lx = cx + labelR * Math.cos(angle)
    const ly = cy + labelR * Math.sin(angle)
    const anchor = angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : 'start'
    const fontSize = n >= 6 ? 10 : 12
    dimLabels += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" font-size="${fontSize}" fill="#627586" font-weight="500">${dimensions[i]}</text>`
  }

  // 数据多边形 + 数据点
  let polys = ''
  series.forEach((s, si) => {
    const color = COLORS[si % COLORS.length]
    const pts = []
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      const dist = innerR + (s.values[i] / ceilMax) * dataR
      pts.push(`${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`)
    }
    // 填充多边形
    polys += `<polygon points="${pts.join(' ')}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`
    // 数据点
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      const dist = innerR + (s.values[i] / ceilMax) * dataR
      polys += `<circle cx="${cx + dist * Math.cos(angle)}" cy="${cy + dist * Math.sin(angle)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1"/>`
    }
  })

  // 图例 —— 底部居中
  let legend = ''
  const legendY = h - 14
  const totalLegendW = series.length * 100 - 10
  const legendStartX = cx - totalLegendW / 2
  series.forEach((s, i) => {
    const lx = legendStartX + i * 100
    legend += `<rect x="${lx}" y="${legendY - 6}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 14}" y="${legendY + 2}" font-size="10" fill="#627586">${s.name}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${rings}
    ${axes}
    ${dimLabels}
    ${polys}
    ${legend}
  </svg>`
}

export function parseCSVSankey(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { sourceNodes: [], targetNodes: [], links: [], maxFlow: 0 }

  const headers = lines[0].split(',').map(h => h.trim())
  const sourceIdx = headers.indexOf('source')
  const targetIdx = headers.indexOf('target')
  const valueIdx = headers.indexOf('value')

  if (sourceIdx === -1 || targetIdx === -1 || valueIdx === -1) {
    return { sourceNodes: [], targetNodes: [], links: [], maxFlow: 0 }
  }

  const links = []
  const sourceTotals = new Map()
  const targetTotals = new Map()

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    const source = cols[sourceIdx]
    const target = cols[targetIdx]
    const value = parseFloat(cols[valueIdx]) || 0

    if (!source || !target || value <= 0) continue

    links.push({ source, target, value })
    sourceTotals.set(source, (sourceTotals.get(source) || 0) + value)
    targetTotals.set(target, (targetTotals.get(target) || 0) + value)
  }

  if (links.length === 0) {
    return { sourceNodes: [], targetNodes: [], links: [], maxFlow: 0 }
  }

  const sourceNodes = [...sourceTotals.entries()].map(([name, total]) => ({ name, total }))
  const targetNodes = [...targetTotals.entries()].map(([name, total]) => ({ name, total }))

  const sourceTotal = sourceNodes.reduce((s, n) => s + n.total, 0)
  const targetTotal = targetNodes.reduce((s, n) => s + n.total, 0)
  const maxFlow = Math.max(sourceTotal, targetTotal)

  return { sourceNodes, targetNodes, links, maxFlow }
}

export function renderSankeyChart(data, w, h, { title = '' } = {}) {
  const { sourceNodes, targetNodes, links, maxFlow } = data

  if (sourceNodes.length === 0 && targetNodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#f8fbfd"/>
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
    </svg>`
  }

  const pad = { top: title ? 44 : 24, bottom: 20, left: 80, right: 80 }
  const nodeW = 18
  const chartH = h - pad.top - pad.bottom
  const flowScale = chartH / maxFlow

  const sourceX = pad.left
  const sourceRightX = sourceX + nodeW
  const targetRightX = w - pad.right
  const targetLeftX = targetRightX - nodeW

  // Position source nodes — stack vertically
  let sy = pad.top
  const sourcePosMap = new Map()
  sourceNodes.forEach((node) => {
    const nh = Math.max(16, node.total * flowScale)
    sourcePosMap.set(node.name, { y: sy, h: nh })
    sy += nh + 12
  })

  // Position target nodes — stack vertically
  let ty = pad.top
  const targetPosMap = new Map()
  targetNodes.forEach((node) => {
    const nh = Math.max(16, node.total * flowScale)
    targetPosMap.set(node.name, { y: ty, h: nh })
    ty += nh + 12
  })

  // Draw flow bands — filled bezier paths, one per link
  const sourceOffsets = new Map(sourceNodes.map(n => [n.name, 0]))
  const targetOffsets = new Map(targetNodes.map(n => [n.name, 0]))

  const sourceNodeMap = new Map(sourceNodes.map(n => [n.name, n]))
  const targetNodeMap = new Map(targetNodes.map(n => [n.name, n]))
  const sourceColorIdx = new Map(sourceNodes.map((n, i) => [n.name, i]))

  let bands = ''
  links.forEach((link) => {
    const s = sourcePosMap.get(link.source)
    const t = targetPosMap.get(link.target)
    if (!s || !t) return

    const sTotal = sourceNodeMap.get(link.source).total
    const tTotal = targetNodeMap.get(link.target).total

    const h1 = (link.value / sTotal) * s.h
    const h2 = (link.value / tTotal) * t.h

    const y1 = s.y + sourceOffsets.get(link.source)
    const y2 = t.y + targetOffsets.get(link.target)

    const colorIdx = sourceColorIdx.get(link.source)
    const color = COLORS[colorIdx % COLORS.length]

    const cp1x = sourceRightX + (targetLeftX - sourceRightX) * 0.4
    const cp2x = sourceRightX + (targetLeftX - sourceRightX) * 0.6

    bands += `<path d="M${sourceRightX},${y1} C${cp1x},${y1} ${cp2x},${y2} ${targetLeftX},${y2} L${targetLeftX},${y2 + h2} C${cp2x},${y2 + h2} ${cp1x},${y1 + h1} ${sourceRightX},${y1 + h1} Z" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-opacity="0.5" stroke-width="0.5"/>`

    sourceOffsets.set(link.source, sourceOffsets.get(link.source) + h1)
    targetOffsets.set(link.target, targetOffsets.get(link.target) + h2)
  })

  // Draw node rectangles and labels
  let nodesSvg = ''
  sourceNodes.forEach((n, i) => {
    const p = sourcePosMap.get(n.name)
    const color = COLORS[i % COLORS.length]
    nodesSvg += `<rect x="${sourceX}" y="${p.y}" width="${nodeW}" height="${p.h}" rx="3" fill="${color}"/>`
    nodesSvg += `<text x="${sourceX - 6}" y="${p.y + p.h / 2 + 4}" text-anchor="end" font-size="12" fill="#627586">${n.name}</text>`
  })

  targetNodes.forEach((n, i) => {
    const p = targetPosMap.get(n.name)
    const color = COLORS[(i + sourceNodes.length) % COLORS.length]
    nodesSvg += `<rect x="${targetLeftX}" y="${p.y}" width="${nodeW}" height="${p.h}" rx="3" fill="${color}"/>`
    nodesSvg += `<text x="${targetRightX + 6}" y="${p.y + p.h / 2 + 4}" text-anchor="start" font-size="12" fill="#627586">${n.name}</text>`
  })

  // Title
  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${bands}
    ${nodesSvg}
  </svg>`
}

export function renderChartSvg(component) {
  const { props, width, height } = component

  const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f8fbfd"/>
    <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
  </svg>`

  const opts = { title: props.title }

  switch (props.chartType) {
    case 'pie': {
      const data = parseCSV(props.csvText)
      return data.length ? renderPieChart(data, width, height, opts) : emptySvg
    }
    case 'line': {
      const data = parseCSV(props.csvText)
      return data.length ? renderLineChart(data, width, height, opts) : emptySvg
    }
    case 'stacked-bar': {
      const data = parseCSVMultiSeries(props.csvText)
      return data.labels.length ? renderStackedBarChart(data, width, height, opts) : emptySvg
    }
    case 'dumbbell': {
      const data = parseCSVDumbbell(props.csvText)
      return data.length ? renderDumbbellChart(data, width, height, opts) : emptySvg
    }
    case 'trend-badge': {
      const data = parseCSVTrendBadge(props.csvText)
      return data.length ? renderTrendBadge(data, width, height, opts) : emptySvg
    }
    case 'radar': {
      const data = parseCSVRadar(props.csvText)
      return data.dimensions.length ? renderRadarChart(data, width, height, opts) : emptySvg
    }
    case 'sankey': {
      const data = parseCSVSankey(props.csvText)
      return data.links.length ? renderSankeyChart(data, width, height, opts) : emptySvg
    }
    case 'bar':
    default: {
      const data = parseCSV(props.csvText)
      return data.length ? renderBarChart(data, width, height, opts) : emptySvg
    }
  }
}
