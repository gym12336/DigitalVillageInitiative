<template>
  <section class="home">
    <section class="hero museum-grid">
      <div class="hero-glow" aria-hidden="true" />
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="eyebrow"><span /> DIGITAL FIELD ARCHIVE · 001</p>
          <p class="hero-overline">乡村数字资源库</p>
          <h1 class="slogan">
            <span>让乡村<em>被看见</em></span>
            <span>让经验<em>被留存</em></span>
            <span>让需求<em>被响应</em></span>
          </h1>
          <p class="sub">以数字档案整理乡土，以青年实践连接未来。<br />从一座村庄开始，建立可阅读、可参与、可继续生长的公共记忆。</p>
          <div class="hero-actions">
            <router-link to="/villages" class="btn primary">
              探索乡村档案 <AppIcon name="arrow-right" :size="17" />
            </router-link>
            <router-link to="/practice/mine" class="btn ghost">
              <AppIcon name="footprint" :size="17" /> 开始我的实践
            </router-link>
          </div>

          <div class="search-block">
            <div class="search">
              <AppIcon name="search" :size="17" />
              <input v-model="keyword" type="text" aria-label="搜索数字乡村档案" placeholder="检索村庄、人物、实践成果或需求" @keyup.enter="doSearch" />
              <button @click="doSearch">检索</button>
            </div>
            <div class="hot">
              <span class="hot-label">INDEX</span>
              <button v-for="w in hotWords" :key="w" class="hot-tag" @click="searchWord(w)">{{ w }}</button>
            </div>
          </div>
        </div>

        <div class="hero-exhibit" aria-label="推荐乡村档案入口">
          <div class="exhibit-corners" aria-hidden="true"><i /><i /><i /><i /></div>
          <div class="exhibit-head">
            <span>FIELD ARCHIVE / {{ heroVillage?.province || '数据同步中' }}</span>
            <span class="signal"><b /> {{ loading ? 'SYNCING' : 'ONLINE' }}</span>
          </div>
          <div class="terrain">
            <svg viewBox="0 0 560 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <defs>
                <linearGradient id="terrainFade" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#76d8bc" stop-opacity=".52" />
                  <stop offset="1" stop-color="#b99b61" stop-opacity=".08" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="url(#terrainFade)" stroke-width="1">
                <path d="M-35 88C53 18 141 38 177 104s129 98 205 55 124-24 217 39" />
                <path d="M-42 111C44 42 124 57 160 120s134 107 215 63 135-19 225 44" />
                <path d="M-48 137C34 69 106 77 144 138s136 114 224 70 143-13 235 49" />
                <path d="M-53 165C29 100 92 99 127 156s140 124 234 84 151-2 244 55" />
                <path d="M-58 196C21 136 77 124 111 177s143 134 244 99 158 9 252 62" />
                <path d="M-62 229C13 176 63 153 96 201s144 144 252 116 163 22 261 69" />
                <path d="M-66 265C4 220 50 185 82 228s143 153 259 134 168 35 270 76" />
                <path d="M23 421c61-42 110-48 154-20 72 47 144-37 212-33 71 5 110 52 180 45" />
                <path d="M50 448c50-37 93-40 134-17 72 40 141-31 207-27 69 5 106 42 168 37" />
              </g>
            </svg>
            <button
              v-for="(village, index) in featuredVillages"
              :key="village.id"
              type="button"
              class="archive-marker"
              :class="{ active: index === heroVillageIndex }"
              :style="markerPositions[index]"
              :aria-label="`预览${village.name}档案`"
              :aria-pressed="index === heroVillageIndex"
              @click="selectHeroVillage(index)"
            >
              <span class="marker-dot" />
              <span class="marker-label"><small>{{ String(index + 1).padStart(2, '0') }}</small>{{ village.name }}</span>
            </button>
          </div>
          <div v-if="heroVillage" class="exhibit-record" aria-live="polite">
            <div class="record-copy">
              <span class="record-no">{{ heroArchiveNo }} · {{ heroCoordinates }}</span>
              <h2>{{ heroVillage.name }}</h2>
              <p>{{ heroVillage.summary || '村庄资料正在由实践团队持续补充。' }}</p>
            </div>
            <div class="record-side">
              <span>{{ heroLocation }}</span>
              <span>{{ heroVillage.certLabel || '数字村志' }}</span>
              <router-link :to="`/villages/${heroVillage.id}`">
                打开完整档案 <AppIcon name="arrow-right" :size="15" />
              </router-link>
            </div>
          </div>
          <div v-else class="exhibit-record exhibit-loading" aria-live="polite">
            <span class="record-no">ARCHIVE INDEX</span>
            <p>{{ loading ? '正在同步村庄档案…' : '暂未读取到村庄档案' }}</p>
          </div>
          <div class="scan-line" aria-hidden="true" />
        </div>
      </div>

      <div class="hero-stats">
        <div v-for="(s, i) in stats" :key="s.label" class="stat">
          <span class="stat-index">{{ String(i + 1).padStart(2, '0') }}</span>
          <div class="num"><CountUp :value="s.value" /><span class="suffix">{{ s.suffix }}</span></div>
          <div class="label">{{ s.label }}</div>
        </div>
        <p class="demo-note">DEMO DATA · 后续接入真实统计</p>
      </div>
    </section>

    <div class="ticker" @mouseenter="tickerPaused = true" @mouseleave="tickerPaused = false">
      <span class="ticker-label">FIELD NOTES / 田野动态</span>
      <div class="ticker-viewport">
        <div class="ticker-track" :class="{ paused: tickerPaused }">
          <component
            :is="item.url ? 'a' : 'span'"
            v-for="item in tickerItems"
            :key="item.key"
            class="ticker-item"
            :href="item.url || undefined"
            :target="item.url ? '_blank' : undefined"
            rel="noopener"
          >
            <span class="ticker-tag">{{ item.tag }}</span>
            {{ item.title }}
            <span class="ticker-source">— {{ item.source }}</span>
          </component>
        </div>
      </div>
    </div>

    <section class="map-zone museum-grid">
      <div class="container map-head">
        <div>
          <p class="section-kicker">GEOSPATIAL ARCHIVE / 地理档案</p>
          <h2>探索数乡 · 点亮中国</h2>
        </div>
        <p>从地理坐标进入村庄档案。点击地图点位，读取资源、人物与实践影像。</p>
      </div>
      <div class="dashboard">
        <MapDashboardStats class="panel-left" :villages="villages" />
        <div class="panel-map">
          <div class="panel-caption"><span>MAP VIEW · CN</span><span>LIVE INDEX</span></div>
          <ChinaMap2D :villages="villages" :selected-id="selectedId" @select-village="onSelect" />
        </div>
        <VillageInfoCard class="panel-right" :village="selectedVillage" :villages="villages" @select-village="onSelect" />
      </div>
    </section>

    <section class="halls">
      <div class="container">
        <div class="halls-head">
          <div>
            <p class="section-kicker">MUSEUM INDEX / 展厅目录</p>
            <h2>六个入口，一套不断生长的乡村档案</h2>
          </div>
          <p>从读懂一个村，到记录一次实践、回应一项需求。每个展厅都是青年与乡村产生连接的起点。</p>
        </div>
        <div class="grid">
          <ModuleCard v-for="(m, index) in modules" :key="m.id" :module="m" :index="index" />
        </div>
      </div>
    </section>

    <section class="field-action">
      <div class="container action-grid">
        <div class="action-intro">
          <p class="section-kicker">CO-CREATION / 共同书写</p>
          <h2>乡村提供真实问题，青年带着专业与脚步抵达</h2>
          <p>平台把零散的影像、访谈、地图与成果整理为可追溯的数字档案，也让下一支团队知道从哪里继续。</p>
        </div>
        <div class="action-cards">
          <router-link to="/voice" class="action-card village">
            <span class="action-no">01 / VILLAGE</span>
            <AppIcon name="seedling" :size="32" />
            <h3>发布乡村需求</h3>
            <p>把产业、文化、治理与传播中的真实问题带到青年面前。</p>
            <span class="action-link">进入乡村之声 <AppIcon name="arrow-right" :size="16" /></span>
          </router-link>
          <router-link to="/practice/mine" class="action-card youth">
            <span class="action-no">02 / YOUTH</span>
            <AppIcon name="university" :size="32" />
            <h3>开始一次实践</h3>
            <p>从组队、调研到成果归档，按清晰阶段推进每一次下乡。</p>
            <span class="action-link">进入实践工作台 <AppIcon name="arrow-right" :size="16" /></span>
          </router-link>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ChinaMap2D from '@/components/ChinaMap2D.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import MapDashboardStats from '@/components/MapDashboardStats.vue'
