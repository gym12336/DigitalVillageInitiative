<!-- src/modules/builder/editor/PracticeImagePicker.vue -->
<template>
  <div class="pip-root" ref="rootRef">
    <button class="pip-trigger" type="button" @click="toggle">
      📁 从实践选取
    </button>

    <div v-if="open" class="pip-dropdown">
      <div class="pip-header">
        <span class="pip-header-title">📁 从实践选取</span>
        <button class="pip-close" type="button" @click="open = false">✕</button>
      </div>

      <div v-if="loading" class="pip-status">
        <span class="pip-spinner"></span> 加载中...
      </div>

      <div v-else-if="error" class="pip-status pip-status--error">
        加载失败，请重试
      </div>

      <div v-else-if="images.length === 0" class="pip-status">
        <div class="pip-empty-icon">🖼</div>
        <div>当前档案暂无图片</div>
      </div>

      <div v-else class="pip-grid">
        <div
          v-for="img in images"
          :key="img.url"
          class="pip-thumb"
          :class="{ 'pip-thumb--selected': modelValue === img.url }"
          @click="select(img)"
        >
          <img :src="img.url" :alt="img.name" class="pip-thumb-img" />
          <span class="pip-thumb-name">{{ img.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { apiGetDossier } from '../../practice/mine/api.js'

const props = defineProps({
  dossierId: { type: String, required: true },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const rootRef = ref(null)
const open = ref(false)
const loading = ref(false)
const error = ref(false)
const images = ref([])

async function fetchImages() {
  if (!props.dossierId) return
  loading.value = true
  error.value = false
  images.value = []
  try {
    const dossier = await apiGetDossier(props.dossierId)
    const materials = dossier?.payload?.collected?.materials || []
    images.value = materials.filter(m => m.kind === 'image')
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) fetchImages()
}

function select(img) {
  emit('update:modelValue', img.url)
  emit('select', img)
  open.value = false
}

// Click outside to close
function onDocClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}

watch(open, (val) => {
  if (val) {
    document.addEventListener('click', onDocClick, true)
  } else {
    document.removeEventListener('click', onDocClick, true)
  }
})
</script>

<style scoped>
.pip-root {
  position: relative;
}

.pip-trigger {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  background: rgba(44,125,160,0.03);
  color: #2c7da0;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pip-trigger:hover {
  border-color: #2c7da0;
  background: rgba(44,125,160,0.08);
}

/* --- dropdown panel --- */
.pip-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.12);
  z-index: 100;
  padding: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.pip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--color-border-light);
}
.pip-header-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}
.pip-close {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-light);
  padding: 0.15rem 0.3rem;
  border-radius: 6px;
  line-height: 1;
  transition: all var(--transition-fast);
}
.pip-close:hover {
  color: #c0392b;
  background: rgba(192,57,43,0.06);
}

/* --- status --- */
.pip-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-light);
  gap: 0.4rem;
}
.pip-status--error {
  color: #c0392b;
}
.pip-empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}
.pip-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: #2c7da0;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- grid --- */
.pip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.pip-thumb {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(44,125,160,0.02);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pip-thumb:hover {
  border-color: rgba(44,125,160,0.3);
}
.pip-thumb--selected {
  border-color: #2c7da0;
  background: #e8f4fd;
}

.pip-thumb-img {
  width: 100%;
  height: 75px;
  object-fit: cover;
  display: block;
}

.pip-thumb-name {
  display: block;
  padding: 0.3rem 0.35rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
</style>
