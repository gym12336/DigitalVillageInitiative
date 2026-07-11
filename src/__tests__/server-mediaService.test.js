import { describe, it, expect, vi } from 'vitest'
import { SIZE_LIMITS, checkUpload, storeFile } from '../../server/services/mediaService.js'

describe('mediaService.checkUpload', () => {
  it('返回 kind/ext，大小在档内放行', () => {
    const r = checkUpload('photo.jpg', 5 * 1024 * 1024)
    expect(r.kind).toBe('image')
    expect(r.ext).toBe('jpg')
  })

  it('图片超 20MB 抛 413', () => {
    expect(() => checkUpload('photo.png', SIZE_LIMITS.image + 1)).toThrow(/过大|413/)
  })

  it('音视频可到 200MB', () => {
    expect(() => checkUpload('clip.mp4', 150 * 1024 * 1024)).not.toThrow()
    expect(() => checkUpload('clip.mp4', SIZE_LIMITS.av + 1)).toThrow()
  })

  it('文本档超 10MB 抛错', () => {
    expect(() => checkUpload('report.pdf', SIZE_LIMITS.doc + 1)).toThrow()
  })

  it('未知扩展名归 other 档', () => {
    const r = checkUpload('archive.zip', 1024)
    expect(r.kind).toBe('other')
  })
})

describe('mediaService.storeFile', () => {
  it('按 dossierId 分目录写盘，返回元数据', async () => {
    const writes = []
    const fsImpl = {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockImplementation((p, buf) => { writes.push({ p, buf }); return Promise.resolve() }),
    }
    const meta = await storeFile({
      baseDir: '/tmp/uploads/practice',
      dossierId: 'd123',
      file: { originalname: '访谈记录.docx', buffer: Buffer.from('x'), size: 3 },
      fsImpl,
      genName: () => 'abc123',
    })
    expect(fsImpl.mkdir).toHaveBeenCalledWith('/tmp/uploads/practice/d123', { recursive: true })
    expect(meta.kind).toBe('doc')
    expect(meta.ext).toBe('docx')
    expect(meta.name).toBe('访谈记录.docx')
    expect(meta.size).toBe(3)
    // url 是可静态访问的相对路径，含重铸后的存储名
    expect(meta.url).toBe('/uploads/practice/d123/abc123.docx')
    expect(writes[0].p).toBe('/tmp/uploads/practice/d123/abc123.docx')
  })

  it('超限文件不写盘、抛 413', async () => {
    const fsImpl = { mkdir: vi.fn(), writeFile: vi.fn() }
    await expect(storeFile({
      baseDir: '/tmp/up',
      dossierId: 'd1',
      file: { originalname: 'big.jpg', buffer: Buffer.alloc(10), size: SIZE_LIMITS.image + 1 },
      fsImpl,
    })).rejects.toThrow()
    expect(fsImpl.writeFile).not.toHaveBeenCalled()
  })
})
