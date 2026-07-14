import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StageTrack from '@/modules/practice/mine/StageTrack.vue'

// 复现 bug：TrackMedia 里「+ 手动登记材料」点了不出行，导致无法录入。
function makeDossier(overrides = {}) {
  return {
    id: 'd1',
    title: 'T',
    idea: '',
    village: '',
    plan: { goal: '', topic: '', targetVillage: '', metrics: [], expected: '', background: '', methods: [], risks: [], phases: [] },
    refs: [],
    collected: { metricValues: [], materials: [], people: [] },
    ...overrides,
  }
}

// 素材 Tab 默认预览模式（渲染 MaterialGroups）；TrackMedia 只在编辑模式渲染。
// 点击素材 Tab 面板里第一个「编辑」模式按钮切过去。
async function enterFilesEdit(w) {
  const editBtn = w.findAll('.mode-btn').find((b) => b.text() === '编辑')
  expect(editBtn).toBeTruthy()
  await editBtn.trigger('click')
}

describe('TrackMedia 手动登记材料（bug 复现）', () => {
  it('点「+ 手动登记材料」后应新增一行材料输入', async () => {
    const w = mount(StageTrack, { props: { dossier: makeDossier() } })
    await enterFilesEdit(w)
    // 找到 TrackMedia 里的「手动登记材料」按钮
    const addBtn = w.findAll('button').find((b) => b.text().includes('手动登记材料'))
    expect(addBtn).toBeTruthy()

    const beforeRows = w.findAll('.mat-row').length
    await addBtn.trigger('click')
    const afterRows = w.findAll('.mat-row').length

    expect(afterRows).toBe(beforeRows + 1)
  })

  it('AI 抽取的材料（有 summary/theme、无 url/source）显示 AI 抽取徽标 + 选填补传入口，不显示默认「选文件」', async () => {
    const dossier = makeDossier({
      collected: {
        metricValues: [],
        people: [],
        // 旧数据：早期 adoptDraft 未打 source:'auto'，仅带 summary/theme
        materials: [{ type: '其他', name: '备用电池', note: '每台机身配2-3块', summary: '每台机身配备2-3块备用电池', theme: '设备清单' }],
      },
    })
    const w = mount(StageTrack, { props: { dossier } })
    await enterFilesEdit(w)
    const row = w.find('.mat-row')
    expect(row.exists()).toBe(true)
    // 徽标标明来源
    expect(row.find('.ai-badge').exists()).toBe(true)
    // 不呈现和手动登记一样的默认「选文件」按钮（避免误以为必须绑文件）
    expect(row.find('.row-file').exists()).toBe(false)
    // 但保留一个明确「选填」的补传入口（实物照片/扫描件），且底层仍是 file input
    const supp = row.find('.row-file-supplement')
    expect(supp.exists()).toBe(true)
    expect(supp.text()).toMatch(/选填/)
    expect(supp.find('input[type="file"]').exists()).toBe(true)
  })

  it('手动登记的空材料（无 url/summary/theme）仍显示默认「选文件」', async () => {
    const dossier = makeDossier({
      collected: { metricValues: [], people: [], materials: [{ type: '照片', name: '村口古樟树', note: '' }] },
    })
    const w = mount(StageTrack, { props: { dossier } })
    await enterFilesEdit(w)
    const row = w.find('.mat-row')
    expect(row.find('.row-file').exists()).toBe(true)
    expect(row.find('.row-file-supplement').exists()).toBe(false)
    expect(row.find('.ai-badge').exists()).toBe(false)
  })

  it('新增一行 → 在材料名里录入文字 → 保存后 emit 的 collected 应含该材料', async () => {
    const w = mount(StageTrack, { props: { dossier: makeDossier() } })
    await enterFilesEdit(w)
    const addBtn = w.findAll('button').find((b) => b.text().includes('手动登记材料'))
    await addBtn.trigger('click')

    // 录入材料名
    const nameInput = w.find('.mat-row .name')
    expect(nameInput.exists()).toBe(true)
    await nameInput.setValue('村口古樟树照片')

    // 保存
    const saveBtn = w.findAll('button').find((b) => b.text().includes('保存采集数据'))
    await saveBtn.trigger('click')

    const emissions = w.emitted('update')
    expect(emissions).toBeTruthy()
    const last = emissions[emissions.length - 1][0]
    expect(last.collected.materials.some((m) => m.name === '村口古樟树照片')).toBe(true)
  })
})
