<template>
  <div class="stage">
    <!-- 进度看板 + 动态督进（通栏） -->
    <TrackProgress :dossier="dossierForAnalysis" />

    <!-- 左右分栏工作台 -->
    <div class="workbench">
      <!-- 左栏：上传区 + AI 采集区 -->
      <div class="col-left">
        <!-- 上传文件：按类型分行 -->
        <UploadPanel :dossier-id="dossier.id" @imported="onImported" />
        <!-- AI 采集区：自然语言输入 + 综述（待审校已移到右栏各 Tab） -->
        <TrackExtract
          :dossier-id="dossier.id"
          :people="state.people"
          :metric-values="state.metricValues"
          :materials="state.materials"
          :collected="state"
          :topic="dossier.plan?.topic || ''"
          :village="dossier.village || dossier.plan?.targetVillage || ''"
          @extracted="onExtracted"
          @change="save"
        />
        <!-- 手动登记材料（补料） -->
        <TrackMedia :materials="state.materials" :dossier-id="dossier.id" @change="save" />
      </div>

      <!-- 右栏：采集成果（Tab 切换） -->
      <div class="col-right">
        <div class="tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ active: activeTab === t.key }"
            @click="activeTab = t.key"
          >{{ t.label }} <span class="tab-n">{{ t.count }}</span><span v-if="t.pending" class="tab-pending">🕓{{ t.pending }}</span></button>
        </div>

        <!-- 指标 Tab -->
        <section v-show="activeTab === 'metrics'" class="tab-panel">
          <p class="block-desc">对照方案里「计划采集的指标」，填入实地采集的前后值。</p>
          <div v-if="metricValues.length" class="metric-table">
            <div class="mt-head">
              <span>指标</span><span>帮扶前</span><span>帮扶后</span><span>单位</span>
            </div>
            <div v-for="(m, i) in metricValues" :key="i" class="mt-row">
              <input v-model="m.name" class="cell name" placeholder="指标名" />
              <input v-model="m.before" class="cell" placeholder="前值" inputmode="decimal" />
              <input v-model="m.after" class="cell" placeholder="后值" inputmode="decimal" />
              <input v-model="m.unit" class="cell unit" placeholder="单位" />
              <button class="chip-x" aria-label="删除" @click="removeMetric(i)">×</button>
            </div>
          </div>
          <p v-else class="hint">方案里还没有指标。可在这里直接添加，或回「实践前」生成方案。</p>
          <button class="btn tiny ghost" @click="addMetric">+ 添加指标</button>
          <DraftReview
            kind="metrics"
            :items="draft.metrics"
            @adopt="adoptDraft('metrics', $event)"
            @discard="draft.metrics.splice($event, 1)"
            @adopt-all="adoptAll('metrics')"
            @discard-all="discardAll('metrics')"
          />
        </section>

        <!-- 材料 Tab：按类型分组 -->
        <section v-show="activeTab === 'materials'" class="tab-panel">
          <p class="block-desc">上传的材料按类型归类展示，点「查看」可站内预览。</p>
          <MaterialGroups :materials="state.materials" @preview="preview = $event" />
          <DraftReview
            kind="materialHints"
            :items="draft.materialHints"
            @adopt="adoptDraft('materialHints', $event)"
            @discard="draft.materialHints.splice($event, 1)"
            @adopt-all="adoptAll('materialHints')"
            @discard-all="discardAll('materialHints')"
          />
        </section>

        <!-- 人物 Tab -->
        <section v-show="activeTab === 'people'" class="tab-panel">
          <p class="block-desc">记录访谈到的乡村人物，他们的话会进入成果的人物故事墙。</p>
          <div class="people-list">
            <div v-for="(p, i) in people" :key="i" class="person-row">
              <input v-model="p.name" class="cell name" placeholder="姓名" />
              <input v-model="p.role" class="cell" placeholder="身份 / 角色" />
              <input v-model="p.quote" class="cell wide" placeholder="一句话记录" />
              <button class="chip-x" aria-label="删除" @click="removePerson(i)">×</button>
            </div>
            <button class="btn tiny ghost" @click="addPerson">+ 添加人物</button>
          </div>
          <DraftReview
            kind="people"
            :items="draft.people"
            @adopt="adoptDraft('people', $event)"
            @discard="draft.people.splice($event, 1)"
            @adopt-all="adoptAll('people')"
            @discard-all="discardAll('people')"
          />
        </section>
      </div>
    </div>

    <!-- ① 本阶段任务：折叠收纳在底部 -->
    <details v-if="hasTrackPhase" class="task-fold">
      <summary class="task-summary">
        ① 本阶段任务 · {{ doneCount }}/{{ trackTasks.length }} 已完成
        <span class="mini-bar"><span class="mini-fill" :style="{ width: percent + '%' }" /></span>
      </summary>
      <ul class="task-list">
        <li v-for="(t, i) in trackTasks" :key="i" class="task-item" :class="{ done: t.done }">
          <label class="task-line">
            <input type="checkbox" :checked="t.done" @change="toggleTask(i, $event.target.checked)" />
            <span class="task-text">{{ t.text }}</span>
            <span v-if="t.output" class="task-output">交付：{{ t.output }}</span>
          </label>
        </li>
      </ul>
    </details>

    <div class="save-bar">
      <button class="btn primary" @click="save">保存采集数据</button>
      <span v-if="justSaved" class="saved-hint">已保存 ✓</span>
    </div>

    <MediaPreview :item="preview" @close="preview = null" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import TrackProgress from './TrackProgress.vue'
