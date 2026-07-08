import { describe, it, expect } from 'vitest'
import { router } from '@/router/index.js'

describe('router 模块自动收集', () => {
  it('包含 villages 模块的列表与详情路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('village-list')
    expect(names).toContain('village-detail')
  })

  it('包含乡村百科三个横向子页路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('village-honors')
    expect(names).toContain('village-gallery')
    expect(names).toContain('village-tags')
  })

  it('包含首页与 not-found 兜底路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('home')
    expect(names).toContain('not-found')
  })

  it('旧路由 people / media / ranking 配置了重定向到新页，不 404', () => {
    const redirectOf = (p) => router.getRoutes().find((r) => r.path === p)?.redirect
    expect(redirectOf('/people')).toBe('/villages')
    expect(redirectOf('/media')).toBe('/villages/gallery')
    expect(redirectOf('/ranking')).toBe('/villages/honors')
  })
})
