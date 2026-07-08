// 打开 SQLite 连接。默认落地 server/data/app.db；测试传 ':memory:' 用内存库。
// 单例：同一路径复用同一连接，避免重复打开。
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_FILE = join(__dirname, '..', 'data', 'app.db')

const instances = new Map()

/**
 * 取数据库连接。
 * @param {string} file - 文件路径或 ':memory:'。默认 server/data/app.db。
 */
export function getDb(file = DEFAULT_FILE) {
  if (instances.has(file)) return instances.get(file)

  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true }) // 确保 data/ 存在
  }
  const db = new Database(file)
  db.pragma('journal_mode = WAL') // 并发读更顺
  db.pragma('foreign_keys = ON') // 启用外键约束
  instances.set(file, db)
  return db
}

/** 关闭并从单例表移除（测试清理用）。 */
export function closeDb(file = DEFAULT_FILE) {
  const db = instances.get(file)
  if (db) {
    db.close()
    instances.delete(file)
  }
}
