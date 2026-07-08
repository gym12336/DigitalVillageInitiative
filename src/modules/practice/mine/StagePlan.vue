<template>
  <div class="stage">
    <!-- idea 输入 + 检索 -->
    <section class="block">
      <h2 class="block-title">① 说出你的 idea</h2>
      <p class="block-desc">用一句话描述你想做的实践，比如「去陈家铺村帮村民把竹编卖出去」。</p>
      <div class="idea-row">
        <textarea
          v-model="ideaInput"
          class="idea-input"
          rows="2"
          placeholder="去某村，帮村民做点什么……"
        />
        <button class="btn primary" :disabled="!ideaInput.trim()" @click="onSearch">检索平台资源</button>
      </div>
    </section>

    <!-- 检索结果卡片 -->
    <section v-if="searched" class="block">
      <h2 class="block-title">② 平台为你找到的资源</h2>
      <p class="block-desc">相似村庄档案、往届类似成果、乡村真实需求、可用调研模板——点卡片可跳转，点「采纳」加入档案。</p>
      <div v-if="cards.length" class="ret-grid">
        <article v-for="c in cards" :key="c.source + c.id" class="ret-card">
          <span class="ret-source" :class="'src-' + c.source">{{ sourceLabel(c.source) }}</span>
          <h3 class="ret-title">{{ c.title }}</h3>
          <p class="ret-sub">{{ c.sub }}</p>
          <div class="ret-actions">
            <a class="ret-link" :href="'#' + c.path" @click.prevent="goTo(c.path)">查看 ↗</a>
            <button
              class="btn tiny"
              :class="{ adopted: isAdopted(c) }"
              @click="toggleAdopt(c)"
            >
              {{ isAdopted(c) ? '✓ 已采纳' : '采纳' }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="empty">站内没有相关资源，可联网搜索补充（联网检索为后续功能）。</p>
    </section>

    <!-- 已采纳资源 -->
    <section v-if="refs.length" class="block">
      <h2 class="block-title">已采纳资源（{{ refs.length }}）</h2>
      <div class="ref-chips">
        <span v-for="r in refs" :key="r.source + r.id" class="ref-chip">
          {{ sourceLabel(r.source) }}·{{ r.title }}
          <button class="chip-x" aria-label="移除" @click="toggleAdopt(r)">×</button>
        </span>
      </div>
    </section>

    <!-- 生成方案 + 编辑 -->
    <section class="block">
      <h2 class="block-title">③ 方案初稿</h2>
      <p class="block-desc">依据 idea 与采纳的资源自动生成，可继续手动编辑。有 DeepSeek key 时走 AI；无 key/网络不通则用离线模板。</p>
      <div class="gen-row">
        <button class="btn primary" :disabled="!ideaInput.trim() || generating" @click="onGenerate">
          {{ generating ? 'AI 生成中…' : (hasPlan ? '重新生成方案' : '生成方案初稿') }}
        </button>
        <span v-if="plan.source === 'template'" class="src-hint">本次用了离线模板，可重新生成试 AI</span>
        <span v-else-if="plan.source === 'ai'" class="src-hint src-ai">✓ AI 版方案</span>
      </div>

      <div v-if="hasPlan" class="plan-form">
        <!-- 基本信息 -->
        <label class="field">
          <span class="field-label">目标村</span>
          <input v-model="plan.targetVillage" class="field-input" />
        </label>
        <label class="field">
          <span class="field-label">选题</span>
          <input v-model="plan.topic" class="field-input" />
        </label>
        <label class="field field-wide">
          <span class="field-label">目标</span>
          <textarea v-model="plan.goal" class="field-input" rows="2" />
        </label>
        <label class="field field-wide">
          <span class="field-label">背景/痛点</span>
          <textarea v-model="plan.background" class="field-input" rows="2" placeholder="乡村之声反映的需求 / 目标村概况 / 时段安排等" />
        </label>
        <label class="field field-wide">
          <span class="field-label">预期成果</span>
          <textarea v-model="plan.expected" class="field-input" rows="2" />
        </label>

        <!-- 方法 chips -->
        <div class="field field-wide">
          <span class="field-label">建议调研方法</span>
          <div class="chip-editor">
            <span v-for="(m, i) in plan.methods" :key="'m' + i" class="chip">
              {{ m }}
              <button class="chip-x" aria-label="删除" @click="removeMethod(i)">×</button>
            </span>
            <input
              v-model="methodDraft"
              class="chip-input"
              placeholder="+ 添加方法，回车确认"
              @keydown.enter.prevent="addMethod"
            />
          </div>
        </div>

        <!-- 三阶段任务清单 -->
        <div class="field field-wide">
          <span class="field-label">分阶段任务</span>
          <p class="field-hint">实践中会用到这些任务，可勾选完成情况。这里只编辑内容，勾选留给「实践中」。</p>
          <div class="phase-list">
            <div v-for="(ph, pi) in plan.phases" :key="pi" class="phase-block">
              <div class="phase-head">
                <span class="phase-badge" :class="'ph-' + ph.stage">{{ ph.title || phaseFallbackTitle(ph.stage) }}</span>
                <span class="phase-hint">共 {{ ph.tasks.length }} 项</span>
              </div>
              <div v-for="(t, ti) in ph.tasks" :key="ti" class="task-row">
                <input v-model="t.text" class="cell task-text" placeholder="任务描述" />
                <input v-model="t.output" class="cell task-output" placeholder="交付物（可选）" />
                <button class="chip-x" aria-label="删除任务" @click="removeTask(pi, ti)">×</button>
              </div>
              <button class="btn tiny ghost" @click="addTask(pi)">+ 添加任务</button>
            </div>
          </div>
        </div>

        <!-- 指标 -->
        <div class="field field-wide">
          <span class="field-label">计划采集的指标</span>
          <div class="metric-list">
            <div v-for="(m, i) in plan.metrics" :key="i" class="metric-row">
              <input v-model="m.name" class="field-input" placeholder="指标名，如 月销售额" />
              <input v-model="m.unit" class="field-input unit" placeholder="单位" />
              <button class="chip-x" aria-label="删除指标" @click="removeMetric(i)">×</button>
            </div>
            <button class="btn tiny ghost" @click="addMetric">+ 添加指标</button>
          </div>
        </div>

        <!-- 风险 chips -->
        <div class="field field-wide">
          <span class="field-label">风险与预案</span>
          <div class="chip-editor">
            <span v-for="(r, i) in plan.risks" :key="'r' + i" class="chip">
              {{ r }}
              <button class="chip-x" aria-label="删除" @click="removeRisk(i)">×</button>
            </span>
            <input
              v-model="riskDraft"
              class="chip-input"
              placeholder="+ 添加风险，回车确认"
              @keydown.enter.prevent="addRisk"
            />
          </div>
        </div>

        <button class="btn primary" @click="onSavePlan">保存方案</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { retrieve } from './retrieval.js'
import { generatePlan } from './planGen.js'
import { retrievalSources } from './sources.js'

const props = defineProps({
  dossier: { type: Object, required: true },
})
const emit = defineEmits(['update'])
const router = useRouter()

const ideaInput = ref(props.dossier.idea || '')
const searched = ref(false)
const cards = ref([])
const generating = ref(false)
const methodDraft = ref('')
const riskDraft = ref('')

// plan 本地态：保证新字段都有默认，避免 v-model 打空。
const plan = reactive(makePlanState(props.dossier.plan))

// 已采纳资源。档案可能缺 refs（迁移导入/历史数据），统一兜底为空数组，避免渲染崩溃。
const refs = computed(() => props.dossier.refs || [])

// 切换档案时，同步本地状态并按条件自动检索
watch(
  () => props.dossier.id,
  () => {
    ideaInput.value = props.dossier.idea || ''
    Object.assign(plan, makePlanState(props.dossier.plan))
    searched.value = false
    cards.value = []
    maybeAutoSearch()
  },
)

// 首次进入实践前也按条件自动检索
onMounted(maybeAutoSearch)

const hasPlan = computed(() =>
  !!(plan.topic || (plan.metrics && plan.metrics.length) || (plan.phases && plan.phases.length)),
)

function makePlanState(src) {
  const p = src && typeof src === 'object' ? src : {}
  return {
    goal: p.goal || '',
    topic: p.topic || '',
    targetVillage: p.targetVillage || '',
    expected: p.expected || '',
    background: p.background || '',
    metrics: Array.isArray(p.metrics) ? p.metrics.map((m) => ({ ...m })) : [],
    methods: Array.isArray(p.methods) ? [...p.methods] : [],
    risks: Array.isArray(p.risks) ? [...p.risks] : [],
    phases: Array.isArray(p.phases) ? p.phases.map(clonePhase) : [],
    source: p.source || '',
    generatedAt: p.generatedAt || '',
  }
}

function clonePhase(ph) {
  return {
    stage: ph?.stage || '',
    title: ph?.title || '',
    tasks: Array.isArray(ph?.tasks) ? ph.tasks.map((t) => ({ text: t?.text || '', output: t?.output || '', done: !!t?.done })) : [],
  }
}

function onSearch() {
  const idea = ideaInput.value.trim()
  cards.value = retrieve(idea, retrievalSources, {
    topic: props.dossier.plan?.topic,
    village: props.dossier.village,
  })
  searched.value = true
  emit('update', { idea })
}

function maybeAutoSearch() {
  const hasRefs = (props.dossier.refs || []).length > 0
  const hasSeed = !!(ideaInput.value.trim() || props.dossier.plan?.topic)
  if (!hasRefs && hasSeed) onSearch()
}

function isAdopted(c) {
  return refs.value.some((r) => r.source === c.source && r.id === c.id)
}
function toggleAdopt(c) {
  const next = refs.value.filter((r) => !(r.source === c.source && r.id === c.id))
  if (next.length === refs.value.length) {
    next.push({ source: c.source, id: c.id, title: c.title, sub: c.sub, path: c.path })
  }
  emit('update', { refs: next })
}

async function onGenerate() {
  if (generating.value) return
  generating.value = true
  try {
    const generated = await generatePlan(ideaInput.value.trim(), props.dossier.refs, {
      village: props.dossier.village || plan.targetVillage,
      topic: plan.topic,
      startDate: props.dossier.startDate,
      endDate: props.dossier.endDate,
    })
    Object.assign(plan, makePlanState(generated))
    emit('update', {
      idea: ideaInput.value.trim(),
      plan: snapshotPlan(plan),
    })
  } finally {
    generating.value = false
  }
}

function snapshotPlan(p) {
  return {
    ...p,
    metrics: p.metrics.map((m) => ({ ...m })),
    methods: [...p.methods],
    risks: [...p.risks],
    phases: p.phases.map((ph) => ({
      stage: ph.stage,
      title: ph.title,
      tasks: ph.tasks.map((t) => ({ ...t })),
    })),
  }
}

function addMetric() { plan.metrics.push({ name: '', unit: '' }) }
function removeMetric(i) { plan.metrics.splice(i, 1) }

function addMethod() {
  const v = methodDraft.value.trim()
  if (!v) return
  plan.methods.push(v)
  methodDraft.value = ''
}
function removeMethod(i) { plan.methods.splice(i, 1) }

function addRisk() {
  const v = riskDraft.value.trim()
  if (!v) return
  plan.risks.push(v)
  riskDraft.value = ''
}
function removeRisk(i) { plan.risks.splice(i, 1) }

function addTask(pi) {
  plan.phases[pi].tasks.push({ text: '', output: '', done: false })
}
function removeTask(pi, ti) { plan.phases[pi].tasks.splice(ti, 1) }

function phaseFallbackTitle(stage) {
  return { plan: '实践前准备', track: '实践中执行', result: '实践后总结' }[stage] || stage
}

function onSavePlan() {
  emit('update', { plan: snapshotPlan(plan) })
}

function goTo(path) { router.push(path) }
const SOURCE_LABELS = { village: '乡村百科', result: '实践成果', demand: '乡村之声', guide: '实践攻略' }
function sourceLabel(s) { return SOURCE_LABELS[s] || s }
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0 0 .9rem; font-size: .88rem; color: var(--color-text-secondary); }

