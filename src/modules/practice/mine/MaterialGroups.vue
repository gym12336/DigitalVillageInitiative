<template>
  <div class="mg">
    <div v-if="!materials.length" class="mg-empty">
      还没有材料。用左侧「AI 采集工作区」上传文档/图片，或在下方手动登记。
    </div>

    <template v-else>
      <!-- 图片：缩略图网格 -->
      <section v-if="groups.image.length" class="mg-group">
        <h4 class="mg-title">🖼 图片（{{ groups.image.length }}）</h4>
        <div class="img-grid">
          <figure v-for="m in groups.image" :key="m._i" class="img-cell" @click="$emit('preview', m)">
            <img :src="m.url" :alt="m.name" />
            <figcaption>{{ m.name }}</figcaption>
          </figure>
        </div>
      </section>

      <!-- 其余类型：带图标列表 -->
      <section v-for="g in listGroups" v-show="groups[g.kind].length" :key="g.kind" class="mg-group">
        <h4 class="mg-title">{{ g.icon }} {{ g.label }}（{{ groups[g.kind].length }}）</h4>
        <ul class="file-list">
          <li v-for="m in groups[g.kind]" :key="m._i" class="file-row">
            <span class="file-ic">{{ g.icon }}</span>
            <div class="file-main">
              <p class="file-name">{{ m.name || '(未命名)' }}</p>
              <p v-if="m.note || m.summary" class="file-note">{{ m.summary || m.note }}</p>
            </div>
            <span v-if="m.theme" class="file-theme">{{ m.theme }}</span>
            <button v-if="m.url || m.text" class="file-link" @click="$emit('preview', m)">查看 ↗</button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  materials: { type: Array, required: true },
})
defineEmits(['preview'])

// 无 kind 的手动登记材料按 type 猜一个归类，保证都能落进某组。
const TYPE_TO_KIND = {
  照片: 'image', 视频: 'av', 音频: 'av', 文档: 'doc', 表格: 'table',
  访谈记录: 'doc', 调研笔记: 'doc', 其他: 'other',
}
function kindOf(m) {
  if (m.kind) return m.kind
  return TYPE_TO_KIND[m.type] || 'other'
}

// 分组：给每项挂原始下标 _i，供 key 稳定。
const groups = computed(() => {
  const g = { image: [], av: [], doc: [], table: [], other: [] }
  props.materials.forEach((m, i) => {
    const k = kindOf(m)
    ;(g[k] || g.other).push({ ...m, _i: i })
  })
  return g
})

const listGroups = [
  { kind: 'av', icon: '🎬', label: '音视频' },
  { kind: 'doc', icon: '📄', label: '文档' },
  { kind: 'table', icon: '📊', label: '表格' },
  { kind: 'other', icon: '📎', label: '其他' },
]
</script>

<style scoped>
.mg { display: flex; flex-direction: column; gap: 1.2rem; }
.mg-empty { padding: 2rem 1rem; text-align: center; font-size: .86rem; color: var(--color-text-light); background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: 12px; }
.mg-group { }
.mg-title { margin: 0 0 .6rem; font-size: .9rem; color: var(--color-primary-dark); }

/* 图片网格 */
.img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: .6rem; }
.img-cell { margin: 0; cursor: pointer; border-radius: 10px; overflow: hidden; background: var(--color-bg); transition: transform var(--transition); }
.img-cell:hover { transform: translateY(-2px); }
.img-cell img { width: 100%; height: 90px; object-fit: cover; display: block; }
.img-cell figcaption { padding: .3rem .4rem; font-size: .72rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 文件列表 */
.file-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
.file-row { display: flex; align-items: center; gap: .7rem; padding: .55rem .7rem; background: var(--color-bg); border-radius: 10px; }
.file-ic { font-size: 1.1rem; flex-shrink: 0; }
.file-main { flex: 1; min-width: 0; }
.file-name { margin: 0; font-size: .86rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-note { margin: .15rem 0 0; font-size: .76rem; color: var(--color-text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-theme { flex-shrink: 0; font-size: .7rem; color: var(--color-primary-dark); background: var(--color-accent); padding: .1rem .5rem; border-radius: 50px; }
.file-link { flex-shrink: 0; font-size: .8rem; color: var(--color-primary); border: none; background: transparent; cursor: pointer; padding: 0; white-space: nowrap; }
.file-link:hover { text-decoration: underline; }
</style>
