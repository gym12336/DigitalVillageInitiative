<template>
  <section class="block extract-block">
    <h2 class="block-title">💬 AI 助手</h2>

    <div class="mode-switch">
      <button class="ms-btn" :class="{ active: mode === 'extract' }" @click="mode = 'extract'">🔍 整理成资料</button>
      <button class="ms-btn" :class="{ active: mode === 'edit' }" @click="mode = 'edit'">✏️ 修改资料</button>
    </div>

    <p class="block-desc">
      <template v-if="mode === 'extract'">贴一段访谈/调研笔记，AI 帮你理出人物、数据、足迹、发现，进右栏各格待审校。</template>
      <template v-else>用一句话告诉 AI 怎么改右栏已有资料，AI 会给出修改建议，你确认后才生效。</template>
    </p>

    <div class="ex-input-row">
      <textarea
        v-model="text"
        class="ex-input"
        rows="4"
        :placeholder="mode === 'extract'
          ? '把访谈记录、调研笔记粘在这里让 AI 整理…'
          : '例如「把王秀兰归类为返乡青年」「把村干部和村民合并成一类」「润色一下陈伯的引语」「删掉游客量这个指标」…'"
      />
    </div>
    <div class="ex-actions">
      <button class="btn primary" :disabled="!text.trim() || busy" @click="onSend">
        {{ busy ? 'AI 处理中…' : (mode === 'extract' ? '发送给 AI' : '让 AI 提出修改') }}
      </button>
      <span v-if="msg" class="ex-hint" :class="msgErr ? 'err' : ''">{{ msg }}</span>
      <span v-if="lastSource === 'template'" class="ex-hint tpl">离线兜底模式，可联网后重试</span>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { extractFromText, editCollected } from './extract.js'

const props = defineProps({
  dossierId: { type: String, required: true },
  // 四桶快照,供「修改资料」模式发给 AI。形状 { people, metrics, places, materials }。
  snapshot: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['extracted', 'edit-ops'])

const mode = ref('extract') // 'extract' | 'edit'
const text = ref('')
const busy = ref(false)
const msg = ref('')
const msgErr = ref(false)
const lastSource = ref('')

function onSend() {
  return mode.value === 'edit' ? onEdit() : onExtract()
}

async function onExtract() {
  if (busy.value) return
  busy.value = true; msg.value = ''; msgErr.value = false
  try {
    const r = await extractFromText(text.value)
    lastSource.value = r.source
    emit('extracted', r)
    const n = (r.people?.length || 0) + (r.metrics?.length || 0) + (r.materialHints?.length || 0)
    msg.value = n ? `已抽取 ${n} 条，请在右栏各资料格审校采纳` : '没抽到可采纳的信息，换段更具体的文字试试'
  } catch (e) {
    msgErr.value = true; msg.value = e.message || '提取失败'
  } finally {
    busy.value = false
  }
}

async function onEdit() {
  if (busy.value) return
  busy.value = true; msg.value = ''; msgErr.value = false
  try {
    const r = await editCollected(text.value, props.snapshot)
    lastSource.value = r.source
    if (r.ops.length) {
      emit('edit-ops', r.ops)
      msg.value = `AI 提出 ${r.ops.length} 条修改，请在右栏确认`
    } else {
      msgErr.value = true
      msg.value = r.source === 'error' ? 'AI 暂时无法处理，请稍后重试' : '没理解这条修改指令，换句话说试试'
    }
  } catch (e) {
    msgErr.value = true; msg.value = e.message || '处理失败'
  } finally {
    busy.value = false
  }
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
.ex-hint { font-size: .82rem; color: var(--color-text-light); }
.ex-hint.err { color: var(--color-highlight); }
.ex-hint.tpl { color: #a15b28; background: #fff3e0; padding: .2rem .6rem; border-radius: 50px; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .6rem 1.3rem; background: var(--color-primary); color: #fff; font-size: .88rem; }
.btn.primary:disabled { background: #cfcfcf; cursor: not-allowed; }
</style>
