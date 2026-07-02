<template>
  <section v-if="village" class="detail">
    <router-link to="/villages" class="back">← 返回列表</router-link>
    <h1>{{ village.name }}</h1>
    <p class="full">{{ village.fullName }}</p>
    <div class="tags"><span class="tag">{{ village.type }}</span><span class="tag">{{ village.status }}</span></div>
    <p class="summary">{{ village.summary }}</p>

    <div v-for="sec in sections" :key="sec.key" class="section">
      <h3>{{ sec.title }}</h3>
      <p v-if="!village.extra || !(village.extra[sec.key] || []).length" class="empty">待实地采集补充</p>
      <ul v-else><li v-for="(item, i) in village.extra[sec.key]" :key="i">{{ typeof item === 'string' ? item : item.title || JSON.stringify(item) }}</li></ul>
    </div>
  </section>
  <section v-else class="detail">
    <p>未找到该村庄。<router-link to="/villages">返回列表</router-link></p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import villages from '@/data/villages.json'

const route = useRoute()
const village = computed(() => villages.find((v) => v.id === route.params.id) || null)
const sections = [
  { key: 'history', title: '村史时间线' },
  { key: 'people', title: '人物故事' },
  { key: 'resources', title: '特色资源' },
  { key: 'media', title: '影像库' },
  { key: 'route', title: '导览路线' },
  { key: 'outcomes', title: '实践成果' },
]
</script>

<style scoped>
.detail { max-width: 820px; margin: 0 auto; padding: 2.4rem 1rem; }
.back { display: inline-block; margin-bottom: 1rem; color: var(--sx-earth); }
.detail h1 { font-size: clamp(32px, 5vw, 52px); color: var(--sx-green); }
.full { color: var(--sx-muted); }
.tags { margin: .6rem 0; }
.tag { font-size: .78rem; border: 1px solid var(--sx-line); border-radius: 999px; padding: .12rem .6rem; margin-right: .4rem; color: var(--sx-earth); }
.summary { font-size: 1.05rem; color: var(--sx-ink); }
.section { margin-top: 1.8rem; border-top: 1px solid var(--sx-line); padding-top: 1rem; }
.section h3 { font-family: var(--sx-serif); color: var(--sx-green); }
.empty { color: var(--sx-muted); font-style: italic; }
</style>
