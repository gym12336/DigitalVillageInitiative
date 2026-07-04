import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppToast from '@/components/AppToast.vue'

describe('AppToast 共享提示', () => {
  it('show() 后显示文本，到期后自动隐藏', async () => {
    vi.useFakeTimers()
    const w = mount(AppToast, { attachTo: document.body })
    w.vm.show('已保存', 1000)
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('已保存')
    vi.advanceTimersByTime(1000)
    await w.vm.$nextTick()
    expect(w.vm.visible ?? false).toBeFalsy()
    vi.useRealTimers()
    w.unmount()
  })
})
