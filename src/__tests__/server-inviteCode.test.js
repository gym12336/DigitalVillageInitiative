import { describe, it, expect } from 'vitest'
import { makeInviteCode, makeUniqueInviteCode, CODE_LEN, ALPHABET } from '../../server/lib/inviteCode.js'

describe('server/lib/inviteCode', () => {
  it('生成定长、仅含字母表字符的码', () => {
    const code = makeInviteCode()
    expect(code).toHaveLength(CODE_LEN)
    for (const ch of code) expect(ALPHABET).toContain(ch)
  })

  it('注入随机源可复现', () => {
    const rand = () => 0 // 全取字母表第一个字符
    expect(makeInviteCode(rand)).toBe(ALPHABET[0].repeat(CODE_LEN))
  })

  it('makeUniqueInviteCode 碰撞则重试，直到不存在', () => {
    let calls = 0
    // 第一次生成的码判为已存在，第二次不存在。
    const exists = (code) => {
      calls++
      return calls === 1
    }
    const code = makeUniqueInviteCode(exists, Math.random, 5)
    expect(typeof code).toBe('string')
    expect(calls).toBe(2)
  })

  it('多次仍碰撞则抛错', () => {
    const exists = () => true // 永远撞
    expect(() => makeUniqueInviteCode(exists, Math.random, 3)).toThrow()
  })
})
