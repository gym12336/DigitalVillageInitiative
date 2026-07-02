import { describe, it, expect } from 'vitest'
import { modules } from '@/modules.config.js'

describe('modules.config', () => {
  it('是一个非空数组', () => {
    expect(Array.isArray(modules)).toBe(true)
    expect(modules.length).toBeGreaterThan(0)
  })

  it('每个模块含 id/name/icon/path/enabled 字段', () => {
    for (const m of modules) {
      expect(typeof m.id).toBe('string')
      expect(typeof m.name).toBe('string')
      expect(typeof m.icon).toBe('string')
      expect(m.path.startsWith('/')).toBe(true)
      expect(typeof m.enabled).toBe('boolean')
    }
  })

  it('模块 id 唯一', () => {
    const ids = modules.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
