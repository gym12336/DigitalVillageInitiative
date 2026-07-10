import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory store for mocked API; reset between tests
const mockStore = { data: [] }

// Mock builderApi so we don't hit the network
vi.mock('../modules/builder/builderApi.js', () => ({
  apiLoadDocuments: vi.fn(async (_dossierId, type) => {
    if (type !== 'big-component') return []
    return [...mockStore.data]
  }),
  apiSaveDocument: vi.fn(async (_dossierId, { type, name, payload }) => {
    const doc = {
      id: 'bd_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      dossier_id: _dossierId,
      type,
      name: name || null,
      payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockStore.data.push(doc)
    return doc
  }),
  apiDeleteDocument: vi.fn(async (id) => {
    mockStore.data = mockStore.data.filter(d => d.id !== id)
  }),
}))

import {
  loadBigComponents,
  saveBigComponent,
  deleteBigComponent,
  getBigComponent,
} from '../modules/builder/display/bigComponentStore.js'

const DOSSIER_ID = 'test-dossier-1'

beforeEach(() => {
  mockStore.data = []
  vi.clearAllMocks()
})

describe('bigComponentStore', () => {
  describe('saveBigComponent', () => {
    it('saves with normalized coordinates', async () => {
      const name = '测试看板'
      const children = [
        { type: 'text', x: 100, y: 50, width: 300, height: 96, props: { text: 'Hello' } },
        { type: 'chart', x: 450, y: 0, width: 520, height: 320, props: { chartType: 'bar' } },
      ]

      const bc = await saveBigComponent(DOSSIER_ID, name, children)

      // The returned document has name from the API response
      expect(bc.name).toBe('测试看板')
      expect(bc.type).toBe('big-component')

      // payload is a JSON string — parse it to verify coordinate normalization
      const payload = JSON.parse(bc.payload)
      expect(payload.children).toHaveLength(2)

      // normalized: minX=100, minY=0
      // text: (100-100, 50-0) = (0, 50)
      expect(payload.children[0].x).toBe(0)
      expect(payload.children[0].y).toBe(50)
      expect(payload.children[0].width).toBe(300)
      expect(payload.children[0].height).toBe(96)

      // chart: (450-100, 0-0) = (350, 0)
      expect(payload.children[1].x).toBe(350)
      expect(payload.children[1].y).toBe(0)
      expect(payload.children[1].width).toBe(520)
      expect(payload.children[1].height).toBe(320)

      // totalWidth = max(0+300, 350+520) = max(300, 870) = 870
      expect(payload.totalWidth).toBe(870)
      // totalHeight = max(50+96, 0+320) = max(146, 320) = 320
      expect(payload.totalHeight).toBe(320)

      expect(typeof payload.createdAt).toBe('number')
      expect(payload.thumbnail).toBe('')
    })

    it('persists via API and is retrievable', async () => {
      const children = [
        { type: 'text', x: 0, y: 0, width: 200, height: 100, props: { text: 'A' } },
      ]

      await saveBigComponent(DOSSIER_ID, 'Test', children)

      const stored = await loadBigComponents(DOSSIER_ID)
      expect(Array.isArray(stored)).toBe(true)
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('Test')
    })
  })

  describe('loadBigComponents', () => {
    it('returns [] when nothing saved', async () => {
      const result = await loadBigComponents(DOSSIER_ID)
      expect(result).toEqual([])
    })

    it('returns all saved components in order', async () => {
      await saveBigComponent(DOSSIER_ID, 'First', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      await saveBigComponent(DOSSIER_ID, 'Second', [{ type: 'text', x: 10, y: 10, width: 100, height: 50, props: {} }])

      const result = await loadBigComponents(DOSSIER_ID)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('First')
      expect(result[1].name).toBe('Second')
    })

    it('gracefully handles API errors and returns []', async () => {
      const { apiLoadDocuments } = await import('../modules/builder/builderApi.js')
      apiLoadDocuments.mockRejectedValueOnce(new Error('Network error'))

      const result = await loadBigComponents(DOSSIER_ID)
      expect(result).toEqual([])
    })
  })

  describe('deleteBigComponent', () => {
    it('removes component by id', async () => {
      const bc = await saveBigComponent(DOSSIER_ID, 'ToDelete', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      await deleteBigComponent(bc.id)

      const result = await loadBigComponents(DOSSIER_ID)
      expect(result).toHaveLength(0)
    })

    it('silently ignores errors for unknown id', async () => {
      const { apiDeleteDocument } = await import('../modules/builder/builderApi.js')
      apiDeleteDocument.mockRejectedValueOnce(new Error('Not found'))

      // Should not throw
      await deleteBigComponent('bd_nonexistent')
    })
  })

  describe('getBigComponent', () => {
    it('returns component by id', async () => {
      const bc = await saveBigComponent(DOSSIER_ID, 'FindMe', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      const found = await getBigComponent(DOSSIER_ID, bc.id)
      expect(found).not.toBeUndefined()
      expect(found.id).toBe(bc.id)
      expect(found.name).toBe('FindMe')
    })

    it('returns undefined for unknown id', async () => {
      await saveBigComponent(DOSSIER_ID, 'Some', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      const found = await getBigComponent(DOSSIER_ID, 'bd_unknown')
      expect(found).toBeUndefined()
    })
  })
})
