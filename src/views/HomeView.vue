<template>
  <section class="home">
    <div class="hero">
      <p class="eyebrow">数字乡村 · 资源中枢</p>
      <h1>数乡计划</h1>
      <p class="lead">乡村数字资源库</p>
      <p class="copy">点击地图上的村庄，在右侧查看它的资源、人物与影像；也可从下方模块，横向浏览某一类资源在各村的样貌。</p>
    </div>

    <div class="dashboard">
      <MapDashboardStats class="panel-left" :villages="villages" />
      <div class="panel-map">
        <ChinaMap3D :villages="villages" :selected-id="selectedId" @select-village="onSelect" />
      </div>
      <VillageInfoCard class="panel-right" :village="selectedVillage" />
    </div>

    <div class="modules">
      <p class="section-kicker">功能模块入口</p>
      <div class="grid">
        <ModuleCard v-for="m in modules" :key="m.id" :module="m" />
        <div v-for="n in placeholderCount" :key="'ph' + n" class="mod-placeholder">＋ 待定模块</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import ChinaMap3D from '@/components/ChinaMap3D.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import MapDashboardStats from '@/components/MapDashboardStats.vue'
import VillageInfoCard from '@/components/VillageInfoCard.vue'
import { modules } from '@/modules.config.js'
import villages from '@/data/villages.json'

const placeholderCount = 3
const selectedId = ref('')
const selectedVillage = computed(() => villages.find((v) => v.id === selectedId.value) || null)
function onSelect(id) { selectedId.value = id }
</script>

<style scoped>
.home { max-width: 1180px; margin: 0 auto; padding: 2.4rem clamp(1rem, 4vw, 2rem) 1rem; }
.hero { text-align: center; margin-bottom: 1.8rem; }
.eyebrow { font-size: 13px; font-weight: 700; color: var(--sx-gold); margin: 0 0 .8rem; letter-spacing: .08em; }
.hero h1 { font-size: clamp(44px, 7vw, 82px); line-height: 1; color: var(--sx-green); }
.lead { font-family: var(--sx-serif); font-size: clamp(20px, 3vw, 32px); color: var(--sx-earth); margin: .6rem 0 0; }
.copy { max-width: 660px; margin: 1rem auto 0; color: var(--sx-muted); font-size: 1rem; }

/* 科技蓝大屏：左统计 + 中地图 + 右信息卡 */
.dashboard {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 300px;
  gap: 1px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(63, 143, 214, 0.25);
  border: 1px solid rgba(63, 143, 214, 0.35);
  box-shadow: 0 24px 60px rgba(6, 18, 35, 0.5);
}
.panel-left, .panel-right { background: linear-gradient(160deg, #0e2a4d, #0a1a2f 70%); }
.panel-map { background: #0a1a2f; }
.panel-map :deep(.map3d) { border: none; border-radius: 0; box-shadow: none; }

.modules { margin-top: 2.4rem; }
.section-kicker { font-size: 13px; font-weight: 700; color: var(--sx-earth); margin: 0 0 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.mod-placeholder {
  display: grid; place-items: center; min-height: 128px; padding: 1.2rem;
  border: 1.5px dashed var(--sx-line); border-radius: 14px;
  color: var(--sx-muted); opacity: .6; font-size: .95rem;
}

@media (max-width: 900px) {
  .dashboard { grid-template-columns: 1fr; }
}
</style>
