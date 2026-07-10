<template>
  <section class="block extract-block">
    <h2 class="block-title">🤖 AI 帮你理素材</h2>
    <p class="block-desc">
      粘贴一段访谈/口述/调研文字，或上传文本档（txt/md/docx/pdf/csv/xlsx），
      AI 会抽出人物、指标、材料要点，你审校后一键采纳进档案。
    </p>

    <div class="ex-input-row">
      <textarea
        v-model="text"
        class="ex-input"
        rows="4"
        placeholder="把访谈记录、口述笔记粘在这里……"
      />
    </div>
    <div class="ex-actions">
      <label class="btn tiny ghost doc-btn">
        📄 传文本档解析
        <input type="file" class="file-input" :disabled="parsing" @change="onPickDoc" />
      </label>
      <button class="btn primary" :disabled="!text.trim() || extracting" @click="onExtract">
        {{ extracting ? 'AI 提取中…' : 'AI 提取' }}
      </button>
      <span v-if="parsing" class="ex-hint">解析文档中…</span>
      <span v-else-if="msg" class="ex-hint" :class="msgErr ? 'err' : ''">{{ msg }}</span>
      <span v-if="lastSource === 'template'" class="ex-hint tpl">离线兜底提取，可联网后重试 AI</span>
    </div>

    <!-- 待审校卡片 -->
    <div v-if="hasDraft" class="draft-wrap">
      <div v-if="draft.people.length" class="draft-group">
        <h3 class="draft-title">人物（{{ draft.people.length }}）</h3>
        <div v-for="(p, i) in draft.people" :key="'p' + i" class="draft-card">
          <input v-model="p.name" class="cell" placeholder="姓名" />
          <input v-model="p.role" class="cell" placeholder="身份" />
          <input v-model="p.quote" class="cell wide" placeholder="一句话" />
          <span class="conf">{{ pct(p.confidence) }}</span>
          <button class="btn tiny" @click="adoptPerson(i)">采纳</button>
          <button class="chip-x" aria-label="丢弃" @click="draft.people.splice(i, 1)">×</button>
        </div>
      </div>

      <div v-if="draft.metrics.length" class="draft-group">
        <h3 class="draft-title">指标（{{ draft.metrics.length }}）</h3>
        <div v-for="(m, i) in draft.metrics" :key="'m' + i" class="draft-card">
          <input v-model="m.name" class="cell" placeholder="指标名" />
          <input v-model="m.value" class="cell" placeholder="数值" />
          <input v-model="m.unit" class="cell" placeholder="单位" />
          <span class="conf">{{ pct(m.confidence) }}</span>
          <button class="btn tiny" @click="adoptMetric(i)">采纳</button>
          <button class="chip-x" aria-label="丢弃" @click="draft.metrics.splice(i, 1)">×</button>
        </div>
      </div>

      <div v-if="draft.materialHints.length" class="draft-group">
        <h3 class="draft-title">材料要点（{{ draft.materialHints.length }}）</h3>
        <div v-for="(h, i) in draft.materialHints" :key="'h' + i" class="draft-card">
          <input v-model="h.name" class="cell wide" placeholder="材料名" />
          <input v-model="h.note" class="cell" placeholder="备注" />
          <span class="conf">{{ pct(h.confidence) }}</span>
          <button class="btn tiny" @click="adoptHint(i)">采纳</button>
          <button class="chip-x" aria-label="丢弃" @click="draft.materialHints.splice(i, 1)">×</button>
        </div>
      </div>

      <p v-if="allEmpty" class="ex-empty">没抽到可采纳的信息，换段更具体的文字试试。</p>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { extractFromText } from './extract.js'
import { extractUploadedDoc } from './mediaApi.js'

const props = defineProps({
  dossierId: { type: String, required: true },
  // 父组件 state 的引用，采纳时直接 push。
  people: { type: Array, required: true },
  metricValues: { type: Array, required: true },
  materials: { type: Array, required: true },
})
const emit = defineEmits(['change'])

