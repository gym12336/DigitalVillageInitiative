import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'
import * as svc from '../../server/services/teamService.js'
import * as dossierSvc from '../../server/services/dossierService.js'

const NOW = '2026-07-08T00:00:00.000Z'
let db

// 造几个裸用户（不经 bcrypt，测 team 逻辑够用）。
function makeUser(username, at = NOW) {
  const info = db
    .prepare("INSERT INTO users (username, password, display_name, created_at) VALUES (?, 'h', ?, ?)")
    .run(username, username, at)
  return info.lastInsertRowid
}

beforeEach(() => {
  db = new Database(':memory:')
  migrate(db, NOW)
})

describe('server/services/teamService', () => {
  it('建队：生成邀请码，建队人 role=owner，返回含 inviteCode', () => {
    const u = makeUser('alice')
    const team = svc.create(db, u, { name: '桃源队' }, NOW)
    expect(team.name).toBe('桃源队')
    expect(team.role).toBe('owner')
    expect(typeof team.inviteCode).toBe('string')
    expect(team.inviteCode.length).toBeGreaterThan(0)
    expect(team.memberCount).toBe(1)

    const m = db.prepare('SELECT role FROM memberships WHERE user_id = ? AND team_id = ?').get(u, team.id)
    expect(m.role).toBe('owner')
  })

  it('建队生成的邀请码唯一（碰撞则重试）', () => {
    const u = makeUser('alice')
    // rand 先吐出会撞已存在 TEAM-01 的序列不可能，这里只验证两次建队码不同。
    const a = svc.create(db, u, { name: '队A' }, NOW)
    const b = svc.create(db, u, { name: '队B' }, NOW)
    expect(a.inviteCode).not.toBe(b.inviteCode)
  })

  it('加入：写 member；重复加入幂等（不报错、不重复行）', () => {
    const owner = makeUser('owner')
    const joiner = makeUser('joiner')
    const team = svc.create(db, owner, { name: '队' }, NOW)

    const first = svc.join(db, joiner, { inviteCode: team.inviteCode }, NOW)
    expect(first.role).toBe('member')
    // 再加入一次：幂等
    const again = svc.join(db, joiner, { inviteCode: team.inviteCode }, NOW)
    expect(again.id).toBe(team.id)

    const count = db
      .prepare('SELECT COUNT(*) c FROM memberships WHERE user_id = ? AND team_id = ?')
      .get(joiner, team.id).c
    expect(count).toBe(1) // 只有一行
  })

  it('加入：邀请码无效抛 409', () => {
    const u = makeUser('alice')
    expect(() => svc.join(db, u, { inviteCode: 'NOPE-NOPE' }, NOW)).toThrow()
    try {
      svc.join(db, u, { inviteCode: 'NOPE-NOPE' }, NOW)
    } catch (e) {
      expect(e.status).toBe(409)
    }
  })

  it('assertMember：命中返回 role，未命中 403（跨队隔离核心用例）', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    const teamA = svc.create(db, a, { name: 'A队' }, NOW)

    expect(svc.assertMember(db, a, teamA.id).role).toBe('owner')
    // 非成员 b 访问 A 队 → 403
    expect(() => svc.assertMember(db, b, teamA.id)).toThrow()
    try {
      svc.assertMember(db, b, teamA.id)
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('listMine：列我加入的队，含成员数与我的档案数', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    const team = svc.create(db, a, { name: '队' }, NOW)
    svc.join(db, b, { inviteCode: team.inviteCode }, NOW)
    // a 在该队建 2 份，b 建 1 份
    dossierSvc.create(db, { id: a }, team.id, { id: 'd1', title: 'A1' }, NOW)
    dossierSvc.create(db, { id: a }, team.id, { id: 'd2', title: 'A2' }, NOW)
    dossierSvc.create(db, { id: b }, team.id, { id: 'd3', title: 'B1' }, NOW)

    const mine = svc.listMine(db, a)
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ id: team.id, role: 'owner', memberCount: 2, myDossierCount: 2 })
  })

  it('listMembers：含每人档案计数，0 份成员也出现；非成员看被拒 403', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    const outsider = makeUser('outsider')
    const team = svc.create(db, a, { name: '队' }, NOW)
    svc.join(db, b, { inviteCode: team.inviteCode }, NOW)
    dossierSvc.create(db, { id: a }, team.id, { id: 'd1', title: 'A1' }, NOW)

    const members = svc.listMembers(db, a, team.id)
    const byName = Object.fromEntries(members.map((m) => [m.username, m]))
    expect(byName.a).toMatchObject({ role: 'owner', dossierCount: 1 })
    expect(byName.b).toMatchObject({ role: 'member', dossierCount: 0 }) // 0 份也出现

    expect(() => svc.listMembers(db, outsider, team.id)).toThrow()
    try {
      svc.listMembers(db, outsider, team.id)
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('退队：普通成员可退；建队人禁止退队 403', () => {
    const owner = makeUser('owner')
    const member = makeUser('member')
    const team = svc.create(db, owner, { name: '队' }, NOW)
    svc.join(db, member, { inviteCode: team.inviteCode }, NOW)

    // 成员退队成功
    expect(svc.leave(db, member, team.id)).toBe(true)
    expect(db.prepare('SELECT COUNT(*) c FROM memberships WHERE user_id = ?').get(member).c).toBe(0)

    // 建队人禁止退队
    try {
      svc.leave(db, owner, team.id)
      throw new Error('should have thrown')
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('getDetail：成员可看含 inviteCode；非成员 403', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    const team = svc.create(db, a, { name: '队' }, NOW)
    const detail = svc.getDetail(db, a, team.id)
    expect(detail.inviteCode).toBe(team.inviteCode)
    expect(() => svc.getDetail(db, b, team.id)).toThrow()
  })
})
