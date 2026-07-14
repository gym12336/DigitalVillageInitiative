<template>
  <div class="mg">
    <div v-if="!fileCards.length && !manualItems.length" class="mg-empty">
      还没有文件。用左侧「上传实践材料」上传，或在编辑模式下手动登记。
    </div>

    <!-- 🆕 一键提取：对素材栏中所有未提取的解析文件 -->
    <div v-if="batchExtractable.length" class="batch-bar">
      <button class="btn-batch" :disabled="batchBusy" @click="onBatchExtract">
        {{ batchBusy ? `⏳ AI 正在提取（${batchDone}/${batchTotal}）…` : `🤖 一键提取全部（${batchExtractable.length} 个文件）` }}
      </button>
    </div>

    <!-- ===== 文件卡片：一个文件一张卡 ===== -->
    <div v-for="card in fileCards" :key="'fc'+card._i" class="file-card">
      <div class="fc-head">
        <span class="fc-icon">{{ card._icon }}</span>
        <div class="fc-meta">
          <span class="fc-name">{{ card.name || '(未命名)' }}</span>
          <span class="fc-type">{{ card._typeLabel }}</span>
        </div>
        <button v-if="card.url || card.text" class="fc-view" @click="$emit('preview', card)">查看 ↗</button>
      </div>

      <!-- 🆕 AI 提取按钮：有解析文本的文件卡直接提取 -->
      <div v-if="card.text" class="fc-extract">
        <button
          class="btn-extract"
          :disabled="extracting[card._i] || extracted[card._i]"
          @click="onExtractFile(card)"
        >
          <template v-if="extracted[card._i]">✓ AI 已提取</template>
          <template v-else-if="extracting[card._i]">⏳ AI 正在提取…</template>
          <template v-else>🤖 AI 提取此文件</template>
        </button>
        <span v-if="extractMsg[card._i]" class="extract-msg" :class="{ err: extractErr[card._i] }">{{ extractMsg[card._i] }}</span>
      </div>

      <!-- 图片缩略图 -->
      <div v-if="card.kind === 'image' && card.url" class="fc-thumb" @click="$emit('preview', card)">
        <img :src="card.url" :alt="card.name" />
      </div>

      <!-- 文档解析文本 -->
      <div v-if="card.text" class="fc-section parsed">
        <div class="fc-section-head">
          <span class="fc-section-label">📝 文档解析文本</span>
          <button
            v-if="card.text.length > 300"
            class="fc-expand"
            @click="expandState['exp'+card._i] = !expandState['exp'+card._i]"
          >{{ expandState['exp'+card._i] ? '收起 ▲' : '展开全文 ▼' }}</button>
        </div>
        <div class="fc-text-body" :class="{ clamped: !expandState['exp'+card._i] && card.text.length > 300 }">
          <pre class="fc-text">{{ card.text }}</pre>
        </div>
      </div>

      <!-- AI 图注（AI 描述图片后写入 note 的内容） -->
      <div v-if="card._aiNote" class="fc-section ai-note">
        <span class="fc-section-label">🤖 AI 图注</span>
        <p class="fc-ai-text">{{ card._aiNote }}</p>
      </div>

      <!-- 用户备注 -->
      <div v-if="card._userNote" class="fc-section user-note">
        <span class="fc-section-label">📌 备注</span>
        <p class="fc-note-text">{{ card._userNote }}</p>
      </div>
    </div>

    <!-- ===== 手动登记（无文件、非AI条目） ===== -->
    <div v-if="manualItems.length" class="manual-block">
      <h4 class="mg-title">📝 手动登记（{{ manualItems.length }}）</h4>
      <div v-for="m in manualItems" :key="'mu'+m._i" class="manual-row">
        <span class="manual-name">{{ m.name || '(未命名)' }}</span>
        <span class="manual-type">{{ m.type }}</span>
        <p v-if="m.note" class="manual-note">{{ m.note }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { extractFromText } from './extract.js'

const props = defineProps({
  materials: { type: Array, required: true },
})
const emit = defineEmits(['preview', 'extracted'])

const KIND_META = {
  image:  { icon: '🖼', label: '图片' },
  av:     { icon: '🎬', label: '音视频' },
  doc:    { icon: '📄', label: '文档' },
  table:  { icon: '📊', label: '表格' },
  other:  { icon: '📎', label: '其他' },
}
const TYPE_TO_KIND = {
  照片: 'image', 视频: 'av', 音频: 'av', 文档: 'doc', 表格: 'table',
  访谈记录: 'doc', 调研笔记: 'doc', 其他: 'other',
}

function kindOf(m) {
  if (m.kind) return m.kind
  return TYPE_TO_KIND[m.type] || 'other'
}

function splitNote(note) {
  const s = (note || '').trim()
  if (!s) return { user: '', ai: '' }
  const idx = s.indexOf('｜')
  if (idx === -1) return { user: s, ai: '' }
  return { user: s.slice(0, idx).trim(), ai: s.slice(idx + 1).trim() }
}

const expandState = reactive({})

// —— AI 提取：每文件独立状态 ——
const extracting = reactive({})
const extracted = reactive({})
const extractMsg = reactive({})
const extractErr = reactive({})

// 一键提取：所有有解析文本、尚未提取、未在提取中的文件
const batchExtractable = computed(() =>
  fileCards.value.filter(c => c.text && !extracted[c._i] && !extracting[c._i])
)
const batchTotal = ref(0)
const batchDone = ref(0)
const batchBusy = ref(false)

async function onBatchExtract() {
  const targets = batchExtractable.value
  if (!targets.length || batchBusy.value) return
  batchBusy.value = true
  batchTotal.value = targets.length
  batchDone.value = 0
  // 逐个提取，避免并发打爆 API
  for (const card of targets) {
    await onExtractFile(card)
    batchDone.value++
  }
  batchBusy.value = false
}

async function onExtractFile(card) {
  const text = (card.text || '').trim()
  if (!text || extracting[card._i] || extracted[card._i]) return
  extracting[card._i] = true
  extractMsg[card._i] = ''
  try {
    const r = await extractFromText(text)
    const tag = { sourceFile: card.name }
    if (r && (r.people?.length || r.metrics?.length || r.materialHints?.length || r.places?.length)) {
      const drafts = {
        people: (r.people || []).map(p => ({ ...p, ...tag })),
        metrics: (r.metrics || []).map(m => ({ ...m, ...tag })),
        materialHints: (r.materialHints || []).map(h => ({ ...h, ...tag })),
        places: (r.places || []).map(p => ({ ...p, ...tag })),
      }
      emit('extracted', drafts)
      extracted[card._i] = true
      const n = drafts.people.length + drafts.metrics.length + drafts.materialHints.length + drafts.places.length
      extractMsg[card._i] = `抽出 ${n} 条，请在右栏各资料格审校`
    } else {
      extractMsg[card._i] = '未抽到结构化信息'
      extractErr[card._i] = true
    }
  } catch {
    extractMsg[card._i] = 'AI 不可用，请稍后重试'
    extractErr[card._i] = true
  } finally {
    extracting[card._i] = false
  }
}

// 文件卡片：有 url 的上传文件
const fileCards = computed(() => {
  return props.materials
    .map((m, i) => ({ ...m, _i: i }))
    .filter(m => m.url)
    .map(m => {
      const meta = KIND_META[kindOf(m)] || KIND_META.other
      const key = 'exp' + m._i
      if (!(key in expandState)) expandState[key] = false
      const { user, ai } = splitNote(m.note)
      return {
        ...m,
        _icon: meta.icon,
        _typeLabel: meta.label + (m.ext ? ' · ' + m.ext : ''),
        _userNote: user,
        _aiNote: ai,
      }
    })
})

// 手动登记：无 url、非 AI 来源
const manualItems = computed(() => {
  return props.materials
    .map((m, i) => ({ ...m, _i: i }))
    .filter(m => !m.url && !(m.source === 'auto'))
})
</script>

<style scoped>
.mg { display: flex; flex-direction: column; gap: 1rem; }
.mg-empty {
  padding: 2rem 1rem; text-align: center; font-size: .86rem;
  color: var(--color-text-light); background: var(--color-bg);
  border: 1px dashed var(--color-border); border-radius: 12px;
}
.mg-title { margin: 0 0 .5rem; font-size: .85rem; font-weight: 600; color: var(--color-text-secondary); }

/* 文件卡片 */
.file-card {
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 12px; padding: .9rem 1rem; box-shadow: var(--shadow-card);
}
.fc-head { display: flex; align-items: center; gap: .7rem; }
.fc-icon { font-size: 1.3rem; flex-shrink: 0; }
.fc-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .1rem; }
.fc-name { font-size: .9rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-type { font-size: .74rem; color: var(--color-text-light); }
.fc-view {
  flex-shrink: 0; font-size: .82rem; font-weight: 600; color: var(--color-primary);
  border: none; background: transparent; cursor: pointer; padding: .25rem .5rem;
  border-radius: 6px; transition: background var(--transition);
}
.fc-view:hover { background: var(--color-bg); }

/* 一键提取 */
.batch-bar { margin-bottom: .4rem; }
.btn-batch {
  width: 100%; font-size: .86rem; font-weight: 600; color: #fff;
  background: var(--color-primary); border: none; padding: .55rem 1rem;
  border-radius: 10px; cursor: pointer; transition: all var(--transition);
}
.btn-batch:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-batch:disabled { opacity: .6; cursor: not-allowed; }

/* AI 提取按钮 */
.fc-extract { margin-top: .7rem; padding-top: .6rem; border-top: 1px dashed var(--color-border); display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; }
.btn-extract {
  font-size: .82rem; font-weight: 600; color: var(--color-primary);
  border: 1px solid var(--color-primary); background: transparent;
  padding: .35rem .8rem; border-radius: 50px; cursor: pointer;
  transition: all var(--transition);
}
.btn-extract:hover:not(:disabled) { background: var(--color-primary); color: #fff; }
.btn-extract:disabled { opacity: .65; cursor: not-allowed; border-color: var(--color-border); color: var(--color-text-light); }
.extract-msg { font-size: .78rem; color: var(--color-primary-dark); }
.extract-msg.err { color: var(--color-text-light); }

/* 缩略图 */
.fc-thumb { margin-top: .7rem; cursor: pointer; border-radius: 8px; overflow: hidden; max-height: 180px; }
.fc-thumb img { width: 100%; height: 160px; object-fit: cover; display: block; }

/* 卡片内分区 */
.fc-section { margin-top: .7rem; padding-top: .6rem; border-top: 1px dashed var(--color-border); }
.fc-section-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .3rem; }
.fc-section-label { font-size: .78rem; font-weight: 600; color: var(--color-text-secondary); }
.fc-expand { border: none; background: transparent; cursor: pointer; font-size: .76rem; color: var(--color-primary); padding: 0; }
.fc-expand:hover { text-decoration: underline; }

/* 解析文本 */
.fc-text-body { position: relative; }
.fc-text-body.clamped { max-height: 100px; overflow: hidden; }
.fc-text-body.clamped::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0;
  height: 36px; background: linear-gradient(transparent, var(--color-card));
}
.fc-text {
  margin: .3rem 0 0; font-size: .8rem; color: var(--color-text); line-height: 1.6;
  white-space: pre-wrap; word-break: break-word; font-family: inherit;
}

.fc-ai-text, .fc-note-text { margin: .2rem 0 0; font-size: .82rem; color: var(--color-text); line-height: 1.5; }
.fc-ai-text { color: var(--color-primary-dark); }

/* 手动登记列表 */
.manual-block { }
.manual-row {
  display: flex; align-items: center; gap: .6rem; padding: .45rem .6rem;
  background: var(--color-bg); border-radius: 8px; margin-bottom: .3rem; flex-wrap: wrap;
}
.manual-name { font-size: .84rem; font-weight: 500; color: var(--color-text); }
.manual-type {
  font-size: .7rem; color: var(--color-text-light);
  background: var(--color-card); padding: .1rem .4rem; border-radius: 50px;
}
.manual-note { width: 100%; margin: .15rem 0 0; font-size: .76rem; color: var(--color-text-light); }

@media (max-width: 640px) {
  .file-card { padding: .7rem .8rem; }
}
</style>
