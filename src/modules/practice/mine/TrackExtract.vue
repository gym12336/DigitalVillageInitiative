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
      <button class="btn tiny ghost" :disabled="summarizing" @click="onSummarize">
        {{ summarizing ? '综述生成中…' : '📝 生成成果综述' }}
      </button>
      <span v-if="parsing" class="ex-hint">解析文档中…</span>
      <span v-else-if="parsingFile" class="ex-hint">🤖 AI 正在读取「{{ parsingFile }}」…</span>
      <span v-else-if="msg" class="ex-hint" :class="msgErr ? 'err' : ''">{{ msg }}</span>
      <span v-if="lastSource === 'template'" class="ex-hint tpl">离线兜底提取，可联网后重试 AI</span>
    </div>

    <span v-if="summaryMsg" class="ex-hint" :class="{ err: summaryDraft.source === 'error' }">{{ summaryMsg }}</span>

    <!-- 成果综述待审校 -->
    <div v-if="summaryDraft.has" class="draft-wrap">
      <div class="draft-group">
        <h3 class="draft-title">成果综述（AI 生成，采纳后进成果页）</h3>
        <textarea v-model="summaryDraft.summary" class="ex-input" rows="4" placeholder="AI 生成的成果综述" />
        <div v-if="summaryDraft.highlights.length" class="hl-list">
          <div v-for="(h, i) in summaryDraft.highlights" :key="'hl' + i" class="draft-card">
            <input v-model="summaryDraft.highlights[i]" class="cell wide" placeholder="成果亮点" />
            <button class="chip-x" aria-label="删除" @click="summaryDraft.highlights.splice(i, 1)">×</button>
          </div>
        </div>
        <div class="sum-actions">
          <button class="btn tiny" @click="adoptSummary">采纳进成果页</button>
          <button class="btn tiny ghost" @click="summaryDraft.has = false">丢弃</button>
        </div>
      </div>
    </div>

    <!-- 待审校卡片 -->
    <div v-if="hasDraft" class="draft-wrap">
      <div v-if="draft.people.length" class="draft-group">
        <h3 class="draft-title">人物（{{ draft.people.length }}）</h3>
        <div v-for="(p, i) in draft.people" :key="'p' + i" class="draft-card">
          <input v-model="p.name" class="cell" placeholder="姓名" />
          <input v-model="p.role" class="cell" placeholder="身份" />
          <input v-model="p.quote" class="cell wide" placeholder="一句话" />
          <span v-if="p.sourceFile" class="src" :title="p.sourceFile">📄 {{ p.sourceFile }}</span>
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
          <span v-if="m.sourceFile" class="src" :title="m.sourceFile">📄 {{ m.sourceFile }}</span>
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
          <span v-if="h.sourceFile" class="src" :title="h.sourceFile">📄 {{ h.sourceFile }}</span>
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
import { extractFromText, summarizeCollected } from './extract.js'
import { extractAndStoreDoc } from './mediaApi.js'

const props = defineProps({
  dossierId: { type: String, required: true },
  // 父组件 state 的引用，采纳时直接 push。
  people: { type: Array, required: true },
  metricValues: { type: Array, required: true },
  materials: { type: Array, required: true },
  // 成果综述采纳目标（父组件 collected 的引用容器）+ 方案上下文。
  collected: { type: Object, default: null },
  topic: { type: String, default: '' },
  village: { type: String, default: '' },
})
const emit = defineEmits(['change'])

const text = ref('')
const extracting = ref(false)
const parsing = ref(false)
const parsingFile = ref('') // 正在被 AI 读取的文件名，空表示无
const msg = ref('')
const msgErr = ref(false)
const lastSource = ref('')
const draft = reactive({ people: [], metrics: [], materialHints: [] })

// 成果综述待审校区。
const summarizing = ref(false)
const summaryMsg = ref('')
const summaryDraft = reactive({ summary: '', highlights: [], has: false })

const hasDraft = computed(() => !!lastSource.value && lastSource.value !== 'empty')
const allEmpty = computed(() => !draft.people.length && !draft.metrics.length && !draft.materialHints.length)

function pct(c) {
  const n = Number(c)
  return Number.isFinite(n) ? `把握 ${Math.round(n * 100)}%` : ''
}

// 把一次抽取结果合并进待审校区（追加、去重），每条标来源文件。
// sourceFile 空串表示手动粘贴输入。返回本次新增条数。
function mergeDraft(r, sourceFile = '') {
  let added = 0
  const tag = (item) => ({ ...item, sourceFile })
  const key = (o, fields) => fields.map((f) => String(o?.[f] || '').trim()).join('|')

  for (const p of r.people || []) {
    const k = key(p, ['name', 'quote'])
    if (k === '|') continue
    if (draft.people.some((x) => key(x, ['name', 'quote']) === k)) continue
    draft.people.push(tag(p)); added++
  }
  for (const m of r.metrics || []) {
    const k = key(m, ['name', 'value'])
    if (k === '|') continue
    if (draft.metrics.some((x) => key(x, ['name', 'value']) === k)) continue
    draft.metrics.push(tag(m)); added++
  }
  for (const h of r.materialHints || []) {
    const k = key(h, ['name'])
    if (k === '') continue
    if (draft.materialHints.some((x) => key(x, ['name']) === k)) continue
    draft.materialHints.push(tag(h)); added++
  }
  return added
}

