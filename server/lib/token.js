// 签发/校验 JWT。载荷只存 { userId }，有效期 7 天。
// secret 显式传入（由调用方从 .env 注入），便于测试且不隐式依赖全局。
import jwt from 'jsonwebtoken'

const EXPIRES_IN = '7d'

/** 签发 token。 */
export function signToken(userId, secret) {
  if (!secret) throw new Error('signToken: secret 缺失')
  return jwt.sign({ userId }, secret, { expiresIn: EXPIRES_IN })
}

/**
 * 校验 token。成功返回 { userId }；失败（签名错/过期/格式错）抛错。
 * 调用方（中间件）捕获后转 401。
 */
export function verifyToken(token, secret) {
  if (!secret) throw new Error('verifyToken: secret 缺失')
  const payload = jwt.verify(token, secret) // 失败即抛
  return { userId: payload.userId }
}
