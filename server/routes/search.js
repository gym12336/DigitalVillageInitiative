// server/routes/search.js
// 联网搜索路由：POST /api/search/web，需登录。
import { Router } from 'express'
import { makeAuth } from '../middleware/auth.js'
import { httpError } from '../lib/validate.js'
import { searchVillage } from '../services/searchService.js'

/**
 * @param {object} deps - { db, secret, searchServiceImpl? }
 */
export function makeSearchRouter(db, secret, searchServiceImpl) {
  const router = Router()
  router.use(makeAuth(secret, db))

  const search = searchServiceImpl || searchVillage

  router.post('/web', async (req, res, next) => {
    try {
      const { village, idea } = req.body || {}
      if (!village || typeof village !== 'string' || !village.trim()) {
        throw httpError(400, '缺少目标村名称')
      }
      const { results } = await search({
        village: village.trim(),
        idea: typeof idea === 'string' ? idea : '',
      })
      res.json({ results })
    } catch (e) {
      next(e)
    }
  })

  return router
}
