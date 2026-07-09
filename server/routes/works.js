// 成果作品路由：列表 + 保存(upsert) + 读 + 删。全部需登录（挂 auth 中间件）。
// 列表/保存显式带 teamId（query 或 body）；读/删由作品自身反查队。
// 授权判定在 service 层（assertMember；删除限本人）。
import { Router } from 'express'
import * as svc from '../services/worksService.js'
import { makeAuth } from '../middleware/auth.js'

export function makeWorksRouter(db, secret) {
  const router = Router()
  router.use(makeAuth(secret, db)) // 整个域都需登录

  // 列出某队作品：必须带 ?teamId=<id>。
  router.get('/', (req, res, next) => {
    try {
      res.json({ works: svc.listForTeam(db, req.user, req.query.teamId) })
    } catch (e) {
      next(e)
    }
  })

  router.get('/:id', (req, res, next) => {
    try {
      res.json({ work: svc.getForUser(db, req.user, req.params.id) })
    } catch (e) {
      next(e)
    }
  })

  // 保存作品（upsert）：body 带 teamId，其余为作品对象。
  router.post('/', (req, res, next) => {
    try {
      const { teamId, ...work } = req.body || {}
      const saved = svc.save(db, req.user, teamId, work)
      res.json({ work: saved })
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
