<template>
  <section class="honors-page museum-public-page">
    <MuseumPageHero
      archive-no="ARCHIVE INDEX · RANKING"
      kicker="乡村百科 / 荣誉榜单"
      title="在数据坐标中，观察乡村档案的公共关注"
      description="按浏览、收藏与实践记录整理档案热度。当前数值用于展示交互结构，不代表官方评选。"
      icon="chart"
      :metric="ranked.length"
      metric-label="个参与排序的村庄档案"
      demo
    />
    <div class="museum-content-shell honors-shell">

      <!-- 维度切换 -->
      <MuseumFilterBar title="RANKING DIMENSION / 排名维度">
      <div class="chips" role="tablist" aria-label="排名维度">
        <button
          v-for="d in dimensions"
          :key="d.value"
          class="museum-chip"
          :class="{ active: dimension === d.value }"
          @click="dimension = d.value"
        >{{ d.label }}</button>
      </div>
      </MuseumFilterBar>

      <!-- 榜单 -->
      <ol v-if="!loading && !error" class="rank-list">
        <li v-for="(v, i) in ranked" :key="v.id" class="rank-row">
          <span class="rank-no" :class="{ top: i < 3 }">{{ i + 1 }}</span>
          <div class="rank-main">
            <router-link class="rank-name" :to="`/villages/${v.id}`">{{ v.name }}</router-link>
            <span class="rank-loc">{{ v.province }} · {{ v.city }}</span>
            <div class="rank-honors">
              <span v-for="h in v.honors" :key="h" class="honor-badge">{{ h }}</span>
            </div>
          </div>
          <div class="rank-value">
            <div class="bar" :style="{ width: barWidth(v) }"></div>
            <span class="num">{{ metricValue(v) }}{{ activeDim.unit }}</span>
          </div>
        </li>
      </ol>
      <MuseumState v-else-if="error" type="error" title="榜单载入失败" :description="`${error}，请刷新重试。`" />
      <MuseumState v-else type="loading" title="正在整理榜单" description="正在读取乡村档案与统计信息。" />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchAllVillages } from '@/api/villages.js'
import MuseumPageHero from '@/components/MuseumPageHero.vue'
import MuseumFilterBar from '@/components/MuseumFilterBar.vue'
import MuseumState from '@/components/MuseumState.vue'

const villages = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    villages.value = await fetchAllVillages()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})

const dimensions = [
  { value: 'views', label: '最热浏览', unit: ' 次' },
  { value: 'favorites', label: '最多收藏', unit: ' 收藏' },
  { value: 'practices', label: '最多实践', unit: ' 份' },
]
const dimension = ref('views')
const activeDim = computed(() => dimensions.find((d) => d.value === dimension.value))

function metricValue(v) {
  return (v.stats && v.stats[dimension.value]) || 0
}
const ranked = computed(() =>
  [...villages.value].sort((a, b) => metricValue(b) - metricValue(a))
)
const maxValue = computed(() => Math.max(1, ...villages.value.map(metricValue)))
function barWidth(v) {
  return `${Math.round((metricValue(v) / maxValue.value) * 100)}%`
}
</script>

<style scoped>
.honors-page { padding: 0; }
.honors-shell { max-width: 1040px; }
.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; color: var(--color-primary-dark); font-family: var(--sx-serif); }
.desc { max-width: 640px; margin: .8rem 0 0; color: var(--color-text-secondary); }

.chips { display: flex; flex-wrap: wrap; gap: .6rem; }
.chip { padding: .45rem 1.1rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-text-secondary); font-size: .88rem; cursor: pointer; transition: all var(--transition); }
.chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

.rank-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .8rem; }
.rank-row {
  display: flex; align-items: center; gap: 1.1rem;
  padding: 1rem 1.3rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);
}
.rank-no {
  flex-shrink: 0; width: 2.2rem; text-align: center;
  font-family: var(--sx-serif); font-size: 1.5rem; font-weight: 700; color: var(--color-text-light);
}
.rank-no.top { color: var(--color-highlight); }
.rank-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .25rem; }
.rank-name { font-family: var(--sx-serif); font-weight: 700; font-size: 1.15rem; color: var(--color-primary-dark); }
.rank-name:hover { color: var(--color-primary); }
.rank-loc { font-size: .82rem; color: var(--color-text-light); }
.rank-honors { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .2rem; }
.honor-badge { padding: .12rem .6rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); font-size: .72rem; font-weight: 600; }
.rank-value { flex-shrink: 0; width: clamp(120px, 22vw, 200px); display: flex; align-items: center; gap: .6rem; }
.bar { height: 8px; border-radius: 50px; background: linear-gradient(90deg, var(--color-primary), var(--color-primary-soft)); min-width: 4px; transition: width var(--transition); }
.num { font-size: .8rem; color: var(--color-text-secondary); white-space: nowrap; }

@media (max-width: 640px) {
  .rank-value { width: 90px; }
  .rank-value .bar { display: none; }
}
</style>