import VillageInfoCard from '@/components/VillageInfoCard.vue'
import CountUp from '@/components/CountUp.vue'
import AppIcon from '@/components/AppIcon.vue'
import { modules } from '@/modules.config.js'
import { fetchAllVillages } from '@/api/villages.js'
import headlines from '@/data/headlines.json'
import { platformDemoStats } from '@/data/demo-metadata.js'

const router = useRouter()
const villages = ref([])
const loading = ref(true)
const keyword = ref('')
const selectedId = ref('')
const selectedVillage = computed(() => villages.value.find((v) => v.id === selectedId.value) || null)
const heroVillageIndex = ref(0)
const featuredVillages = computed(() => villages.value.slice(0, 3))
const heroVillage = computed(() => featuredVillages.value[heroVillageIndex.value] || null)
const markerPositions = [
  { left: '20%', top: '22%' },
  { left: '66%', top: '36%' },
  { left: '46%', top: '64%' },
]
const heroArchiveNo = computed(() => `ARCHIVE SX-${String(heroVillageIndex.value + 1).padStart(3, '0')}`)
const heroCoordinates = computed(() => {
  const [lng, lat] = heroVillage.value?.coord || []
  return Number.isFinite(lng) && Number.isFinite(lat) ? `${lat.toFixed(4)}°N · ${lng.toFixed(4)}°E` : '坐标待补充'
})
const heroLocation = computed(() => {
  const village = heroVillage.value
  if (!village) return ''
  return [...new Set([village.province, village.city, village.district].filter(Boolean))].join(' · ')
})
function onSelect(id) { selectedId.value = id }
function selectHeroVillage(index) {
  heroVillageIndex.value = index
  selectedId.value = featuredVillages.value[index]?.id || selectedId.value
}
function doSearch() { router.push({ path: '/villages', query: keyword.value ? { q: keyword.value } : {} }) }
const hotWords = ['湖北乡村', '传统村落', '非遗文化', '青年实践']
function searchWord(w) { router.push({ path: '/villages', query: { q: w } }) }

