<template>
  <section class="enc-page">
    <div class="container">
      <!-- 头条推荐：多卡跑马灯 -->
      <div v-if="!loading && !loadError" class="hero-picks" @mouseenter="pauseAuto" @mouseleave="resumeAuto">
        <div class="picks-head">
          <p class="hero-kicker">📌 精选乡村 · 本周推荐</p>
          <div class="picks-nav">
            <button class="pick-arrow" aria-label="上一组" @click="prevSlide">‹</button>
            <button class="pick-arrow" aria-label="下一组" @click="nextSlide">›</button>
          </div>
        </div>
        <div class="picks-viewport">
          <div class="picks-track" :style="{ transform: `translateX(calc(-${startIndex} * ${100 / perView}%))` }">
            <div v-for="h in highlights" :key="h.id" class="pick-slide" :style="{ flexBasis: `${100 / perView}%` }">
              <article
                class="pick-card"
                role="button"
                tabindex="0"
                @click="goVillage(h.id)"
                @keydown.enter="goVillage(h.id)"
              >
                <div class="pick-cover" :style="{ backgroundImage: `url(${h.cover})` }">
                  <span v-if="h.honors && h.honors.length" class="pick-tag">{{ h.honors[0] }}</span>
                </div>
                <div class="pick-body">
                  <h3 class="pick-title">{{ h.name }}</h3>
                  <p class="pick-loc">{{ h.province }} · {{ h.city }}</p>
                  <p class="pick-oneline">“{{ h.summary }}”</p>
                </div>
              </article>
            </div>
          </div>
        </div>
        <div class="picks-dots">
          <button
            v-for="i in maxStart + 1"
            :key="i"
            class="dot"
            :class="{ active: startIndex === i - 1 }"
            :aria-label="`第 ${i} 组`"
            @click="goSlide(i - 1)"
          />
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

      <!-- 窄屏筛选按钮 -->
      <button class="filter-toggle" aria-label="打开筛选" @click="filterOpen = true">
        🔍 筛选 / 搜索<template v-if="hasActiveFilter"> · 已启用</template>
      </button>

      <!-- 左栏筛选 + 右结果 两栏布局 -->
      <div v-if="!loading && !loadError" class="enc-body">
        <!-- 左侧筛选侧栏（窄屏为抽屉） -->
        <aside class="filter-sidebar" :class="{ open: filterOpen }" aria-label="筛选">
          <div class="sidebar-head">
            <span class="sidebar-title">筛选</span>
            <button class="sidebar-close" aria-label="关闭筛选" @click="filterOpen = false">✕</button>
          </div>

          <!-- 搜索 -->
          <div class="search-bar">
            <span class="search-ic">🔍</span>
            <input v-model="keyword" type="text" placeholder="搜索乡村名称、关键词、标签..." aria-label="搜索乡村" />
          </div>

          <!-- 排序（竖向单选） -->
          <div class="fgroup">
            <p class="fgroup-title">排序</p>
            <div class="sort-list" role="radiogroup" aria-label="排序方式">
              <button
                v-for="o in sortOptions"
                :key="o.value"
                class="sort-item"
                :class="{ active: sortBy === o.value }"
                role="radio"
                :aria-checked="sortBy === o.value"
                @click="sortBy = o.value"
              >{{ o.label }}</button>
            </div>
          </div>

          <!-- 地区（行政树级联） -->
          <div class="fgroup">
            <p class="fgroup-title">地区</p>
            <div class="region-col">
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
          </div>

          <!-- 荣誉（竖向胶囊换行，带动态计数） -->
          <div class="fgroup">
            <p class="fgroup-title">荣誉</p>
            <div class="honor-wall" role="group" aria-label="荣誉筛选">
              <button class="honor-chip" :class="{ active: honor === '全部' }" @click="honor = '全部'">全部</button>
              <button
                v-for="h in honorList"
                :key="h.honor"
                class="honor-chip"
                :class="{ active: honor === h.honor, empty: honorCount(h.honor) === 0 }"
                @click="honor = h.honor"
              >{{ h.honor }} · {{ honorCount(h.honor) }}</button>
            </div>
          </div>

          <!-- 特色标签（六大类，多选 AND） -->
          <div class="fgroup">
            <p class="fgroup-title">特色标签</p>
            <div v-for="c in tagCategories" :key="c.cat" class="tag-cat">
              <span class="tag-cat-name">{{ c.cat }}</span>
              <div class="tag-chips">
                <button
                  v-for="t in c.tags"
                  :key="t.name"
                  class="tag-chip"
                  :class="{ active: selectedTags.includes(t.name), empty: !selectedTags.includes(t.name) && tagCount(t.name) === 0 }"
                  @click="toggleTag(t.name)"
                >{{ t.name }} · {{ tagCount(t.name) }}</button>
              </div>
            </div>
          </div>

          <button v-if="hasActiveFilter" class="btn-clear" @click="clearFilters">清除全部筛选</button>
        </aside>

        <!-- 窄屏抽屉遮罩 -->
        <div v-if="filterOpen" class="filter-backdrop" @click="filterOpen = false" />

        <!-- 右侧结果区 -->
        <div class="result-area">
          <!-- 已选条件面包屑 -->
          <div v-if="activeChips.length" class="crumbs">
            <button v-for="(chip, i) in activeChips" :key="i" class="crumb" @click="removeChip(chip)">
              {{ chip.label }} <span class="crumb-x">✕</span>
            </button>
            <button class="crumb-clear" @click="clearFilters">清空全部</button>
          </div>

          <!-- 结果条：计数 + 视图切换 -->
          <div class="result-bar">
            <p class="result-count">筛选到 {{ visibleVillages.length }} 个乡村</p>
            <div class="view-switch" role="group" aria-label="视图切换">
              <button class="view-btn" :class="{ active: viewMode === 'grid' }" aria-label="网格视图" @click="viewMode = 'grid'">▦</button>
              <button class="view-btn" :class="{ active: viewMode === 'list' }" aria-label="列表视图" @click="viewMode = 'list'">☰</button>
            </div>
          </div>

          <template v-if="visibleVillages.length">
            <div v-if="viewMode === 'grid'" class="grid">
              <VillageCard v-for="v in visibleVillages" :key="v.id" :village="v" />
            </div>
            <div v-else class="list">
              <router-link v-for="v in visibleVillages" :key="v.id" class="list-row" :to="`/villages/${v.id}`">
                <div class="list-thumb" :style="{ backgroundImage: v.cover ? `url(${v.cover})` : 'none' }">
                  <span v-if="!v.cover" class="list-ph">{{ v.name.slice(0, 1) }}</span>
                </div>
                <div class="list-main">
                  <p class="list-name">{{ v.name }}</p>
                  <p class="list-loc">{{ v.province }} · {{ v.city }} · {{ v.district }}</p>
                  <p class="list-summary">{{ v.summary }}</p>
                </div>
                <div class="list-honors">
                  <span v-for="h in (v.honors || []).slice(0, 2)" :key="h" class="list-honor">{{ h }}</span>
                </div>
              </router-link>
            </div>
          </template>
          <p v-else class="empty">没有匹配的乡村，试试调整筛选或搜索关键词。</p>
        </div>
      </div>

      <!-- 加载 / 错误兜底 -->
      <div v-else class="list-empty">
        <p v-if="loadError" class="empty">{{ loadError }}，请刷新重试。</p>
        <p v-else class="empty">加载中…</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import VillageCard from '@/components/VillageCard.vue'
