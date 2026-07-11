// 搭建台成果文档路由。全部需登录。
import { Router } from 'express'
import * as svc from '../services/builderService.js'
import { makeAuth } from '../middleware/auth.js'

export function makeBuilderRouter(db, secret) {
  const router = Router()
  router.use(makeAuth(secret, db))

  // 列出某 dossier 下的文档。query: ?type=editor|display|big-component
  router.get('/:dossierId/documents', (req, res, next) => {
    try {
      const docs = svc.listByDossier(db, req.user, req.params.dossierId, req.query.type)
      res.json({ documents: docs })
    } catch (e) {
      next(e)
    }
  })

  // 创建或覆盖文档。body: { type, name?, payload, id? }
  router.post('/:dossierId/documents', (req, res, next) => {
    try {
      const doc = svc.upsert(db, req.user, req.params.dossierId, req.body)
      res.status(201).json({ document: doc })
    } catch (e) {
      next(e)
    }
  })

  // 删除文档（仅 big-component）
  router.delete('/documents/:id', (req, res, next) => {
    try {
      svc.remove(db, req.user, req.params.id)
      res.json({ ok: true })
    } catch (e) {
      next(e)
    }
  })

  return router
}
