<template>
  <section class="tags-page">
    <div class="container">
      <header class="page-head">
        <p class="kicker">乡村百科</p>
        <h1>分类浏览</h1>
        <p class="desc">按六大类特色标签浏览名村。点击任一标签，筛选出带该标签的村庄。</p>
      </header>

      <!-- 标签云：按类别分区 -->
      <div class="cloud">
        <div v-for="cat in categories" :key="cat.name" class="cat-block">
          <h3 class="cat-title">{{ cat.name }}</h3>
          <div class="cat-tags">
            <button
              v-for="t in cat.tags"
              :key="t"
              class="tag-chip"
              :class="{ active: activeTag === t }"
              @click="toggleTag(t)"
            >{{ t }}</button>
          </div>
        </div>
      </div>

      <!-- 筛选结果 -->
      <div class="result">
        <p class="result-count">
          <template v-if="activeTag">带「{{ activeTag }}」标签的村庄：{{ matched.length }} 个</template>
          <template v-else>点击上方标签查看对应村庄</template>
        </p>
        <div v-if="activeTag && matched.length" class="grid">
          <VillageCard v-for="v in matched" :key="v.id" :village="v" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import VillageCard from '@/components/VillageCard.vue'
import villages from '@/data/encyclopedia-villages.json'

const route = useRoute()

// 收集六大类下的去重标签
const categories = computed(() => {
  const map = {}
  villages.forEach((v) => {
    if (!v.tags) return
    Object.entries(v.tags).forEach(([cat, items]) => {
      map[cat] = map[cat] || new Set()
      items.forEach((t) => map[cat].add(t))
    })
  })
  return Object.entries(map).map(([name, set]) => ({ name, tags: [...set] }))
})

const activeTag = ref(route.query.tag ? String(route.query.tag) : '')
function toggleTag(t) {
  activeTag.value = activeTag.value === t ? '' : t
}

const matched = computed(() => {
  if (!activeTag.value) return []
  return villages.filter((v) =>
    v.tags && Object.values(v.tags).some((items) => items.includes(activeTag.value))
  )
})
</script>

<style scoped>
.tags-page { padding: 2.6rem 0 3rem; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }
.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; color: var(--color-primary-dark); font-family: var(--sx-serif); }
.desc { max-width: 640px; margin: .8rem 0 0; color: var(--color-text-secondary); }

.cloud { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; margin-bottom: 2rem; }
.cat-block { background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1.1rem 1.2rem; box-shadow: var(--shadow-sm); }
.cat-title { font-size: 1rem; color: var(--color-primary-dark); font-family: var(--sx-serif); margin: 0 0 .8rem; display: flex; align-items: center; gap: .5rem; }
.cat-title::before { content: ''; width: 4px; height: 1.1em; background: var(--color-primary); border-radius: 2px; }
.cat-tags { display: flex; flex-wrap: wrap; gap: .5rem; }
.tag-chip { padding: .3rem .8rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--sx-paper-deep); color: var(--color-text-secondary); font-size: .8rem; cursor: pointer; transition: all var(--transition); }
.tag-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.tag-chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

.result-count { font-size: .9rem; color: var(--color-text-secondary); margin: 0 0 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.4rem; }
</style>
