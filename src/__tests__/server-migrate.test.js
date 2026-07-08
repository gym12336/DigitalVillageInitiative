import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'

const NOW = '2026-07-08T00:00:00.000Z'

// 造一个「旧一人一队」结构的内存库：users 带 team_id、teams 无 created_by、无 memberships。
function makeLegacyDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      team_id INTEGER REFERENCES teams(id),
      created_at TEXT NOT NULL
    );
    CREATE TABLE teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE dossiers (
      id TEXT PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'plan',
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  return db
}

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)
}

describe('server/db/migrate 从旧一人一队结构升级', () => {
  let db
  beforeEach(() => {
    db = makeLegacyDb()
    // 老队 + 老用户 + 老档案（团队 1：u1(id1)、u2(id2)；团队 2：u3(id3)）
    db.prepare("INSERT INTO teams (id,name,invite_code,created_at) VALUES (10,'老一队','OLD-1',?)").run('2026-01-01')
    db.prepare("INSERT INTO teams (id,name,invite_code,created_at) VALUES (20,'老二队','OLD-2',?)").run('2026-01-01')
    db.prepare("INSERT INTO users (id,username,password,display_name,team_id,created_at) VALUES (1,'u1','h','A',10,'2026-02-01')").run()
    db.prepare("INSERT INTO users (id,username,password,display_name,team_id,created_at) VALUES (2,'u2','h','B',10,'2026-02-02')").run()
    db.prepare("INSERT INTO users (id,username,password,display_name,team_id,created_at) VALUES (3,'u3','h','C',20,'2026-02-03')").run()
    db.prepare("INSERT INTO users (id,username,password,display_name,team_id,created_at) VALUES (4,'u4','h','D',NULL,'2026-02-04')").run()
    db.prepare("INSERT INTO dossiers (id,team_id,created_by,title,stage,payload,created_at,updated_at) VALUES ('dx',10,1,'档案X','plan','{\"id\":\"dx\"}','2026-03-01','2026-03-01')").run()
    migrate(db, NOW)
  })

  it('memberships 正确生成（team_id 非空用户各一行）', () => {
    const rows = db.prepare('SELECT user_id, team_id, role FROM memberships ORDER BY team_id, user_id').all()
    expect(rows).toEqual([
      { user_id: 1, team_id: 10, role: 'owner' }, // 队 10 id 最小 → owner
      { user_id: 2, team_id: 10, role: 'member' },
      { user_id: 3, team_id: 20, role: 'owner' }, // 队 20 唯一成员 → owner
    ])
    // team_id 为空的 u4 不产生 membership
    expect(db.prepare('SELECT COUNT(*) c FROM memberships WHERE user_id = 4').get().c).toBe(0)
  })

  it('每队 created_by 回填为 id 最小的成员', () => {
    expect(db.prepare('SELECT created_by FROM teams WHERE id = 10').get().created_by).toBe(1)
    expect(db.prepare('SELECT created_by FROM teams WHERE id = 20').get().created_by).toBe(3)
  })

  it('users.team_id 列已移除，用户数据不丢', () => {
    expect(hasColumn(db, 'users', 'team_id')).toBe(false)
    expect(db.prepare('SELECT COUNT(*) c FROM users').get().c).toBe(4)
    expect(db.prepare('SELECT display_name FROM users WHERE id = 1').get().display_name).toBe('A')
  })

  it('档案不丢', () => {
    const d = db.prepare('SELECT team_id, created_by FROM dossiers WHERE id = ?').get('dx')
    expect(d).toEqual({ team_id: 10, created_by: 1 })
  })

  it('重复跑 migrate 幂等（不重复搬、不报错）', () => {
    migrate(db, NOW)
    migrate(db, NOW)
    expect(db.prepare('SELECT COUNT(*) c FROM memberships').get().c).toBe(3)
    expect(hasColumn(db, 'users', 'team_id')).toBe(false)
  })

  it('全新库（无 team_id 列）迁移不报错，seed 队伍在位', () => {
    const fresh = new Database(':memory:')
    fresh.pragma('foreign_keys = ON')
    migrate(fresh, NOW)
    expect(hasColumn(fresh, 'users', 'team_id')).toBe(false)
    expect(fresh.prepare('SELECT COUNT(*) c FROM teams').get().c).toBe(5) // TEAM-01..05
    expect(hasColumn(fresh, 'teams', 'created_by')).toBe(true)
  })
})
