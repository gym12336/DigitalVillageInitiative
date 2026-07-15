// 档案读写 + 权限判定。纯逻辑，db 显式传入，可用内存库单测。
// 多队后授权改用 memberships（assertMember），teamId 由调用方显式传入：
//   - 列表/建档/导入：显式 teamId，assertMember(用户, teamId)
//   - 读/改：由档案自身的 team_id 反查，assertMember(用户, 档案.team_id)
//   - 删除额外要求：created_by === 用户 id（只能删自己创建的），与 role 无关
import { httpError, validateDossier, validateTeamId } from '../lib/validate.js'
import { assertMember } from './teamService.js'

// —— 读 ——

function rowById(db, id) {
  return db.prepare('SELECT * FROM dossiers WHERE id = ?').get(id)
}

/**
 * 列出指定队全部档案，updated_at 倒序（校验我是该队成员）。方案 A：
 * 不返回完整 payload，用 json_extract 在 SQL 里抽出几个标量预览字段
 * （idea/village/topic/targetVillage），供列表卡片展示，避免在 JS 里全量解析 JSON。
 */
export function listForTeam(db, user, teamId) {
  const tid = validateTeamId(teamId)
  assertMember(db, user.id, tid)
  return db
    .prepare(
      `SELECT id, title, stage, created_by, updated_at,
              json_extract(payload, '$.idea')               AS idea,
              json_extract(payload, '$.village')            AS village,
              json_extract(payload, '$.plan.topic')         AS topic,
              json_extract(payload, '$.plan.targetVillage') AS targetVillage
       FROM dossiers WHERE team_id = ? ORDER BY updated_at DESC`,
    )
    .all(tid)
}

/** 取单份档案完整数据（校验我是该档案所属队成员）。返回解析后的 dossier 对象。 */
export function getForUser(db, user, id) {
  const row = rowById(db, id)
  if (!row) throw httpError(404, '档案不存在')
  assertMember(db, user.id, row.team_id)
  return JSON.parse(row.payload)
}

// —— 写 ——

/** 新建（显式 teamId，校验我是该队成员）。id 冲突抛 409。记建档人。返回落库的 dossier。 */
export function create(db, user, teamId, dossier, now = new Date().toISOString()) {
  const tid = validateTeamId(teamId)
  assertMember(db, user.id, tid)
  const { id, title, stage, payload } = validateDossier(dossier)
  if (rowById(db, id)) throw httpError(409, '档案 id 已存在')
  db.prepare(
    `INSERT INTO dossiers (id, team_id, created_by, title, stage, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, tid, user.id, title, stage, payload, now, now)
  return getForUser(db, user, id)
}

/**
 * 全量更新（校验我是该档案所属队成员）。title/stage 从 payload 抽取（单一数据源）。
 *
 * 可选乐观锁：传 opts.expectedUpdatedAt（客户端读取档案时拿到的 updated_at）时，
 * 若与库中当前值不一致，说明期间已被他人保存过 → 抛 409，避免"后写静默覆盖先写"。
 * 不传则保持原有全量覆盖语义（向后兼容，现有调用不受影响）。
 */
export function update(db, user, id, dossier, now = new Date().toISOString(), opts = {}) {
  const row = rowById(db, id)
  if (!row) throw httpError(404, '档案不存在')
  assertMember(db, user.id, row.team_id)
  if (opts.expectedUpdatedAt != null && row.updated_at !== opts.expectedUpdatedAt) {
    throw httpError(409, '档案已被他人修改，请刷新后重试')
  }
  const { title, stage, payload } = validateDossier({ ...dossier, id })
  db.prepare(
    'UPDATE dossiers SET title = ?, stage = ?, payload = ?, updated_at = ? WHERE id = ?',
  ).run(title, stage, payload, now, id)
  return getForUser(db, user, id)
}

/** 删除（校验我是该队成员且本人建档）。返回 true。 */
export function remove(db, user, id) {
  const row = rowById(db, id)
  if (!row) throw httpError(404, '档案不存在')
  assertMember(db, user.id, row.team_id)
  if (row.created_by !== user.id) throw httpError(403, '只能删除自己创建的档案')
  db.prepare('DELETE FROM dossiers WHERE id = ?').run(id)
  return true
}

/**
 * 一次性迁移导入到指定队（校验我是该队成员）：单事务全或无。每条重铸 id
 * （不复用旧 id），原 id 记入 payload.migratedFrom。任一条失败整批回滚。
 * @param genId - (index) => string，注入以便测试可复现
 * 返回 { imported, ids }。
 */
export function importBatch(db, user, teamId, dossiers, genId, now = new Date().toISOString()) {
  const tid = validateTeamId(teamId)
  assertMember(db, user.id, tid)
  if (!Array.isArray(dossiers)) throw httpError(400, 'dossiers 必须是数组')

  const insert = db.prepare(
    `INSERT INTO dossiers (id, team_id, created_by, title, stage, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const run = db.transaction(() => {
    const ids = []
    dossiers.forEach((d, i) => {
      const newId = genId(i)
      // 重铸 id，原 id 留痕；title/stage 经 validate 从 payload 抽取。
      const reforged = { ...d, id: newId, migratedFrom: d && d.id }
      const { title, stage, payload } = validateDossier(reforged)
      const createdAt = (d && d.createdAt) || now
      insert.run(newId, tid, user.id, title, stage, payload, createdAt, now)
      ids.push(newId)
    })
    return ids
  })
  const ids = run() // 抛错则整批回滚
  return { imported: ids.length, ids }
}
