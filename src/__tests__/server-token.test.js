import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../../server/lib/token.js'

const SECRET = 'test-secret'

describe('server/lib/token', () => {
  it('签发的 token 能被同 secret 校验，取回 userId', () => {
    const token = signToken(42, SECRET)
    expect(verifyToken(token, SECRET)).toEqual({ userId: 42 })
  })

  it('被篡改的 token 校验失败', () => {
    const token = signToken(1, SECRET)
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa')
    expect(() => verifyToken(tampered, SECRET)).toThrow()
  })

  it('错误 secret 校验失败', () => {
    const token = signToken(1, SECRET)
    expect(() => verifyToken(token, 'wrong-secret')).toThrow()
  })

  it('缺 secret 直接抛错', () => {
    expect(() => signToken(1, '')).toThrow(/secret/)
    expect(() => verifyToken('x', '')).toThrow(/secret/)
  })
})
