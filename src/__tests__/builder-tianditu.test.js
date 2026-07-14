import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock mapConfig before importing tianditu
vi.mock('../modules/builder/editor/map3d/mapConfig.js', () => ({
  getTiandituKey: vi.fn(() => 'test-key-123'),
}))

import {
  searchVillages,
  buildMosaicTiles,
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

  describe('buildMosaicTiles', () => {
    it('返回按图层顺序排列的 WMTS 瓦片列表（底图在前，注记在后）', () => {
      const tiles = buildMosaicTiles({ lng: 100.5, lat: 23.8, zoom: 14, width: 640, height: 420 })
      const imgTiles = tiles.filter(t => t.layer === 'img_w')
      const ciaTiles = tiles.filter(t => t.layer === 'cia_w')
      expect(imgTiles.length).toBeGreaterThan(0)
      expect(ciaTiles.length).toBe(imgTiles.length)
      const firstCiaIdx = tiles.findIndex(t => t.layer === 'cia_w')
      const lastImgIdx = tiles.map(t => t.layer).lastIndexOf('img_w')
      expect(firstCiaIdx).toBeGreaterThan(lastImgIdx)
    })

    it('每张瓦片 URL 命中 WMTS 接口并携带 tk / LAYER / TILEMATRIX', () => {
      const [t] = buildMosaicTiles({ lng: 100.5, lat: 23.8, zoom: 14, width: 640, height: 420 })
      expect(t.url).toContain('tianditu.gov.cn/img_w/wmts')
      expect(t.url).toContain('LAYER=img')
      expect(t.url).toContain('TILEMATRIXSET=w')
      expect(t.url).toContain('TILEMATRIX=14')
      expect(t.url).toContain('tk=test-key-123')
    })

    it('包含中心坐标的瓦片使 (lng,lat) 落在画布中心 (±256px)', () => {
      const width = 640, height = 420
      const tiles = buildMosaicTiles({ lng: 100.5, lat: 23.8, zoom: 14, width, height })
      // 中心瓦片：drawX/drawY 加半瓦片后应约等于画布中心
      const centerImg = tiles
        .filter(t => t.layer === 'img_w')
        .find(t => t.drawX <= width / 2 && t.drawX + 256 >= width / 2 && t.drawY <= height / 2 && t.drawY + 256 >= height / 2)
      expect(centerImg).toBeDefined()
    })

    it('画布尺寸变大 → 瓦片数量单调增加', () => {
      const small = buildMosaicTiles({ lng: 100.5, lat: 23.8, zoom: 14, width: 320, height: 200 })
      const large = buildMosaicTiles({ lng: 100.5, lat: 23.8, zoom: 14, width: 1280, height: 800 })
      expect(large.length).toBeGreaterThan(small.length)
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

    it('构造正确的请求 URL（含 specifyAdminCode 参数）', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      await searchVillages({ name: '和平村', provinceCode: '530000' })

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).toContain('api.tianditu.gov.cn/v2/search')
      expect(calledUrl).toContain('postStr=')
      expect(calledUrl).toContain('type=query')
      expect(calledUrl).toContain('tk=test-key-123')
      // postStr JSON 中包含 keyWord 和 specifyAdminCode（9 位国标码，前补 156）
      expect(calledUrl).toContain(encodeURIComponent('"keyWord":"和平村"'))
      expect(calledUrl).toContain(encodeURIComponent('"specifyAdminCode":"156530000"'))
    })

    it('无 provinceCode 时不传 specify 参数', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      await searchVillages({ name: '和平村' })

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).not.toContain(encodeURIComponent('"specifyAdminCode"'))
    })

    it('返回空数组当天地图返回空结果', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      const results = await searchVillages({ name: '不存在村庄' })
      expect(results).toEqual([])
    })

    it('兼容天地图 v2 的 status 对象格式 (infocode: 1000)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: { infocode: 1000, cndesc: '服务正常' },
          pois: [
            { name: '和平村', address: '云南省普洱市澜沧县竹塘乡', lonlat: '99.9,22.5' },
          ],
        }),
      })

      const results = await searchVillages({ name: '和平村' })
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('和平村')
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
            { name: '和平村', address: '云南省普洱市澜沧县竹塘乡', lonlat: '99.9,22.5' },
            { name: '和平村', address: '云南省昆明市宜良县狗街镇', lonlat: '103.1,24.9' },
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

import { pixelsToLngLat } from '../modules/builder/editor/map3d/panMath.js'

describe('pixelsToLngLat', () => {
  it('返回 { dLng: 0, dLat: 0 } 当 dx=0, dy=0', () => {
    const r = pixelsToLngLat(0, 0, 30, 17)
    expect(r.dLng).toBe(0)
    expect(r.dLat).toBe(0)
  })

  it('赤道 zoom=17，dx=+100 → dLng ≈ -0.001073°', () => {
    const r = pixelsToLngLat(100, 0, 0, 17)
    // mpp = 156543.03392 / 2^17 = 1.1943... m/px
    // dLng = -100 * 1.1943 / 111320 = -0.001073°
    expect(r.dLng).toBeCloseTo(-0.001073, 6)
    expect(r.dLat).toBe(0)
  })

  it('Web Mercator：dLng 与纬度无关（同 dx 不同 lat → 相同 dLng）', () => {
    const eq = pixelsToLngLat(100, 0, 0, 17)
    const at30 = pixelsToLngLat(100, 0, 30, 17)
    expect(at30.dLng).toBeCloseTo(eq.dLng, 6)
  })

  it('方向：dx=+100 → dLng < 0（抓住地图拖）', () => {
    const r = pixelsToLngLat(100, 0, 30, 17)
    expect(r.dLng).toBeLessThan(0)
  })

  it('方向：dy=+100 → dLat > 0（画布下方是北）', () => {
    const r = pixelsToLngLat(0, 100, 30, 17)
    expect(r.dLat).toBeGreaterThan(0)
  })

  it('zoom=18 相比 zoom=17，同 dx 下 |dLng| 减半', () => {
    const z17 = pixelsToLngLat(100, 0, 30, 17)
    const z18 = pixelsToLngLat(100, 0, 30, 18)
    expect(Math.abs(z18.dLng) / Math.abs(z17.dLng)).toBeCloseTo(0.5, 3)
  })
})