const tickerItems = computed(() => [...headlines, ...headlines].map((h, i) => ({ ...h, key: `${h.id}-${i}` })))
const tickerPaused = ref(false)

onMounted(async () => {
  try {
    villages.value = await fetchAllVillages()
    selectedId.value = villages.value[0]?.id || ''
  } catch (error) {
    console.error('加载村庄数据失败:', error)
  } finally {
    loading.value = false
  }
})

const stats = computed(() => [
  { label: '已入驻乡村', value: villages.value.length, suffix: '+' },
  { label: '存档实践成果', value: platformDemoStats.practiceResults, suffix: '+' },
  { label: '已发布需求', value: platformDemoStats.publishedDemands, suffix: '+' },
  { label: '已对接团队', value: platformDemoStats.connectedTeams, suffix: '+' },
])
</script>

<style scoped>
.home { overflow: hidden; }
.hero {
  position: relative;
  min-height: calc(100vh - 68px);
  padding: clamp(4.8rem, 9vw, 8rem) 0 0;
  overflow: hidden;
  color: #f5efe2;
  background-color: var(--museum-black);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 76% 36%, rgba(95, 146, 125, .16), transparent 28%),
    linear-gradient(110deg, rgba(7,17,15,.2), rgba(7,17,15,.82));
}
.hero-glow { position: absolute; top: 18%; left: -9rem; width: 28rem; height: 28rem; border: 1px solid rgba(185,155,97,.12); border-radius: 50%; box-shadow: 0 0 0 4rem rgba(185,155,97,.02), 0 0 0 8rem rgba(185,155,97,.015); }
.hero-inner { position: relative; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(400px, .95fr); align-items: center; gap: clamp(3rem, 7vw, 7rem); width: min(100%, 1240px); margin: 0 auto; padding: 0 clamp(1.2rem, 4vw, 3rem) clamp(4rem, 7vw, 6rem); }
.eyebrow { display: flex; align-items: center; gap: 10px; color: var(--data-glow); font-family: var(--font-mono); font-size: 10px; letter-spacing: .17em; }
.eyebrow span { width: 28px; height: 1px; background: currentColor; }
.hero-overline { margin: 1.6rem 0 .5rem; color: var(--bronze-light); font-family: var(--font-display); font-size: .98rem; letter-spacing: .24em; }
.slogan { display: flex; flex-direction: column; margin-left: -.06em; color: #f7f1e5; font-size: clamp(2.8rem, 5.2vw, 5.5rem); font-weight: 600; line-height: 1.08; letter-spacing: .03em; }
.slogan em { margin-left: .1em; color: var(--bronze-light); font-style: normal; }
.slogan span:nth-child(2) em { color: var(--jade-light); }
.sub { max-width: 620px; margin-top: 1.8rem; color: rgba(243, 238, 228, .58); font-size: .94rem; line-height: 1.95; }
.hero-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 2rem; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 44px; padding: 0 18px; border: 1px solid var(--bronze-light); font-size: 13px; font-weight: 700; }
.btn.primary { color: var(--museum-black); background: var(--bronze-light); }
.btn.primary:hover { color: #fff; background: transparent; }
.btn.ghost { color: rgba(243,238,228,.82); border-color: var(--museum-line-bright); }
.btn.ghost:hover { color: var(--data-glow); border-color: var(--data-glow); }
.search-block { margin-top: 2.25rem; }
.search { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; width: min(100%, 610px); min-height: 50px; padding-left: 16px; color: var(--jade-light); background: rgba(255,255,255,.045); border: 1px solid var(--museum-line-bright); }
.search:focus-within { border-color: var(--data-glow); box-shadow: 0 0 0 3px rgba(118,216,188,.08); }
.search input { min-width: 0; padding: 0 12px; color: #f4eee1; background: transparent; border: 0; outline: 0; font-size: 13px; }
.search input::placeholder { color: rgba(243,238,228,.35); }
.search button { align-self: stretch; padding: 0 22px; color: var(--museum-black); background: var(--jade-light); border: 0; cursor: pointer; font-size: 12px; font-weight: 700; }
.hot { display: flex; align-items: center; flex-wrap: wrap; gap: .35rem .8rem; margin-top: .8rem; }
.hot-label { color: var(--bronze); font-family: var(--font-mono); font-size: 9px; letter-spacing: .14em; }
.hot-tag { padding: 0; color: rgba(243,238,228,.44); background: transparent; border: 0; cursor: pointer; font-size: 11px; }
.hot-tag:hover { color: var(--data-glow); }
.hero-exhibit { position: relative; min-height: 540px; padding: 18px; overflow: hidden; background: rgba(10,27,22,.56); border: 1px solid var(--museum-line-bright); box-shadow: inset 0 0 70px rgba(4,12,10,.36); }
.exhibit-corners i { position: absolute; z-index: 3; width: 18px; height: 18px; border-color: var(--bronze); }
.exhibit-corners i:nth-child(1) { top: 8px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.exhibit-corners i:nth-child(2) { top: 8px; right: 8px; border-top: 1px solid; border-right: 1px solid; }
.exhibit-corners i:nth-child(3) { bottom: 8px; left: 8px; border-bottom: 1px solid; border-left: 1px solid; }
.exhibit-corners i:nth-child(4) { right: 8px; bottom: 8px; border-right: 1px solid; border-bottom: 1px solid; }
.exhibit-head { position: relative; z-index: 2; display: flex; justify-content: space-between; color: rgba(243,238,228,.48); font-family: var(--font-mono); font-size: 9px; letter-spacing: .13em; }
.signal { display: flex; align-items: center; gap: 6px; color: var(--data-glow); }
.signal b { width: 5px; height: 5px; background: currentColor; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
.terrain { position: absolute; inset: 48px 0 176px; }
.terrain svg { width: 100%; height: 100%; }
.archive-marker { position: absolute; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 5px; color: rgba(243,238,228,.45); background: transparent; border: 0; cursor: pointer; transform: translate(-50%,-50%); }
.marker-dot { width: 9px; height: 9px; background: var(--jade-light); border: 1px solid rgba(255,255,255,.7); border-radius: 50%; box-shadow: 0 0 0 7px rgba(118,216,188,.1), 0 0 18px rgba(118,216,188,.44); transition: transform var(--transition), box-shadow var(--transition); }
.marker-label { display: flex; align-items: center; gap: 6px; padding: 6px 8px; white-space: nowrap; background: rgba(7,17,15,.72); border: 1px solid transparent; font-size: 10px; opacity: 0; transform: translateX(-5px); transition: opacity var(--transition), transform var(--transition), border-color var(--transition); }
.marker-label small { color: var(--bronze-light); font-family: var(--font-mono); font-size: 8px; }
.archive-marker:hover .marker-label, .archive-marker:focus-visible .marker-label, .archive-marker.active .marker-label { opacity: 1; transform: translateX(0); }
.archive-marker.active .marker-dot { transform: scale(1.25); box-shadow: 0 0 0 10px rgba(118,216,188,.12), 0 0 24px rgba(118,216,188,.7); }
.archive-marker.active .marker-label { color: #f5efe2; border-color: var(--museum-line-bright); }
.archive-marker:focus-visible { outline: 1px solid var(--data-glow); outline-offset: 3px; }
.exhibit-record { position: absolute; right: 18px; bottom: 18px; left: 18px; z-index: 3; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 1.5rem; min-height: 140px; padding: 16px 18px; background: linear-gradient(110deg, rgba(7,17,15,.96), rgba(15,39,32,.92)); border: 1px solid var(--museum-line-bright); box-shadow: 0 18px 50px rgba(0,0,0,.18); }
.record-no { color: var(--bronze-light); font-family: var(--font-mono); font-size: 8px; letter-spacing: .11em; }
.record-copy h2 { margin-top: 8px; color: #f5efe2; font-size: 1.45rem; }
.record-copy p { max-width: 370px; margin-top: 6px; color: rgba(243,238,228,.53); font-size: 11px; line-height: 1.65; }
.record-side { display: flex; min-width: 150px; flex-direction: column; align-items: flex-end; justify-content: flex-end; gap: 5px; color: rgba(243,238,228,.4); font-family: var(--font-mono); font-size: 8px; }
.record-side a { display: inline-flex; align-items: center; gap: 7px; margin-top: 8px; padding-top: 8px; color: var(--data-glow); border-top: 1px solid var(--museum-line); font-family: var(--font-ui); font-size: 11px; font-weight: 700; }
.record-side a:hover { color: var(--bronze-light); }
.exhibit-loading { display: flex; flex-direction: column; justify-content: center; color: rgba(243,238,228,.55); }
.scan-line { position: absolute; z-index: 1; top: 48px; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(118,216,188,.7), transparent); box-shadow: 0 0 18px rgba(118,216,188,.7); animation: scan 7s linear infinite; }
@keyframes scan { from { transform: translateY(0); } to { transform: translateY(400px); } }
.hero-stats { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); width: min(100%, 1240px); margin: 0 auto; padding: 0 clamp(1.2rem,4vw,3rem) 2.2rem; }
.stat { position: relative; display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; gap: 0 12px; padding: 1.2rem 1.3rem; border-top: 1px solid var(--museum-line); border-right: 1px solid var(--museum-line); }
.stat:first-child { border-left: 1px solid var(--museum-line); }
.stat-index { grid-row: 1 / 3; color: var(--bronze); font-family: var(--font-mono); font-size: 8px; }
.num { color: #f5efe2; font-family: var(--font-mono); font-size: clamp(1.45rem,3vw,2.35rem); line-height: 1; }
.suffix { color: var(--data-glow); font-size: .48em; }.label { margin-top: 7px; color: rgba(243,238,228,.42); font-size: 10px; letter-spacing: .08em; }
.demo-note { position: absolute; right: clamp(1.2rem,4vw,3rem); bottom: .55rem; color: rgba(243,238,228,.24); font-family: var(--font-mono); font-size: 7px; letter-spacing: .12em; }
.ticker { display: flex; align-items: center; min-height: 39px; overflow: hidden; background: #10231e; border-block: 1px solid var(--museum-line); }
.ticker-label { z-index: 2; flex: none; align-self: stretch; display: flex; align-items: center; padding: 0 clamp(1rem,4vw,3rem); color: var(--museum-black); background: var(--bronze-light); font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: .12em; }
.ticker-viewport { flex: 1; overflow: hidden; }.ticker-track { display: inline-flex; white-space: nowrap; animation: ticker-scroll 50s linear infinite; }.ticker-track.paused { animation-play-state: paused; }
.ticker-item { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 24px; color: rgba(243,238,228,.66); border-right: 1px solid var(--museum-line); font-size: 11px; }
.ticker-tag { color: var(--data-glow); font-family: var(--font-mono); font-size: 9px; font-weight: 700; }.ticker-source { color: rgba(243,238,228,.34); }
@keyframes ticker-scroll { to { transform: translateX(-50%); } }
.map-zone { padding: var(--spacing-section) 0; color: #f5efe2; background: linear-gradient(180deg, #10231e 0%, var(--museum-deep) 20%, var(--museum-black) 100%); }
.map-head { display: grid; grid-template-columns: 1fr minmax(260px,420px); align-items: end; gap: 2rem; margin-bottom: 2rem; }
.map-head h2 { color: #f5efe2; }.map-head > p { color: rgba(243,238,228,.5); font-size: 13px; line-height: 1.8; }
.map-head .section-kicker, .halls .section-kicker { color: var(--data-glow); }
.dashboard { display: grid; grid-template-columns: 280px minmax(0,1fr) 330px; gap: 1px; width: min(calc(100% - 2.4rem), 1420px); margin: 0 auto; background: var(--museum-line); border: 1px solid var(--museum-line); }
.panel-left, .panel-right, .panel-map { min-width: 0; overflow: hidden; background: var(--museum-black); border: 0; border-radius: 0; box-shadow: none; }
.panel-map { position: relative; }.panel-caption { position: absolute; z-index: 2; top: 0; right: 0; left: 0; display: flex; justify-content: space-between; padding: 10px 12px; color: var(--jade-light); background: linear-gradient(180deg,rgba(7,17,15,.86),transparent); font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; pointer-events: none; }
.panel-map :deep(.chart) { height: 70vh; min-height: 560px; }
.dashboard :deep(*) { --color-card: #10231e; --color-bg: #0b1815; --color-bg-deep: #07110f; --color-text: #f3eee4; --color-text-secondary: rgba(243,238,228,.58); --color-text-light: rgba(243,238,228,.36); --color-border: rgba(151,196,177,.2); --color-primary-dark: #91bba8; }
.halls { padding: var(--spacing-section) 0 calc(var(--spacing-section) + 2rem); color: #f5efe2; background: linear-gradient(180deg, var(--museum-black), #0b1916); }
.halls-head { display: grid; grid-template-columns: 1.2fr .8fr; align-items: end; gap: 3rem; margin-bottom: 2.5rem; }.halls-head h2 { max-width: 760px; color: #f5efe2; }.halls-head > p { color: rgba(243,238,228,.48); font-size: 13px; line-height: 1.8; }
.grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--museum-line); border: 1px solid var(--museum-line); }
.field-action { position: relative; padding: calc(var(--spacing-section) + 2.5rem) 0 var(--spacing-section); background: linear-gradient(180deg, var(--paper-deep) 0%, var(--paper) 24%, var(--paper-light) 72%, var(--paper-deep) 100%); }
.field-action::before { content: '田野'; position: absolute; right: 1vw; bottom: -5vw; color: rgba(49,92,76,.04); font-family: var(--font-accent); font-size: min(32vw,430px); line-height: 1; pointer-events: none; }
.field-action::after { content: ''; position: absolute; right: 0; bottom: 100%; left: 0; height: 120px; pointer-events: none; background: linear-gradient(180deg, rgba(11,25,22,0), #365047 58%, var(--paper-deep) 100%); }
.action-grid { position: relative; display: grid; grid-template-columns: .85fr 1.15fr; gap: clamp(3rem,7vw,7rem); align-items: start; }
.action-intro h2 { max-width: 520px; color: var(--jade-deep); }.action-intro > p:last-child { max-width: 520px; margin-top: 1.3rem; color: var(--ink-soft); font-size: .92rem; line-height: 1.9; }
.action-cards { display: grid; grid-template-columns: repeat(2,1fr); gap: 1rem; }
.action-card { position: relative; min-height: 310px; padding: 1.6rem; color: var(--ink); background: var(--paper-light); border: 1px solid var(--color-border); transition: border-color var(--transition), transform var(--transition); }
.action-card:hover { color: var(--ink); border-color: var(--bronze); transform: translateY(-4px); }.action-card > .app-icon { margin: 3rem 0 1.2rem; color: var(--jade); }
.action-no { color: var(--clay); font-family: var(--font-mono); font-size: 9px; letter-spacing: .14em; }.action-card h3 { color: var(--jade-deep); font-size: 1.5rem; }.action-card p { margin-top: .8rem; color: var(--ink-soft); font-size: .82rem; line-height: 1.8; }.action-link { position: absolute; right: 1.6rem; bottom: 1.6rem; left: 1.6rem; display: flex; align-items: center; justify-content: space-between; padding-top: .8rem; color: var(--jade-deep); border-top: 1px solid var(--color-border); font-size: 11px; font-weight: 700; }
@media (max-width: 1100px) { .hero-inner { grid-template-columns: 1fr 420px; gap: 3rem; }.dashboard { grid-template-columns: 240px minmax(0,1fr) 300px; } }
@media (max-width: 900px) {
  .hero-inner { grid-template-columns: 1fr; }.hero-exhibit { min-height: 480px; }.hero-stats { grid-template-columns: repeat(2,1fr); }.stat:nth-child(3) { border-left: 1px solid var(--museum-line); }
  .map-head, .halls-head, .action-grid { grid-template-columns: 1fr; }.dashboard { grid-template-columns: 1fr; }.panel-map { order: -1; }.panel-map :deep(.chart) { height: 62vh; min-height: 480px; }.grid { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 620px) {
  .hero { padding-top: 4rem; }.slogan { font-size: clamp(2.55rem,14vw,4.4rem); }.sub br { display: none; }.hero-actions, .btn { width: 100%; }.hero-exhibit { min-height: 460px; }.terrain { bottom: 200px; }.marker-label { font-size: 9px; }.exhibit-record { grid-template-columns: 1fr; gap: .7rem; min-height: 175px; }.record-side { align-items: flex-start; }.record-side span { display: none; }
  .hero-stats { padding-inline: 1rem; }.stat { padding: 1rem .7rem; }.ticker-label { display: none; }.map-head { padding-inline: 1.2rem; }.dashboard { width: calc(100% - 1.2rem); }.grid, .action-cards { grid-template-columns: 1fr; }.action-card { min-height: 280px; }
}
</style>
