import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import GuideView from '@/modules/guide/GuideView.vue'
import GuideDetailView from '@/modules/guide/GuideDetailView.vue'
import guideData from '@/modules/guide/guide-data.json'
import { GUIDE_STAGE_ALL, GUIDE_TYPE_ALL } from '@/modules/guide/guide-schema.js'
import {
  clearGuideFilters,
  filterGuideResources,
  findGuideResource,
  hasDownloadableAttachments,
} from '@/modules/guide/guide-utils.js'

const routerLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : (to.path || to.name)"><slot /></a>',
}

const global = {
  stubs: {
    RouterLink: routerLinkStub,
    Teleport: true,
  },
}

describe('guide-utils', () => {
  it('支持关键词搜索标题、简介、关键词和正文摘要', () => {
    const result = filterGuideResources(guideData.resources, { keyword: '访谈提纲' })
    expect(result.map((item) => item.slug)).toContain('villager-interview-template')
  })

  it('支持按实践阶段筛选', () => {
    const result = filterGuideResources(guideData.resources, { stage: 'during' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => item.stage === 'during')).toBe(true)
  })

  it('支持按资源类型筛选', () => {
    const result = filterGuideResources(guideData.resources, { type: '模板' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => item.type === '模板')).toBe(true)
  })

  it('支持多条件组合筛选', () => {
    const result = filterGuideResources(guideData.resources, {
      keyword: '新闻稿',
      stage: 'during',
      type: '模板',
    })
    expect(result.map((item) => item.slug)).toEqual(['news-writing'])
  })

  it('清除筛选返回默认条件', () => {
    expect(clearGuideFilters()).toEqual({
      keyword: '',
      stage: GUIDE_STAGE_ALL,
      type: GUIDE_TYPE_ALL,
    })
  })

  it('不存在的攻略返回 null', () => {
    expect(findGuideResource(guideData.resources, 'missing-slug')).toBeNull()
  })

  it('无附件资源不会被识别为可下载', () => {
    const item = findGuideResource(guideData.resources, 'topic-selection')
    expect(hasDownloadableAttachments(item)).toBe(false)
  })
})

describe('GuideView', () => {
  it('渲染资源中心首页、三阶段入口和高频工具区', () => {
    const w = mount(GuideView, { global })

    expect(w.text()).toContain('实践攻略')
    expect(w.text()).toContain('从第一次联系村庄，到完成最终答辩')
    expect(w.findAll('.stage-entry-card')).toHaveLength(3)
    expect(w.findAll('.featured-card')).toHaveLength(8)
    expect(w.text()).toContain('联系实践地话术')

    w.unmount()
  })

  it('点击热门关键词会立即执行搜索', async () => {
    const w = mount(GuideView, {
      global,
      attachTo: document.body,
    })

    await w.findAll('.hot-keywords button').find((btn) => btn.text() === '访谈提纲').trigger('click')
    expect(w.find('#guide-search').element.value).toBe('访谈提纲')
    expect(w.findAll('.resource-card').length).toBeGreaterThan(0)
    expect(w.findAll('.resource-card').some((card) => card.text().includes('村民访谈提纲模板'))).toBe(true)

    w.unmount()
  })

  it('点击阶段入口筛选对应阶段资源', async () => {
    const w = mount(GuideView, { global })

    await w.findAll('.stage-entry-card')[1].trigger('click')
    const cards = w.findAll('.resource-card')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.every((card) => card.text().includes('实践中'))).toBe(true)

    w.unmount()
  })

  it('资源卡无附件时不显示下载链接', async () => {
    const w = mount(GuideView, { global })

    await w.find('.filter-search input').setValue('如何选择合适的社会实践主题')
    const cards = w.findAll('.resource-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('在线阅读')
    expect(cards[0].find('.download-link').exists()).toBe(false)

    w.unmount()
  })

  it('清除全部条件恢复完整结果', async () => {
    const w = mount(GuideView, { global })

    await w.find('.filter-search input').setValue('新闻稿')
    await w.findAll('.filter-chip').find((btn) => btn.text() === '实践中').trigger('click')
    await w.findAll('.filter-chip').find((btn) => btn.text() === '模板').trigger('click')
    expect(w.findAll('.resource-card')).toHaveLength(1)

    await w.find('.clear-btn').trigger('click')
    expect(w.find('.filter-search input').element.value).toBe('')
    expect(w.findAll('.resource-card')).toHaveLength(guideData.resources.length)

    w.unmount()
  })
})

describe('GuideDetailView', () => {
  async function mountWithRoute(path) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home-test', component: { template: '<div />' } },
        { path: '/guide', name: 'guide', component: GuideView },
        { path: '/guide/:slug', name: 'guide-detail', component: GuideDetailView },
      ],
    })
    await router.push(path)
    await router.isReady()
    return mount(GuideDetailView, { global: { plugins: [router] } })
  }

  it('详情页路由渲染指定攻略', async () => {
    const w = await mountWithRoute('/guide/contact-village')

    expect(w.text()).toContain('如何联系村委会或实践单位')
    expect(w.text()).toContain('适用场景')
    expect(w.text()).toContain('可勾选操作清单')
    expect(w.text()).toContain('本内容为通用参考')

    w.unmount()
  })

  it('不存在的攻略显示明确处理状态', async () => {
    const w = await mountWithRoute('/guide/not-exist')

    expect(w.text()).toContain('这个攻略暂时不存在')
    expect(w.text()).toContain('返回资源中心')

    w.unmount()
  })

  it('详情页无附件时不显示下载链接', async () => {
    const w = await mountWithRoute('/guide/topic-selection')

    expect(w.text()).toContain('当前资源以在线阅读为主')
    expect(w.find('.attachment-list a').exists()).toBe(false)

    w.unmount()
  })
})
