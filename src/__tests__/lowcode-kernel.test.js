// 低代码内核四模块 + 预置 + 导出 的 TDD 覆盖。
import { describe, it, expect } from 'vitest'
import { REGISTRY, DATA_SOURCES, PALETTE, isKnownType, isKnownSource, isKnownColor, listComponents, GRID_COLS } from '@/modules/practice/lowcode/registry.js'
import { validateWork } from '@/modules/practice/lowcode/validate.js'
import { resolveBindings } from '@/modules/practice/lowcode/binding.js'
import { renderWork } from '@/modules/practice/lowcode/renderer.js'
import { createBlock, createEmptyWork, PRESETS, presetTypesAreValid } from '@/modules/practice/lowcode/presets.js'
import { toJSON, toStaticSite } from '@/modules/practice/lowcode/exportSite.js'

// —— 样例实践档案 ——
const dossier = {
  village: '小朱湾村',
  plan: { topic: '电商帮扶', targetVillage: '小朱湾村' },
  collected: {
    metricValues: [
      { name: '月销售额', unit: '万元', before: '2', after: '8' },
      { name: '就业人数', unit: '人', before: '10', after: '35' },
    ],
    materials: [
      { name: '走访农户', note: '记录30户', type: '调研' },
      { name: '直播培训', note: '', type: '活动' },
    ],
    people: [
      { name: '朱大姐', role: '合作社社长', quote: '日子有奔头了' },
    ],
  },
}

// 造一份合法作品：KPI + 时间轴 + 人物墙 + 标题
function sampleWork() {
  const w = createEmptyWork({ id: 'w1', title: '小朱湾电商帮扶', source: 'd1' })
  w.blocks = [
    createBlock('heading', { x: 0, y: 0, w: 12, props: { text: '成果', level: 'h1' }, genId: () => 'b-head' }),
    createBlock('kpiGrid', { x: 0, y: 1, w: 12, genId: () => 'b-kpi' }),
    createBlock('timeline', { x: 0, y: 3, w: 6, genId: () => 'b-tl' }),
    createBlock('peopleWall', { x: 6, y: 3, w: 6, genId: () => 'b-pw' }),
  ]
  return w
}

describe('registry', () => {
  it('基础组件无插槽，大组件有插槽', () => {
    expect(REGISTRY.heading.category).toBe('basic')
    expect(REGISTRY.heading.slots).toEqual([])
    expect(REGISTRY.kpiGrid.category).toBe('composite')
    expect(REGISTRY.kpiGrid.slots.length).toBeGreaterThan(0)
  })
  it('isKnownType / isKnownSource', () => {
    expect(isKnownType('kpiGrid')).toBe(true)
    expect(isKnownType('nope')).toBe(false)
    expect(isKnownSource('metricValues')).toBe(true)
    expect(isKnownSource('secrets')).toBe(false)
  })
  it('每个插槽的 accepts 都是白名单里的源；default 为白名单源或空串（可选未绑定）', () => {
    for (const def of Object.values(REGISTRY)) {
      for (const s of def.slots) {
        for (const src of s.accepts) expect(DATA_SOURCES[src]).toBeTruthy()
        // default 允许空串（表示插槽可选、默认不绑定，渲染时回落 props）；否则必是白名单源。
        if (s.default !== '') expect(DATA_SOURCES[s.default]).toBeTruthy()
      }
    }
  })
  it('listComponents 返回全部并带 type', () => {
    const list = listComponents()
    expect(list.length).toBe(Object.keys(REGISTRY).length)
    expect(list.every((c) => c.type)).toBe(true)
  })
})

