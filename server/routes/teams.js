// 队伍路由：列我的队 / 建队 / 加入 / 队详情 / 队员列表 / 退队。全部需登录。
// 授权判定在 service 层（assertMember）。routes 只管 HTTP。
import { Router } from 'express'
import * as svc from '../services/teamService.js'
import { makeAuth } from '../middleware/auth.js'
import { validateCreateTeam, validateJoin, validateTeamId } from '../lib/validate.js'

export function makeTeamsRouter(db, secret) {
  const router = Router()
  router.use(makeAuth(secret, db)) // 整个域都需登录

  // 列出我加入的队（id/name/role/成员数/我在该队的档案数）。
  router.get('/', (req, res, next) => {
    try {
      res.json({ teams: svc.listMine(db, req.user.id) })
    } catch (e) {
      next(e)
    }
  })

  // 建队：{ name } → 自动邀请码，建队人写入 memberships(owner)。返回新队（含 inviteCode）。
  router.post('/', (req, res, next) => {
    try {
      const { name } = validateCreateTeam(req.body)
      const team = svc.create(db, req.user.id, { name })
      res.status(201).json({ team })
    } catch (e) {
      next(e)
    }
  })

  // 加入：{ inviteCode } → 幂等。放在 /:id 之前避免被当成 id。
  router.post('/join', (req, res, next) => {
    try {
      const { inviteCode } = validateJoin(req.body)
      const team = svc.join(db, req.user.id, { inviteCode })
      res.json({ team })
    } catch (e) {
      next(e)
    }
  })

  // 队详情（校验我是成员），含 inviteCode 供分享。
  router.get('/:id', (req, res, next) => {
    try {
      const teamId = validateTeamId(req.params.id)
      res.json({ team: svc.getDetail(db, req.user.id, teamId) })
    } catch (e) {
      next(e)
    }
  })

  // 队员列表（校验我是成员，否则 403），含每人在本队的档案计数。
  router.get('/:id/members', (req, res, next) => {
    try {
      const teamId = validateTeamId(req.params.id)
      res.json({ members: svc.listMembers(db, req.user.id, teamId) })
    } catch (e) {
      next(e)
    }
  })

  // 退队：删自己的 membership。建队人禁止退队（403）。
  router.delete('/:id/leave', (req, res, next) => {
    try {
      const teamId = validateTeamId(req.params.id)
      svc.leave(db, req.user.id, teamId)
      res.json({ ok: true })
    } catch (e) {
      next(e)
    }
  })

  return router
}