import TrackMedia from './TrackMedia.vue'
import TrackExtract from './TrackExtract.vue'
import MaterialGroups from './MaterialGroups.vue'
import MediaPreview from './MediaPreview.vue'
import UploadPanel from './UploadPanel.vue'
import DraftReview from './DraftReview.vue'

const props = defineProps({
  dossier: { type: Object, required: true },
})
const emit = defineEmits(['update'])

// 右栏 Tab 状态 + 站内预览目标。
const activeTab = ref('metrics')
const preview = ref(null)

// —— 待审校区（提升到此，供右栏三 Tab 各自渲染）——
const draft = reactive({ people: [], metrics: [], materialHints: [] })

// 合并一次抽取结果（追加、去重），每条已带 sourceFile。返回新增条数。
function mergeDraft(r) {
  let added = 0
  const key = (o, fs) => fs.map((f) => String(o?.[f] || '').trim()).join('|')
  for (const p of r.people || []) {
    if (key(p, ['name', 'quote']) === '|') continue
    if (draft.people.some((x) => key(x, ['name', 'quote']) === key(p, ['name', 'quote']))) continue
    draft.people.push({ ...p }); added++
  }
  for (const m of r.metrics || []) {
    if (key(m, ['name', 'value']) === '|') continue
    if (draft.metrics.some((x) => key(x, ['name', 'value']) === key(m, ['name', 'value']))) continue
    draft.metrics.push({ ...m }); added++
  }
  for (const h of r.materialHints || []) {
    if (key(h, ['name']) === '') continue
    if (draft.materialHints.some((x) => key(x, ['name']) === key(h, ['name']))) continue
    draft.materialHints.push({ ...h }); added++
  }
  return added
}

// TrackExtract 抽取完成回调：并入待审校。
function onExtracted(r) { mergeDraft(r) }

// UploadPanel 上传完成：材料入清单，抽取草稿并入待审校。
function onImported({ materials, drafts } = {}) {
  for (const m of materials || []) state.materials.push({ ...m })
  if (drafts) mergeDraft(drafts)
  save()
}

// 采纳单条：并入 state 对应数组（携带富字段），从 draft 移除，保存。
function adoptDraft(kind, i) {
  if (kind === 'people') {
    const p = draft.people[i]
    state.people.push({ name: p.name, role: p.role, quote: p.quote, story: p.story || '', highlight: p.highlight || '' })
    draft.people.splice(i, 1)
  } else if (kind === 'metrics') {
    const m = draft.metrics[i]
    state.metricValues.push({ name: m.name, before: '', after: m.value, unit: m.unit, insight: m.insight || '', isHighlight: !!m.isHighlight })
    draft.metrics.splice(i, 1)
  } else {
    const h = draft.materialHints[i]
    state.materials.push({ type: '其他', name: h.name, note: h.note, summary: h.summary || '', theme: h.theme || '' })
    draft.materialHints.splice(i, 1)
  }
  save()
}
// 批量采纳/丢弃某类（从后往前采纳以保下标稳定）。
function adoptAll(kind) {
  const arr = kind === 'people' ? draft.people : kind === 'metrics' ? draft.metrics : draft.materialHints
  for (let i = arr.length - 1; i >= 0; i--) adoptDraft(kind, i)
}
function discardAll(kind) {
  const arr = kind === 'people' ? draft.people : kind === 'metrics' ? draft.metrics : draft.materialHints
  arr.splice(0, arr.length)
}

