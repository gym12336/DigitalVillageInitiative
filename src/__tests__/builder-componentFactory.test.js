import { describe, it, expect } from 'vitest'
import {
  createComponent,
  createTextComponent,
  createImageComponent,
  createChartComponent,
  createSensorComponent,
} from '../modules/builder/editor/componentFactory.js'

describe('componentFactory', () => {
  describe('createTextComponent', () => {
    it('returns a text component with defaults', () => {
      const c = createTextComponent(100, 200)
      expect(c.type).toBe('text')
      expect(c.x).toBe(100)
      expect(c.y).toBe(200)
      expect(c.width).toBe(300)
      expect(c.height).toBe(96)
      expect(c.props.text).toBe('新建文本')
      expect(c.props.fontSize).toBe(34)
      expect(c.props.color).toBe('#1f2937')
      expect(c.props.fontWeight).toBe(700)
      expect(c.props.textAlign).toBe('left')
      expect(c.props.backgroundColor).toBe('transparent')
    })
  })

  describe('createImageComponent', () => {
    it('returns an image component with defaults', () => {
      const c = createImageComponent(0, 0)
      expect(c.type).toBe('image')
      expect(c.width).toBe(320)
      expect(c.height).toBe(220)
      expect(c.props.objectFit).toBe('cover')
      expect(c.props.borderRadius).toBe(0)
      expect(c.props.autoRefresh).toBe(false)
      expect(c.props.refreshInterval).toBe(60)
    })
  })

  describe('createChartComponent', () => {
    it('returns a chart component with defaults and sample CSV', () => {
      const c = createChartComponent(0, 0)
      expect(c.type).toBe('chart')
      expect(c.width).toBe(520)
      expect(c.height).toBe(320)
      expect(c.props.chartType).toBe('bar')
      expect(c.props.title).toBe('图表标题')
      expect(c.props.labelColumn).toBe('label')
      expect(c.props.valueColumn).toBe('value')
      expect(c.props.csvText).toContain('label,value')
    })
  })

  describe('createSensorComponent', () => {
    it('returns a sensor component with defaults and 4 sensors', () => {
      const c = createSensorComponent(0, 0)
      expect(c.type).toBe('agri-sensor')
      expect(c.width).toBe(430)
      expect(c.height).toBe(400)
      expect(c.props.sensors).toHaveLength(4)
      expect(c.props.sensors[0]).toEqual({
        name: '温度', value: 26.5, unit: '°C', status: 'normal',
      })
    })
  })

  describe('createComponent', () => {
    it('dispatches to correct factory by type', () => {
      expect(createComponent('text', 10, 20).type).toBe('text')
      expect(createComponent('image', 10, 20).type).toBe('image')
      expect(createComponent('chart', 10, 20).type).toBe('chart')
      expect(createComponent('agri-sensor', 10, 20).type).toBe('agri-sensor')
    })
  })
})
