<template>
  <section class="enc-page">
    <div class="container">
      <!-- 头条推荐轮播 -->
      <div class="hero-carousel" @mouseenter="pauseAuto" @mouseleave="resumeAuto">
        <p class="hero-kicker">📌 精选乡村 · 本周推荐</p>
        <div class="hero-stage">
          <button class="hero-arrow left" aria-label="上一张" @click="prevSlide">‹</button>
          <transition :name="slideDir" mode="out-in">
            <article :key="activeHi.id" class="hero-card" role="button" tabindex="0" @click="goVillage(activeHi.id)" @keydown.enter="goVillage(activeHi.id)">
              <div class="hero-cover" :style="{ backgroundImage: `url(${activeHi.cover})` }"></div>
              <div class="hero-body">
                <span class="hero-tag">{{ activeHi.honors[0] }}</span>
                <h2 class="hero-title">{{ activeHi.name }}</h2>
                <p class="hero-loc">{{ activeHi.province }} · {{ activeHi.city }}</p>
                <p class="hero-oneline">“{{ activeHi.summary }}”</p>
              </div>
            </article>
          </transition>
          <button class="hero-arrow right" aria-label="下一张" @click="nextSlide">›</button>
        </div>
        <div class="hero-dots">
          <button v-for="(h, i) in highlights" :key="h.id" class="dot" :class="{ active: i === slideIndex }" :aria-label="`第 ${i + 1} 张`" @click="goSlide(i)" />
        </div>
      </div>

      <!-- 页面头部 -->
      <header class="page-head">
        <p class="kicker">乡村百科</p>
        <div class="head-row">
          <div class="head-text">
            <h1>乡村百科 —— 一村一页，读懂中国乡村</h1>
            <p class="desc">收录全国传统村落、历史文化名村、特色乡村的完整档案。</p>
            <p class="stat">共 {{ villages.length }} 个乡村</p>
          </div>
        </div>
      </header>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <span class="search-ic">🔍</span>
        <input v-model="keyword" type="text" placeholder="搜索乡村名称、关键词、标签..." aria-label="搜索乡村" />
      </div>

      <!-- 排序胶囊 -->
      <div class="chips" role="tablist" aria-label="排序方式">
        <button v-for="o in sortOptions" :key="o.value" class="chip" :class="{ active: sortBy === o.value }" @click="sortBy = o.value">{{ o.label }}</button>
      </div>

      <!-- 行政树级联 -->
      <div class="region-row">
        <select v-model="province" class="region-select" aria-label="省份" @change="onProvinceChange">
          <option value="全部">省份（全部）</option>
          <option v-for="p in provinceOptions" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="city" class="region-select" aria-label="城市" :disabled="province === '全部'" @change="onCityChange">
          <option value="全部">城市（全部）</option>
          <option v-for="c in cityOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="district" class="region-select" aria-label="区县" :disabled="city === '全部'">
          <option value="全部">区县（全部）</option>
          <option v-for="d in districtOptions" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <!-- 荣誉标签墙 -->
      <div class="honor-wall" role="tablist" aria-label="荣誉筛选">
        <button class="honor-chip" :class="{ active: honor === '全部' }" @click="honor = '全部'">全部</button>
        <button v-for="h in honorList" :key="h.honor" class="honor-chip" :class="{ active: honor === h.honor }" @click="honor = h.honor">
          {{ h.honor }} · {{ h.count }}
        </button>
      </div>

      <!-- 当前筛选路径 + 清除 -->
      <div class="filter-path">
        <span>
          当前筛选：{{ regionPath }}
          <template v-if="honor !== '全部'"> · {{ honor }}</template>
          <template v-if="keyword"> · 关键词“{{ keyword }}”</template>
          · {{ sortLabel }}
        </span>
        <button v-if="hasActiveFilter" class="btn-clear" @click="clearFilters">清除筛选</button>
      </div>

      <!-- 卡片网格 -->
      <p class="result-count">筛选到 {{ visibleVillages.length }} 个乡村</p>
      <div v-if="visibleVillages.length" class="grid">
        <VillageCard v-for="v in visibleVillages" :key="v.id" :village="v" />
      </div>
      <p v-else class="empty">没有匹配的乡村，试试调整筛选或搜索关键词。</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import VillageCard from '@/components/VillageCard.vue'
