import { describe, it, expect, vi } from 'vitest'
import { importZip, ZIP_LIMITS } from '../../server/services/zipImportService.js'

// 构造一个假 jszip：forEach 遍历给定条目，async 返回 buffer。
function fakeZip(files) {
  // files: [{ path, dir?, content(string) }]
  return {
    loadAsync: vi.fn(async () => ({
      forEach(cb) {
        for (const f of files) cb(f.path, { dir: !!f.dir, async: async () => Buffer.from(f.content || '') })
      },
    })),
  }
}

const baseArgs = (jszip, over = {}) => ({
  dossierId: 'd1',
  baseDir: '/tmp/up',
  deps: {
    jszip,
    storeFileImpl: async ({ file }) => ({
      url: `/uploads/practice/d1/x-${file.originalname}`,
      name: file.originalname,
      size: file.size,
      ext: file.originalname.split('.').pop(),
      kind: file.originalname.endsWith('.txt') ? 'doc' : 'image',
    }),
    extractTextImpl: async () => ({ text: '访谈全文……', truncated: false }),
    extractImpl: async () => ({ people: [{ name: '王建国', quote: '好' }], metrics: [], materialHints: [], source: 'ai' }),
    ...over,
  },
})

describe('zipImportService.importZip', () => {
  it('解压多文件：图片存盘、文本档触发抽取', async () => {
    const jszip = fakeZip([
      { path: 'photo.jpg', content: 'img' },
      { path: 'note.txt', content: '一段访谈' },
    ])
    const r = await importZip(Buffer.from('zip'), baseArgs(jszip))
    expect(r.imported).toBe(2)
    expect(r.materials).toHaveLength(2)
    // 文本档抽取的草稿并入
    expect(r.drafts.people).toHaveLength(1)
    expect(r.drafts.people[0].sourceFile).toBe('note.txt')
  })

  it('跳过目录 / __MACOSX / 隐藏文件', async () => {
    const jszip = fakeZip([
      { path: 'sub/', dir: true },
      { path: '__MACOSX/x', content: 'meta' },
      { path: '.DS_Store', content: 'ds' },
      { path: 'ok.jpg', content: 'img' },
    ])
    const r = await importZip(Buffer.from('zip'), baseArgs(jszip))
    expect(r.imported).toBe(1)
    expect(r.materials[0].name).toBe('ok.jpg')
  })

  it('文件数超限 → 抛 413', async () => {
    const files = Array.from({ length: ZIP_LIMITS.maxFiles + 1 }, (_, i) => ({ path: `f${i}.jpg`, content: 'x' }))
    const jszip = fakeZip(files)
    await expect(importZip(Buffer.from('zip'), baseArgs(jszip))).rejects.toMatchObject({ status: 413 })
  })

  it('单文件存盘失败 → 记 skipped 继续，不中断整包', async () => {
    const jszip = fakeZip([
      { path: 'bad.jpg', content: 'x' },
      { path: 'good.jpg', content: 'y' },
    ])
    let n = 0
    const args = baseArgs(jszip, {
      storeFileImpl: async ({ file }) => {
        if (n++ === 0) throw new Error('太大')
        return { url: '/u/good', name: file.originalname, size: 1, ext: 'jpg', kind: 'image' }
      },
    })
    const r = await importZip(Buffer.from('zip'), args)
    expect(r.imported).toBe(1)
    expect(r.skipped).toHaveLength(1)
    expect(r.skipped[0].reason).toBe('太大')
  })

  it('空包 → 抛 400', async () => {
    const jszip = fakeZip([{ path: 'sub/', dir: true }])
    await expect(importZip(Buffer.from('zip'), baseArgs(jszip))).rejects.toMatchObject({ status: 400 })
  })

  it('损坏 zip（loadAsync 抛）→ 400', async () => {
    const jszip = { loadAsync: vi.fn(async () => { throw new Error('bad') }) }
    await expect(importZip(Buffer.from('zip'), baseArgs(jszip))).rejects.toMatchObject({ status: 400 })
  })
})
