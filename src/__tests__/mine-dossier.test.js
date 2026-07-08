import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock api.js：dossier.js 改异步后不再碰 localStorage，改调这些接口。
// 重点验证：addDossier 走单件 POST；updateDossier 是「取全量→合并 patch→PUT 全量」；
// 导出函数对调用方的浅合并契约不变。
vi.mock('@/modules/practice/mine/api.js', () => ({
  apiListDossiers: vi.fn(),
  apiGetDossier: vi.fn(),
  apiCreateDossier: vi.fn(),
  apiUpdateDossier: vi.fn(),
  apiDeleteDossier: vi.fn(),
  apiImportDossiers: vi.fn(),
}))

import {
  createDossier,
  addDossier,
  loadDossiers,
  updateDossier,
  removeDossier,
  setStage,
  getDossier,
  readLegacyDossiers,
  hasPendingMigration,
  migrateLegacyDossiers,
} from '@/modules/practice/mine/dossier'
import * as api from '@/modules/practice/mine/api.js'

beforeEach(() => {
  vi.clearAllMocks()
  if (typeof localStorage !== 'undefined') localStorage.clear()
})

describe('createDossier（纯函数，不落库）', () => {
  it('由 idea 生成默认标题与初始结构', () => {
    const d = createDossier({ idea: '去陈家铺村帮村民把竹编卖出去', village: '陈家铺村', now: 0, rand: 0.5 })
    expect(d.id).toBeTruthy()
    expect(d.title).toBeTruthy()
    expect(d.stage).toBe('plan')
    expect(d.plan.targetVillage).toBe('陈家铺村')
    expect(d.collected).toEqual({ metricValues: [], materials: [], people: [] })
    expect(d.refs).toEqual([])
  })

  it('长 idea 标题截断', () => {
    const d = createDossier({ idea: '一二三四五六七八九十一二三四五六七八九十' })
    expect(d.title.length).toBeLessThanOrEqual(17)
  })

  it('概要字段落到对应位置', () => {
    const d = createDossier({
      teamName: '浙大团',
      village: '陈家铺村',
      topic: '非遗文化挖掘',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
    })
    expect(d.teamName).toBe('浙大团')
    expect(d.plan.targetVillage).toBe('陈家铺村')
    expect(d.plan.topic).toBe('非遗文化挖掘')
    expect(d.startDate).toBe('2026-07-10')
  })

  it('标题按队名·主题生成，缺一用另一个', () => {
    expect(createDossier({ teamName: '浙大团', topic: '非遗文化挖掘' }).title).toBe('浙大团·非遗文化挖掘')
    expect(createDossier({ teamName: '浙大团' }).title).toBe('浙大团')
    expect(createDossier({ topic: '非遗文化挖掘' }).title).toBe('非遗文化挖掘')
  })
})

describe('loadDossiers 归一化后端预览字段', () => {
  it('扁平预览字段回填成卡片期望形状（updatedAt + 嵌套 plan）', async () => {
    api.apiListDossiers.mockResolvedValue([
      {
        id: 'a',
        title: 'A',
        stage: 'plan',
        created_by: 7,
        updated_at: '2026-07-08T00:00:00.000Z',
        idea: '想法',
        village: '桃源村',
        topic: '教育',
        targetVillage: '桃源村小学',
      },
    ])
    const [d] = await loadDossiers()
    expect(d.updatedAt).toBe('2026-07-08T00:00:00.000Z')
    expect(d.createdBy).toBe(7)
    expect(d.plan).toEqual({ topic: '教育', targetVillage: '桃源村小学' })
    expect(d.idea).toBe('想法')
  })
})

describe('loadDossiers 带 teamId', () => {
  it('把 teamId 透传给 apiListDossiers', async () => {
    api.apiListDossiers.mockResolvedValue([])
    await loadDossiers(7)
    expect(api.apiListDossiers).toHaveBeenCalledWith(7)
  })
})

describe('addDossier 走单件 POST（带 teamId）', () => {
  it('造对象后 POST 到指定队，返回后端档案；不整表读写', async () => {
    api.apiCreateDossier.mockImplementation(async (teamId, d) => ({ ...d, _server: true, _team: teamId }))
    const d = await addDossier(5, { idea: '竹编', now: 0, rand: 0.5 })
    expect(api.apiListDossiers).not.toHaveBeenCalled() // 不再整表读
    expect(api.apiCreateDossier).toHaveBeenCalledTimes(1)
    const [teamId, posted] = api.apiCreateDossier.mock.calls[0]
    expect(teamId).toBe(5)
    expect(posted.idea).toBe('竹编')
    expect(posted.id).toBeTruthy()
    expect(d._server).toBe(true)
  })
})

describe('updateDossier：取全量→合并 patch→PUT 全量（浅合并契约不变）', () => {
  it('先 GET 再 PUT，patch 浅合并到完整档案', async () => {
    api.apiGetDossier.mockResolvedValue({
      id: 'd1',
      title: '旧标题',
      idea: '旧 idea',
      stage: 'plan',
      plan: { goal: 'g' },
    })
    api.apiUpdateDossier.mockImplementation(async (id, full) => full)

    const updated = await updateDossier('d1', { title: '新标题' }, 1000)

    expect(api.apiGetDossier).toHaveBeenCalledWith('d1')
    expect(api.apiUpdateDossier).toHaveBeenCalledTimes(1)
    const [, sent] = api.apiUpdateDossier.mock.calls[0]
    // 全量 PUT：未 patch 的字段保留（浅合并语义）
    expect(sent.title).toBe('新标题')
    expect(sent.idea).toBe('旧 idea')
    expect(sent.plan).toEqual({ goal: 'g' })
    expect(sent.updatedAt).toBe(new Date(1000).toISOString())
    expect(updated.title).toBe('新标题')
  })

  it('目标不存在（GET 返回 null）→ 返回 null，不 PUT', async () => {
    api.apiGetDossier.mockResolvedValue(null)
    expect(await updateDossier('nope', { title: 'x' })).toBe(null)
    expect(api.apiUpdateDossier).not.toHaveBeenCalled()
  })
})

