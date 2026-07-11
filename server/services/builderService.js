// 搭建台成果文档读写 + 权限判定。纯逻辑，db 显式传入。
// type: 'editor' | 'display' | 'big-component'
import { httpError } from '../lib/validate.js'
import { assertMember } from './teamService.js'

function dossierById(db, id) {
  return db.prepare('SELECT * FROM dossiers WHERE id = ?').get(id)
}

function docById(db, id) {
  return db.prepare('SELECT * FROM builder_documents WHERE id = ?').get(id)
}

function rowsByDossierAndType(db, dossierId, type) {
  return db
    .prepare('SELECT * FROM builder_documents WHERE dossier_id = ? AND type = ? ORDER BY created_at DESC')
    .all(dossierId, type)
}

/** 列出某 dossier 下指定类型的所有文档。鉴权后再查。 */
export function listByDossier(db, user, dossierId, type) {
  if (!['editor', 'display', 'big-component'].includes(type))
    throw httpError(400, 'type 须为 editor / display / big-component')
  const d = dossierById(db, dossierId)
  if (!d) throw httpError(404, '档案不存在')
  assertMember(db, user.id, d.team_id)
  return rowsByDossierAndType(db, dossierId, type)
}

/**
 * 创建或覆盖文档。
 * - editor / display：同 dossier 同 type 已存在 → 覆盖；不存在 → 创建
 * - big-component：始终创建新记录
 */
export function upsert(db, user, dossierId, { type, name, payload, id }, now = new Date().toISOString()) {
  if (!['editor', 'display', 'big-component'].includes(type))
    throw httpError(400, 'type 须为 editor / display / big-component')
  if (!payload || typeof payload !== 'string')
    throw httpError(400, 'payload 必须是字符串')

  const d = dossierById(db, dossierId)
  if (!d) throw httpError(404, '档案不存在')
  assertMember(db, user.id, d.team_id)

  if (type === 'editor' || type === 'display') {
    const existing = rowsByDossierAndType(db, dossierId, type)
    if (existing.length > 0) {
      // 覆盖
      db.prepare(
        'UPDATE builder_documents SET payload = ?, updated_at = ? WHERE dossier_id = ? AND type = ?',
      ).run(payload, now, dossierId, type)
      return rowsByDossierAndType(db, dossierId, type)[0]
    }
  }

  // 新建
  const docId = id || `bd_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
  const docName = type === 'big-component' ? (name || '') : null
  db.prepare(
    `INSERT INTO builder_documents (id, dossier_id, created_by, type, name, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(docId, dossierId, user.id, type, docName, payload, now, now)
  return docById(db, docId)
}

/** 删除文档（仅 big-component）。返回 true。 */
export function remove(db, user, documentId) {
  const doc = docById(db, documentId)
  if (!doc) throw httpError(404, '文档不存在')
  if (doc.type !== 'big-component') throw httpError(400, '只能删除大组件类型文档')

  const d = dossierById(db, doc.dossier_id)
  if (!d) throw httpError(404, '关联档案不存在')
  assertMember(db, user.id, d.team_id)

  db.prepare('DELETE FROM builder_documents WHERE id = ?').run(documentId)
  return true
}
