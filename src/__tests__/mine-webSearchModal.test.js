// src/__tests__/mine-webSearchModal.test.js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WebSearchModal from '@/modules/practice/mine/WebSearchModal.vue'

const card = {
  source: 'web',
  id: 'https://example.com/village',
  title: '陈家铺村竹编产业发展纪实',
  sub: '陈家铺村位于浙江省松阳县，竹编技艺传承已有300余年历史...',
  path: 'https://example.com/village',
  dimension: 'resources',
  relevance: 'high',
}

describe('WebSearchModal', () => {
  it('渲染标题、URL、内容摘要', () => {
    const w = mount(WebSearchModal, {
      props: { card },
      attachTo: document.body,
    })
    expect(w.text()).toContain('陈家铺村竹编产业发展纪实')
    expect(w.text()).toContain('https://example.com/village')
    expect(w.text()).toContain('竹编技艺传承已有300余年历史')
    // 关闭后清理 DOM
    w.unmount()
  })

  it('点击关闭按钮 → emit close', async () => {
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const closeBtn = w.find('[aria-label="关闭"]')
    await closeBtn.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    w.unmount()
  })

  it('点击「打开原网页」→ 调用 window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const openBtn = w.find('.modal-open-link')
    await openBtn.trigger('click')
    expect(openSpy).toHaveBeenCalledWith(card.path, '_blank')
    openSpy.mockRestore()
    w.unmount()
  })

  it('点击「采纳此信息」→ emit adopt 并 emit close', async () => {
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const adoptBtn = w.find('.modal-adopt')
    await adoptBtn.trigger('click')
    expect(w.emitted('adopt')).toBeTruthy()
    expect(w.emitted('close')).toBeTruthy()
    w.unmount()
  })

  it('点击遮罩层 → emit close', async () => {
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const overlay = w.find('.modal-overlay')
    await overlay.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    w.unmount()
  })

  it('snippet 为空时也不崩', () => {
    const emptyCard = { ...card, sub: '', title: '只有标题' }
    const w = mount(WebSearchModal, { props: { card: emptyCard }, attachTo: document.body })
    expect(w.text()).toContain('只有标题')
    w.unmount()
  })
})