function clone(d) {
  const c = d.collected || {}
  return {
    metricValues: (c.metricValues || []).map((m) => ({ ...m })),
    materials: (c.materials || []).map((m) => ({ type: '照片', ...m })),
    people: (c.people || []).map((p) => ({ ...p })),
    summary: c.summary || '',
    highlights: Array.isArray(c.highlights) ? c.highlights.slice() : [],
  }
}

const state = reactive(clone(props.dossier))
const metricValues = computed(() => state.metricValues)
const people = computed(() => state.people)
const justSaved = ref(false)

// 右栏 Tab 定义 + 计数徽标。
const tabs = computed(() => [
  { key: 'metrics', label: '指标', count: state.metricValues.length, pending: draft.metrics.length },
  { key: 'materials', label: '材料', count: state.materials.length, pending: draft.materialHints.length },
  { key: 'people', label: '人物', count: state.people.length, pending: draft.people.length },
])

// 传给 TrackProgress 的档案：并进当前编辑态，实时反映未保存的采集。
const dossierForAnalysis = computed(() => ({ ...props.dossier, collected: { ...state } }))

// —— 阶段任务（track 段）——
const trackPhase = computed(() => {
  const phases = props.dossier.plan?.phases
  if (!Array.isArray(phases)) return null
  return phases.find((p) => p?.stage === 'track') || null
})
const hasTrackPhase = computed(() => !!trackPhase.value && Array.isArray(trackPhase.value.tasks) && trackPhase.value.tasks.length > 0)
const trackTasks = computed(() => trackPhase.value?.tasks || [])
const doneCount = computed(() => trackTasks.value.filter((t) => t.done).length)
const percent = computed(() => {
  const n = trackTasks.value.length
  if (!n) return 0
  return Math.round((doneCount.value / n) * 100)
})

// 勾选：把 plan.phases 复制回写（不改 props），emit update 让父组件落库。
function toggleTask(i, done) {
  const phases = Array.isArray(props.dossier.plan?.phases) ? props.dossier.plan.phases : []
  const nextPhases = phases.map((p) => ({
    ...p,
    tasks: Array.isArray(p.tasks) ? p.tasks.map((t) => ({ ...t })) : [],
  }))
  const track = nextPhases.find((p) => p?.stage === 'track')
  if (!track || !track.tasks[i]) return
  track.tasks[i].done = !!done
  emit('update', { plan: { ...props.dossier.plan, phases: nextPhases } })
}

// 首次进入时，把方案里计划的指标补进采集表（若尚未登记）
function seedFromPlan() {
  const planned = props.dossier.plan?.metrics || []
  const have = new Set(state.metricValues.map((m) => m.name))
  for (const pm of planned) {
    if (pm.name && !have.has(pm.name)) {
      state.metricValues.push({ name: pm.name, before: '', after: '', unit: pm.unit || '' })
    }
  }
}
seedFromPlan()

watch(
  () => props.dossier.id,
  () => {
    Object.assign(state, clone(props.dossier))
    seedFromPlan()
  },
)

function addMetric() { state.metricValues.push({ name: '', before: '', after: '', unit: '' }) }
function removeMetric(i) { state.metricValues.splice(i, 1) }
function addPerson() { state.people.push({ name: '', role: '', quote: '' }) }
function removePerson(i) { state.people.splice(i, 1) }

