<template>
  <section class="block extract-block">
    <h2 class="block-title">💬 AI 助手</h2>
    <p class="block-desc">
      用自然语言告诉 AI 你想做什么：贴一段访谈让 AI 帮你理出人物/数据/要点，
      或者描述你对右侧资料的需求，AI 会理解意图并自动处理。
    </p>

    <div class="ex-input-row">
      <textarea
        v-model="text"
        class="ex-input"
        rows="4"
        placeholder="把访谈记录、调研笔记粘在这里让 AI 整理；或直接说「帮我把指标里的茶园面积改成150亩」…"
      />
    </div>
    <div class="ex-actions">
      <button class="btn primary" :disabled="!text.trim() || extracting" @click="onExtract">
        {{ extracting ? 'AI 处理中…' : '发送给 AI' }}
      </button>
      <span v-if="msg" class="ex-hint" :class="msgErr ? 'err' : ''">{{ msg }}</span>
      <span v-if="lastSource === 'template'" class="ex-hint tpl">离线兜底模式，可联网后重试</span>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { extractFromText } from './extract.js'

const props = defineProps({
  dossierId: { type: String, required: true },
})
const emit = defineEmits(['extracted'])

const text = ref('')
const extracting = ref(false)
const msg = ref('')
const msgErr = ref(false)
const lastSource = ref('')

async function onExtract() {
  if (extracting.value) return
  extracting.value = true; msg.value = ''; msgErr.value = false
  try {
    const r = await extractFromText(text.value)
    lastSource.value = r.source
    emit('extracted', r)
    const n = (r.people?.length || 0) + (r.metrics?.length || 0) + (r.materialHints?.length || 0)
    msg.value = n ? `已抽取 ${n} 条，请在右栏各资料格审校采纳` : '没抽到可采纳的信息，换段更具体的文字试试'
  } catch (e) {
    msgErr.value = true; msg.value = e.message || '提取失败'
  } finally {
    extracting.value = false
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
