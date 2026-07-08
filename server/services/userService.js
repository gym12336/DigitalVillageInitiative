// 用户读写 + 密码哈希。纯逻辑，db 显式传入，可用内存库单测。
// 密码用 bcryptjs 异步哈希/校验，避免阻塞（better-sqlite3 虽同步，哈希是 CPU 密集）。
// 多队后：用户不再持单一 team，公开 user 含 teams[]（我加入的所有队，含 role）。
import bcrypt from 'bcryptjs'
import { httpError } from '../lib/validate.js'

const BCRYPT_COST = 10

/** 取某用户加入的所有队（含在该队的 role），按加入时间升序。 */
function teamsForUser(db, userId) {
  return db
    .prepare(
      `SELECT t.id, t.name, m.role
       FROM memberships m JOIN teams t ON t.id = m.team_id
       WHERE m.user_id = ?
       ORDER BY m.joined_at, t.id`,
    )
    .all(userId)
}

// 对外的 user 形状：绝不含 password。teams 为空数组表示尚未加入任何队。
function toPublicUser(db, row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    teams: teamsForUser(db, row.id),
  }
}

/** 按 id 取公开 user（含 teams[]）。找不到返回 null。 */
export function getUserById(db, id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  return row ? toPublicUser(db, row) : null
}

/**
 * 注册。username 唯一，冲突抛 409。密码存 bcrypt 哈希。
 * 返回公开 user（未加入任何队，teams=[]）。
 */
export async function register(db, { username, password, displayName }, now = new Date().toISOString()) {
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)
  if (exists) throw httpError(409, '用户名已存在')

  const hash = await bcrypt.hash(password, BCRYPT_COST)
  const info = db
    .prepare(
      'INSERT INTO users (username, password, display_name, created_at) VALUES (?, ?, ?, ?)',
    )
    .run(username, hash, displayName || '', now)
  return getUserById(db, info.lastInsertRowid)
}

/**
 * 登录。用户名不存在或密码不符一律抛 401（不泄露哪一项错）。
 * 返回公开 user（含 teams[]）。
 */
export async function login(db, { username, password }) {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!row) throw httpError(401, '用户名或密码错误')
  const ok = await bcrypt.compare(password, row.password)
  if (!ok) throw httpError(401, '用户名或密码错误')
  return toPublicUser(db, row)
}
