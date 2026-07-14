import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('buildAndOpen', () => {
  let buildAndOpen

  beforeEach(async () => {
    vi.resetModules()
    vi.spyOn(Date, 'now').mockReturnValue(1712345678000)
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
    window.open = vi.fn()
    delete window.__previewState
    const mod = await import('@/modules/builder/editor/buildPreview.js')
    buildAndOpen = mod.buildAndOpen
  })

  it('连续调用两次 __previewState 含两个不同 id', () => {
    const s = { pageWidth: 800, pageHeight: 600, pageBackground: '#fff', components: [] }
    buildAndOpen(s)
    Math.random.mockReturnValue(0.987654321)
    buildAndOpen(s)

    const keys = Object.keys(window.__previewState)
    expect(keys).toHaveLength(2)
    expect(keys[0]).not.toBe(keys[1])
    expect(keys[0]).toMatch(/^p1712345678000/)
  })

  it('state 引用正确挂到 __previewState[id]', () => {
    const s = { pageWidth: 1200, pageHeight: 800, pageBackground: '#f0f0f0', components: [{ type: 'text' }] }
    buildAndOpen(s)
    const key = Object.keys(window.__previewState)[0]
    expect(window.__previewState[key]).toBe(s)
  })

  it('调用 window.open 传 hash 路由', () => {
    const s = { pageWidth: 800, pageHeight: 600, pageBackground: '#fff', components: [] }
    buildAndOpen(s)
    expect(window.open).toHaveBeenCalledTimes(1)
    const [url, target] = window.open.mock.calls[0]
    expect(target).toBe('_blank')
    expect(url).toMatch(/^#\/builder\/preview\?id=p/)
  })
})
