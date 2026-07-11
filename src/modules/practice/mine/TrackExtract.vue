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
      <button class="btn primary" :disabled="!text.trim() || extracting" @click="onExtract">
        {{ extracting ? 'AI 提取中…' : 'AI 提取' }}
      </button>
      <button class="btn tiny ghost" :disabled="summarizing" @click="onSummarize">
        {{ summarizing ? '综述生成中…' : '📝 生成成果综述' }}
      </button>
      <span v-if="msg" class="ex-hint" :class="msgErr ? 'err' : ''">{{ msg }}</span>
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

  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { extractFromText, summarizeCollected } from './extract.js'

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
const emit = defineEmits(['change', 'extracted'])

const text = ref('')
const extracting = ref(false)
const msg = ref('')
const msgErr = ref(false)
const lastSource = ref('')

// 成果综述待审校区。
const summarizing = ref(false)
const summaryMsg = ref('')
const summaryDraft = reactive({ summary: '', highlights: [], has: false })

async function onExtract() {
  if (extracting.value) return
  extracting.value = true
  msg.value = ''
  msgErr.value = false
  try {
    const r = await extractFromText(text.value)
    lastSource.value = r.source
    // 待审校由父组件 StageTrack 统一收进右栏对应 Tab。
    emit('extracted', r)
    const n = (r.people?.length || 0) + (r.metrics?.length || 0) + (r.materialHints?.length || 0)
    msg.value = n ? `已抽取 ${n} 条，请在右栏各 Tab 审校采纳` : '没抽到可采纳的信息，换段更具体的文字试试'
  } catch (e) {
    msgErr.value = true
    msg.value = e.message || '提取失败'
  } finally {
    extracting.value = false
  }
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
