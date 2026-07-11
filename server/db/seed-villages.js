// 一次性数据迁移：将 src/data/encyclopedia-villages.json 中所有村庄导入 SQLite。
// 运行方式：node server/db/seed-villages.js
// 幂等：已存在的 id 会跳过（INSERT OR IGNORE）。

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getDb, closeDb } from './connection.js'
import { migrate } from './migrate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'encyclopedia-villages.json')

if (!existsSync(DATA_FILE)) {
  console.error(`数据文件不存在：${DATA_FILE}`)
  process.exit(1)
}

const db = getDb()
migrate(db) // 确保 villages 表存在

const raw = readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '')
const villages = JSON.parse(raw)
const now = new Date().toISOString()
const count = { inserted: 0, skipped: 0 }

const insert = db.prepare(`
  INSERT OR IGNORE INTO villages (
    id, name, full_name, province, city, district, town,
    summary, intro, cover, cert_level, cert_label, coord_lat, coord_lng,
    views, favorites, practices,
    honors, tags, gallery, guide, socials, manager,
    facts, timeline, specialties, festivals, sections,
    created_at, updated_at
  ) VALUES (
    @id, @name, @fullName, @province, @city, @district, @town,
    @summary, @intro, @cover, @certLevel, @certLabel, @coordLat, @coordLng,
    @views, @favorites, @practices,
    @honors, @tags, @gallery, @guide, @socials, @manager,
    @facts, @timeline, @specialties, @festivals, @sections,
    @now, @now
  )
`)

const seed = db.transaction(() => {
  for (const v of villages) {
    const result = insert.run({
      id: v.id,
      name: v.name,
      fullName: v.fullName || '',
      province: v.province || '',
      city: v.city || '',
      district: v.district || '',
      town: v.town || '',
      summary: v.summary || '',
      intro: v.intro || '',
      cover: v.cover || '',
      certLevel: v.certLevel || 'township',
      certLabel: v.certLabel || '',
      coordLat: v.coord?.[1] ?? 0,
      coordLng: v.coord?.[0] ?? 0,
      views: v.views || 0,
      favorites: v.favorites || 0,
      practices: v.practices || 0,
      honors: JSON.stringify(v.honors || []),
      tags: JSON.stringify(v.tags || {}),
      gallery: JSON.stringify(v.gallery || []),
      guide: JSON.stringify(v.guide || []),
      socials: JSON.stringify(v.socials || {}),
      manager: JSON.stringify(v.manager || {}),
      facts: JSON.stringify(v.facts || {}),
      timeline: JSON.stringify(v.timeline || []),
      specialties: JSON.stringify(v.specialties || []),
      festivals: JSON.stringify(v.festivals || []),
      sections: JSON.stringify(v.sections || {}),
      now,
    })
    result.changes ? count.inserted++ : count.skipped++
  }
})

seed()

console.log(`村庄数据迁移完成：导入 ${count.inserted} 条，跳过 ${count.skipped} 条（共 ${villages.length} 个村）`)

// 验证
const total = db.prepare('SELECT COUNT(*) as cnt FROM villages').get().cnt
console.log(`数据库中现有 ${total} 个村庄`)

closeDb()

