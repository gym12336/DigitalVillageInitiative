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
        <div class="mat-actions">
          <button
            v-if="m.url && m.kind === 'image'"
            class="mat-link"
            :disabled="describing === i"
            @click="onDescribe(i)"
          >{{ describing === i ? 'AI 识图中…' : '🤖 AI 描述此图' }}</button>
          <button v-if="m.url || m.text" class="mat-link" @click="preview = m">查看 ↗</button>
          <label v-else class="btn tiny row-file" :class="{ disabled: rowUploading === i }">
            {{ rowUploading === i ? '上传中…' : '📎 选文件' }}
            <input type="file" class="file-input" :disabled="rowUploading === i" @change="onRowFile(i, $event)" />
          </label>
        </div>
        <button class="chip-x" aria-label="删除" @click="remove(i)">×</button>
      </div>
      <button class="btn tiny ghost" @click="addManual">+ 手动登记材料</button>
    </div>

    <MediaPreview :item="preview" @close="preview = null" />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { uploadMedia, extractAndStoreDoc, describeImage } from './mediaApi.js'
import MediaPreview from './MediaPreview.vue'

// 可解析文本档扩展名：这些走 extract-and-store，顺带拿到解析全文供站内预览。
const PARSABLE_EXT = new Set(['txt', 'md', 'docx', 'pdf', 'csv', 'xlsx', 'xls'])
function extOf(name) {
  const s = String(name || '')
  const dot = s.lastIndexOf('.')
  return dot >= 0 && dot < s.length - 1 ? s.slice(dot + 1).toLowerCase() : ''
}

const props = defineProps({
  materials: { type: Array, required: true }, // 直接改传入数组（父组件 state 的引用）
  dossierId: { type: String, required: true },
})
const emit = defineEmits(['change'])

const materialTypes = ['照片', '视频', '音频', '访谈记录', '调研笔记', '文档', '表格', '其他']
const preview = ref(null)
const describing = ref(-1) // 正在 AI 识图的行下标，-1 表示无
const uploading = ref(false)
const uploadMsg = ref('')
const uploadErr = ref(false)
const rowUploading = ref(-1) // 正在上传的行下标，-1 表示无

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
    // 文本档走 extract-and-store：存盘同时拿解析全文，站内预览能读内容而非只下载。
    if (PARSABLE_EXT.has(extOf(file.name))) {
      const { media, text } = await extractAndStoreDoc(props.dossierId, file)
      props.materials.push({
        type: KIND_TO_TYPE[media.kind] || '文档',
        name: media.name,
        note: '',
        url: media.url,
        kind: media.kind,
        ext: media.ext,
        text: text || '',
      })
    } else {
      const media = await uploadMedia(props.dossierId, file)
      props.materials.push({
        type: KIND_TO_TYPE[media.kind] || '其他',
        name: media.name,
        note: '',
        url: media.url,
        kind: media.kind,
        ext: media.ext,
      })
    }
    uploadMsg.value = '上传成功 ✓'
    emit('change')
  } catch (err) {
    uploadErr.value = true
    uploadMsg.value = err.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

// 行内选文件：给某条手动登记的材料补传真实文件，绑定到该行（保留已填的名称/备注）。
async function onRowFile(i, e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  const row = props.materials[i]
  if (!row) return
  rowUploading.value = i
  uploadMsg.value = ''
  uploadErr.value = false
  try {
    if (PARSABLE_EXT.has(extOf(file.name))) {
      const { media, text } = await extractAndStoreDoc(props.dossierId, file)
      row.name = row.name || media.name
      row.type = row.type || KIND_TO_TYPE[media.kind] || '文档'
      row.url = media.url
      row.kind = media.kind
      row.ext = media.ext
      row.text = text || ''
    } else {
      const media = await uploadMedia(props.dossierId, file)
      row.name = row.name || media.name
      row.type = row.type || KIND_TO_TYPE[media.kind] || '其他'
      row.url = media.url
      row.kind = media.kind
      row.ext = media.ext
    }
    uploadMsg.value = '上传成功 ✓'
    emit('change')
  } catch (err) {
    uploadErr.value = true
    uploadMsg.value = err.message || '上传失败'
  } finally {
    rowUploading.value = -1
  }
}

// AI 描述图片：把图注写进该行备注（空时填入，否则追加）。诚实降级：不支持时提示。
async function onDescribe(i) {
  const row = props.materials[i]
  if (!row || !row.url || describing.value !== -1) return
  // 从 url 取回文件不便，改为直接用 fetch 拉图再转 File 上传。
  describing.value = i
  uploadMsg.value = ''
  uploadErr.value = false
  try {
    const resp = await fetch(row.url)
    if (!resp.ok) throw new Error('无法读取图片')
    const blob = await resp.blob()
    const file = new File([blob], row.name || 'image', { type: blob.type })
    const r = await describeImage(props.dossierId, file)
    if (r.available && r.description) {
      row.note = row.note ? `${row.note}｜${r.description}` : r.description
      uploadMsg.value = 'AI 已生成图注 ✓'
      emit('change')
    } else {
      uploadErr.value = true
      uploadMsg.value = r.reason || '暂无法识别该图'
    }
  } catch (err) {
    uploadErr.value = true
    uploadMsg.value = err.message || 'AI 识图失败'
  } finally {
    describing.value = -1
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
.mat-actions { display: flex; align-items: center; gap: .7rem; white-space: nowrap; }
.mat-link { font-size: .8rem; color: var(--color-primary); text-decoration: none; white-space: nowrap; border: none; background: transparent; cursor: pointer; padding: 0; }
.mat-link:hover { text-decoration: underline; }
.mat-link:disabled { color: var(--color-text-light); cursor: default; text-decoration: none; }

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