import { fetchAllVillages } from '@/api/villages.js'
import { buildRegionTree, filterVillages, sortVillages, allHonors, allTagsByCategory } from '@/lib/encyclopedia.js'

const route = useRoute()

const villages = ref([])
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    villages.value = await fetchAllVillages()
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})

// —— 头条推荐：多卡跑马灯（取前 6 村） ——
const highlights = computed(() => villages.value.slice(0, 6))
const perView = 3
const startIndex = ref(0)
const maxStart = computed(() => Math.max(0, highlights.value.length - perView))
function goSlide(i) { startIndex.value = Math.min(Math.max(0, i), maxStart.value) }
function nextSlide() { startIndex.value = startIndex.value >= maxStart.value ? 0 : startIndex.value + 1 }
function prevSlide() { startIndex.value = startIndex.value <= 0 ? maxStart.value : startIndex.value - 1 }

let autoTimer = null
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
function startAuto() { if (reduceMotion || maxStart.value < 1) return; stopAuto(); autoTimer = setInterval(nextSlide, 4000) }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null } }
const pauseAuto = stopAuto
const resumeAuto = startAuto

// —— 路由跳转 ——
function goVillage(id) { window.location.hash = `#/villages/${id}` }

// —— 窄屏筛选抽屉开关 ——
const filterOpen = ref(false)

