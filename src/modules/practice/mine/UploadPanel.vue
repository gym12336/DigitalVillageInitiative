<template>
  <section class="block up-panel">
    <h2 class="block-title">上传实践材料</h2>
    <p class="block-desc">按类型点击对应行上传。文档/表格会自动解析并交 AI 抽取，图片/音视频存档归类。</p>

    <div class="type-list">
      <label
        v-for="t in types"
        :key="t.key"
        class="type-row"
        :class="{ busy: busy === t.key }"
      >
        <span class="type-ic">{{ t.icon }}</span>
        <span class="type-main">
          <span class="type-name">{{ t.name }}</span>
          <span class="type-formats">{{ t.formats }}</span>
        </span>
        <span class="type-limit">{{ t.limit }}</span>
        <span class="type-action">{{ busy === t.key ? '上传中…' : '选择文件 ↗' }}</span>
        <input
          type="file"
          class="file-input"
          :accept="t.accept"
          :disabled="busy !== ''"
          @change="onPick(t, $event)"
        />
      </label>
    </div>

    <p v-if="msg" class="up-msg" :class="{ err: msgErr }">{{ msg }}</p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { uploadMedia, extractAndStoreDoc, importZip } from './mediaApi.js'

const props = defineProps({
  dossierId: { type: String, required: true },
})
// imported: { materials: [...], drafts: {people,metrics,materialHints}|null }
const emit = defineEmits(['imported'])

const KIND_TO_TYPE = { image: '照片', av: '视频', doc: '文档', table: '表格', other: '其他' }

const types = [
  { key: 'zip', icon: '📦', name: '压缩包整包导入', formats: '.zip', limit: '≤100MB', accept: '.zip', mode: 'zip' },
  { key: 'doc', icon: '📄', name: '文档', formats: 'pdf / word / txt / md', limit: '≤10MB', accept: '.pdf,.doc,.docx,.txt,.md', mode: 'parse' },
  { key: 'table', icon: '📊', name: '表格', formats: 'xlsx / xls / csv', limit: '≤10MB', accept: '.xlsx,.xls,.csv', mode: 'parse' },
  { key: 'image', icon: '🖼', name: '图片', formats: 'jpg / png / webp / gif', limit: '≤20MB', accept: 'image/*', mode: 'store' },
  { key: 'av', icon: '🎬', name: '音视频', formats: 'mp4 / mov / mp3 / wav', limit: '≤200MB', accept: 'audio/*,video/*', mode: 'store' },
]

const busy = ref('')
const msg = ref('')
const msgErr = ref(false)

async function onPick(t, e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file || busy.value) return
  busy.value = t.key
  msg.value = ''
  msgErr.value = false
  try {
    if (t.mode === 'zip') {
      const r = await importZip(props.dossierId, file)
      emit('imported', { materials: r.materials || [], drafts: r.drafts || null })
      const skip = (r.skipped || []).length
      msg.value = `导入 ${r.imported} 个文件${skip ? `（跳过 ${skip} 个）` : ''}`
    } else if (t.mode === 'parse') {
      const { media, text } = await extractAndStoreDoc(props.dossierId, file)
      const item = { type: KIND_TO_TYPE[media.kind] || '文档', name: media.name, note: '', url: media.url, kind: media.kind, ext: media.ext, text: text || '' }
      emit('imported', { materials: [item], drafts: null, parseText: text || '', sourceFile: media.name })
      msg.value = `「${media.name}」已上传并解析`
    } else {
      const media = await uploadMedia(props.dossierId, file)
      const item = { type: KIND_TO_TYPE[media.kind] || '其他', name: media.name, note: '', url: media.url, kind: media.kind, ext: media.ext }
      emit('imported', { materials: [item], drafts: null })
      msg.value = `「${media.name}」已上传`
    }
  } catch (err) {
    msgErr.value = true
    msg.value = err.status === 413 ? (err.message || '文件过大') : (err.status === 422 ? '该文件无法解析，请确认格式' : (err.message || '上传失败'))
  } finally {
    busy.value = ''
  }
}
</script>

<style scoped>
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0 0 .9rem; font-size: .88rem; color: var(--color-text-secondary); }
.up-panel {
  padding: 1.3rem 1.4rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}

.type-list { display: flex; flex-direction: column; gap: .5rem; }
.type-row {
  position: relative; overflow: hidden; cursor: pointer;
  display: flex; align-items: center; gap: .8rem;
  padding: .7rem .9rem; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: 12px;
  transition: all var(--transition);
}
.type-row:hover { border-color: var(--color-primary); transform: translateY(-1px); }
.type-row.busy { opacity: .6; pointer-events: none; }
.type-ic { font-size: 1.4rem; flex-shrink: 0; }
.type-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .1rem; }
.type-name { font-size: .92rem; font-weight: 600; color: var(--color-text); }
.type-formats { font-size: .76rem; color: var(--color-text-light); }
.type-limit { font-size: .76rem; color: var(--color-text-light); white-space: nowrap; }
.type-action { font-size: .82rem; font-weight: 600; color: var(--color-primary); white-space: nowrap; }
/* 透明文件输入铺满整行，但因 .type-row 有 position:relative，被约束在行内，不逃逸。 */
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

.up-msg { margin: .9rem 0 0; font-size: .84rem; color: var(--color-primary); }
.up-msg.err { color: var(--color-highlight); }
</style>
