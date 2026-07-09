// 乡村百科路由：列表 + 搜索 + 详情 + 标签聚合 + AI 内容增强。
// 列表/详情/标签无需登录；增删改 + enrich 待将来加管理员鉴权。
import { Router } from 'express'
import * as svc from '../services/villageService.js'
import * as ai from '../services/aiContentService.js'

export function makeVillagesRouter(db) {
  const router = Router()

  // GET /api/villages?page=1&pageSize=20&q=搜索词&province=浙江省&tag=非遗文化
  router.get('/', (req, res, next) => {
    try {
      const result = svc.list(db, req.query)
      res.json(result)
    } catch (e) {
      next(e)
    }
  })

  // GET /api/villages/meta —— 省份列表 + 热门标签
  router.get('/meta', (_req, res, next) => {
    try {
      res.json(svc.getMeta(db))
    } catch (e) {
      next(e)
    }
  })

  // GET /api/villages/:id —— 单个村庄详情
  router.get('/:id', (req, res, next) => {
    try {
      const village = svc.getById(db, req.params.id)
      if (!village) return res.status(404).json({ error: '村庄不存在' })
      res.json({ village })
    } catch (e) {
      next(e)
    }
  })

  // POST /api/villages —— 创建村庄（暂不鉴权，后续加 admin middleware）
  router.post('/', (req, res, next) => {
    try {
      const village = svc.create(db, req.body)
      res.status(201).json({ village })
    } catch (e) {
      next(e)
    }
  })

  // POST /api/villages/batch —— 批量导入（INSERT OR IGNORE，幂等）。
  // body: { villages: [...] }，单次建议 ≤500 条。返回 { inserted, skipped, total }。
  router.post('/batch', (req, res, next) => {
    try {
      const villages = req.body?.villages
      if (!Array.isArray(villages)) {
        return res.status(400).json({ error: 'body.villages 必须是数组' })
      }
      const { inserted, skipped } = svc.createBatch(db, villages)
      res.status(201).json({ inserted, skipped, total: villages.length })
    } catch (e) {
      next(e)
    }
  })

  // PUT /api/villages/:id —— 更新村庄
  router.put('/:id', (req, res, next) => {
    try {
      const village = svc.update(db, req.params.id, req.body)
      if (!village) return res.status(404).json({ error: '村庄不存在' })
      res.json({ village })
    } catch (e) {
      next(e)
    }
  })

  // DELETE /api/villages/:id —— 删除村庄
  router.delete('/:id', (req, res, next) => {
    try {
      const ok = svc.remove(db, req.params.id)
      if (!ok) return res.status(404).json({ error: '村庄不存在' })
      res.json({ deleted: true })
    } catch (e) {
      next(e)
    }
  })

  // POST /api/villages/:id/enrich —— AI 内容增强（生成 intro / facts / tags）
  router.post('/:id/enrich', async (req, res, next) => {
    try {
      const village = svc.getById(db, req.params.id)
      if (!village) return res.status(404).json({ error: '村庄不存在' })

      const fields = req.body.fields || ['intro', 'facts', 'tags']

      // 检查哪些字段已有 source:manual 人工编辑，自动跳过
      const skippable = []
      if (fields.includes('intro') && village.intro) {
        // 保守策略：intro 非空且长度 > 100 视为已有人工编辑
        if (village.intro.length > 100) skippable.push('intro')
      }

      const effectiveFields = fields.filter((f) => !skippable.includes(f))

      if (effectiveFields.length === 0) {
        return res.json({
          message: '所有请求字段已有人工编辑内容，跳过 AI 生成',
          skipped: skippable,
          results: {},
        })
      }

      const results = await ai.enrichAll(village, { fields: effectiveFields })

      // 将 AI 生成结果写回数据库（仅写入请求的字段）
      const updates = {}
      if (results.intro && !results.intro.error) {
        updates.intro = results.intro.intro
      }
      if (results.facts && !results.facts.error) {
        // 将 facts 合并到现有 facts
        const existingFacts = village.facts || {}
        updates.facts = {
          ...existingFacts,
          ...results.facts,
          _meta: results.facts._meta,
        }
      }
      if (results.tags && !results.tags.error) {
        updates.tags = results.tags
      }

      if (Object.keys(updates).length > 0) {
        svc.update(db, req.params.id, updates)
      }

      res.json({
        villageId: req.params.id,
        generated: effectiveFields,
        skipped: [...skippable, ...(results.skipped || [])],
        results,
      })
    } catch (e) {
      next(e)
    }
  })

  // GET /api/villages/:id/enrich/status —— 查询 AI 生成可用性
  router.get('/:id/enrich/status', (req, res, next) => {
    try {
      const village = svc.getById(db, req.params.id)
      if (!village) return res.status(404).json({ error: '村庄不存在' })

      res.json({
        villageId: req.params.id,
        intro: {
          exists: !!(village.intro && village.intro.length > 50),
          length: village.intro?.length || 0,
          source: village.intro?._meta?.source || (village.intro ? 'unknown' : 'empty'),
        },
        facts: {
          exists: !!(village.facts && Object.keys(village.facts).length > 1),
          source: village.facts?._meta?.source || (Object.keys(village.facts || {}).length > 1 ? 'unknown' : 'empty'),
        },
        tags: {
          exists: !!(village.tags && Object.keys(village.tags).length > 0),
          source: village.tags?._meta?.source || (Object.keys(village.tags || {}).length > 0 ? 'unknown' : 'empty'),
        },
        aiAvailable: !!process.env.DEEPSEEK_API_KEY,
      })
    } catch (e) {
      next(e)
    }
  })

  return router
}