describe('setStage / removeDossier / getDossier', () => {
  it('setStage 合法阶段复用 updateDossier', async () => {
    api.apiGetDossier.mockResolvedValue({ id: 'd1', stage: 'plan' })
    api.apiUpdateDossier.mockImplementation(async (id, full) => full)
    const r = await setStage('d1', 'track')
    expect(r.stage).toBe('track')
  })

  it('setStage 非法阶段返回 null，不请求', async () => {
    expect(await setStage('d1', 'bogus')).toBe(null)
    expect(api.apiGetDossier).not.toHaveBeenCalled()
  })

  it('removeDossier 调 DELETE', async () => {
    api.apiDeleteDossier.mockResolvedValue(null)
    expect(await removeDossier('d1')).toBe(true)
    expect(api.apiDeleteDossier).toHaveBeenCalledWith('d1')
  })

  it('getDossier 404 吞成 null', async () => {
    const err = new Error('不存在')
    err.status = 404
    api.apiGetDossier.mockRejectedValue(err)
    expect(await getDossier('nope')).toBe(null)
  })
})

describe('normalizeDossier 兼容旧档案（补新 plan 字段）', () => {
  it('缺 plan.phases/methods/risks/background/source → 补空数组/空串', async () => {
    api.apiGetDossier.mockResolvedValue({
      id: 'd1',
      title: '旧档案',
      stage: 'plan',
      plan: { goal: 'g', topic: '', targetVillage: '', metrics: [], expected: '' },
    })
    const d = await getDossier('d1')
    expect(d.plan.phases).toEqual([])
    expect(d.plan.methods).toEqual([])
    expect(d.plan.risks).toEqual([])
    expect(d.plan.background).toBe('')
    expect(d.plan.source).toBe('')
  })

  it('已有新字段则不覆盖', async () => {
    api.apiGetDossier.mockResolvedValue({
      id: 'd1',
      stage: 'plan',
      plan: {
        goal: 'g',
        topic: 't',
        targetVillage: 'v',
        metrics: [],
        expected: 'e',
        background: 'B',
        methods: ['M'],
        risks: ['R'],
        phases: [{ stage: 'plan', title: 'X', tasks: [{ text: 'a', done: true }] }],
        source: 'ai',
      },
    })
    const d = await getDossier('d1')
    expect(d.plan.background).toBe('B')
    expect(d.plan.methods).toEqual(['M'])
    expect(d.plan.risks).toEqual(['R'])
    expect(d.plan.phases).toHaveLength(1)
    expect(d.plan.source).toBe('ai')
  })
})

describe('一次性迁移', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('readLegacyDossiers 读旧键，损坏降级为 []', () => {
    localStorage.setItem('sx.mine.dossiers', JSON.stringify([{ id: 'x' }]))
    expect(readLegacyDossiers()).toHaveLength(1)
    localStorage.setItem('sx.mine.dossiers', '{坏JSON')
    expect(readLegacyDossiers()).toEqual([])
  })

  it('有旧档案且未迁移过 → hasPendingMigration 为 true', () => {
    localStorage.setItem('sx.mine.dossiers', JSON.stringify([{ id: 'x' }]))
    expect(hasPendingMigration()).toBe(true)
    localStorage.setItem('sx.mine.migrated', '2')
    expect(hasPendingMigration()).toBe(false)
  })

  it('migrate 成功后才清本地键并写 migrated 标记', async () => {
    localStorage.setItem('sx.mine.dossiers', JSON.stringify([{ id: 'old-1' }, { id: 'old-2' }]))
    api.apiImportDossiers.mockResolvedValue({ imported: 2, ids: ['n1', 'n2'] })

    const res = await migrateLegacyDossiers(3)
    expect(res.imported).toBe(2)
    expect(api.apiImportDossiers).toHaveBeenCalledTimes(1)
    expect(api.apiImportDossiers.mock.calls[0][0]).toBe(3) // teamId 透传
    expect(localStorage.getItem('sx.mine.dossiers')).toBe(null) // 已清
    expect(localStorage.getItem('sx.mine.migrated')).toBe('3')
  })

  it('migrate 失败则本地键保留（可安全重试）', async () => {
    localStorage.setItem('sx.mine.dossiers', JSON.stringify([{ id: 'old-1' }]))
    api.apiImportDossiers.mockRejectedValue(new Error('网络错误'))

    await expect(migrateLegacyDossiers(3)).rejects.toThrow()
    expect(localStorage.getItem('sx.mine.dossiers')).not.toBe(null) // 保留
    expect(localStorage.getItem('sx.mine.migrated')).toBe(null)
  })

  it('无旧档案时不请求，直接返回 0', async () => {
    const res = await migrateLegacyDossiers(3)
    expect(res).toEqual({ imported: 0, ids: [] })
    expect(api.apiImportDossiers).not.toHaveBeenCalled()
  })
})