.idea-row { display: flex; gap: .8rem; align-items: stretch; flex-wrap: wrap; }
.idea-input {
  flex: 1; min-width: 260px; resize: vertical;
  padding: .8rem 1rem; font-size: .95rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; outline: none;
}
.idea-input:focus { border-color: var(--color-primary); }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .7rem 1.5rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover:not(:disabled) { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.primary:disabled { background: #cfcfcf; cursor: not-allowed; }
.btn.tiny { padding: .35rem .9rem; font-size: .8rem; background: var(--color-accent); color: var(--color-primary-dark); }
.btn.tiny.adopted { background: var(--color-primary); color: #fff; }
.btn.tiny.ghost { background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }

.gen-row { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; }
.src-hint { font-size: .82rem; color: #a15b28; background: #fff3e0; padding: .25rem .7rem; border-radius: 50px; }
.src-hint.src-ai { color: var(--color-primary-dark); background: var(--color-accent); }

/* 检索结果 */
.ret-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.ret-card {
  display: flex; flex-direction: column; gap: .4rem;
  padding: 1.1rem 1.2rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.ret-source { align-self: flex-start; font-size: .72rem; padding: .12rem .6rem; border-radius: 50px; color: #fff; }
.src-village { background: #6b8c5c; }
.src-result { background: #4a8fbf; }
.src-demand { background: #e07a5f; }
.src-guide { background: #c9a86a; }
.ret-title { margin: .2rem 0 0; font-size: .98rem; color: var(--color-text); }
.ret-sub { margin: 0; font-size: .82rem; color: var(--color-text-light); flex: 1; }
.ret-actions { display: flex; align-items: center; justify-content: space-between; margin-top: .3rem; }
.ret-link { font-size: .82rem; color: var(--color-primary); text-decoration: none; }
.ret-link:hover { text-decoration: underline; }

.ref-chips { display: flex; flex-wrap: wrap; gap: .5rem; }
.ref-chip {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .3rem .8rem; font-size: .82rem; border-radius: 50px;
  background: var(--color-accent); color: var(--color-primary-dark);
}
.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1rem; line-height: 1; color: inherit; }

/* 方案表单 */
.plan-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.2rem; }
.field { display: flex; flex-direction: column; gap: .35rem; }
.field-wide { grid-column: 1 / -1; }
.field-label { font-size: .82rem; font-weight: 600; color: var(--color-text); }
.field-hint { margin: 0 0 .3rem; font-size: .78rem; color: var(--color-text-light); }
.field-input {
  padding: .6rem .8rem; font-size: .9rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; outline: none; resize: vertical;
}
.field-input:focus { border-color: var(--color-primary); }
.metric-list { display: flex; flex-direction: column; gap: .5rem; }
.metric-row { display: flex; gap: .5rem; align-items: center; }
.metric-row .field-input { flex: 1; }
.metric-row .unit { flex: 0 0 90px; }

/* chip editor（方法 / 风险） */
.chip-editor {
  display: flex; flex-wrap: wrap; gap: .5rem; align-items: center;
  padding: .5rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px;
}
.chip {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .3rem .8rem; font-size: .82rem; border-radius: 50px;
  background: var(--color-accent); color: var(--color-primary-dark);
}
.chip-input {
  flex: 1; min-width: 160px; padding: .3rem .5rem; font-size: .85rem;
  border: none; background: transparent; outline: none; color: var(--color-text);
}

/* 阶段任务 */
.phase-list { display: flex; flex-direction: column; gap: .9rem; }
.phase-block {
  padding: .8rem 1rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px;
  display: flex; flex-direction: column; gap: .5rem;
}
.phase-head { display: flex; align-items: center; gap: .7rem; }
.phase-badge {
  font-size: .78rem; padding: .18rem .7rem; border-radius: 50px; color: #fff;
}
.ph-plan { background: #6b8c5c; }
.ph-track { background: #4a8fbf; }
.ph-result { background: #c9a86a; }
.phase-hint { font-size: .78rem; color: var(--color-text-light); }
.task-row { display: grid; grid-template-columns: 2fr 1.2fr auto; gap: .5rem; align-items: center; }
.cell {
  padding: .5rem .7rem; font-size: .88rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 9px; outline: none; min-width: 0;
}
.cell:focus { border-color: var(--color-primary); }

.empty { padding: 2rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }

@media (max-width: 560px) {
  .plan-form { grid-template-columns: 1fr; }
  .task-row { grid-template-columns: 1fr auto; }
  .task-row .task-output { grid-column: 1 / 2; }
}
</style>