const text = ref('')
const extracting = ref(false)
const parsing = ref(false)
const msg = ref('')
const msgErr = ref(false)
const lastSource = ref('')
const draft = reactive({ people: [], metrics: [], materialHints: [] })

const hasDraft = computed(() => !!lastSource.value && lastSource.value !== 'empty')
const allEmpty = computed(() => !draft.people.length && !draft.metrics.length && !draft.materialHints.length)

function pct(c) {
  const n = Number(c)
  return Number.isFinite(n) ? `把握 ${Math.round(n * 100)}%` : ''
}

async function onExtract() {
  if (extracting.value) return
  extracting.value = true
  msg.value = ''
  msgErr.value = false
  try {
    const r = await extractFromText(text.value)
    draft.people = r.people || []
    draft.metrics = r.metrics || []
    draft.materialHints = r.materialHints || []
    lastSource.value = r.source
  } catch (e) {
    msgErr.value = true
    msg.value = e.message || '提取失败'
  } finally {
    extracting.value = false
  }
}

async function onPickDoc(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  parsing.value = true
  msg.value = ''
  msgErr.value = false
  try {
    const { text: parsed } = await extractUploadedDoc(props.dossierId, file)
    text.value = parsed || ''
    msg.value = '文档已解析，可点「AI 提取」'
  } catch (err) {
    msgErr.value = true
    msg.value = err.status === 422 ? '该文件无法解析文本，请传 txt/docx/pdf 等' : (err.message || '解析失败')
  } finally {
    parsing.value = false
  }
}

// 采纳：并入父组件 state 并去掉该草稿卡；通知父组件保存。
function adoptPerson(i) {
  const p = draft.people[i]
  props.people.push({ name: p.name, role: p.role, quote: p.quote })
  draft.people.splice(i, 1)
  emit('change')
}
function adoptMetric(i) {
  const m = draft.metrics[i]
  props.metricValues.push({ name: m.name, before: '', after: m.value, unit: m.unit })
  draft.metrics.splice(i, 1)
  emit('change')
}
function adoptHint(i) {
  const h = draft.materialHints[i]
  props.materials.push({ type: '其他', name: h.name, note: h.note })
  draft.materialHints.splice(i, 1)
  emit('change')
}
</script>

<style scoped>
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0 0 .9rem; font-size: .88rem; color: var(--color-text-secondary); }
.extract-block {
  padding: 1.3rem 1.4rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}

.ex-input {
  width: 100%; resize: vertical; box-sizing: border-box;
  padding: .8rem 1rem; font-size: .92rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px; outline: none;
}
.ex-input:focus { border-color: var(--color-primary); }
.ex-actions { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; margin-top: .8rem; }
.doc-btn { position: relative; overflow: hidden; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.ex-hint { font-size: .82rem; color: var(--color-text-light); }
.ex-hint.err { color: var(--color-highlight); }
.ex-hint.tpl { color: #a15b28; background: #fff3e0; padding: .2rem .6rem; border-radius: 50px; }

.draft-wrap { margin-top: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
.draft-title { font-size: .92rem; color: var(--color-text); margin: 0 0 .5rem; }
.draft-group { padding-top: .8rem; border-top: 1px dashed var(--color-border); }
.draft-card { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; flex-wrap: wrap; }
.cell {
  padding: .45rem .6rem; font-size: .86rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px; outline: none; min-width: 80px;
}
.cell.wide { flex: 1; min-width: 160px; }
.cell:focus { border-color: var(--color-primary); }
.conf { font-size: .74rem; color: var(--color-text-light); white-space: nowrap; }
.ex-empty { font-size: .86rem; color: var(--color-text-light); margin: .4rem 0 0; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .6rem 1.3rem; background: var(--color-primary); color: #fff; font-size: .88rem; }
.btn.primary:disabled { background: #cfcfcf; cursor: not-allowed; }
.btn.tiny { padding: .35rem .9rem; font-size: .8rem; background: var(--color-accent); color: var(--color-primary-dark); }
.btn.tiny.ghost { background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }
.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; color: var(--color-text-light); }
.chip-x:hover { color: var(--color-highlight); }
</style>
