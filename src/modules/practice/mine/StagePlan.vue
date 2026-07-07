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
    <section v-if="dossier.refs.length" class="block">
      <h2 class="block-title">已采纳资源（{{ dossier.refs.length }}）</h2>
      <div class="ref-chips">
        <span v-for="r in dossier.refs" :key="r.source + r.id" class="ref-chip">
          {{ sourceLabel(r.source) }}·{{ r.title }}
          <button class="chip-x" aria-label="移除" @click="toggleAdopt(r)">×</button>
        </span>
      </div>
    </section>

    <!-- 生成方案 + 编辑 -->
    <section class="block">
      <h2 class="block-title">③ 方案初稿</h2>
      <p class="block-desc">依据 idea 与采纳的资源自动生成，可继续手动编辑。</p>
      <button class="btn primary" :disabled="!ideaInput.trim()" @click="onGenerate">
        {{ hasPlan ? '重新生成方案' : '生成方案初稿' }}
      </button>

      <div v-if="hasPlan" class="plan-form">
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
          <span class="field-label">预期成果</span>
          <textarea v-model="plan.expected" class="field-input" rows="2" />
        </label>

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
const plan = reactive({ ...props.dossier.plan })

// 切换档案时，同步本地状态并按条件自动检索
watch(
  () => props.dossier.id,
  () => {
    ideaInput.value = props.dossier.idea || ''
    Object.assign(plan, props.dossier.plan)
    searched.value = false
    cards.value = []
    maybeAutoSearch()
  },
)

// 首次进入实践前也按条件自动检索
onMounted(maybeAutoSearch)

const hasPlan = computed(() => !!(plan.topic || (plan.metrics && plan.metrics.length)))

function onSearch() {
  const idea = ideaInput.value.trim()
  cards.value = retrieve(idea, retrievalSources, {
    topic: props.dossier.plan?.topic,
    village: props.dossier.village,
  })
  searched.value = true
  // idea 变更即写回档案（自动检索时 idea 未变，写回幂等，无副作用）
  emit('update', { idea })
}

// 进入实践前：refs 为空（从未采纳过资源）且 idea 或 topic 非空时，自动检索一次。
function maybeAutoSearch() {
  const hasRefs = (props.dossier.refs || []).length > 0
  const hasSeed = !!(ideaInput.value.trim() || props.dossier.plan?.topic)
  if (!hasRefs && hasSeed) onSearch()
}

function isAdopted(c) {
  return props.dossier.refs.some((r) => r.source === c.source && r.id === c.id)
}
function toggleAdopt(c) {
  const refs = props.dossier.refs.filter((r) => !(r.source === c.source && r.id === c.id))
  if (refs.length === props.dossier.refs.length) {
    refs.push({ source: c.source, id: c.id, title: c.title, sub: c.sub, path: c.path })
  }
  emit('update', { refs })
}

function onGenerate() {
  const generated = generatePlan(ideaInput.value.trim(), props.dossier.refs)
  Object.assign(plan, generated)
  emit('update', { idea: ideaInput.value.trim(), plan: { ...plan, metrics: plan.metrics.map((m) => ({ ...m })) } })
}

function addMetric() {
  plan.metrics.push({ name: '', unit: '' })
}
function removeMetric(i) {
  plan.metrics.splice(i, 1)
}
function onSavePlan() {
  emit('update', { plan: { ...plan, metrics: plan.metrics.map((m) => ({ ...m })) } })
}

function goTo(path) {
  router.push(path)
}
const SOURCE_LABELS = { village: '乡村百科', result: '实践成果', demand: '乡村之声', guide: '实践攻略' }
function sourceLabel(s) {
  return SOURCE_LABELS[s] || s
}
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block { }
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
.field-input {
  padding: .6rem .8rem; font-size: .9rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; outline: none; resize: vertical;
}
.field-input:focus { border-color: var(--color-primary); }
.metric-list { display: flex; flex-direction: column; gap: .5rem; }
.metric-row { display: flex; gap: .5rem; align-items: center; }
.metric-row .field-input { flex: 1; }
.metric-row .unit { flex: 0 0 90px; }

.empty { padding: 2rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }

@media (max-width: 560px) { .plan-form { grid-template-columns: 1fr; } }
</style>
