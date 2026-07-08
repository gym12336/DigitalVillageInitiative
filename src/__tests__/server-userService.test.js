import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'
import * as userService from '../../server/services/userService.js'
import * as teamService from '../../server/services/teamService.js'

const NOW = '2026-07-08T00:00:00.000Z'
let db

beforeEach(() => {
  db = new Database(':memory:')
  migrate(db, NOW)
})

describe('server/services/userService', () => {
  it('注册后密码是哈希（非明文）且能校验通过', async () => {
    const user = await userService.register(db, {
      username: 'alice',
      password: 'secret1',
      displayName: '小A',
    })
    expect(user).toMatchObject({ username: 'alice', displayName: '小A', teams: [] })
    expect(user).not.toHaveProperty('password')

    const row = db.prepare('SELECT password FROM users WHERE id = ?').get(user.id)
    expect(row.password).not.toBe('secret1') // 已哈希

    const logged = await userService.login(db, { username: 'alice', password: 'secret1' })
    expect(logged.id).toBe(user.id)
  })

  it('重复用户名报 409', async () => {
    await userService.register(db, { username: 'bob', password: 'secret1', displayName: '' })
    await expect(
      userService.register(db, { username: 'bob', password: 'other1', displayName: '' }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('密码错误登录抛 401', async () => {
    await userService.register(db, { username: 'carol', password: 'secret1', displayName: '' })
    await expect(
      userService.login(db, { username: 'carol', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('用户名不存在登录抛 401', async () => {
    await expect(
      userService.login(db, { username: 'ghost', password: 'x' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('getUserById 返回我加入的所有队（含 role）', async () => {
    const user = await userService.register(db, {
      username: 'dave',
      password: 'secret1',
      displayName: '',
    })
    // 建一个队（owner）+ 用邀请码加入另一个 seed 队（member）
    const owned = teamService.create(db, user.id, { name: '我的队' }, NOW)
    teamService.join(db, user.id, { inviteCode: 'TEAM-01' }, NOW)

    const fresh = userService.getUserById(db, user.id)
    expect(fresh.teams).toEqual(
      expect.arrayContaining([
        { id: owned.id, name: '我的队', role: 'owner' },
        expect.objectContaining({ name: '第一队', role: 'member' }),
      ]),
    )
    expect(fresh.teams).toHaveLength(2)
  })
})
