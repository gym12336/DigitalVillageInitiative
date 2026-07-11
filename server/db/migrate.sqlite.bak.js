// 幂等迁移：建表 + seed 5 支队邀请码 + 从旧「一人一队」结构升级到多队 memberships。
// 启动时调 migrate(db)；重复调用安全。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, 'schema.sql')

// 5 支队的固定邀请码。实训期够用；泄漏/作废属后续运维，不在本期。
const SEED_TEAMS = [
  { name: '第一队', invite_code: 'TEAM-01' },
  { name: '第二队', invite_code: 'TEAM-02' },
  { name: '第三队', invite_code: 'TEAM-03' },
  { name: '第四队', invite_code: 'TEAM-04' },
  { name: '第五队', invite_code: 'TEAM-05' },
]

/** 表是否有某列。用 PRAGMA table_info 判断，供幂等升级用。 */
function hasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  return cols.some((c) => c.name === column)
}

/**
 * 一次性升级：把旧的 users.team_id（一人一队）搬进 memberships，再删该列。
 * 幂等：靠「users 是否仍有 team_id 列」判断只跑一次；重复启动安全。
 * 全部在一个同步事务里，全或无。
 */
function upgradeToMemberships(db, now) {
  // schema.sql 已幂等建好 memberships 表并给 teams 补了 created_by（新库）。
  // 旧库可能缺 teams.created_by 列，先补。
  if (!hasColumn(db, 'teams', 'created_by')) {
    db.exec('ALTER TABLE teams ADD COLUMN created_by INTEGER REFERENCES users(id)')
  }

  // 只有旧库（users 仍有 team_id）才需要搬数据 + 删列。
  if (!hasColumn(db, 'users', 'team_id')) return

  // 删列要用「建新表→换名」，会 DROP 被 dossiers/memberships 外键引用的 users。
  // 按 SQLite 官方 table-rebuild 步骤：事务外先关外键（事务内改 pragma 无效），
  // 重建完再开回。better-sqlite3 同步执行，无并发顾虑。
  const fkWasOn = db.pragma('foreign_keys', { simple: true })
  db.pragma('foreign_keys = OFF')

  const run = db.transaction(() => {
    // 1. 搬成员关系：team_id 非空的用户 → memberships（joined_at 用注册时间占位）。
    const legacy = db
      .prepare('SELECT id, team_id, created_at FROM users WHERE team_id IS NOT NULL')
      .all()
    const insertMember = db.prepare(
      "INSERT OR IGNORE INTO memberships (user_id, team_id, role, joined_at) VALUES (?, ?, 'member', ?)",
    )
    for (const u of legacy) insertMember.run(u.id, u.team_id, u.created_at || now)

    // 2. 每队 created_by 回填为「该队 id 最小的成员」（确定性、可复现），其 role=owner。
    const teamIds = db
      .prepare('SELECT DISTINCT team_id FROM memberships ORDER BY team_id')
      .all()
    const setOwner = db.prepare(
      "UPDATE memberships SET role = 'owner' WHERE user_id = ? AND team_id = ?",
    )
    const setTeamCreator = db.prepare('UPDATE teams SET created_by = ? WHERE id = ?')
    for (const { team_id } of teamIds) {
      const owner = db
        .prepare('SELECT user_id FROM memberships WHERE team_id = ? ORDER BY user_id LIMIT 1')
        .get(team_id)
      if (owner) {
        setOwner.run(owner.user_id, team_id)
        setTeamCreator.run(owner.user_id, team_id)
      }
    }

    // 3. 删 users.team_id：SQLite 用「建新表 → 拷数据 → 换名」标准式。
    db.exec(`
      CREATE TABLE users_new (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT NOT NULL UNIQUE,
        password     TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        created_at   TEXT NOT NULL
      );
      INSERT INTO users_new (id, username, password, display_name, created_at)
        SELECT id, username, password, display_name, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `)
  })
  try {
    run()
  } finally {
    if (fkWasOn) db.pragma('foreign_keys = ON') // 恢复外键约束
  }
}

/**
 * 幂等迁移：建表 + seed 队伍 + 升级到多队 memberships。
 * @param {import('better-sqlite3').Database} db
 * @param {string} now - ISO 时间戳，测试可注入
 */
export function migrate(db, now = new Date().toISOString()) {
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'))

  // seed：邀请码 UNIQUE，用 INSERT OR IGNORE 保证幂等。
  const insert = db.prepare(
    'INSERT OR IGNORE INTO teams (name, invite_code, created_at) VALUES (?, ?, ?)',
  )
  const seed = db.transaction(() => {
    for (const t of SEED_TEAMS) insert.run(t.name, t.invite_code, now)
  })
  seed()

  // 从旧「一人一队」结构升级（幂等，只在旧库跑一次）。
  upgradeToMemberships(db, now)
}

export { SEED_TEAMS }

