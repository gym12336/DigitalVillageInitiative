import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'
import * as svc from '../../server/services/worksService.js'
import * as teamService from '../../server/services/teamService.js'

const NOW = '2026-07-10T00:00:00.000Z'
let db

// 队1：u1(owner)+u2(member)；队2：u3(owner)。
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

const sampleWork = (over = {}) => ({
  id: 'w1',
  title: '小朱湾电商成果',
  source: 'd1',
  layout: { cols: 12 },
  blocks: [{ id: 'b1', type: 'kpiGrid', x: 0, y: 0, w: 12, h: 2, props: {}, bindings: { items: 'metricValues' } }],
  ...over,
})

beforeEach(() => {
  db = new Database(':memory:')
  migrate(db, NOW)
})

describe('server/services/worksService', () => {
  it('保存/读回往返一致，title/source 抽入冗余列', () => {
    const { team1a, t1 } = seed()
    const saved = svc.save(db, team1a, t1, sampleWork(), NOW)
    expect(saved.blocks[0].type).toBe('kpiGrid')

    const got = svc.getForUser(db, team1a, 'w1')
    expect(got.title).toBe('小朱湾电商成果')

    const [row] = svc.listForTeam(db, team1a, t1)
    expect(row).toMatchObject({ id: 'w1', title: '小朱湾电商成果', source: 'd1' })
    expect(row).not.toHaveProperty('payload')
  })

  it('upsert：同 id 再存是更新而非重复', () => {
    const { team1a, t1 } = seed()
    svc.save(db, team1a, t1, sampleWork(), '2026-07-10T01:00:00.000Z')
    svc.save(db, team1a, t1, sampleWork({ title: '改名了' }), '2026-07-10T02:00:00.000Z')
    const list = svc.listForTeam(db, team1a, t1)
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('改名了')
  })

  it('列表只返回本队作品，updated_at 倒序', () => {
    const { team1a, team2, t1, t2 } = seed()
    svc.save(db, team1a, t1, sampleWork({ id: 'a' }), '2026-07-10T01:00:00.000Z')
    svc.save(db, team1a, t1, sampleWork({ id: 'b' }), '2026-07-10T02:00:00.000Z')
    svc.save(db, team2, t2, sampleWork({ id: 'c' }), NOW)
    const list = svc.listForTeam(db, team1a, t1)
    expect(list.map((w) => w.id)).toEqual(['b', 'a'])
  })

  it('跨队读作品被拒 403', () => {
    const { team1a, team2, t1 } = seed()
    svc.save(db, team1a, t1, sampleWork(), NOW)
    try {
      svc.getForUser(db, team2, 'w1')
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('向非成员队保存被拒 403', () => {
    const { team1a, t2 } = seed()
    try {
      svc.save(db, team1a, t2, sampleWork(), NOW)
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('已存在作品不能被改到别的队（防跨队搬运）', () => {
    const { team1a, t1 } = seed()
    svc.save(db, team1a, t1, sampleWork(), NOW)
    // team1a 不是 t2 成员，assertMember 先挡（403），保护到位
    try {
      svc.save(db, team1a, 2, sampleWork(), NOW)
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(403)
    }
  })

  it('删除：同队非建档人被拒 403，本人可删', () => {
    const { team1a, team1b, t1 } = seed()
    svc.save(db, team1a, t1, sampleWork(), NOW)
    // 队友能读
    expect(svc.getForUser(db, team1b, 'w1').title).toBe('小朱湾电商成果')
    try {
      svc.remove(db, team1b, 'w1')
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(403)
    }
    expect(svc.remove(db, team1a, 'w1')).toBe(true)
  })

  it('读/删不存在的作品 404', () => {
    const { team1a } = seed()
    try {
      svc.getForUser(db, team1a, 'nope')
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(404)
    }
  })

  it('缺 teamId 列表/保存被拒 400', () => {
    const { team1a } = seed()
    try {
      svc.listForTeam(db, team1a, undefined)
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(400)
    }
  })

  it('无 id 的作品保存被拒 400', () => {
    const { team1a, t1 } = seed()
    try {
      svc.save(db, team1a, t1, sampleWork({ id: '' }), NOW)
      throw new Error('should throw')
    } catch (e) {
      expect(e.status).toBe(400)
    }
  })
})
