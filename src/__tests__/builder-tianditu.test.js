import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock mapConfig before importing tianditu
vi.mock('../modules/builder/editor/map3d/mapConfig.js', () => ({
  getTiandituKey: vi.fn(() => 'test-key-123'),
}))

import {
  searchVillages,
  buildStaticImageUrl,
  normalizeRegion,
  PROVINCE_MAP,
} from '../modules/builder/editor/map3d/tianditu.js'

describe('tianditu', () => {
  describe('PROVINCE_MAP', () => {
    it('包含 35 条记录（34 省 + 不限）', () => {
      expect(PROVINCE_MAP).toHaveLength(35)
    })

    it('所有省份 adminCode 唯一', () => {
      const codes = PROVINCE_MAP.filter(p => p.adminCode !== '')
      const seen = new Set()
      for (const p of codes) {
        expect(seen.has(p.adminCode)).toBe(false)
        seen.add(p.adminCode)
      }
    })

    it('第一条为"不限"，adminCode 为空字符串', () => {
      expect(PROVINCE_MAP[0].name).toBe('不限')
      expect(PROVINCE_MAP[0].adminCode).toBe('')
    })
  })

  describe('buildStaticImageUrl', () => {
    it('拼装正确的天地图静态图 URL', () => {
      const url = buildStaticImageUrl(100.5, 23.8, 14, 640, 420)
      expect(url).toContain('api.tianditu.gov.cn/static')
      expect(url).toContain('center=100.5,23.8')
      expect(url).toContain('zoom=14')
      expect(url).toContain('size=640,420')
      expect(url).toContain('layers=img_w,cia_w')
      expect(url).toContain('tk=test-key-123')
    })
  })

  describe('normalizeRegion', () => {
    it('规范化标准格式地址', () => {
      const result = normalizeRegion('云南省普洱市澜沧拉祜族自治县竹塘乡')
      expect(result).toContain('云南省')
      expect(result).toContain('普洱市')
      expect(result).toContain('澜沧')
      expect(result).toContain('竹塘乡')
    })

    it('空字符串返回空字符串', () => {
      expect(normalizeRegion('')).toBe('')
    })

    it('null/undefined 返回空字符串', () => {
      expect(normalizeRegion(null)).toBe('')
      expect(normalizeRegion(undefined)).toBe('')
    })
  })

  describe('searchVillages', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('构造正确的请求 URL（含 specify 参数）', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      await searchVillages({ name: '和平村', provinceCode: '530000' })

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).toContain('api.tianditu.gov.cn/v2/search')
      expect(calledUrl).toContain('keyWord=%E5%92%8C%E5%B9%B3%E6%9D%91')
      expect(calledUrl).toContain('specify=530000')
      expect(calledUrl).toContain('queryType=1')
      expect(calledUrl).toContain('tk=test-key-123')
    })

    it('无 provinceCode 时不传 specify 参数', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      await searchVillages({ name: '和平村' })

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).not.toContain('specify=')
    })

    it('返回空数组当天地图返回空结果', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      const results = await searchVillages({ name: '不存在村庄' })
      expect(results).toEqual([])
    })

    it('5 秒超时时抛出错误', async () => {
      vi.useFakeTimers()

      // Mock fetch that respects the abort signal
      global.fetch.mockImplementationOnce((_url, opts) => {
        return new Promise((_resolve, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }
        })
      })

      const promise = searchVillages({ name: 'test' })
      vi.advanceTimersByTime(5100)

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })

    it('按 cityKeyword 做前端二次过滤', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          pois: [
            { name: '和平村', address: '云南省普洱市澜沧县竹塘乡', lon: '99.9', lat: '22.5' },
            { name: '和平村', address: '云南省昆明市宜良县狗街镇', lon: '103.1', lat: '24.9' },
          ],
        }),
      })

      const results = await searchVillages({ name: '和平村', cityKeyword: '普洱' })
      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('普洱')
    })

    it('网络错误时抛出错误', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(searchVillages({ name: 'test' })).rejects.toThrow('Network error')
    })
  })
})
