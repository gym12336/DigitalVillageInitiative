import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadBigComponents,
  saveBigComponent,
  deleteBigComponent,
  getBigComponent,
} from '../modules/builder/display/bigComponentStore.js'

const STORAGE_KEY = 'builder-big-components'

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

describe('bigComponentStore', () => {
  describe('saveBigComponent', () => {
    it('saves with normalized coordinates', () => {
      const name = '测试看板'
      const children = [
        { type: 'text', x: 100, y: 50, width: 300, height: 96, props: { text: 'Hello' } },
        { type: 'chart', x: 450, y: 0, width: 520, height: 320, props: { chartType: 'bar' } },
      ]

      const bc = saveBigComponent(name, children)

      // id format
      expect(bc.id).toMatch(/^bc_/)

      // name
      expect(bc.name).toBe('测试看板')

      // children length
      expect(bc.children).toHaveLength(2)

      // normalized coordinates: minX=100, minY=0
      // text: (100-100, 50-0) = (0, 50)
      expect(bc.children[0].x).toBe(0)
      expect(bc.children[0].y).toBe(50)
      expect(bc.children[0].width).toBe(300)
      expect(bc.children[0].height).toBe(96)

      // chart: (450-100, 0-0) = (350, 0)
      expect(bc.children[1].x).toBe(350)
      expect(bc.children[1].y).toBe(0)
      expect(bc.children[1].width).toBe(520)
      expect(bc.children[1].height).toBe(320)

      // totalWidth = max(0+300, 350+520) = max(300, 870) = 870
      expect(bc.totalWidth).toBe(870)

      // totalHeight = max(50+96, 0+320) = max(146, 320) = 320
      expect(bc.totalHeight).toBe(320)

      // createdAt is a number
      expect(typeof bc.createdAt).toBe('number')

      // thumbnail is empty
      expect(bc.thumbnail).toBe('')
    })

    it('persists to localStorage', () => {
      const children = [
        { type: 'text', x: 0, y: 0, width: 200, height: 100, props: { text: 'A' } },
      ]

      saveBigComponent('Test', children)

      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()

      const stored = JSON.parse(raw)
      expect(Array.isArray(stored)).toBe(true)
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('Test')
    })
  })

  describe('loadBigComponents', () => {
    it('returns [] when nothing saved', () => {
      const result = loadBigComponents()
      expect(result).toEqual([])
    })

    it('returns all saved components in order', () => {
      saveBigComponent('First', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      saveBigComponent('Second', [{ type: 'text', x: 10, y: 10, width: 100, height: 50, props: {} }])

      const result = loadBigComponents()
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('First')
      expect(result[1].name).toBe('Second')
    })

    it('handles corrupt localStorage and returns []', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json')

      const result = loadBigComponents()
      expect(result).toEqual([])
    })
  })

  describe('deleteBigComponent', () => {
    it('removes component by id', () => {
      const bc = saveBigComponent('ToDelete', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      deleteBigComponent(bc.id)

      const result = loadBigComponents()
      expect(result).toHaveLength(0)
    })

    it('does nothing for unknown id', () => {
      saveBigComponent('KeepMe', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      deleteBigComponent('bc_nonexistent')

      const result = loadBigComponents()
      expect(result).toHaveLength(1)
    })
  })

  describe('getBigComponent', () => {
    it('returns component by id', () => {
      const bc = saveBigComponent('FindMe', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      const found = getBigComponent(bc.id)
      expect(found).not.toBeUndefined()
      expect(found.id).toBe(bc.id)
      expect(found.name).toBe('FindMe')
    })

    it('returns undefined for unknown id', () => {
      saveBigComponent('Some', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])

      const found = getBigComponent('bc_unknown')
      expect(found).toBeUndefined()
    })
  })
})
