import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// mock retrieval（含 searchWeb + retrieve）
vi.mock('@/modules/practice/mine/retrieval.js', () => ({
  retrieve: vi.fn(() => []),
  searchWeb: vi.fn(),
  extractKeywords: vi.fn(() => []),
}))

import StagePlan from '@/modules/practice/mine/StagePlan.vue'
import * as retrieval from '@/modules/practice/mine/retrieval.js'

const stubs = {
  'router-link': { props: ['to'], template: '<a><slot /></a>' },
}
const globalOpts = { stubs, mocks: { $router: { push: vi.fn() } } }

function fullDossier(overrides = {}) {
  return {
    id: 'd', title: 'T', idea: '', village: '', plan: {
      goal: '', topic: '', targetVillage: '', metrics: [], expected: '',
      background: '', methods: [], risks: [], phases: [], source: '',
    },
    refs: [], collected: { metricValues: [], materials: [], people: [] },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StagePlan 联网搜索集成', () => {
  it('平台检索结果 < 15 且有目标村 → 自动触发 searchWeb', async () => {
    retrieval.retrieve.mockReturnValue([
      { source: 'village', id: 'v1', title: 'X村', sub: '...', path: '/villages/v1', score: 5 },
    ]) // 仅 1 条 < 15
    retrieval.searchWeb.mockResolvedValue({
      cards: [
        { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '摘要', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
      ],
      overview: null,
    })

    const dossier = fullDossier({ village: '陈家铺村', idea: '帮村民卖竹编' })
    mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    expect(retrieval.searchWeb).toHaveBeenCalledWith('陈家铺村', '帮村民卖竹编')
  })

  it('平台检索结果 ≥ 15 → 不触发 searchWeb', async () => {
    const fifteenCards = Array.from({ length: 15 }, (_, i) => ({
      source: 'village', id: `v${i}`, title: `村${i}`, sub: '', path: `/v/${i}`, score: i,
    }))
    retrieval.retrieve.mockReturnValue(fifteenCards)

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    expect(retrieval.searchWeb).not.toHaveBeenCalled()
  })

  it('无目标村名 → 不触发 searchWeb', async () => {
    retrieval.retrieve.mockReturnValue([])
    const dossier = fullDossier({ village: '', idea: '' })
    mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()
    expect(retrieval.searchWeb).not.toHaveBeenCalled()
  })

  it('网络卡片显示 🌐 网络 source 标签', async () => {
    retrieval.retrieve.mockReturnValue([])
    retrieval.searchWeb.mockResolvedValue({
      cards: [
        { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '...', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
      ],
      overview: null,
    })

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    const sourceLabels = w.findAll('.ret-source')
    const webLabel = sourceLabels.find((el) => el.text().includes('网络'))
    expect(webLabel).toBeTruthy()
    expect(webLabel.classes()).toContain('src-web')
  })

  it('点击网络卡片「查看」→ 打开 WebSearchModal', async () => {
    retrieval.retrieve.mockReturnValue([])
    retrieval.searchWeb.mockResolvedValue({
      cards: [
        { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '...', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
      ],
      overview: null,
    })

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    // 初始无弹窗
    expect(w.find('.modal-overlay').exists()).toBe(false)

    // 点击查看
    const viewLink = w.find('.ret-link')
    await viewLink.trigger('click')

    // 弹窗出现
    expect(w.find('.modal-overlay').exists()).toBe(true)
  })

  it('网络卡片「采纳」→ 加入 refs', async () => {
    retrieval.retrieve.mockReturnValue([])
    const webCard = {
      source: 'web', id: 'https://a.com', title: '搜索结果', sub: '...', path: 'https://a.com', dimension: 'overview', relevance: 'high',
    }
    retrieval.searchWeb.mockResolvedValue({ cards: [webCard], overview: null })

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    // 点击采纳
    const adoptBtn = w.find('.ret-card .btn.tiny')
    await adoptBtn.trigger('click')

    // 检查 update 事件中 refs 包含该卡片
    const updates = w.emitted('update')
    const lastUpdate = updates[updates.length - 1][0]
    expect(lastUpdate.refs).toBeDefined()
    expect(lastUpdate.refs.some((r) => r.source === 'web' && r.id === 'https://a.com')).toBe(true)
  })

  it('searchWeb 返回 overview → 渲染 AI 村落概况卡片', async () => {
    retrieval.retrieve.mockReturnValue([
      { source: 'village', id: 'v1', title: 'X村', sub: '...', path: '/villages/v1', score: 5 },
    ])
    retrieval.searchWeb.mockResolvedValue({
      cards: [
        { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '摘要', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
      ],
      overview: {
        answer: '陈家铺村位于浙江省松阳县……',
        references: [{ title: '源1', url: 'https://r.com', snippet: '...' }],
      },
    })

    const dossier = fullDossier({ village: '陈家铺村', idea: '帮村民卖竹编' })
    const wrapper = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    // 概况卡片渲染
    expect(wrapper.find('.overview-card').exists()).toBe(true)
    expect(wrapper.find('.overview-card').text()).toContain('AI 村落概况')
    expect(wrapper.find('.overview-card').text()).toContain('陈家铺村位于浙江省松阳县')
    // 参考来源可折叠
    expect(wrapper.find('.overview-refs').exists()).toBe(true)
  })

  it('overview 为 null → 不渲染概况卡片', async () => {
    retrieval.retrieve.mockReturnValue([
      { source: 'village', id: 'v1', title: 'X村', sub: '...', path: '/villages/v1', score: 5 },
    ])
    retrieval.searchWeb.mockResolvedValue({
      cards: [
        { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '摘要', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
      ],
      overview: null,
    })

    const dossier = fullDossier({ village: '陈家铺村', idea: '帮村民卖竹编' })
    const wrapper = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    expect(wrapper.find('.overview-card').exists()).toBe(false)
  })
})
