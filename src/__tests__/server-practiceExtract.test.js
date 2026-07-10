import { describe, it, expect, vi } from 'vitest'
import { extractFromText } from '../../server/services/practiceExtractService.js'

describe('practiceExtractService.extractFromText', () => {
  it('LLM 正常返回 → 规范化输出，各项带 source:auto + confidence', async () => {
    const chatImpl = vi.fn().mockResolvedValue({
      people: [{ name: '李伯', role: '竹编手艺人', quote: '这门手艺不能断', confidence: 0.9 }],
      metrics: [{ name: '月销售额', value: '5000', unit: '元', confidence: 0.8 }],
      materialHints: [{ name: '竹编工艺访谈录音', note: '30分钟', confidence: 0.7 }],
    })
    const r = await extractFromText('（一段访谈文字）', { chatImpl })
    expect(r.source).toBe('ai')
    expect(r.people[0].name).toBe('李伯')
    expect(r.people[0].confidence).toBe(0.9)
    expect(r.metrics[0].value).toBe('5000')
    expect(r.materialHints[0].name).toContain('竹编')
  })

  it('LLM 缺字段 → 补齐为空数组，不抛', async () => {
    const chatImpl = vi.fn().mockResolvedValue({ people: [{ name: '王姐' }] })
    const r = await extractFromText('文字', { chatImpl })
    expect(Array.isArray(r.metrics)).toBe(true)
    expect(Array.isArray(r.materialHints)).toBe(true)
    // 缺 confidence 补默认
    expect(typeof r.people[0].confidence).toBe('number')
    // 缺 role/quote 补空串
    expect(r.people[0].role).toBe('')
  })

  it('空文本 → 直接返回空结果，不调 LLM', async () => {
    const chatImpl = vi.fn()
    const r = await extractFromText('   ', { chatImpl })
    expect(chatImpl).not.toHaveBeenCalled()
    expect(r.people).toEqual([])
    expect(r.source).toBe('empty')
  })

  it('LLM 抛错 → 兜底空结果 source:error，不抛', async () => {
    const chatImpl = vi.fn().mockRejectedValue(new Error('boom'))
    const r = await extractFromText('一段文字', { chatImpl })
    expect(r.source).toBe('error')
    expect(r.people).toEqual([])
    expect(r.metrics).toEqual([])
  })

  it('LLM 返回非对象 → 兜底空结果', async () => {
    const chatImpl = vi.fn().mockResolvedValue('not json')
    const r = await extractFromText('一段文字', { chatImpl })
    expect(r.source).toBe('error')
  })
})
