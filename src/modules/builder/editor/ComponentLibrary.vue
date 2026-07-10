<!-- src/modules/builder/editor/ComponentLibrary.vue -->
<template>
  <div class="cl-root">
    <div class="cl-header">
      <h3 class="cl-title">可视化组件库</h3>
      <input v-model="search" class="cl-search" placeholder="搜索组件..." />
    </div>

    <div class="cl-categories">
      <details v-for="cat in filteredCategories" :key="cat.id" class="cl-cat" :open="cat.id === 'overview'">
        <summary class="cl-cat-summary">
          <span class="cl-cat-icon">{{ cat.icon }}</span>
          <span class="cl-cat-name">{{ cat.name }}</span>
          <span class="cl-cat-count">{{ cat.items.length }}</span>
        </summary>
        <div class="cl-grid">
          <div
            v-for="item in cat.items"
            :key="item.type + item.label"
            class="cl-item"
            draggable="true"
            @dragstart="onDragStart($event, item)"
          >
            <span class="cl-item-icon">{{ item.icon }}</span>
            <span class="cl-item-label">{{ item.label }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const COMPONENT_CATEGORIES = [
  {
    id: 'change', icon: '📊', name: '讲「变化」— 帮扶对比',
    items: [
      { label: '哑铃图', icon: '🔗', type: 'chart', chartType: 'dumbbell' },
      { label: '涨跌徽标', icon: '📈', type: 'chart', chartType: 'trend-badge' },
    ],
  },
  {
    id: 'overview', icon: '📈', name: '讲「整体画像」— 概览',
    items: [
      { label: 'KPI 卡组', icon: '🃏', type: 'agri-sensor' },
      { label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'timeline', icon: '⏱️', name: '讲「过程」— 时间线',
    items: [
      { label: '时间轴', icon: '📋', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'composition', icon: '🍩', name: '讲「构成 / 分布」',
    items: [
      { label: '饼图', icon: '🥧', type: 'chart', chartType: 'pie' },
      { label: '堆叠柱', icon: '📊', type: 'chart', chartType: 'stacked-bar' },
    ],
  },
  {
    id: 'people', icon: '👥', name: '讲「人与故事」',
    items: [
      { label: '人物卡', icon: '👤', type: 'text' },
      { label: '金句块', icon: '💬', type: 'text' },
    ],
  },
  {
    id: 'geo', icon: '🗺️', name: '讲「空间」— 地理分布',
    items: [
      { label: '地图散点', icon: '📍', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'cover', icon: '🎬', name: '封面开场',
    items: [
      { label: '封面大图', icon: '🖼️', type: 'image' },
    ],
  },
  {
    id: 'emphasis', icon: '🔢', name: '单点强调',
    items: [
      { label: '大数字', icon: '🔢', type: 'text' },
    ],
  },
  {
    id: 'flow', icon: '🔀', name: '关系流向',
    items: [
      { label: '桑基图', icon: '〰️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'frequency', icon: '📅', name: '时间频率',
    items: [
      { label: '日历热力', icon: '🗓️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'compare', icon: '🔄', name: '交互对比',
    items: [
      { label: '前后对比', icon: '↔️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'honor', icon: '🏆', name: '荣誉佐证',
    items: [
      { label: '数据表', icon: '📋', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'media', icon: '🎬', name: '媒体嵌入',
    items: [
      { label: '视频嵌入', icon: '▶️', type: 'image' },
    ],
  },
]

const search = ref('')

const filteredCategories = computed(() => {
  if (!search.value.trim()) return COMPONENT_CATEGORIES
  const q = search.value.trim().toLowerCase()
  return COMPONENT_CATEGORIES
    .map(cat => ({
      ...cat,
      items: cat.items.filter(i => i.label.toLowerCase().includes(q)),
    }))
    .filter(cat => cat.items.length)
})

function onDragStart(e, item) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', JSON.stringify({ type: item.type, chartType: item.chartType }))
}
</script>

<style scoped>
.cl-root { display: flex; flex-direction: column; height: 100%; }
.cl-header { padding: 1.2rem 1rem 0.8rem; flex-shrink: 0; }
.cl-title {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}
.cl-search {
  width: 100%; padding: 0.5rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.cl-search:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}
.cl-search::placeholder { color: var(--color-text-light); }

.cl-categories { flex: 1; overflow-y: auto; padding: 0 0.6rem 0.6rem; }
.cl-cat { border-bottom: 1px solid var(--color-border-light); }
.cl-cat-summary {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 0.4rem;
  cursor: pointer;
  font-size: 0.82rem; font-weight: 600;
  color: var(--color-text-secondary);
  user-select: none;
  transition: color var(--transition-fast);
}
.cl-cat-summary:hover { color: #2c7da0; }
.cl-cat-summary::marker { color: var(--color-text-light); }
.cl-cat[open] > .cl-cat-summary { color: #2c7da0; }
.cl-cat[open] > .cl-cat-summary::marker { color: #2c7da0; }
.cl-cat-icon { font-size: 0.9rem; }
.cl-cat-name { flex: 1; }
.cl-cat-count {
  font-size: 0.68rem; padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgba(44,125,160,0.08);
  color: #2c7da0;
  font-weight: 600;
}

.cl-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.4rem; padding: 0 0.2rem 0.6rem;
}
.cl-item {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  padding: 0.7rem 0.3rem;
  border: 1px solid var(--color-border-light);
  border-radius: 18px;
  cursor: grab;
  transition: all var(--transition-fast);
  background: rgba(44,125,160,0.03);
}
.cl-item:hover {
  border-color: #2c7da0;
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.cl-item:active { cursor: grabbing; transform: scale(0.96); }
.cl-item-icon { font-size: 1.3rem; }
.cl-item-label {
  font-size: 0.72rem; color: var(--color-text-secondary); font-weight: 500;
}
</style>
