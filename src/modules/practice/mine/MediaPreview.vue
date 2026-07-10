<template>
  <div v-if="item" class="mp-mask" @click.self="close">
    <div class="mp-box" role="dialog" aria-modal="true">
      <header class="mp-head">
        <span class="mp-ic">{{ kindIcon }}</span>
        <span class="mp-name" :title="item.name">{{ item.name || '材料预览' }}</span>
        <a v-if="item.url" class="mp-dl" :href="item.url" target="_blank" rel="noopener" download>下载 ↓</a>
        <button class="mp-x" aria-label="关闭" @click="close">×</button>
      </header>

      <div class="mp-body">
        <!-- 图片 -->
        <img v-if="viewMode === 'image'" :src="item.url" class="mp-img" :alt="item.name" />

        <!-- 视频 -->
        <video v-else-if="viewMode === 'video'" :src="item.url" class="mp-media" controls preload="metadata" />

        <!-- 音频 -->
        <audio v-else-if="viewMode === 'audio'" :src="item.url" controls preload="metadata" class="mp-audio" />

        <!-- 浏览器可内嵌渲染的文档：pdf / txt / md -->
        <iframe v-else-if="viewMode === 'iframe'" :src="item.url" class="mp-frame" title="文档预览" />

        <!-- 已解析文本（docx/xlsx/csv 等无法内嵌，展示抽出的纯文本） -->
        <pre v-else-if="viewMode === 'text'" class="mp-text">{{ item.text }}</pre>

        <!-- 兜底：无法预览，给下载 -->
        <div v-else class="mp-fallback">
          <p>这类文件无法在页面内预览。</p>
          <a v-if="item.url" class="mp-dl-big" :href="item.url" target="_blank" rel="noopener" download>下载查看 ↓</a>
          <p v-else class="mp-none">该材料未上传文件，仅登记了元数据。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 要预览的材料项：{ url, name, kind, ext, text? }。null 时不渲染。
  item: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const KIND_ICON = { image: '🖼', av: '🎬', doc: '📄', table: '📊', other: '📎' }
const kindIcon = computed(() => KIND_ICON[props.item?.kind] || '📎')

// 音视频要分音频/视频；扩展名兜底判定。
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'])
// 浏览器可内嵌渲染的文档扩展名。
const IFRAME_EXT = new Set(['pdf', 'txt', 'md'])

const viewMode = computed(() => {
  const it = props.item
  if (!it) return 'none'
  const ext = String(it.ext || extFromName(it.name)).toLowerCase()
  if (!it.url) return it.text ? 'text' : 'none'
  if (it.kind === 'image') return 'image'
  if (it.kind === 'av') return AUDIO_EXT.has(ext) ? 'audio' : 'video'
  if (IFRAME_EXT.has(ext)) return 'iframe'
  // docx/xlsx/csv 等：有解析文本就展示文本，否则下载兜底。
  if (it.text) return 'text'
  return 'fallback'
})

function extFromName(name) {
  const s = String(name || '')
  const dot = s.lastIndexOf('.')
  return dot >= 0 && dot < s.length - 1 ? s.slice(dot + 1) : ''
}

function close() {
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

// 打开时锁滚动 + 绑 Esc；关闭/卸载时还原。
watch(
  () => props.item,
  (v) => {
    if (typeof document === 'undefined') return
    if (v) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  },
)
onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.mp-mask {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(30, 30, 30, .62); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 4vh 4vw;
}
.mp-box {
  width: min(920px, 100%); max-height: 92vh; display: flex; flex-direction: column;
  background: var(--color-card); border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow-card);
}
.mp-head {
  display: flex; align-items: center; gap: .6rem;
  padding: .8rem 1rem; border-bottom: 1px solid var(--color-border);
}
.mp-ic { font-size: 1.1rem; }
.mp-name { flex: 1; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-dl { font-size: .82rem; color: var(--color-primary); text-decoration: none; white-space: nowrap; }
.mp-dl:hover { text-decoration: underline; }
.mp-x { border: none; background: transparent; cursor: pointer; font-size: 1.5rem; line-height: 1; color: var(--color-text-light); }
.mp-x:hover { color: var(--color-highlight); }

.mp-body { flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center; background: var(--color-bg); min-height: 240px; }
.mp-img { max-width: 100%; max-height: 84vh; object-fit: contain; display: block; }
.mp-media { max-width: 100%; max-height: 84vh; background: #000; }
.mp-audio { width: 90%; }
.mp-frame { width: 100%; height: 80vh; border: none; background: #fff; }
.mp-text {
  align-self: stretch; margin: 0; padding: 1.2rem 1.4rem; width: 100%; box-sizing: border-box;
  font-size: .9rem; line-height: 1.7; color: var(--color-text); white-space: pre-wrap; word-break: break-word;
  font-family: var(--sx-sans, inherit);
}
.mp-fallback { text-align: center; color: var(--color-text-secondary); padding: 2rem; }
.mp-dl-big {
  display: inline-block; margin-top: .8rem; padding: .6rem 1.4rem; border-radius: 50px;
  background: var(--color-primary); color: #fff; text-decoration: none; font-weight: 600;
}
.mp-none { font-size: .85rem; color: var(--color-text-light); }
</style>
