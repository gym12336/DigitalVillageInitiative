<template>
  <aside class="stats">
    <div class="stat-block">
      <div class="stat-num">{{ villages.length }}</div>
      <div class="stat-label">已收录村庄</div>
    </div>

    <div class="stat-section">
      <p class="sec-title">资源类型分布</p>
      <div v-for="t in typeStats" :key="t.type" class="type-row">
        <span class="type-name">{{ t.type }}</span>
        <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(t.count) }"></div></div>
        <span class="type-count">{{ t.count }}</span>
      </div>
    </div>

    <div class="stat-section">
      <p class="sec-title">资源丰富度 Top 3</p>
      <ol class="top-list">
        <li v-for="(v, i) in top" :key="v.id">
          <span class="top-rank">{{ i + 1 }}</span>
          <span class="top-name">{{ v.name }}</span>
          <span class="top-count">{{ v.count }} 项</span>
        </li>
      </ol>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { resourceTypeStats, topByResources } from '@/lib/villageResources.js'

const props = defineProps({ villages: { type: Array, default: () => [] } })
const typeStats = computed(() => resourceTypeStats(props.villages))
const top = computed(() => topByResources(props.villages, 3))
const maxType = computed(() => Math.max(1, ...typeStats.value.map((t) => t.count)))
function barWidth(count) { return `${Math.round((count / maxType.value) * 100)}%` }
</script>

<style scoped>
.stats { height: 100%; padding: 1.1rem; color: #dbeeff; display: flex; flex-direction: column; gap: 1.2rem; }
.stat-block { text-align: center; padding-bottom: .8rem; border-bottom: 1px solid rgba(63,143,214,.2); }
.stat-num { font-family: var(--sx-serif); font-size: 2.6rem; font-weight: 700; color: #7fd0ff; line-height: 1; }
.stat-label { font-size: .82rem; color: #6f9bc4; margin-top: .3rem; }
.sec-title { font-size: .82rem; color: #9fc8ec; margin: 0 0 .6rem; }
.type-row { display: flex; align-items: center; gap: .5rem; margin-bottom: .45rem; font-size: .78rem; }
.type-name { width: 4.5rem; color: #b8d4ee; flex-shrink: 0; }
.bar-track { flex: 1; height: 8px; background: rgba(63,143,214,.15); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #3f8fd6, #7fd0ff); border-radius: 4px; }
.type-count { width: 1.5rem; text-align: right; color: #9fc8ec; }
.top-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .5rem; }
.top-list li { display: flex; align-items: center; gap: .6rem; font-size: .85rem; }
.top-rank { display: grid; place-items: center; width: 1.4rem; height: 1.4rem; border-radius: 50%; background: rgba(63,143,214,.25); color: #7fd0ff; font-size: .75rem; }
.top-name { flex: 1; color: #dbeeff; }
.top-count { color: #9fc8ec; font-size: .78rem; }
</style>