describe('validate', () => {
  it('合法作品通过', () => {
    const r = validateWork(sampleWork())
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
  })
  it('非对象直接判非法', () => {
    expect(validateWork(null).valid).toBe(false)
    expect(validateWork([]).valid).toBe(false)
  })
  it('blocks 非数组判非法', () => {
    expect(validateWork({ blocks: 'nope' }).valid).toBe(false)
  })
  it('未知组件类型被拦', () => {
    const r = validateWork({ blocks: [{ type: 'evil', x: 0, y: 0, w: 1, h: 1 }] })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /未知组件类型/.test(e.message))).toBe(true)
  })
  it('栅格越界被拦', () => {
    const r = validateWork({ layout: { cols: 12 }, blocks: [{ type: 'text', x: 8, y: 0, w: 6, h: 1 }] })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /越界/.test(e.message))).toBe(true)
  })
  it('缺栅格坐标被拦', () => {
    const r = validateWork({ blocks: [{ type: 'text', x: 0, y: 0, w: 6 }] })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /缺少栅格坐标 h/.test(e.message))).toBe(true)
  })
  it('绑定到未知插槽被拦', () => {
    const r = validateWork({ blocks: [{ type: 'kpiGrid', x: 0, y: 0, w: 6, h: 2, bindings: { ghost: 'metricValues' } }] })
    expect(r.valid).toBe(false)
  })
  it('绑定到不被接受的源被拦', () => {
    const r = validateWork({ blocks: [{ type: 'kpiGrid', x: 0, y: 0, w: 6, h: 2, bindings: { items: 'people' } }] })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /不接受数据源/.test(e.message))).toBe(true)
  })
  it('调色板外的颜色被拦', () => {
    const r = validateWork({ blocks: [{ type: 'heading', x: 0, y: 0, w: 12, h: 1, props: { color: 'red; content:evil' } }] })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /调色板/.test(e.message))).toBe(true)
  })
  it('调色板内颜色 + 空串（默认）通过', () => {
    expect(validateWork({ blocks: [{ type: 'heading', x: 0, y: 0, w: 12, h: 1, props: { color: '#6b8c5c' } }] }).valid).toBe(true)
    expect(validateWork({ blocks: [{ type: 'heading', x: 0, y: 0, w: 12, h: 1, props: { color: '' } }] }).valid).toBe(true)
  })
  it('select 属性越界值被拦', () => {
    const r = validateWork({ blocks: [{ type: 'heading', x: 0, y: 0, w: 12, h: 1, props: { level: 'h9' } }] })
    expect(r.valid).toBe(false)
  })
})

describe('registry colors', () => {
  it('isKnownColor 认调色板 + 空串，拒其它', () => {
    expect(isKnownColor('')).toBe(true)
    expect(isKnownColor('#6b8c5c')).toBe(true)
    expect(isKnownColor('rgb(1,2,3)')).toBe(false)
    expect(PALETTE.length).toBeGreaterThan(2)
  })
})

describe('binding', () => {
  it('list 插槽从档案取到数组', () => {
    const filled = resolveBindings(sampleWork(), dossier)
    const kpi = filled.blocks.find((b) => b.type === 'kpiGrid')
    expect(kpi.resolved.items.kind).toBe('list')
    expect(kpi.resolved.items.value.length).toBe(2)
    expect(kpi.resolved.items.missing).toBe(false)
  })
  it('取不到数据时 missing=true 且落空', () => {
    const filled = resolveBindings(sampleWork(), { collected: {} })
    const kpi = filled.blocks.find((b) => b.type === 'kpiGrid')
    expect(kpi.resolved.items.value).toEqual([])
    expect(kpi.resolved.items.missing).toBe(true)
  })
  it('基础组件 resolved 为空对象', () => {
    const filled = resolveBindings(sampleWork(), dossier)
    const head = filled.blocks.find((b) => b.type === 'heading')
    expect(head.resolved).toEqual({})
  })
  it('scalar 源（地图点位地点）取标量', () => {
    const w = createEmptyWork()
    w.blocks = [createBlock('mapPoint', { x: 0, y: 0, w: 6, genId: () => 'm1' })]
    const filled = resolveBindings(w, dossier)
    expect(filled.blocks[0].resolved.place.kind).toBe('scalar')
    expect(filled.blocks[0].resolved.place.value).toBe('小朱湾村')
  })
})

