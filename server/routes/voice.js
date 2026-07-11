// 乡村之声路由:需求列表 + 详情 + 浏览/收藏计数 + 问答列表。全部无需登录(只读+计数),对齐 villages。
// 注意:/qa 静态段放在 /:id 之前,避免被动态段捕获。
import { Router } from 'express'
import * as svc from '../services/voiceService.js'

export function makeVoiceRouter(db) {
  const router = Router()

  // GET /api/voice?page=1&pageSize=20&q=词&type=文化挖掘&status=待响应&sort=latest
  router.get('/', (req, res, next) => {
    try {
      res.json(svc.list(db, req.query))
    } catch (e) {
      next(e)
    }
  })

  // GET /api/voice/qa —— 问答列表(须在 /:id 之前)
  router.get('/qa', (_req, res, next) => {
    try {
      res.json({ qa: svc.listQa(db) })
    } catch (e) {
      next(e)
    }
  })

  // GET /api/voice/:id —— 单条需求详情
  router.get('/:id', (req, res, next) => {
    try {
      const demand = svc.getById(db, req.params.id)
      if (!demand) return res.status(404).json({ error: '需求不存在' })
      res.json({ demand })
    } catch (e) {
      next(e)
    }
  })

  // POST /api/voice/:id/view —— 浏览数 +1
  router.post('/:id/view', (req, res, next) => {
    try {
      const demand = svc.incrementViews(db, req.params.id)
      if (!demand) return res.status(404).json({ error: '需求不存在' })
      res.json({ demand })
    } catch (e) {
      next(e)
    }
  })

  // POST /api/voice/:id/favorite —— 收藏计数增减,body { delta: 1 | -1 }
  router.post('/:id/favorite', (req, res, next) => {
    try {
      const demand = svc.adjustFavorites(db, req.params.id, req.body?.delta)
      if (!demand) return res.status(404).json({ error: '需求不存在' })
      res.json({ demand })
    } catch (e) {
      next(e)
    }
  })

  return router
}