import villages from '@/data/encyclopedia-villages.json'
import { buildRegionTree, filterVillages, sortVillages, allHonors } from '@/lib/encyclopedia.js'

const route = useRoute()

// —— 头条推荐（取前 3 村） ——
const highlights = villages.slice(0, 3)
const slideIndex = ref(0)
const slideDir = ref('slide-next')
const activeHi = computed(() => highlights[slideIndex.value])
let autoTimer = null
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
function goSlide(i) { slideDir.value = i >= slideIndex.value ? 'slide-next' : 'slide-prev'; slideIndex.value = (i + highlights.length) % highlights.length }
function nextSlide() { slideDir.value = 'slide-next'; slideIndex.value = (slideIndex.value + 1) % highlights.length }
function prevSlide() { slideDir.value = 'slide-prev'; slideIndex.value = (slideIndex.value - 1 + highlights.length) % highlights.length }
function startAuto() { if (reduceMotion) return; stopAuto(); autoTimer = setInterval(nextSlide, 5000) }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null } }
const pauseAuto = stopAuto
const resumeAuto = startAuto

// —— 路由跳转 ——
function goVillage(id) { window.location.hash = `#/villages/${id}` }

// —— 检索状态 ——
const keyword = ref('')
const sortBy = ref('latest')
const province = ref('全部')
const city = ref('全部')
const district = ref('全部')
const honor = ref('全部')

const sortOptions = [
  { value: 'latest', label: '最新入驻' },
  { value: 'views', label: '最热浏览' },
  { value: 'favorites', label: '最多收藏' },
  { value: 'practices', label: '最多实践' },
]
const sortLabel = computed(() => sortOptions.find((o) => o.value === sortBy.value)?.label ?? '')

// —— 行政树 ——
const regionTree = buildRegionTree(villages)
const provinceOptions = computed(() => Object.keys(regionTree))
const cityOptions = computed(() => (province.value === '全部' ? [] : Object.keys(regionTree[province.value] || {})))
const districtOptions = computed(() => {
  if (province.value === '全部' || city.value === '全部') return []
  return Object.keys((regionTree[province.value] || {})[city.value] || {})
})
function onProvinceChange() { city.value = '全部'; district.value = '全部' }
function onCityChange() { district.value = '全部' }
const regionPath = computed(() => {
  if (province.value === '全部') return '全国'
  return [province.value, city.value, district.value].filter((x) => x && x !== '全部').join(' > ')
})

// —— 荣誉墙 ——
const honorList = allHonors(villages)

// —— 结果 ——
const visibleVillages = computed(() => {
  const filtered = filterVillages(villages, {
    keyword: keyword.value, province: province.value, city: city.value, district: district.value, honor: honor.value,
  })
  return sortVillages(filtered, sortBy.value)
})

const hasActiveFilter = computed(() =>
  keyword.value || province.value !== '全部' || honor.value !== '全部' || sortBy.value !== 'latest')
function clearFilters() {
  keyword.value = ''; province.value = '全部'; city.value = '全部'; district.value = '全部'; honor.value = '全部'; sortBy.value = 'latest'
}

// —— 首页搜索带入 ?q= ——
watch(() => route.query.q, (q) => { if (q) keyword.value = String(q) }, { immediate: true })

onMounted(startAuto)
onBeforeUnmount(stopAuto)
</script>

