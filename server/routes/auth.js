// 认证路由：注册 / 登录 / 取当前用户。入队已移到队伍域 POST /api/teams/join。
// 工厂函数注入 db 与 secret，便于测试。routes 只管 HTTP，逻辑在 service。
import { Router } from 'express'
import * as userService from '../services/userService.js'
import { signToken } from '../lib/token.js'
import { validateRegister, validateLogin } from '../lib/validate.js'
import { makeAuth } from '../middleware/auth.js'

export function makeAuthRouter(db, secret) {
  const router = Router()
  const auth = makeAuth(secret, db)

  // 注册后直接发 token，省一次登录。
  router.post('/register', async (req, res, next) => {
    try {
      const body = validateRegister(req.body)
      const user = await userService.register(db, body)
      res.status(201).json({ token: signToken(user.id, secret), user })
    } catch (e) {
      next(e)
    }
  })

  router.post('/login', async (req, res, next) => {
    try {
      const body = validateLogin(req.body)
      const user = await userService.login(db, body)
      res.json({ token: signToken(user.id, secret), user })
    } catch (e) {
      next(e)
    }
  })

  // 取当前用户（含 teams[]）。
  router.get('/me', auth, (req, res, next) => {
    try {
      const user = userService.getUserById(db, req.user.id)
      if (!user) return next({ status: 401, message: '用户不存在' })
      res.json({ user })
    } catch (e) {
      next(e)
    }
  })

  return router
}
