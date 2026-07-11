<template>
  <section class="module-page">
    <header class="mod-hero">
      <p class="kicker">人物故事</p>
      <h1>乡村人物纪实</h1>
      <p class="lead">记录驻村干部、返乡青年、手艺人等乡村建设核心人物的故事。</p>
    </header>

    <div v-if="scopedVillage" class="scope-banner">
      只看 <b>{{ scopedVillage.name }}</b> 的人物
      <router-link class="scope-clear" to="/people">查看全部村庄 →</router-link>
    </div>

    <div v-if="!scopedVillage" class="columns">
      <span v-for="c in columns" :key="c" class="col-tag">{{ c }}</span>
    </div>

    <div v-if="people.length" class="people-grid">
      <article v-for="(p, i) in people" :key="i" class="person-card">
        <div class="avatar">{{ p.name ? p.name.slice(0, 1) : '人' }}</div>
        <div class="person-body">
          <div class="person-name">{{ p.name || '待采集' }}</div>
          <div class="person-role">{{ p.role || '乡村人物' }}</div>
          <router-link class="person-village" :to="`/villages/${p.villageId}`">{{ p.villageName }}</router-link>
        </div>
      </article>
    </div>
    <p v-else class="empty">人物故事待各村实地采集后补充（每村至少 1 位核心人物完整记录）。</p>
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

// 方案栏目：驻村的声音 / 乡村青年志 / 干部的一天
const columns = ['驻村的声音', '乡村青年志', '干部的一天', '手艺人']

// 从各村 manager 聚合人物（scoped 时只取该村）
const people = computed(() => {
  const source = scopedVillage.value ? [scopedVillage.value] : villages.value
  return source.flatMap((v) => {
    const mgr = v.manager
    if (!mgr || !mgr.name) return []
    return [{ name: mgr.name, role: mgr.role || '乡村人物', villageId: v.id, villageName: v.name }]
  })
})
</script>

<style scoped>
.module-page { max-width: 960px; margin: 0 auto; padding: 2.4rem clamp(1rem, 4vw, 2rem); }
.mod-hero { margin-bottom: 1.4rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--sx-gold); margin: 0 0 .5rem; }
.mod-hero h1 { font-size: clamp(34px, 5vw, 54px); color: var(--sx-green); }
.lead { color: var(--sx-muted); max-width: 620px; }
.columns { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.6rem; }
.col-tag { font-size: .82rem; color: var(--sx-earth); border: 1px solid var(--sx-line); border-radius: 999px; padding: .2rem .8rem; }
.people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.person-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.1rem; background: var(--sx-white);
  border: 1px solid var(--sx-line); border-radius: 14px;
}
.avatar {
  display: grid; place-items: center; width: 52px; height: 52px; flex-shrink: 0;
  border-radius: 50%; background: var(--sx-green); color: var(--sx-gold-bright);
  font-family: var(--sx-serif); font-size: 1.3rem;
}
.person-body { display: flex; flex-direction: column; }
.person-name { font-family: var(--sx-serif); font-weight: 700; color: var(--sx-green); }
.person-role { font-size: .82rem; color: var(--sx-muted); }
.person-village { font-size: .8rem; color: var(--sx-earth); margin-top: .2rem; }
.empty { color: var(--sx-muted); font-style: italic; }
.scope-banner {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .7rem 1rem; margin-bottom: 1.4rem;
  background: var(--sx-paper-deep); border: 1px solid var(--sx-line); border-radius: 10px;
  color: var(--sx-ink); font-size: .9rem;
}
.scope-clear { margin-left: auto; color: var(--sx-earth); font-size: .85rem; }
</style>
