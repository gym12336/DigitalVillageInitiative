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

describe('TrackMedia 手动登记材料（bug 复现）', () => {
  it('点「+ 手动登记材料」后应新增一行材料输入', async () => {
    const w = mount(StageTrack, { props: { dossier: makeDossier() } })
    // 找到 TrackMedia 里的「手动登记材料」按钮
    const addBtn = w.findAll('button').find((b) => b.text().includes('手动登记材料'))
    expect(addBtn).toBeTruthy()

    const beforeRows = w.findAll('.mat-row').length
    await addBtn.trigger('click')
    const afterRows = w.findAll('.mat-row').length

    expect(afterRows).toBe(beforeRows + 1)
  })

  it('新增一行 → 在材料名里录入文字 → 保存后 emit 的 collected 应含该材料', async () => {
    const w = mount(StageTrack, { props: { dossier: makeDossier() } })
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
