import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migrate } from '../../server/db/migrate.js'
import { createApp } from '../../server/app.js'

const SECRET = 'test-secret'
let app
let uploadDir

beforeEach(async () => {
  const db = new Database(':memory:')
  migrate(db, '2026-07-10T00:00:00.000Z')
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sx-media-'))
  app = createApp({ db, secret: SECRET, uploadDir })
})

afterAll(async () => {
  // 清理测试期间创建的临时上传目录
  try { await fs.rm(uploadDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

async function register(username) {
  const reg = await request(app).post('/api/auth/register')
    .send({ username, password: 'secret1', displayName: username })
  return reg.body.token
}
const auth = (token) => ({ Authorization: `Bearer ${token}` })

async function createTeamAndDossier(token) {
  const team = (await request(app).post('/api/teams').set(auth(token)).send({ name: '桃源队' })).body.team
  const d = await request(app).post('/api/dossiers').set(auth(token))
    .send({ teamId: team.id, id: 'd-media-1', title: '实践A', plan: { goal: 'g' } })
  return { team, dossierId: d.body.dossier.id }
}

describe('POST /api/practice/media', () => {
  it('未登录 → 401', async () => {
    const res = await request(app).post('/api/practice/media')
      .field('dossierId', 'd1')
      .attach('file', Buffer.from('hi'), 'note.txt')
    expect(res.status).toBe(401)
  })

  it('成员上传文本档 → 返回元数据（url/kind/ext）', async () => {
    const token = await register('alice')
    const { dossierId } = await createTeamAndDossier(token)
    const res = await request(app).post('/api/practice/media').set(auth(token))
      .field('dossierId', dossierId)
      .attach('file', Buffer.from('访谈记录内容'), '访谈.txt')
    expect(res.status).toBe(201)
    expect(res.body.media.kind).toBe('doc')
    expect(res.body.media.ext).toBe('txt')
    expect(res.body.media.url).toMatch(new RegExp(`/uploads/practice/${dossierId}/`))
  })

  it('非该档所属队成员 → 403', async () => {
    const alice = await register('alice')
    const { dossierId } = await createTeamAndDossier(alice)
    const bob = await register('bob')
    const res = await request(app).post('/api/practice/media').set(auth(bob))
      .field('dossierId', dossierId)
      .attach('file', Buffer.from('x'), 'note.txt')
    expect(res.status).toBe(403)
  })

  it('缺 file → 400', async () => {
    const token = await register('alice')
    const { dossierId } = await createTeamAndDossier(token)
    const res = await request(app).post('/api/practice/media').set(auth(token))
      .field('dossierId', dossierId)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/practice/media/extract-text', () => {
  it('上传可解析文本档 → 返回抽出的文本', async () => {
    const token = await register('alice')
    const { dossierId } = await createTeamAndDossier(token)
    const res = await request(app).post('/api/practice/media/extract-text').set(auth(token))
      .field('dossierId', dossierId)
      .attach('file', Buffer.from('第一行\n第二行'), 'notes.txt')
    expect(res.status).toBe(200)
    expect(res.body.text).toContain('第一行')
  })

  it('图片等不可解析类型 → 422', async () => {
    const token = await register('alice')
    const { dossierId } = await createTeamAndDossier(token)
    const res = await request(app).post('/api/practice/media/extract-text').set(auth(token))
      .field('dossierId', dossierId)
      .attach('file', Buffer.from('fakejpg'), 'photo.jpg')
    expect(res.status).toBe(422)
  })
})

describe('POST /api/practice/media/extract', () => {
  it('空文本 → 400', async () => {
    const token = await register('alice')
    const res = await request(app).post('/api/practice/media/extract').set(auth(token))
      .send({ text: '   ' })
    expect(res.status).toBe(400)
  })

  it('有文本、无 LLM key → 恒 200，返回空结果 source', async () => {
    const token = await register('alice')
    const res = await request(app).post('/api/practice/media/extract').set(auth(token))
      .send({ text: '李伯是竹编手艺人，他说这门手艺不能断。' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('people')
    expect(res.body).toHaveProperty('source')
  })

  it('未登录 → 401', async () => {
    const res = await request(app).post('/api/practice/media/extract').send({ text: 'x' })
    expect(res.status).toBe(401)
  })
})
