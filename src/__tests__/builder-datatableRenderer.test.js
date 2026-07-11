import { describe, it, expect } from 'vitest'
import { renderDatatableMarkup } from '../modules/builder/editor/datatableRenderer.js'

describe('renderDatatableMarkup', () => {
  const makeComponent = (overrides = {}) => ({
    type: 'datatable',
    width: 560,
    height: 340,
    props: {
      title: '荣誉资质',
      columns: ['荣誉名称', '颁发单位', '时间'],
      rows: [
        ['全国文明村', '中央文明办', '2021'],
        ['省级美丽乡村', '省农业农村厅', '2022'],
      ],
      ...overrides,
    },
  })

  it('returns HTML table with header and data rows', () => {
    const html = renderDatatableMarkup(makeComponent())
    expect(html).toContain('荣誉资质')
    expect(html).toContain('<table')
    expect(html).toContain('<thead')
    expect(html).toContain('<tbody')
    expect(html).toContain('荣誉名称')
    expect(html).toContain('颁发单位')
    expect(html).toContain('全国文明村')
    expect(html).toContain('中央文明办')
    expect(html).toContain('省级美丽乡村')
  })

  it('renders alternating row backgrounds', () => {
    const html = renderDatatableMarkup(makeComponent())
    // Should have white and light blue rows
    expect(html).toContain('#ffffff')
    expect(html).toContain('rgba(44,125,160,0.03)')
  })

  it('handles empty rows gracefully', () => {
    const comp = makeComponent({ rows: [] })
    const html = renderDatatableMarkup(comp)
    expect(html).toContain('暂无数据')
  })

  it('handles empty columns gracefully', () => {
    const comp = makeComponent({ columns: [], rows: [] })
    const html = renderDatatableMarkup(comp)
    expect(html).toContain('暂无数据')
  })

  it('renders all columns and cells', () => {
    const comp = makeComponent({
      columns: ['A', 'B', 'C', 'D'],
      rows: [['1', '2', '3', '4']],
    })
    const html = renderDatatableMarkup(comp)
    expect(html.match(/<th(\s|>)/g).length).toBe(4)
    expect(html.match(/<td(\s|>)/g).length).toBe(4)
  })
})
