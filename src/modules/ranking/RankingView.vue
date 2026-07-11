<template>
  <section class="module-page">
    <header class="mod-hero">
      <p class="kicker">资源榜单</p>
      <h1>乡村特色资源</h1>
      <p class="lead">按村庄类型汇总各村的特色资源清单，为调研报告与平台展示提供索引。</p>
    </header>

    <div v-if="scopedVillage" class="scope-banner">
      只看 <b>{{ scopedVillage.name }}</b> 的资源
      <router-link class="scope-clear" to="/ranking">查看全部村庄 →</router-link>
    </div>

    <div v-if="!scopedVillage" class="filter">
      <button
        v-for="t in types"
        :key="t"
        class="chip"
        :class="{ active: activeType === t }"
        @click="activeType = t"
      >{{ t }}</button>
    </div>

    <div class="rank-list">
      <article v-for="(v, i) in filtered" :key="v.id" class="rank-row">
        <span class="rank-no">{{ i + 1 }}</span>
        <div class="rank-main">
          <router-link class="rank-name" :to="`/villages/${v.id}`">{{ v.name }}</router-link>
          <span class="rank-meta">{{ v.fullName }}</span>
        </div>
        <span class="rank-type">{{ v.type }}</span>
        <span class="rank-count">{{ (v.specialties || []).length }} 项特产</span>
      </article>
      <p v-if="!filtered.length" class="empty">该类型暂无村庄，待实地采集补充。</p>
    </div>

    <div v-if="scopedVillage" class="res-detail">
      <h3>{{ scopedVillage.name }} · 特色资源</h3>
      <ul v-if="(scopedVillage.specialties || []).length">
        <li v-for="(sp, i) in scopedVillage.specialties" :key="i">
          <b>{{ sp.name || sp }}</b><span v-if="sp.icon" class="r-type">{{ sp.icon }}</span>
          <p v-if="sp.description">{{ sp.description }}</p>
        </li>
      </ul>
      <p v-else class="empty">该村资源待实地采集补充。</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchAllVillages } from '@/api/villages.js'

const villages = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    villages.value = await fetchAllVillages()
  } catch (e) {
    console.error('加载村庄数据失败:', e)
  } finally {
    loading.value = false
  }
})

const route = useRoute()
const scopedVillage = computed(() =>
  route.query.village ? villages.value.find((v) => v.id === route.query.village) || null : null
)

const types = computed(() => ['全部', ...new Set(villages.value.map((v) => v.certLabel || (v.honors && v.honors[0]) || '其他'))])
const activeType = ref('全部')
const filtered = computed(() => {
  if (scopedVillage.value) return [scopedVillage.value]
  const label = activeType.value
  if (label === '全部') return villages.value
  return villages.value.filter((v) => (v.certLabel || (v.honors && v.honors[0]) || '其他') === label)
})
</script>

<style scoped>
.module-page { max-width: 960px; margin: 0 auto; padding: 2.4rem clamp(1rem, 4vw, 2rem); }
.mod-hero { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--sx-gold); margin: 0 0 .5rem; }
.mod-hero h1 { font-size: clamp(34px, 5vw, 54px); color: var(--sx-green); }
.lead { color: var(--sx-muted); max-width: 620px; }
.filter { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.4rem; }
.chip {
  padding: .3rem .9rem; font-size: .85rem; cursor: pointer;
  border: 1px solid var(--sx-line); border-radius: 999px;
  background: var(--sx-white); color: var(--sx-earth); transition: all .15s;
}
.chip.active { background: var(--sx-green); color: var(--sx-white); border-color: var(--sx-green); }
.rank-list { display: flex; flex-direction: column; gap: .6rem; }
.rank-row {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.2rem; background: var(--sx-white);
  border: 1px solid var(--sx-line); border-radius: 12px;
}
.rank-no { font-family: var(--sx-serif); font-size: 1.4rem; color: var(--sx-gold); width: 2rem; text-align: center; }
.rank-main { flex: 1; display: flex; flex-direction: column; }
.rank-name { font-family: var(--sx-serif); font-weight: 700; font-size: 1.1rem; color: var(--sx-green); }
.rank-meta { font-size: .8rem; color: var(--sx-muted); }
.rank-type { font-size: .78rem; color: var(--sx-earth); border: 1px solid var(--sx-line); border-radius: 999px; padding: .1rem .6rem; }
.rank-count { font-size: .82rem; color: var(--sx-muted); min-width: 5rem; text-align: right; }
.empty { color: var(--sx-muted); font-style: italic; }
.scope-banner {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .7rem 1rem; margin-bottom: 1.2rem;
  background: var(--sx-paper-deep); border: 1px solid var(--sx-line); border-radius: 10px;
  color: var(--sx-ink); font-size: .9rem;
}
.scope-clear { margin-left: auto; color: var(--sx-earth); font-size: .85rem; }
.res-detail { margin-top: 1.8rem; border-top: 1px solid var(--sx-line); padding-top: 1.2rem; }
.res-detail h3 { font-family: var(--sx-serif); color: var(--sx-green); margin-bottom: .8rem; }
.res-detail ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .8rem; }
.res-detail li { background: var(--sx-white); border: 1px solid var(--sx-line); border-radius: 12px; padding: .9rem 1.1rem; }
.res-detail b { color: var(--sx-green); font-family: var(--sx-serif); }
.r-type { margin-left: .6rem; font-size: .74rem; color: var(--sx-earth); border: 1px solid var(--sx-line); border-radius: 999px; padding: .05rem .5rem; }
.res-detail p { margin: .3rem 0 0; font-size: .88rem; color: var(--sx-muted); }
</style>
