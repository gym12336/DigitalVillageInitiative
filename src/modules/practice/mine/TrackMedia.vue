<template>
  <section class="block">
    <h2 class="block-title">材料清单</h2>
    <p class="block-desc">上传实践材料（照片/音视频存储，文本档可交给 AI 解析）。也可只登记元数据。</p>

    <div class="upload-row">
      <label class="btn tiny upload-btn">
        📎 上传文件
        <input type="file" class="file-input" :disabled="uploading" @change="onPick" />
      </label>
      <span v-if="uploading" class="up-hint">上传中…</span>
      <span v-else-if="uploadMsg" class="up-hint" :class="uploadErr ? 'err' : 'ok'">{{ uploadMsg }}</span>
      <span class="up-limit">音视频≤200MB · 图片≤20MB · 文本档≤10MB</span>
    </div>

    <div class="mat-list">
      <div v-for="(m, i) in materials" :key="i" class="mat-row" :class="{ 'has-file': m.url }">
        <img v-if="m.url && m.kind === 'image'" :src="m.url" class="mat-thumb" :alt="m.name" />
        <span v-else class="mat-ic">{{ kindIcon(m.kind) }}</span>
        <select v-model="m.type" class="cell type">
          <option v-for="t in materialTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <input v-model="m.name" class="cell name" placeholder="材料名称" />
        <input v-model="m.note" class="cell" placeholder="备注（可选）" />
        <a v-if="m.url" class="mat-link" :href="m.url" target="_blank" rel="noopener">查看 ↗</a>
        <button class="chip-x" aria-label="删除" @click="remove(i)">×</button>
      </div>
      <button class="btn tiny ghost" @click="addManual">+ 手动登记材料</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { uploadMedia } from './mediaApi.js'

const props = defineProps({
  materials: { type: Array, required: true }, // 直接改传入数组（父组件 state 的引用）
  dossierId: { type: String, required: true },
})
const emit = defineEmits(['change'])

const materialTypes = ['照片', '视频', '音频', '访谈记录', '调研笔记', '文档', '表格', '其他']
const uploading = ref(false)
const uploadMsg = ref('')
const uploadErr = ref(false)

const KIND_TO_TYPE = { image: '照片', av: '视频', doc: '文档', table: '表格', other: '其他' }
const KIND_ICON = { image: '🖼', av: '🎬', doc: '📄', table: '📊', other: '📎' }
function kindIcon(kind) { return KIND_ICON[kind] || '📎' }

async function onPick(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = '' // 允许重复选同一文件
  if (!file) return
  uploading.value = true
  uploadMsg.value = ''
  uploadErr.value = false
  try {
    const media = await uploadMedia(props.dossierId, file)
    props.materials.push({
      type: KIND_TO_TYPE[media.kind] || '其他',
      name: media.name,
      note: '',
      url: media.url,
      kind: media.kind,
    })
    uploadMsg.value = '上传成功 ✓'
    emit('change')
  } catch (err) {
    uploadErr.value = true
    uploadMsg.value = err.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

function addManual() {
  props.materials.push({ type: '照片', name: '', note: '' })
  emit('change')
}
function remove(i) {
  props.materials.splice(i, 1)
  emit('change')
}
</script>

<style scoped>
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0 0 .9rem; font-size: .88rem; color: var(--color-text-secondary); }

.upload-row { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; margin-bottom: 1rem; }
.upload-btn { position: relative; overflow: hidden; cursor: pointer; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.up-hint { font-size: .82rem; }
.up-hint.ok { color: var(--color-primary); }
.up-hint.err { color: var(--color-highlight); }
.up-limit { font-size: .76rem; color: var(--color-text-light); margin-left: auto; }

.mat-list { display: flex; flex-direction: column; gap: .5rem; }
.mat-row { display: grid; grid-template-columns: 32px 100px 1.4fr 1.4fr auto auto; gap: .5rem; align-items: center; }
.mat-thumb { width: 32px; height: 32px; object-fit: cover; border-radius: 6px; }
.mat-ic { font-size: 1.1rem; text-align: center; }
.mat-link { font-size: .8rem; color: var(--color-primary); text-decoration: none; white-space: nowrap; }
.mat-link:hover { text-decoration: underline; }

.cell {
  padding: .5rem .7rem; font-size: .88rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 9px; outline: none; min-width: 0;
}
.cell:focus { border-color: var(--color-primary); }

.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; color: var(--color-text-light); }
.chip-x:hover { color: var(--color-highlight); }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.tiny { padding: .4rem 1rem; font-size: .82rem; background: var(--color-accent); color: var(--color-primary-dark); }
.btn.tiny.ghost { align-self: flex-start; background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }

@media (max-width: 640px) {
  .mat-row { grid-template-columns: 24px 1fr 1fr auto; }
  .mat-row .type { display: none; }
}
</style>
