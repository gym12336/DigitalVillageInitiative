import { describe, it, expect } from 'vitest'
import { router } from '@/router/index.js'

describe('router 模块自动收集', () => {
  it('包含 villages 模块的列表与详情路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('village-list')
    expect(names).toContain('village-detail')
  })

  it('包含首页与 not-found 兜底路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('home')
    expect(names).toContain('not-found')
  })
})
