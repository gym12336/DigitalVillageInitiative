import { describe, it, expect } from 'vitest'
import {
  validateRegister,
  validateLogin,
  validateJoin,
  validateDossier,
  validatePlanRequest,
  PAYLOAD_MAX_BYTES,
} from '../../server/lib/validate.js'

describe('server/lib/validate', () => {
  describe('validateRegister', () => {
    it('合法体规范化 username（trim）并透传', () => {
      expect(validateRegister({ username: '  alice ', password: '123456' })).toEqual({
        username: 'alice',
        password: '123456',
        displayName: '',
      })
    })
    it('用户名过短报 400', () => {
      expect(() => validateRegister({ username: 'ab', password: '123456' })).toThrow(
        /用户名/,
      )
    })
    it('密码过短报 400', () => {
      expect(() => validateRegister({ username: 'alice', password: '123' })).toThrow(
        /密码/,
      )
    })
    it('非字符串字段报 400', () => {
      const err = (() => {
        try {
          validateRegister({ username: 123, password: '123456' })
        } catch (e) {
          return e
        }
      })()
      expect(err.status).toBe(400)
    })
  })

  describe('validateLogin', () => {
    it('合法体透传', () => {
      expect(validateLogin({ username: 'alice', password: 'x' })).toEqual({
        username: 'alice',
        password: 'x',
      })
    })
    it('空用户名报 400', () => {
      expect(() => validateLogin({ username: '  ', password: 'x' })).toThrow()
    })
  })

  describe('validateJoin', () => {
    it('trim 邀请码', () => {
      expect(validateJoin({ inviteCode: ' TEAM-01 ' })).toEqual({ inviteCode: 'TEAM-01' })
    })
    it('空邀请码报 400', () => {
      expect(() => validateJoin({ inviteCode: '' })).toThrow()
    })
  })

  describe('validateDossier', () => {
    it('抽取 title/stage，序列化 payload', () => {
      const r = validateDossier({ id: 'd1', title: '标题', stage: 'track', plan: {} })
      expect(r.id).toBe('d1')
      expect(r.title).toBe('标题')
      expect(r.stage).toBe('track')
      expect(JSON.parse(r.payload).plan).toEqual({})
    })
    it('非法 stage 回落到 plan', () => {
      expect(validateDossier({ id: 'd1', stage: 'bogus' }).stage).toBe('plan')
    })
    it('缺 id 报 400', () => {
      expect(() => validateDossier({ title: 'x' })).toThrow(/id/)
    })
    it('超大 payload 报 400', () => {
      const big = 'x'.repeat(PAYLOAD_MAX_BYTES + 1)
      expect(() => validateDossier({ id: 'd1', big })).toThrow(/上限/)
    })
  })

  describe('validatePlanRequest', () => {
    it('合法体 trim idea 并透传其他可选字段', () => {
      expect(
        validatePlanRequest({
          idea: '  去陈家铺村  ',
          village: '陈家铺村 ',
          topic: '产业',
          startDate: '2026-07-10',
          endDate: '2026-07-20',
          refs: [{ source: 'village', title: 'x' }],
        }),
      ).toEqual({
        idea: '去陈家铺村',
        village: '陈家铺村',
        topic: '产业',
        startDate: '2026-07-10',
        endDate: '2026-07-20',
        refs: [{ source: 'village', title: 'x' }],
      })
    })
    it('缺 idea 报 400', () => {
      expect(() => validatePlanRequest({})).toThrow(/idea/)
    })
    it('空白 idea 报 400', () => {
      expect(() => validatePlanRequest({ idea: '   ' })).toThrow()
    })
    it('idea 超长报 400', () => {
      expect(() => validatePlanRequest({ idea: 'a'.repeat(600) })).toThrow(/长度/)
    })
    it('refs 非数组降级为空数组', () => {
      const r = validatePlanRequest({ idea: '去村里', refs: 'nope' })
      expect(r.refs).toEqual([])
    })
  })
})
