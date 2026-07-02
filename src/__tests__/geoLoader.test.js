import { describe, it, expect, vi } from 'vitest'
import { createGeoLoader } from '@/lib/geoLoader.js'

describe('geoLoader', () => {
  it('成功拉取并按 adcode 缓存（第二次不再请求）', async () => {
    const fake = { type: 'FeatureCollection', features: [] }
    const fetcher = vi.fn().mockResolvedValue(fake)
    const loader = createGeoLoader({ fetcher })
    const a = await loader.load('420000')
    const b = await loader.load('420000')
    expect(a).toBe(fake)
    expect(b).toBe(fake)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('拉取失败返回 null 且不抛出，记录失败 adcode', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network'))
    const errs = []
    const loader = createGeoLoader({ fetcher, onError: (adcode) => errs.push(adcode) })
    const r = await loader.load('999999')
    expect(r).toBe(null)
    expect(errs).toEqual(['999999'])
  })

  it('urlFor 生成 DataV 地址', () => {
    const loader = createGeoLoader({ fetcher: vi.fn() })
    expect(loader.urlFor('420000')).toContain('420000_full.json')
  })
})