function save() {
  emit('update', {
    collected: {
      metricValues: state.metricValues.map((m) => ({ ...m })),
      materials: state.materials.map((m) => ({ ...m })),
      people: state.people.map((p) => ({ ...p })),
      summary: state.summary || '',
      highlights: Array.isArray(state.highlights) ? state.highlights.slice() : [],
    },
  })
  justSaved.value = true
  setTimeout(() => (justSaved.value = false), 1800)
}
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0 0 .9rem; font-size: .88rem; color: var(--color-text-secondary); }
.hint { font-size: .85rem; color: var(--color-text-light); margin: 0 0 .6rem; }

/* —— 左右分栏工作台 —— */
.workbench { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.4rem; align-items: start; }
.col-left { display: flex; flex-direction: column; gap: 1.4rem; min-width: 0; }
.col-right {
  min-width: 0; padding: 1.2rem 1.3rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}

/* Tab 头 */
.tabs { display: flex; gap: .4rem; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
.tab {
  border: none; background: transparent; cursor: pointer; padding: .5rem .9rem;
  font-size: .9rem; font-weight: 600; color: var(--color-text-secondary);
  border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all var(--transition);
}
.tab:hover { color: var(--color-primary); }
.tab.active { color: var(--color-primary-dark); border-bottom-color: var(--color-primary); }
.tab-n { font-size: .72rem; color: var(--color-text-light); background: var(--color-bg); padding: 0 .4rem; border-radius: 50px; margin-left: .2rem; }
.tab-panel { min-height: 120px; }

/* 折叠任务 */
.task-fold { border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-card); padding: .4rem .9rem; }
.task-summary { cursor: pointer; font-size: .92rem; font-weight: 600; color: var(--color-primary-dark); display: flex; align-items: center; gap: .8rem; padding: .5rem 0; }
.mini-bar { flex: 1; max-width: 160px; height: 6px; background: var(--color-bg); border-radius: 50px; overflow: hidden; }
.mini-fill { display: block; height: 100%; background: var(--color-primary); }
.task-fold .task-list { margin-top: .6rem; padding-bottom: .5rem; }

@media (max-width: 900px) {
  .workbench { grid-template-columns: 1fr; }
}

.cell {
  padding: .5rem .7rem; font-size: .88rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 9px; outline: none; min-width: 0;
}
.cell:focus { border-color: var(--color-primary); }

/* —— 任务块 —— */
.progress { display: flex; align-items: center; gap: .8rem; margin-bottom: .8rem; }
.progress-bar {
  flex: 1; height: 8px; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: 50px; overflow: hidden;
}
.progress-fill { height: 100%; background: var(--color-primary); transition: width .25s ease; }
.progress-text { font-size: .85rem; color: var(--color-text-secondary); white-space: nowrap; }

.task-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
.task-item {
  padding: .55rem .8rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 10px;
}
.task-item.done { background: var(--color-bg); }
.task-item.done .task-text { text-decoration: line-through; color: var(--color-text-light); }
.task-line { display: flex; align-items: center; gap: .7rem; cursor: pointer; flex-wrap: wrap; }
.task-line input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-primary); }
.task-text { flex: 1; font-size: .92rem; color: var(--color-text); min-width: 200px; }
.task-output { font-size: .78rem; color: var(--color-text-light); }

/* 指标表 */
.metric-table { display: flex; flex-direction: column; gap: .5rem; margin-bottom: .8rem; }
.mt-head { display: grid; grid-template-columns: 1.6fr 1fr 1fr .8fr; gap: .5rem; font-size: .78rem; color: var(--color-text-light); padding: 0 .3rem; }
.mt-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr .8fr auto; gap: .5rem; align-items: center; }

/* 人物 */
.people-list { display: flex; flex-direction: column; gap: .5rem; }
.person-row { display: grid; grid-template-columns: 1fr 1fr 2fr auto; gap: .5rem; align-items: center; }
.cell.wide { width: 100%; }

.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; color: var(--color-text-light); }
.chip-x:hover { color: var(--color-highlight); }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .7rem 1.5rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.tiny.ghost { align-self: flex-start; padding: .4rem 1rem; font-size: .82rem; background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }

.save-bar { display: flex; align-items: center; gap: 1rem; }
.saved-hint { font-size: .85rem; color: var(--color-primary); }

@media (max-width: 640px) {
  .mt-head { display: none; }
  .mt-row, .person-row { grid-template-columns: 1fr 1fr auto; }
}
</style>
