import { describe, it, expect, vi } from 'vitest'
import { extractText, EXTRACT_TEXT_MAX, isParsable, kindOf } from '../../server/lib/fileText.js'

describe('fileText.kindOf', () => {
  it('按扩展名分档', () => {
    expect(kindOf('a.jpg')).toBe('image')
    expect(kindOf('a.PNG')).toBe('image')
    expect(kindOf('a.mp4')).toBe('av')
    expect(kindOf('a.mp3')).toBe('av')
    expect(kindOf('a.docx')).toBe('doc')
    expect(kindOf('a.pdf')).toBe('doc')
    expect(kindOf('a.txt')).toBe('doc')
    expect(kindOf('a.md')).toBe('doc')
    expect(kindOf('a.csv')).toBe('table')
    expect(kindOf('a.xlsx')).toBe('table')
    expect(kindOf('a.zip')).toBe('other')
    expect(kindOf('noext')).toBe('other')
  })
})

describe('fileText.isParsable', () => {
  it('仅 doc/table 可抽文本', () => {
    expect(isParsable('note.txt')).toBe(true)
    expect(isParsable('note.md')).toBe(true)
    expect(isParsable('report.docx')).toBe(true)
    expect(isParsable('report.pdf')).toBe(true)
    expect(isParsable('data.csv')).toBe(true)
    expect(isParsable('data.xlsx')).toBe(true)
    expect(isParsable('photo.jpg')).toBe(false)
    expect(isParsable('clip.mp4')).toBe(false)
  })
})

describe('fileText.extractText', () => {
  it('txt/md 直读为文本', async () => {
    const buf = Buffer.from('第一行\n第二行', 'utf8')
    const r = await extractText(buf, 'note.txt')
    expect(r.text).toBe('第一行\n第二行')
    expect(r.truncated).toBe(false)
  })

  it('超长文本按上限截断并置 truncated', async () => {
    const long = 'x'.repeat(EXTRACT_TEXT_MAX + 100)
    const r = await extractText(Buffer.from(long, 'utf8'), 'big.md')
    expect(r.text.length).toBe(EXTRACT_TEXT_MAX)
    expect(r.truncated).toBe(true)
  })

  it('不可解析类型抛错', async () => {
    await expect(extractText(Buffer.from('x'), 'photo.jpg')).rejects.toThrow(/无法解析/)
  })

  it('docx 走 mammoth', async () => {
    const parsers = {
      mammoth: { extractRawText: vi.fn().mockResolvedValue({ value: 'docx 正文' }) },
    }
    const r = await extractText(Buffer.from('rawdocx'), 'report.docx', { parsers })
    expect(r.text).toBe('docx 正文')
    expect(parsers.mammoth.extractRawText).toHaveBeenCalled()
  })

  it('pdf 走 pdf-parse', async () => {
    const parsers = { pdfParse: vi.fn().mockResolvedValue({ text: 'pdf 正文' }) }
    const r = await extractText(Buffer.from('rawpdf'), 'report.pdf', { parsers })
    expect(r.text).toBe('pdf 正文')
  })

  it('csv 走 papaparse，拼成带表头的文本', async () => {
    const parsers = {
      papaparse: { parse: vi.fn().mockReturnValue({ data: [['指标', '前值', '后值'], ['月销售额', '2000', '5000']] }) },
    }
    const r = await extractText(Buffer.from('csvraw'), 'data.csv', { parsers })
    expect(r.text).toContain('指标')
    expect(r.text).toContain('月销售额')
    expect(r.text).toContain('5000')
  })

  it('xlsx 走 sheetjs，转成 csv 文本', async () => {
    const parsers = {
      xlsx: {
        read: vi.fn().mockReturnValue({ SheetNames: ['S1'], Sheets: { S1: {} } }),
        utils: { sheet_to_csv: vi.fn().mockReturnValue('指标,前值,后值\n合作农户数,0,12') },
      },
    }
    const r = await extractText(Buffer.from('xlsxraw'), 'data.xlsx', { parsers })
    expect(r.text).toContain('合作农户数')
    expect(r.text).toContain('12')
  })
})