// —— 检索状态 ——
const keyword = ref('')
const sortBy = ref('latest')
const province = ref('全部')
const city = ref('全部')
const district = ref('全部')
const honor = ref('全部')
const selectedTags = ref([])
const viewMode = ref('grid') // 'grid' | 'list'

function toggleTag(t) {
  const i = selectedTags.value.indexOf(t)
  if (i >= 0) selectedTags.value.splice(i, 1)
  else selectedTags.value.push(t)
}

const sortOptions = [
  { value: 'latest', label: '最新入驻' },
  { value: 'views', label: '最热浏览' },
  { value: 'favorites', label: '最多收藏' },
  { value: 'practices', label: '最多实践' },
]
const sortLabel = computed(() => sortOptions.find((o) => o.value === sortBy.value)?.label ?? '')

// —— 行政树 ——
const regionTree = computed(() => buildRegionTree(villages.value))
const provinceOptions = computed(() => Object.keys(regionTree.value))
const cityOptions = computed(() => (province.value === '全部' ? [] : Object.keys(regionTree.value[province.value] || {})))
const districtOptions = computed(() => {
  if (province.value === '全部' || city.value === '全部') return []
  return Object.keys((regionTree.value[province.value] || {})[city.value] || {})
})
function onProvinceChange() { city.value = '全部'; district.value = '全部' }
function onCityChange() { district.value = '全部' }
const regionPath = computed(() => {
  if (province.value === '全部') return '全国'
  return [province.value, city.value, district.value].filter((x) => x && x !== '全部').join(' > ')
})

// —— 荣誉墙 ——
const honorList = computed(() => allHonors(villages.value))

// —— 标签分类（六大类） ——
const tagCategories = computed(() => allTagsByCategory(villages.value))

// 当前筛选参数（不含排序，供结果与计数复用）
const filterArgs = computed(() => ({
  keyword: keyword.value, province: province.value, city: city.value, district: district.value,
  honor: honor.value, tags: selectedTags.value,
}))

// —— 结果 ——
const visibleVillages = computed(() => sortVillages(filterVillages(villages.value, filterArgs.value), sortBy.value))

// 荣誉计数：除荣誉外其他条件生效后，各荣誉还剩多少村
function honorCount(h) {
  const base = filterVillages(villages.value, { ...filterArgs.value, honor: '全部' })
  return h === '全部' ? base.length : base.filter((v) => (v.honors || []).includes(h)).length
}
// 标签计数：除该标签外其他条件生效后，加上该标签还剩多少村
function tagCount(t) {
  const others = selectedTags.value.filter((x) => x !== t)
  return filterVillages(villages.value, { ...filterArgs.value, tags: [...others, t] }).length
}

// 面包屑：当前激活的可删除筛选项
const activeChips = computed(() => {
  const chips = []
  if (keyword.value) chips.push({ type: 'keyword', label: `关键词“${keyword.value}”` })
  if (province.value !== '全部') chips.push({ type: 'region', label: regionPath.value })
  if (honor.value !== '全部') chips.push({ type: 'honor', label: honor.value })
  selectedTags.value.forEach((t) => chips.push({ type: 'tag', label: t, value: t }))
  if (sortBy.value !== 'latest') chips.push({ type: 'sort', label: sortLabel.value })
  return chips
})
function removeChip(chip) {
  if (chip.type === 'keyword') keyword.value = ''
  else if (chip.type === 'region') { province.value = '全部'; city.value = '全部'; district.value = '全部' }
  else if (chip.type === 'honor') honor.value = '全部'
  else if (chip.type === 'tag') toggleTag(chip.value)
  else if (chip.type === 'sort') sortBy.value = 'latest'
}

const hasActiveFilter = computed(() =>
  keyword.value || province.value !== '全部' || honor.value !== '全部' || selectedTags.value.length > 0 || sortBy.value !== 'latest')
function clearFilters() {
  keyword.value = ''; province.value = '全部'; city.value = '全部'; district.value = '全部'; honor.value = '全部'; selectedTags.value = []; sortBy.value = 'latest'
}

