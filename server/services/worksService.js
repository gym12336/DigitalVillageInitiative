// 成果作品读写 + 权限判定。纯逻辑，db 显式传入，可用内存库单测。
// 与 dossierService 同构，授权同样走 assertMember（跨队隔离）：
//   - 列表/保存：显式 teamId，assertMember(用户, teamId)
//   - 读/删：由作品自身的 team_id 反查，assertMember(用户, 作品.team_id)
//   - 删除额外要求：created_by === 用户 id（只能删自己创建的）
// 与档案的唯一差别：保存是 upsert（编辑器反复存同一 id），而非「建档 POST + 全量 PUT」两分。
import { httpError, validateWorkRecord, validateTeamId } from '../lib/validate.js'
import { assertMember } from './teamService.js'

function rowById(db, id) {
  return db.prepare('SELECT * FROM works WHERE id = ?').get(id)
}

// —— 读 ——

/**
 * 列出指定队全部作品，updated_at 倒序（校验我是该队成员）。
 * 轻量预览：不回传完整 payload，只抽 id/title/source/时间。
 */
export function listForTeam(db, user, teamId) {
  const tid = validateTeamId(teamId)
  assertMember(db, user.id, tid)
  return db
    .prepare(
      `SELECT id, title, source_dossier AS source, created_by, created_at, updated_at
       FROM works WHERE team_id = ? ORDER BY updated_at DESC`,
    )
    .all(tid)
}

/** 取单份作品完整数据（校验我是该作品所属队成员）。返回解析后的作品对象。 */
export function getForUser(db, user, id) {
  const row = rowById(db, id)
  if (!row) throw httpError(404, '作品不存在')
  assertMember(db, user.id, row.team_id)
  return JSON.parse(row.payload)
}

// —— 写（upsert）——

/**
 * 保存作品：不存在则插入、已存在则全量更新（upsert）。
 * 校验我是目标队成员；已存在时额外要求我是该队成员（沿用行上的 team_id）。
 * 新建记 created_by；更新不改 created_by / created_at。返回落库的作品。
 */
export function save(db, user, teamId, work, now = new Date().toISOString()) {
  const tid = validateTeamId(teamId)
  assertMember(db, user.id, tid)
  const { id, title, sourceDossier, payload } = validateWorkRecord(work)

  const existing = rowById(db, id)
  if (existing) {
    // 已存在：必须与传入队一致，且我是该队成员（上面已校验 tid）。防跨队搬运。
    if (existing.team_id !== tid) throw httpError(403, '作品已属于其它队，不能改归属')
    db.prepare(
      'UPDATE works SET title = ?, source_dossier = ?, payload = ?, updated_at = ? WHERE id = ?',
    ).run(title, sourceDossier, payload, now, id)
  } else {
    db.prepare(
      `INSERT INTO works (id, team_id, created_by, title, source_dossier, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, tid, user.id, title, sourceDossier, payload, now, now)
  }
  return getForUser(db, user, id)
}

/** 删除（校验我是该队成员且本人建档）。返回 true。 */
export function remove(db, user, id) {
  const row = rowById(db, id)
  if (!row) throw httpError(404, '作品不存在')
  assertMember(db, user.id, row.team_id)
  if (row.created_by !== user.id) throw httpError(403, '只能删除自己创建的作品')
  db.prepare('DELETE FROM works WHERE id = ?').run(id)
  return true
}

