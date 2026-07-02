<template>
  <section class="home">
    <div class="hero">
      <h1>数乡计划 · 乡村数字资源库</h1>
      <p class="sub">点击地图逐级下钻，探索各地村庄</p>
    </div>
    <ChinaMap3D :villages="villages" @select-village="goVillage" />
    <div class="modules">
      <p class="label">功能模块</p>
      <div class="grid">
        <ModuleCard v-for="m in enabledModules" :key="m.id" :module="m" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ChinaMap3D from '@/components/ChinaMap3D.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import { modules } from '@/modules.config.js'
import villages from '@/data/villages.json'

const router = useRouter()
const enabledModules = computed(() => modules.filter((m) => m.enabled))
function goVillage(id) { router.push(`/villages/${id}`) }
</script>

<style scoped>
.home { max-width: 1100px; margin: 0 auto; padding: 1rem; }
.hero { text-align: center; padding: 1.2rem 0 .4rem; }
.hero h1 { color: var(--sx-gold); margin: 0; }
.hero .sub { color: var(--sx-text-dim); }
.modules { margin-top: 1.4rem; }
.modules .label { color: var(--sx-text-dim); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .8rem; }
</style>