// —— 首页搜索带入 ?q= ——
watch(() => route.query.q, (q) => { if (q) keyword.value = String(q) }, { immediate: true })

onMounted(startAuto)
onBeforeUnmount(stopAuto)
</script>

<style scoped>
.enc-page { padding: 2.6rem 0 3rem; }
.container { max-width: none; margin: 0; padding: 0 clamp(1rem, 4vw, 2.5rem); }

/* —— 头条推荐：3 卡并排 —— */
.hero-picks { margin-bottom: 2.4rem; }
.picks-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8rem; }
.hero-kicker { font-size: 14px; font-weight: 700; color: var(--color-highlight); margin: 0; }
.picks-nav { display: flex; gap: .5rem; }
.pick-arrow {
  width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
  border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-primary-dark);
  font-size: 1.5rem; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all var(--transition);
}
.pick-arrow:hover { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.picks-viewport { overflow: hidden; }
.picks-track { display: flex; transition: transform var(--transition); }
.pick-slide { flex: 0 0 auto; box-sizing: border-box; padding: 0 .7rem; }
.pick-slide:first-child { padding-left: 0; }
.pick-slide:last-child { padding-right: 0; }
.picks-dots { display: flex; justify-content: center; gap: .5rem; margin-top: 1rem; }
.pick-card {
  display: flex; flex-direction: column; overflow: hidden; cursor: pointer;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-card);
  transition: transform var(--transition), box-shadow var(--transition);
}
.pick-card:hover, .pick-card:focus-visible { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); outline: none; }
.pick-cover { position: relative; aspect-ratio: 16 / 10; background-size: cover; background-position: center; background-color: var(--color-primary); }
.pick-tag { position: absolute; left: .8rem; top: .8rem; padding: .25rem .8rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); font-size: .76rem; font-weight: 600; }
.pick-body { padding: 1.1rem 1.3rem 1.3rem; display: flex; flex-direction: column; gap: .4rem; }
.pick-title { font-size: 1.25rem; font-weight: 700; color: var(--color-primary-dark); font-family: var(--sx-serif); }
.pick-loc { font-size: .85rem; color: var(--color-primary); font-weight: 600; }
.pick-oneline { font-size: .9rem; color: var(--color-text-secondary); font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
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

/* —— 两栏布局 —— */
.enc-body { display: grid; grid-template-columns: 260px 1fr; gap: 1.8rem; align-items: start; }

/* —— 左侧筛选侧栏 —— */
.filter-sidebar {
  position: sticky; top: 88px;
  display: flex; flex-direction: column; gap: 1.2rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 1.2rem 1.2rem 1.4rem; box-shadow: var(--shadow-sm);
}
.sidebar-head { display: none; align-items: center; justify-content: space-between; }
.sidebar-title { font-weight: 700; color: var(--color-primary-dark); font-size: 1.1rem; }
.sidebar-close { border: none; background: transparent; font-size: 1.2rem; cursor: pointer; color: var(--color-text-light); }

.fgroup { display: flex; flex-direction: column; gap: .6rem; }
.fgroup-title { margin: 0; font-size: .82rem; font-weight: 700; color: var(--color-text-secondary); letter-spacing: .04em; }

/* 搜索 */
.search-bar { display: flex; align-items: center; gap: .5rem; padding: .2rem .9rem; background: var(--sx-paper-deep); border: 1px solid var(--color-border); border-radius: 50px; }
.search-bar input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; padding: .55rem 0; font-size: .9rem; color: var(--color-text); }

/* 排序（竖向单选） */
.sort-list { display: flex; flex-direction: column; gap: .4rem; }
.sort-item { text-align: left; padding: .45rem .8rem; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-text-secondary); font-size: .86rem; cursor: pointer; transition: all var(--transition); }
.sort-item:hover { border-color: var(--color-primary); color: var(--color-primary); }
.sort-item.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

/* 地区（竖向级联） */
.region-col { display: flex; flex-direction: column; gap: .5rem; }
.region-select { width: 100%; padding: .5rem .8rem; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-text); font-size: .86rem; cursor: pointer; }
.region-select:disabled { opacity: .5; cursor: not-allowed; }

