import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'
import * as svc from '../../server/services/dossierService.js'
import * as teamService from '../../server/services/teamService.js'

const NOW = '2026-07-08T00:00:00.000Z'
let db

// 造两队：队1 有 u1(owner)+u2(member)，队2 有 u3(owner)。返回精简 user（含 id）+ teamId。
function seed() {
  const mk = (name) =>
    db
      .prepare("INSERT INTO users (username,password,display_name,created_at) VALUES (?, 'h', '', ?)")
      .run(name, NOW).lastInsertRowid
  const u1 = mk('u1')
  const u2 = mk('u2')
  const u3 = mk('u3')
  const team1 = teamService.create(db, u1, { name: '队1' }, NOW)
  teamService.join(db, u2, { inviteCode: team1.inviteCode }, NOW)
  const team2 = teamService.create(db, u3, { name: '队2' }, NOW)
  return {
    team1a: { id: u1 },
    team1b: { id: u2 },
    team2: { id: u3 },
    noTeam: { id: 9999 },
    t1: team1.id,
    t2: team2.id,
  }
}

beforeEach(() => {
  db = new Database(':memory:')
  migrate(db, NOW)
})

describe('server/services/dossierService', () => {
  it('建/读/改/删往返一致', () => {
    const { team1a, t1 } = seed()
    const created = svc.create(db, team1a, t1, { id: 'd1', title: 'T', stage: 'plan', plan: { goal: 'g' } }, NOW)
    expect(created.plan.goal).toBe('g')

    expect(svc.getForUser(db, team1a, 'd1').title).toBe('T')

    svc.update(db, team1a, 'd1', { title: 'T2', stage: 'track', plan: { goal: 'g2' } }, NOW)
    const got = svc.getForUser(db, team1a, 'd1')
    expect(got.title).toBe('T2')
    expect(got.stage).toBe('track')

    expect(svc.remove(db, team1a, 'd1')).toBe(true)
    expect(() => svc.getForUser(db, team1a, 'd1')).toThrow(/不存在/)
  })

  it('乐观锁：expectedUpdatedAt 匹配则更新成功', () => {
    const { team1a, t1 } = seed()
    svc.create(db, team1a, t1, { id: 'd1', title: 'T', stage: 'plan' }, NOW)
    // 用读取时的 updated_at（=NOW）做乐观锁，匹配 → 正常更新
    const updated = svc.update(
      db, team1a, 'd1', { title: 'T2', stage: 'track' },
      '2026-07-08T05:00:00.000Z', { expectedUpdatedAt: NOW },
    )
    expect(updated.title).toBe('T2')
  })

  it('乐观锁：expectedUpdatedAt 不匹配（他人已改）则抛 409', () => {
    const { team1a, t1 } = seed()
    svc.create(db, team1a, t1, { id: 'd1', title: 'T', stage: 'plan' }, NOW)
    // 模拟他人已保存：库中 updated_at 变成新时间
    svc.update(db, team1a, 'd1', { title: 'byOther', stage: 'plan' }, '2026-07-08T03:00:00.000Z')
    // 我方仍拿着旧的 NOW 做乐观锁 → 冲突 409
    try {
      svc.update(
        db, team1a, 'd1', { title: 'mine', stage: 'plan' },
        '2026-07-08T06:00:00.000Z', { expectedUpdatedAt: NOW },
      )
      throw new Error('should have thrown')
    } catch (e) {
      expect(e.status).toBe(409)
    }
    // 冲突方未覆盖：库中仍是 byOther
    expect(svc.getForUser(db, team1a, 'd1').title).toBe('byOther')
  })

  it('列表只返回本队档案，updated_at 倒序', () => {
    const { team1a, team2, t1, t2 } = seed()
    svc.create(db, team1a, t1, { id: 'a', title: 'A' }, '2026-07-08T01:00:00.000Z')
    svc.create(db, team1a, t1, { id: 'b', title: 'B' }, '2026-07-08T02:00:00.000Z')
    svc.create(db, team2, t2, { id: 'c', title: 'C' }, NOW)

    const list = svc.listForTeam(db, team1a, t1)
    expect(list.map((d) => d.id)).toEqual(['b', 'a']) // 倒序，且不含队2 的 c
  })

  it('列表返回方案 A 预览字段（idea/village/topic/targetVillage），不含完整 payload', () => {
    const { team1a, t1 } = seed()
    svc.create(
      db,
      team1a,
      t1,
      {
        id: 'a',
        title: 'A',
        idea: '给村小学建图书角',
        village: '桃源村',
        plan: { topic: '教育帮扶', targetVillage: '桃源村小学' },
      },
      NOW,
    )
    const [row] = svc.listForTeam(db, team1a, t1)
    expect(row).toMatchObject({
      id: 'a',
      idea: '给村小学建图书角',
      village: '桃源村',
      topic: '教育帮扶',
      targetVillage: '桃源村小学',
    })
    expect(row).not.toHaveProperty('payload') // 仍是轻量，不回传完整 JSON
  })

  it('跨队访问被拒 403（核心安全用例）', () => {
    const { team1a, team2, t1 } = seed()
    svc.create(db, team1a, t1, { id: 'd1', title: 'T' }, NOW)
    // 队2 成员读队1 的档案 → 403
    expect(() => svc.getForUser(db, team2, 'd1')).toThrow()
    try {
      svc.getForUser(db, team2, 'd1')
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('A 队成员向 B 队建档被拒 403（不能往非成员队塞档案）', () => {
    const { team1a, t2 } = seed()
    expect(() => svc.create(db, team1a, t2, { id: 'x', title: 'x' }, NOW)).toThrow()
    try {
      svc.create(db, team1a, t2, { id: 'x', title: 'x' }, NOW)
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('删除他人档案（同队但非建档人）被拒 403，建档人本人可删', () => {
    const { team1a, team1b, t1 } = seed()
    svc.create(db, team1a, t1, { id: 'd1', title: 'T' }, NOW)

    // 同队队友能读能改
    expect(svc.getForUser(db, team1b, 'd1').title).toBe('T')
    // 但不能删
    try {
      svc.remove(db, team1b, 'd1')
      throw new Error('should have thrown')
    } catch (e) {
      expect(e.status).toBe(403)
    }
    // 建档人本人能删
    expect(svc.remove(db, team1a, 'd1')).toBe(true)
  })

  it('非成员建档/列表被拒 403', () => {
    const { noTeam, t1 } = seed()
    expect(() => svc.create(db, noTeam, t1, { id: 'x' }, NOW)).toThrow()
    expect(() => svc.listForTeam(db, noTeam, t1)).toThrow()
  })

  it('缺 teamId 建档/列表被拒 400', () => {
    const { team1a } = seed()
    expect(() => svc.listForTeam(db, team1a, undefined)).toThrow()
    try {
      svc.listForTeam(db, team1a, undefined)
    } catch (e) {
      expect(e.status).toBe(400)
    }
  })

  it('import 批量导入重铸 id，原 id 记入 migratedFrom', () => {
    const { team1a, t1 } = seed()
    const genId = (i) => `new-${i}`
    const res = svc.importBatch(
      db,
      team1a,
      t1,
      [
        { id: 'old-1', title: 'A' },
        { id: 'old-2', title: 'B' },
      ],
      genId,
      NOW,
    )
    expect(res).toEqual({ imported: 2, ids: ['new-0', 'new-1'] })
    const first = svc.getForUser(db, team1a, 'new-0')
    expect(first.id).toBe('new-0')
    expect(first.migratedFrom).toBe('old-1')
  })

  it('import 单事务全或无：一条非法则整批回滚', () => {
    const { team1a, t1 } = seed()
    const genId = (i) => `new-${i}`
    // 第二条超上限，触发 validateDossier 抛错
    const huge = 'x'.repeat(300 * 1024)
    expect(() =>
      svc.importBatch(db, team1a, t1, [{ id: 'ok', title: 'A' }, { id: 'bad', huge }], genId, NOW),
    ).toThrow()
    // 回滚：第一条也不该落库
    expect(svc.listForTeam(db, team1a, t1)).toHaveLength(0)
  })
})