<style scoped>
.enc-page { padding: 2.6rem 0 3rem; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

/* —— 头条轮播 —— */
.hero-carousel { margin-bottom: 2.4rem; }
.hero-kicker { font-size: 14px; font-weight: 700; color: var(--color-highlight); margin: 0 0 .8rem; }
.hero-stage { display: flex; align-items: center; gap: .6rem; }
.hero-card {
  flex: 1; display: grid; grid-template-columns: 1.1fr 1fr; overflow: hidden;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-card); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.hero-card:hover, .hero-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.hero-cover { min-height: 240px; background-size: cover; background-position: center; background-color: var(--color-primary); }
.hero-body { padding: 1.6rem 1.8rem; display: flex; flex-direction: column; justify-content: center; }
.hero-tag { align-self: flex-start; padding: .25rem .8rem; border-radius: 50px; margin-bottom: .8rem; background: var(--color-accent); color: var(--color-primary-dark); font-size: .78rem; font-weight: 600; }
.hero-title { font-size: 1.5rem; font-weight: 700; color: var(--color-primary-dark); }
.hero-loc { margin: .6rem 0 .5rem; font-size: .9rem; color: var(--color-primary); font-weight: 600; }
.hero-oneline { font-size: .95rem; color: var(--color-text-secondary); font-style: italic; }
.hero-arrow {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
  border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-primary-dark);
  font-size: 1.6rem; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all var(--transition);
}
.hero-arrow:hover { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.hero-dots { display: flex; justify-content: center; gap: .5rem; margin-top: 1rem; }
.dot { width: 9px; height: 9px; border-radius: 50%; border: none; cursor: pointer; padding: 0; background: var(--color-border); transition: all var(--transition); }
.dot.active { background: var(--color-primary); width: 22px; border-radius: 50px; }
.slide-next-enter-active, .slide-next-leave-active, .slide-prev-enter-active, .slide-prev-leave-active { transition: opacity var(--transition), transform var(--transition); }
.slide-next-enter-from { opacity: 0; transform: translateX(24px); }
.slide-next-leave-to { opacity: 0; transform: translateX(-24px); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-24px); }
.slide-prev-leave-to { opacity: 0; transform: translateX(24px); }

/* —— 头部 —— */
.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.head-text h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; color: var(--color-primary-dark); }
.desc { max-width: 720px; margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }
.stat { margin: .7rem 0 0; font-size: 14px; color: var(--color-text-light); }

/* —— 搜索 + 排序 —— */
.search-bar { display: flex; align-items: center; gap: .6rem; padding: .3rem 1.2rem; margin-bottom: 1.2rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 50px; box-shadow: var(--shadow-card); }
.search-bar input { flex: 1; border: none; outline: none; background: transparent; padding: .6rem 0; font-size: .95rem; color: var(--color-text); }
.chips { display: flex; flex-wrap: wrap; gap: .6rem; margin-bottom: 1.2rem; }
.chip { padding: .45rem 1.1rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-text-secondary); font-size: .88rem; cursor: pointer; transition: all var(--transition); }
.chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

/* —— 行政树 —— */
.region-row { display: flex; flex-wrap: wrap; gap: .8rem; margin-bottom: 1.2rem; }
.region-select { padding: .5rem 1rem; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-text); font-size: .88rem; cursor: pointer; min-width: 150px; }
.region-select:disabled { opacity: .5; cursor: not-allowed; }

/* —— 荣誉墙 —— */
.honor-wall { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: .6rem; padding-bottom: .8rem; margin-bottom: .8rem; }
.honor-chip { flex-shrink: 0; padding: .4rem 1.1rem; border: none; border-radius: 50px; background: var(--sx-paper-deep); color: var(--color-text-secondary); font-size: .82rem; cursor: pointer; white-space: nowrap; transition: all var(--transition); }
.honor-chip:hover { background: var(--color-highlight); color: #fff; }
.honor-chip.active { background: var(--color-primary); color: #fff; }

/* —— 路径 + 结果 —— */
.filter-path { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; font-size: .85rem; color: var(--color-text-light); margin-bottom: .4rem; }
.btn-clear { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-highlight); padding: .25rem .8rem; border-radius: 50px; font-size: .8rem; cursor: pointer; }
.btn-clear:hover { border-color: var(--color-highlight); }
.result-count { font-size: .82rem; color: var(--color-text-light); margin: 0 0 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.4rem; }
.empty { padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }

@media (max-width: 760px) {
  .hero-card { grid-template-columns: 1fr; }
  .hero-cover { min-height: 180px; }
  .region-select { min-width: 0; flex: 1; }
}
</style>