/* 荣誉（竖向胶囊换行） */
.honor-wall { display: flex; flex-wrap: wrap; gap: .45rem; }
.honor-chip { padding: .32rem .9rem; border: none; border-radius: 50px; background: var(--sx-paper-deep); color: var(--color-text-secondary); font-size: .8rem; cursor: pointer; transition: all var(--transition); }
.honor-chip:hover { background: var(--color-highlight); color: #fff; }
.honor-chip.active { background: var(--color-primary); color: #fff; }

.btn-clear { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-highlight); padding: .5rem .8rem; border-radius: 8px; font-size: .84rem; cursor: pointer; }
.btn-clear:hover { border-color: var(--color-highlight); }

/* —— 右侧结果区 —— */
/* 面包屑 */
.crumbs { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .9rem; }
.crumb { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .8rem; border: 1px solid var(--color-primary); border-radius: 50px; background: var(--color-primary); color: #fff; font-size: .8rem; cursor: pointer; }
.crumb-x { font-size: .72rem; opacity: .85; }
.crumb:hover { background: var(--color-primary-dark); border-color: var(--color-primary-dark); }
.crumb-clear { padding: .3rem .8rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-highlight); font-size: .8rem; cursor: pointer; }
.crumb-clear:hover { border-color: var(--color-highlight); }

/* 结果条 + 视图切换 */
.result-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.result-count { font-size: .82rem; color: var(--color-text-light); margin: 0; }
.view-switch { display: flex; gap: .3rem; }
.view-btn { width: 34px; height: 34px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-text-secondary); font-size: 1rem; cursor: pointer; transition: all var(--transition); }
.view-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.view-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.4rem; }

/* 列表视图 */
.list { display: flex; flex-direction: column; gap: .9rem; }
.list-row { display: flex; align-items: center; gap: 1rem; padding: .9rem 1.1rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card); transition: transform var(--transition), box-shadow var(--transition); }
.list-row:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); border-color: var(--color-primary); }
.list-thumb { flex-shrink: 0; width: 96px; height: 68px; border-radius: 8px; background-size: cover; background-position: center; background-color: var(--color-primary); display: flex; align-items: center; justify-content: center; }
.list-ph { font-family: var(--sx-serif); font-size: 1.6rem; color: var(--color-accent); }
.list-main { flex: 1; min-width: 0; }
.list-name { font-family: var(--sx-serif); font-weight: 700; font-size: 1.1rem; color: var(--color-primary-dark); }
.list-loc { font-size: .8rem; color: var(--color-text-light); margin-top: .2rem; }
.list-summary { font-size: .85rem; color: var(--color-text-secondary); margin-top: .3rem; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.list-honors { flex-shrink: 0; display: flex; flex-direction: column; gap: .3rem; align-items: flex-end; }
.list-honor { padding: .15rem .6rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); font-size: .72rem; font-weight: 600; white-space: nowrap; }

.empty { padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }

/* 标签分类筛选 */
.tag-cat { margin-bottom: .7rem; }
.tag-cat-name { display: block; font-size: .76rem; color: var(--color-text-light); margin-bottom: .35rem; }
.tag-chips { display: flex; flex-wrap: wrap; gap: .4rem; }
.tag-chip { padding: .28rem .7rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-text-secondary); font-size: .76rem; cursor: pointer; transition: all var(--transition); }
.tag-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.tag-chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.tag-chip.empty, .honor-chip.empty { opacity: .4; }

/* 窄屏列表精简 */
@media (max-width: 560px) {
  .list-honors { display: none; }
  .list-thumb { width: 72px; height: 54px; }
}

/* —— 窄屏筛选按钮 + 抽屉 —— */
.filter-toggle { display: none; width: 100%; margin-bottom: 1rem; padding: .7rem 1rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-primary-dark); font-size: .9rem; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm); }
.filter-backdrop { display: none; }

@media (max-width: 960px) {
  .enc-body { grid-template-columns: 1fr; }
  .filter-toggle { display: block; }
  .filter-backdrop { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .4); z-index: 60; }
  .filter-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 70;
    width: min(320px, 86vw); border-radius: 0; overflow-y: auto;
    transform: translateX(-100%); transition: transform var(--transition);
  }
  .filter-sidebar.open { transform: translateX(0); }
  .sidebar-head { display: flex; }
}

@media (max-width: 760px) {
  .hero-card { grid-template-columns: 1fr; }
  .hero-cover { min-height: 180px; }
}
</style>


