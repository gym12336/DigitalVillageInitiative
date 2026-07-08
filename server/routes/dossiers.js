// 档案路由：CRUD + 一次性迁移导入。全部需登录（挂 auth 中间件）。
// 多队：列表/建档/导入显式带 teamId（query 或 body）；读/改/删由档案自身反查队。
// 授权判定在 service 层（assertMember；删除限本人）。
import { Router } from 'express'
import * as svc from '../services/dossierService.js'
import { makeAuth } from '../middleware/auth.js'
import { genId } from '../lib/genId.js'

export function makeDossiersRouter(db, secret) {
  const router = Router()
  router.use(makeAuth(secret, db)) // 整个域都需登录

  // 列出某队档案：必须带 ?teamId=<id>。
  router.get('/', (req, res, next) => {
    try {
      res.json({ dossiers: svc.listForTeam(db, req.user, req.query.teamId) })
    } catch (e) {
      next(e)
    }
  })

  router.get('/:id', (req, res, next) => {
    try {
      res.json({ dossier: svc.getForUser(db, req.user, req.params.id) })
    } catch (e) {
      next(e)
    }
  })

  // 建档：body 带 teamId，档案归属该队。
  router.post('/', (req, res, next) => {
    try {
      const { teamId, ...dossier } = req.body || {}
      const created = svc.create(db, req.user, teamId, dossier)
      res.status(201).json({ dossier: created })
    } catch (e) {
      next(e)
    }
  })

  // 一次性迁移到指定队：单事务全或无，每条重铸 id。放在 /:id 之前避免被吞。
  router.post('/import', (req, res, next) => {
    try {
      // 每条用真实时间戳 + 序号偏移，避免同毫秒重复；service 内是单事务。
      let n = Date.now()
      const result = svc.importBatch(
        db,
        req.user,
        req.body.teamId,
        req.body.dossiers,
        () => genId(n++),
      )
      res.status(201).json(result)
    } catch (e) {
      next(e)
    }
  })

  router.put('/:id', (req, res, next) => {
    try {
      const dossier = svc.update(db, req.user, req.params.id, req.body)
      res.json({ dossier })
    } catch (e) {
      next(e)
    }
  })

  router.delete('/:id', (req, res, next) => {
    try {
      svc.remove(db, req.user, req.params.id)
      res.json({ ok: true })
    } catch (e) {
      next(e)
    }
  })

  return router
}
