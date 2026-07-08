// 队伍域：建队 / 加入 / 列我的队 / 队详情 / 队员列表 / 退队。
// 纯逻辑，db 显式传入，可用内存库单测。授权核心 assertMember 也在此，供 dossierService 复用。
import { httpError } from '../lib/validate.js'
import { makeUniqueInviteCode } from '../lib/inviteCode.js'

// —— 授权核心（纯查询，跨队隔离的唯一闸口）——

/**
 * 队成员判定：memberships 无 (userId, teamId) 行 → 403。
 * 所有带 teamId 的接口（列档案、建档、看队员、看队详情）都过这一关。
 * 返回该成员的 membership 行（含 role），命中即可复用。
 */
export function assertMember(db, userId, teamId) {
  const row = db
    .prepare('SELECT role FROM memberships WHERE user_id = ? AND team_id = ?')
    .get(userId, teamId)
  if (!row) throw httpError(403, '你不是该队成员')
  return row
}

/** 队存在性：取队伍行，不存在抛 404。 */
function teamRow(db, teamId) {
  const t = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId)
  if (!t) throw httpError(404, '队伍不存在')
  return t
}

// —— 建队 / 加入 ——

/**
 * 建队：生成唯一邀请码，建队人写入 memberships（role=owner）。
 * 返回新队（含 invite_code，供建队人分享）。单事务全或无。
 * @param {() => number} rand - 注入随机源，测试可复现。
 */
export function create(db, userId, { name }, now = new Date().toISOString(), rand = Math.random) {
  const exists = (code) => !!db.prepare('SELECT 1 FROM teams WHERE invite_code = ?').get(code)
  const inviteCode = makeUniqueInviteCode(exists, rand)

  const run = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO teams (name, invite_code, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(name, inviteCode, userId, now)
    const teamId = info.lastInsertRowid
    db.prepare(
      "INSERT INTO memberships (user_id, team_id, role, joined_at) VALUES (?, ?, 'owner', ?)",
    ).run(userId, teamId, now)
    return teamId
  })
  const teamId = run()
  return getDetail(db, userId, teamId)
}

/**
 * 加入：按邀请码找队，写 memberships（role=member）。
 * 已在队里则幂等返回，不报错、不重复行。邀请码无效抛 409。
 * 返回队详情。
 */
export function join(db, userId, { inviteCode }, now = new Date().toISOString()) {
  const team = db.prepare('SELECT id FROM teams WHERE invite_code = ?').get(inviteCode)
  if (!team) throw httpError(409, '邀请码无效')
  // INSERT OR IGNORE：主键 (user_id, team_id) 冲突即跳过，天然幂等。
  db.prepare(
    "INSERT OR IGNORE INTO memberships (user_id, team_id, role, joined_at) VALUES (?, ?, 'member', ?)",
  ).run(userId, team.id, now)
  return getDetail(db, userId, team.id)
}

// —— 读 ——

/**
 * 列出我加入的所有队：id/name/role/成员数/我在该队的档案数。
 * 供「我的队伍」列表页。按加入时间升序。
 */
export function listMine(db, userId) {
  return db
    .prepare(
      `SELECT t.id, t.name, m.role, m.joined_at,
              (SELECT COUNT(*) FROM memberships mm WHERE mm.team_id = t.id) AS memberCount,
              (SELECT COUNT(*) FROM dossiers d WHERE d.team_id = t.id AND d.created_by = ?)
                AS myDossierCount
       FROM memberships m JOIN teams t ON t.id = m.team_id
       WHERE m.user_id = ?
       ORDER BY m.joined_at, t.id`,
    )
    .all(userId, userId)
}

/**
 * 单队详情（校验我是成员）：id/name/invite_code（供分享）/role/成员数/created_by。
 */
export function getDetail(db, userId, teamId) {
  const role = assertMember(db, userId, teamId).role
  const t = teamRow(db, teamId)
  const memberCount = db
    .prepare('SELECT COUNT(*) c FROM memberships WHERE team_id = ?')
    .get(teamId).c
  return {
    id: t.id,
    name: t.name,
    inviteCode: t.invite_code,
    createdBy: t.created_by,
    role,
    memberCount,
  }
}

/**
 * 队员列表（校验我是成员）：每人 userId/昵称/用户名/role/joinedAt/在本队的档案计数。
 * 档案计数用 LEFT JOIN 聚合，0 份的成员也出现。按加入时间升序（owner 通常最早）。
 */
export function listMembers(db, userId, teamId) {
  assertMember(db, userId, teamId)
  return db
    .prepare(
      `SELECT u.id AS userId, u.username, u.display_name AS displayName,
              m.role, m.joined_at AS joinedAt,
              (SELECT COUNT(*) FROM dossiers d
                 WHERE d.team_id = m.team_id AND d.created_by = u.id) AS dossierCount
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.team_id = ?
       ORDER BY m.joined_at, u.id`,
    )
    .all(teamId)
}

// —— 退队 ——

/**
 * 退队：删自己的 membership。建队人（owner）本期禁止退队 → 403「请先解散或转让」。
 * 非成员退队 → 403（assertMember）。返回 true。
 */
export function leave(db, userId, teamId) {
  const { role } = assertMember(db, userId, teamId)
  if (role === 'owner') throw httpError(403, '建队人不能退队，请先解散或转让')
  db.prepare('DELETE FROM memberships WHERE user_id = ? AND team_id = ?').run(userId, teamId)
  return true
}
