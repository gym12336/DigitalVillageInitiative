import { describe, it, expect, vi } from 'vitest'
import { editCollected } from '../../server/services/practiceEditService.js'

describe('practiceEditService.editCollected', () => {
  it('LLM 正常返回 → 规范化保留合法 ops', async () => {
    const chatImpl = vi.fn().mockResolvedValue({
      ops: [
        { op: 'update', bucket: 'people', target: '王秀兰', field: 'category', value: '返乡青年', reason: '归类' },
        { op: 'merge_category', bucket: 'people', target: '村民', value: '村干部', reason: '合并' },
        { op: 'delete', bucket: 'metrics', target: '游客量', reason: '删除' },
      ],
    })
    const r = await editCollected({ snapshot: {}, instruction: '把王秀兰归为返乡青年' }, { chatImpl })
    expect(r.source).toBe('ai')
    expect(r.ops).toHaveLength(3)
    expect(r.ops[0].field).toBe('category')
  })

  it('白名单外字段的 update → 被过滤', async () => {
    const chatImpl = vi.fn().mockResolvedValue({
      ops: [
        { op: 'update', bucket: 'people', target: '李书记', field: 'confidence', value: '9', reason: 'x' },
        { op: 'update', bucket: 'people', target: '李书记', field: 'role', value: '村支书', reason: 'ok' },
      ],
    })
    const r = await editCollected({ snapshot: {}, instruction: 'x' }, { chatImpl })
    expect(r.ops).toHaveLength(1)
    expect(r.ops[0].field).toBe('role')
  })

  it('未知桶/操作/缺 target → 丢弃', async () => {
    const chatImpl = vi.fn().mockResolvedValue({
      ops: [
        { op: 'update', bucket: 'summary', target: 'x', field: 'name', value: 'y' },
        { op: 'frobnicate', bucket: 'people', target: 'x' },
        { op: 'delete', bucket: 'people' },
        { op: 'merge_category', bucket: 'people', target: '村民' },
      ],
    })
    const r = await editCollected({ snapshot: {}, instruction: 'x' }, { chatImpl })
    expect(r.ops).toEqual([])
  })

  it('空指令 → 直接返回空 ops，不调 LLM', async () => {
    const chatImpl = vi.fn()
    const r = await editCollected({ snapshot: {}, instruction: '  ' }, { chatImpl })
    expect(chatImpl).not.toHaveBeenCalled()
    expect(r.source).toBe('empty')
    expect(r.ops).toEqual([])
  })

  it('LLM 抛错 → 兜底空 ops source:error，不抛', async () => {
    const chatImpl = vi.fn().mockRejectedValue(new Error('boom'))
    const r = await editCollected({ snapshot: {}, instruction: '改点东西' }, { chatImpl })
    expect(r.source).toBe('error')
    expect(r.ops).toEqual([])
  })

  it('LLM 返回缺 ops 数组 → 兜底空', async () => {
    const chatImpl = vi.fn().mockResolvedValue({ nope: true })
    const r = await editCollected({ snapshot: {}, instruction: 'x' }, { chatImpl })
    expect(r.source).toBe('error')
  })
})
