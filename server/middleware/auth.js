// JWT 校验中间件：解 Authorization: Bearer <token> → req.user = { id, username }。
// 无 token / 校验失败 → 401。
// 多队后不再预取队伍（没有唯一队）——「我是不是某队成员」交给 service 层按需查 memberships，
// 中间件保持轻量、无隐式假设。
import { verifyToken } from '../lib/token.js'
import { httpError } from '../lib/validate.js'
import { getDb } from '../db/connection.js'

/** 生成鉴权中间件。secret 与 db 注入，便于测试与解耦。 */
export function makeAuth(secret, db = getDb()) {
  return function auth(req, _res, next) {
    const header = req.headers.authorization || ''
    const m = header.match(/^Bearer\s+(.+)$/i)
    if (!m) return next(httpError(401, '未登录'))

    let userId
    try {
      ;({ userId } = verifyToken(m[1], secret))
    } catch {
      return next(httpError(401, '登录已失效，请重新登录'))
    }

    const row = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId)
    if (!row) return next(httpError(401, '用户不存在'))

    req.user = { id: row.id, username: row.username } // 只放身份，不放 teamId
    next()
  }
}
