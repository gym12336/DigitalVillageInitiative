import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  parseCSVMultiSeries,
  parseCSVDumbbell,
  parseCSVTrendBadge,
  renderBarChart,
  renderPieChart,
  renderLineChart,
  renderStackedBarChart,
  renderDumbbellChart,
  renderTrendBadge,
  renderChartSvg,
} from '../modules/builder/editor/chartRenderer.js'

describe('parseCSVMultiSeries', () => {
  it('parses multi-column CSV into labels, series, and totals', () => {
    const csv = 'label,茶叶,水果\n李家村,210,85\n张家村,150,120'
    const result = parseCSVMultiSeries(csv)
    expect(result.labels).toEqual(['李家村', '张家村'])
    expect(result.series).toHaveLength(2)
    expect(result.series[0].name).toBe('茶叶')
    expect(result.series[0].values).toEqual([210, 150])
    expect(result.series[1].name).toBe('水果')
    expect(result.series[1].values).toEqual([85, 120])
    expect(result.totals).toEqual([295, 270])
  })

  it('returns empty arrays for insufficient data', () => {
    expect(parseCSVMultiSeries('').labels).toEqual([])
    expect(parseCSVMultiSeries('label\n李家村,100').labels).toEqual([])
  })

  it('handles CSV with no label column', () => {
    const csv = 'name,value\nA,10'
    const result = parseCSVMultiSeries(csv)
    expect(result.labels).toEqual([])
  })
})

describe('renderStackedBarChart', () => {
  it('returns SVG with stacked rects for each bar', () => {
    const data = {
      labels: ['李家村', '张家村'],
      series: [
        { name: '茶叶', values: [210, 150] },
        { name: '水果', values: [85, 120] },
      ],
      totals: [295, 270],
    }
    const svg = renderStackedBarChart(data, 520, 320, { title: '产量' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('产量')
    // Should have 4 rects (2 bars × 2 series)
    expect(svg.match(/<rect/g).length).toBeGreaterThanOrEqual(4)
  })
})

describe('parseCSVDumbbell', () => {
  it('parses start/end columns', () => {
    const csv = 'label,start,end\n茶叶产量,120,210\n农户收入,8000,18500'
    const result = parseCSVDumbbell(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ label: '茶叶产量', start: 120, end: 210 })
    expect(result[1]).toEqual({ label: '农户收入', start: 8000, end: 18500 })
  })

  it('returns empty array for missing columns', () => {
    expect(parseCSVDumbbell('label,value\nA,10')).toEqual([])
    expect(parseCSVDumbbell('')).toEqual([])
  })
})

describe('renderDumbbellChart', () => {
  it('returns SVG with paired circles and connecting lines', () => {
    const data = [
      { label: '茶叶产量', start: 120, end: 210 },
      { label: '农户收入', start: 8000, end: 18500 },
    ]
    const svg = renderDumbbellChart(data, 520, 320, { title: '变化对比' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('变化对比')
    // Should have 4 circles (2 per row)
    expect(svg.match(/<circle/g).length).toBe(4)
    // Should have connecting lines
    expect(svg).toContain('<line')
    // Should show +75.0% for 120→210
    expect(svg).toContain('+75.0%')
    // Should show +131.3% for 8000→18500
    expect(svg).toContain('+131.3%')
  })
})