async function onExtract() {
  if (extracting.value) return
  extracting.value = true
  msg.value = ''
  msgErr.value = false
  try {
    const r = await extractFromText(text.value)
    mergeDraft(r, '') // 手动输入：来源留空
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
    // 一趟往返：文件存盘（进材料清单，可查看）+ 抽文本（喂 AI）。
    const { media, text: parsed } = await extractAndStoreDoc(props.dossierId, file)
    text.value = parsed || ''
    // 登记进材料清单：带 url 可下载、带 text 可站内预览解析全文。
    props.materials.push({
      type: '文档',
      name: media.name,
      note: '',
      url: media.url,
      kind: media.kind,
      ext: media.ext,
      text: parsed || '',
    })
    emit('change')

    // 上传即自动抽取：拿到解析文本后自动跑一次 AI 提取，结果并入待审校区。
    if (parsed && parsed.trim()) {
      parsingFile.value = media.name
      extracting.value = true
      try {
        const r = await extractFromText(parsed)
        const added = mergeDraft(r, media.name)
        lastSource.value = r.source
        msg.value = added
          ? `已从「${media.name}」抽取 ${added} 条待审校信息`
          : `文档已存入材料清单，但未从中抽到结构化信息`
      } finally {
        extracting.value = false
        parsingFile.value = ''
      }
    } else {
      msg.value = '文档已存入材料清单（无可解析文本）'
    }
  } catch (err) {
    msgErr.value = true
    msg.value = err.status === 422 ? '该文件无法解析文本，请传 txt/docx/pdf 等' : (err.message || '解析失败')
  } finally {
    parsing.value = false
  }
}

// 采纳：并入父组件 state 并去掉该草稿卡；通知父组件保存。
// 携带 AI 富字段（story/highlight、insight/isHighlight），供成果组件直接渲染。
function adoptPerson(i) {
  const p = draft.people[i]
  props.people.push({ name: p.name, role: p.role, quote: p.quote, story: p.story || '', highlight: p.highlight || '' })
  draft.people.splice(i, 1)
  emit('change')
}
function adoptMetric(i) {
  const m = draft.metrics[i]
  props.metricValues.push({ name: m.name, before: '', after: m.value, unit: m.unit, insight: m.insight || '', isHighlight: !!m.isHighlight })
  draft.metrics.splice(i, 1)
  emit('change')
}
function adoptHint(i) {
  const h = draft.materialHints[i]
  props.materials.push({ type: '其他', name: h.name, note: h.note, summary: h.summary || '', theme: h.theme || '' })
  draft.materialHints.splice(i, 1)
  emit('change')
}

// 生成成果综述：把已采集的人物/指标/材料喂给 AI，产出综述 + 亮点进待审校。
async function onSummarize() {
  if (summarizing.value) return
  summarizing.value = true
  summaryMsg.value = ''
  try {
    const r = await summarizeCollected({
      people: props.people,
      metricValues: props.metricValues,
      materials: props.materials,
      topic: props.topic,
      village: props.village,
    })
    if (r.source === 'empty') {
      summaryMsg.value = '还没有可综述的采集数据，先采纳一些人物/指标/材料。'
      summaryDraft.has = false
    } else if (r.source === 'error' || (!r.summary && !r.highlights.length)) {
      summaryMsg.value = '综述暂未生成，可补充材料后重试。'
      summaryDraft.has = false
    } else {
      summaryDraft.summary = r.summary
      summaryDraft.highlights = Array.isArray(r.highlights) ? r.highlights.slice() : []
      summaryDraft.source = r.source
      summaryDraft.has = true
      summaryMsg.value = ''
    }
  } finally {
    summarizing.value = false
  }
}

// 采纳成果综述：写入父组件 collected.summary / highlights，供成果页文本组件绑定。
function adoptSummary() {
  if (props.collected) {
    props.collected.summary = summaryDraft.summary
    props.collected.highlights = summaryDraft.highlights.filter((h) => String(h).trim())
  }
  summaryDraft.has = false
  summaryMsg.value = '成果综述已采纳 ✓'
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
.src {
  font-size: .72rem; color: var(--color-primary-dark); background: var(--color-accent);
  padding: .12rem .5rem; border-radius: 50px; max-width: 140px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.ex-empty { font-size: .86rem; color: var(--color-text-light); margin: .4rem 0 0; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .6rem 1.3rem; background: var(--color-primary); color: #fff; font-size: .88rem; }
.btn.primary:disabled { background: #cfcfcf; cursor: not-allowed; }
.btn.tiny { padding: .35rem .9rem; font-size: .8rem; background: var(--color-accent); color: var(--color-primary-dark); }
.btn.tiny.ghost { background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }
.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; color: var(--color-text-light); }
.chip-x:hover { color: var(--color-highlight); }
</style>
