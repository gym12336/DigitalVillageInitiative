// 一次性数据迁移:将 src/modules/voice/voice-data.json 的需求 + 问答导入 SQLite。
// 运行方式:node server/db/seed-voice.js
// 幂等:已存在的 id 会跳过(INSERT OR IGNORE)。

// 注意:connection.js / migrate.js 仅在「脚本直接运行」时动态 import,
// 避免测试仅为拿 seedVoice 而被 connection.js 的外部依赖(如 pg 迁移中间态)带崩。
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, '..', '..', 'src', 'modules', 'voice', 'voice-data.json')

/**
 * 把 voice-data.json 灌入 demands + qa 两表。幂等。
 * 抽成函数便于 migrate/测试复用;独立运行时下方兜底调用。
 * @param {import('better-sqlite3').Database} db
 * @param {string} [now] - ISO 时间戳,测试可注入
 * @returns {{demands:{inserted:number,skipped:number}, qa:{inserted:number,skipped:number}}}
 */
export function seedVoice(db, now = new Date().toISOString()) {
  if (!existsSync(DATA_FILE)) {
    throw new Error(`数据文件不存在:${DATA_FILE}`)
  }
  const raw = readFileSync(DATA_FILE, 'utf8').replace(/^﻿/, '')
  const { demands = [], qa = [] } = JSON.parse(raw)

  const count = {
    demands: { inserted: 0, skipped: 0 },
    qa: { inserted: 0, skipped: 0 },
  }

  const insertDemand = db.prepare(`
    INSERT OR IGNORE INTO demands (
      id, title, town, village, type, cert_by, publish_time, status, deadline,
      views, favorites, majors, descr, expected, contact, phone,
      created_at, updated_at
    ) VALUES (
      @id, @title, @town, @village, @type, @certBy, @publishTime, @status, @deadline,
      @views, @favorites, @majors, @descr, @expected, @contact, @phone,
      @now, @now
    )
  `)

  const insertQa = db.prepare(`
    INSERT OR IGNORE INTO qa (
      id, question, asker, ask_time, answers, created_at, updated_at
    ) VALUES (
      @id, @question, @asker, @askTime, @answers, @now, @now
    )
  `)

  const seed = db.transaction(() => {
    for (const d of demands) {
      const r = insertDemand.run({
        id: d.id,
        title: d.title || '',
        town: d.town || '',
        village: d.village || '',
        type: d.type || '',
        certBy: d.certBy || '',
        publishTime: d.publishTime || '',
        status: d.status || '待响应',
        deadline: d.deadline || '',
        views: d.views || 0,
        favorites: d.favorites || 0,
        majors: JSON.stringify(d.majors || []),
        descr: d.desc || '',
        expected: d.expected || '',
        contact: d.contact || '',
        phone: d.phone || '',
        now,
      })
      r.changes ? count.demands.inserted++ : count.demands.skipped++
    }
    for (const q of qa) {
      const r = insertQa.run({
        id: q.id,
        question: q.question || '',
        asker: q.asker || '',
        askTime: q.askTime || '',
        answers: JSON.stringify(q.answers || []),
        now,
      })
      r.changes ? count.qa.inserted++ : count.qa.skipped++
    }
  })
  seed()

  return count
}

// 作为脚本直接运行时执行迁移(被 import 时不触发)。
// connection.js / migrate.js 在此动态 import,避免 import 期把外部依赖带进测试。
if (process.argv[1]?.endsWith('seed-voice.js')) {
  const { getDb, closeDb } = await import(/* @vite-ignore */ './connection.js')
  const { migrate } = await import(/* @vite-ignore */ './migrate.js')
  const db = getDb()
  migrate(db)
  const count = seedVoice(db)
  console.log(
    `乡村之声迁移完成:需求导入 ${count.demands.inserted} 跳过 ${count.demands.skipped};` +
      `问答导入 ${count.qa.inserted} 跳过 ${count.qa.skipped}`,
  )
  const dc = db.prepare('SELECT COUNT(*) as cnt FROM demands').get().cnt
  const qc = db.prepare('SELECT COUNT(*) as cnt FROM qa').get().cnt
  console.log(`数据库现有需求 ${dc} 条,问答 ${qc} 条`)
  closeDb()
}

