// 方案生成路由：POST /api/plan/generate。需登录（挂 auth 中间件）。
// 无 teamId：方案生成是纯计算，不落库、不涉及队权限；生成结果由前端并入档案后走既有 PUT 落库。
import { Router } from 'express'
import { makeAuth } from '../middleware/auth.js'
import { validatePlanRequest } from '../lib/validate.js'
import { generatePlan } from '../services/planService.js'

/**
 * @param {object} deps - { db, secret, planService? }
 *   planService 允许注入（测试用）；默认走真实 generatePlan。
 */
export function makePlanRouter(db, secret, planService = { generatePlan }) {
  const router = Router()
  router.use(makeAuth(secret, db))

  router.post('/generate', async (req, res, next) => {
    try {
      const input = validatePlanRequest(req.body)
      const plan = await planService.generatePlan(input)
      res.json({ plan })
    } catch (e) {
      next(e)
    }
  })

  return router
}