describe('renderer', () => {
  it('产出渲染描述：title + cols + nodes', () => {
    const rendered = renderWork(resolveBindings(sampleWork(), dossier))
    expect(rendered.cols).toBe(GRID_COLS)
    expect(rendered.nodes.length).toBe(4)
    expect(rendered.nodes[0].grid).toEqual({ x: 0, y: 0, w: 12, h: 1 })
  })
  it('KPI view 过滤出有值指标并算好 value', () => {
    const rendered = renderWork(resolveBindings(sampleWork(), dossier))
    const kpi = rendered.nodes.find((n) => n.type === 'kpiGrid')
    expect(kpi.view.items.length).toBe(2)
    expect(kpi.view.items[0]).toMatchObject({ name: '月销售额', value: 8, unit: '万元' })
  })
  it('未知类型被 filter 掉', () => {
    const rendered = renderWork({ blocks: [{ type: 'evil', x: 0, y: 0, w: 1, h: 1 }, ...sampleWork().blocks] })
    expect(rendered.nodes.every((n) => n.type !== 'evil')).toBe(true)
  })
  it('缺失数据时 view.missing=true', () => {
    const rendered = renderWork(resolveBindings(sampleWork(), { collected: {} }))
    const kpi = rendered.nodes.find((n) => n.type === 'kpiGrid')
    expect(kpi.view.missing).toBe(true)
  })
  it('样式属性（accent/size/color）穿透到 view', () => {
    const w = createEmptyWork()
    w.blocks = [
      createBlock('kpiGrid', { x: 0, y: 0, w: 12, props: { accent: '#e07a5f' }, genId: () => 'k' }),
      createBlock('text', { x: 0, y: 2, w: 6, props: { size: 'large', color: '#4d6b3e' }, genId: () => 't' }),
    ]
    const rendered = renderWork(resolveBindings(w, dossier))
    expect(rendered.nodes.find((n) => n.type === 'kpiGrid').view.accent).toBe('#e07a5f')
    const tv = rendered.nodes.find((n) => n.type === 'text').view
    expect(tv.size).toBe('large')
    expect(tv.color).toBe('#4d6b3e')
  })
  it('grid.h 反映组件高度', () => {
    const w = createEmptyWork()
    w.blocks = [createBlock('image', { x: 0, y: 0, w: 6, h: 5, genId: () => 'i' })]
    const rendered = renderWork(resolveBindings(w, dossier))
    expect(rendered.nodes[0].grid.h).toBe(5)
  })
})

describe('presets', () => {
  it('全部预置项 make 出合法 type', () => {
    expect(presetTypesAreValid()).toBe(true)
    expect(PRESETS.length).toBeGreaterThan(0)
  })
  it('createBlock 用 registry 默认值打底', () => {
    const b = createBlock('kpiGrid', { genId: () => 'x' })
    expect(b.props.title).toBe('关键指标')
    expect(b.bindings.items).toBe('metricValues')
  })
})

describe('export', () => {
  it('toJSON 往返一致', () => {
    const w = sampleWork()
    expect(JSON.parse(toJSON(w))).toEqual(w)
  })
  it('toStaticSite 产出完整 HTML 且含标题与组件内容', () => {
    const html = toStaticSite(renderWork(resolveBindings(sampleWork(), dossier)))
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('小朱湾电商帮扶')
    expect(html).toContain('月销售额')
    expect(html).toContain('朱大姐')
  })
  it('toStaticSite 转义防注入', () => {
    const w = createEmptyWork({ title: '<script>x</script>' })
    w.blocks = [createBlock('heading', { x: 0, y: 0, w: 12, props: { text: '<img onerror=1>' }, genId: () => 'h' })]
    const html = toStaticSite(renderWork(resolveBindings(w, dossier)))
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;img onerror=1&gt;')
  })
  it('导出应用强调色到静态 HTML', () => {
    const w = createEmptyWork({ title: 'T' })
    w.blocks = [createBlock('kpiGrid', { x: 0, y: 0, w: 12, props: { accent: '#e07a5f' }, genId: () => 'k' })]
    const html = toStaticSite(renderWork(resolveBindings(w, dossier)))
    expect(html).toContain('#e07a5f')
  })
  it('缺失数据的大组件导出显示待补充', () => {
    const w = createEmptyWork({ title: 'T' })
    w.blocks = [createBlock('kpiGrid', { x: 0, y: 0, w: 12, genId: () => 'k' })]
    const html = toStaticSite(renderWork(resolveBindings(w, { collected: {} })))
    expect(html).toContain('待补充')
  })
})
