<template>
  <section class="home">
    <!-- 英雄区 -->
    <div class="hero">
      <div class="hero-bg">
        <div
          v-for="(img, i) in heroImages"
          :key="i"
          class="hero-slide"
          :class="{ active: i === currentSlide }"
          :style="{ backgroundImage: `url(${img})` }"
        />
        <div class="hero-mask" />
      </div>

      <div class="hero-inner">
        <h1 class="slogan">
          <span>让乡村<em>被看见</em></span>
          <span>让经验<em>被留存</em></span>
          <span>让需求<em>被响应</em></span>
        </h1>
        <p class="sub">连接乡村与青年 · 让每一次下乡都有回响</p>
        <div class="search">
          <span class="search-ic">🔍</span>
          <input v-model="keyword" type="text" placeholder="搜索乡村、实践成果、需求…" @keyup.enter="doSearch" />
          <button @click="doSearch">搜索</button>
        </div>
        <div class="hot">
          <span class="hot-label">热门</span>
          <button v-for="w in hotWords" :key="w" class="hot-tag" @click="searchWord(w)">{{ w }}</button>
        </div>
        <div class="quick">
          <router-link to="/villages"><span class="q-icon">📖</span>探索乡村 →</router-link>
          <router-link to="/practice"><span class="q-icon">🎓</span>查看成果 →</router-link>
          <router-link to="/voice"><span class="q-icon">📢</span>发布需求 →</router-link>
        </div>
      </div>

      <!-- 装饰波浪底部 -->
      <svg class="hero-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path fill="var(--color-bg)" d="M0,32 C240,80 480,0 720,32 C960,64 1200,0 1440,32 L1440,80 L0,80 Z" />
      </svg>

      <!-- 乡村头条 -->
      <div class="ticker" @mouseenter="tickerPaused = true" @mouseleave="tickerPaused = false">
        <span class="ticker-label">🌾 乡村头条</span>
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
    </div>

    <!-- 数据看板 -->
    <div class="board">
      <div v-for="(s, i) in stats" :key="s.label" class="stat" :style="{ animationDelay: `${i * 0.1}s` }">
        <div class="stat-ring">
          <div class="num"><CountUp :value="s.value" /><span class="suffix">{{ s.suffix }}</span></div>
        </div>
        <div class="label">{{ s.label }}</div>
        <div class="stat-line" />
      </div>
    </div>

    <!-- 探索数乡 · 点亮中国 -->
    <div class="container map-section">
      <div class="map-head">
        <p class="section-kicker">数据可视化</p>
        <h2>探索数乡 · 点亮中国</h2>
        <p>点击地图上的村庄，在右侧查看它的资源、人物与影像</p>
      </div>
    </div>
    <div class="dashboard">
      <MapDashboardStats class="panel-left" :villages="villages" />
      <div class="panel-map">
        <ChinaMap2D :villages="villages" :selected-id="selectedId" @select-village="onSelect" />
      </div>
      <VillageInfoCard class="panel-right" :village="selectedVillage" :villages="villages" @select-village="onSelect" />
    </div>

    <!-- 六大栏目 -->
    <div class="section-alt">
      <div class="container modules">
        <div class="modules-head">
          <p class="section-kicker">探索平台</p>
          <h2>六大栏目，一站连接乡村与青年</h2>
          <p class="modules-sub">从读懂一个村，到发布一次需求、带走一件好物 —— 每个入口都是一段可以开始的旅程。</p>
        </div>
        <div class="grid">
          <ModuleCard v-for="m in modules.filter(m => m.enabled)" :key="m.id" :module="m" />
        </div>
      </div>
    </div>

    <!-- CTA 行动号召 -->
    <div class="cta">
      <div class="cta-inner">
        <div class="cta-head">
          <p class="cta-kicker">双向奔赴</p>
          <h2>无论你来自乡村，还是走向乡村，这里都有你的位置</h2>
        </div>
        <div class="cta-cards">
          <div class="cta-card village">
            <div class="cta-top">
              <div class="cta-ic">🌾</div>
              <div>
                <p class="cta-role">我是乡村 / 乡镇团委</p>
                <p class="cta-title">发布真实需求，让青年团队看见你</p>
              </div>
            </div>
            <p class="cta-sub">把村里的产业、文化、治理难题写成需求，等待高校团队精准响应。</p>
            <router-link to="/voice" class="cta-btn green">立即发布需求 →</router-link>
          </div>
          <div class="cta-card youth">
            <div class="cta-top">
              <div class="cta-ic">🎓</div>
              <div>
                <p class="cta-role">我是高校 / 学生团队</p>
                <p class="cta-title">带上专业与热情，找到该去的村庄</p>
              </div>
            </div>
            <p class="cta-sub">浏览真实需求、参考往届攻略，把论文写在祖国大地上。</p>
            <router-link to="/practice" class="cta-btn coral">立即参与实践 →</router-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import ChinaMap2D from '@/components/ChinaMap2D.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import MapDashboardStats from '@/components/MapDashboardStats.vue'
import VillageInfoCard from '@/components/VillageInfoCard.vue'
import CountUp from '@/components/CountUp.vue'
import { modules } from '@/modules.config.js'
import villages from '@/data/villages.json'
import headlines from '@/data/headlines.json'

const router = useRouter()
const keyword = ref('')
const selectedId = ref('')
const selectedVillage = computed(() => villages.find((v) => v.id === selectedId.value) || null)
function onSelect(id) { selectedId.value = id }
function doSearch() {
  router.push({ path: '/villages', query: keyword.value ? { q: keyword.value } : {} })
}
const hotWords = ['松阳县', '陈家铺村', '非遗文化', '乡村振兴']
function searchWord(w) {
  router.push({ path: '/villages', query: { q: w } })
}

// 英雄区背景轮播
const heroImages = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600',
  'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=1600',
]
const currentSlide = ref(0)
let slideTimer = null

// 乡村头条
const tickerItems = computed(() =>
  [...headlines, ...headlines].map((h, i) => ({ ...h, key: `${h.id}-${i}` }))
)
const tickerPaused = ref(false)

onMounted(() => {
  slideTimer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % heroImages.length
  }, 5000)
})
onBeforeUnmount(() => {
  if (slideTimer) clearInterval(slideTimer)
})

const stats = [
  { label: '已入驻乡村', value: 156, suffix: '+' },
  { label: '存档实践成果', value: 423, suffix: '+' },
  { label: '已发布需求', value: 89, suffix: '+' },
  { label: '已对接团队', value: 267, suffix: '+' },
]
</script>

<style scoped>
.home { padding-bottom: 0; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

/* ========== 英雄区 ========== */
.hero {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem clamp(1rem, 4vw, 2rem) 5.5rem;
  background: var(--gradient-hero);
  color: #fff;
  text-align: center;
  overflow: hidden;
}
.hero-bg { position: absolute; inset: 0; z-index: 0; }
.hero-slide {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0; transition: opacity 1.6s ease-in-out;
}
.hero-slide.active { opacity: 1; }
.hero-mask {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(29,33,27,.24) 0%, rgba(29,33,27,.55) 100%);
}
.hero-inner { position: relative; z-index: 1; max-width: 820px; }

/* 波浪装饰 */
.hero-wave {
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 60px;
  z-index: 1;
}
.hero-wave path { fill: var(--color-bg); }

/* 标语 */
.slogan {
  display: flex; flex-direction: column; gap: .4rem; align-items: center;
  font-size: clamp(32px, 5.4vw, 56px); font-weight: 800; line-height: 1.15;
  letter-spacing: 2px; text-shadow: 0 2px 16px rgba(0, 0, 0, .35);
}
.slogan em { font-style: normal; color: var(--color-accent); }
.hero .sub {
  font-size: clamp(16px, 2.1vw, 21px); font-weight: 500;
  margin: 1.8rem 0 2.4rem; opacity: 0.92;
  text-shadow: 0 1px 10px rgba(0, 0, 0, .3);
}

/* 搜索框 */
.search {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,.95); border-radius: 50px;
  padding: 5px 5px 5px 20px; max-width: 560px; margin: 0 auto;
  box-shadow: 0 8px 32px rgba(0,0,0,.15);
}
.search-ic { font-size: .95rem; opacity: .4; margin-right: 6px; }
.search input {
  flex: 1; border: none; background: transparent; outline: none;
  font-size: 15px; color: var(--color-text);
}
.search button {
  border: none; background: var(--gradient-hero); color: #fff;
  padding: 12px 30px; border-radius: 50px; font-size: 15px;
  cursor: pointer; font-weight: 600; white-space: nowrap;
  transition: filter var(--transition-fast);
}
.search button:hover { filter: brightness(1.1); }

/* 热门标签 */
.hot {
  display: flex; align-items: center; justify-content: center;
  gap: .6rem; flex-wrap: wrap; margin: 1.4rem 0 1.8rem;
}
.hot-label { font-size: 13px; color: rgba(255, 255, 255, .8); margin-right: .2rem; }
.hot-tag {
  border: 1px solid rgba(255, 255, 255, .35); background: rgba(255, 255, 255, .12);
  color: #fff; font-size: 13px; padding: 5px 15px; border-radius: 50px;
  cursor: pointer; transition: all var(--transition-fast); backdrop-filter: blur(4px);
  font-family: inherit;
}
.hot-tag:hover { background: var(--color-highlight); border-color: var(--color-highlight); }

/* 快捷入口 */
.quick { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; }
.quick a {
  display: inline-flex; align-items: center; gap: .4rem;
  color: #fff; font-weight: 500; padding: .5rem 1rem;
  border-radius: 50px; transition: all var(--transition-fast);
}
.quick a:hover { background: rgba(255,255,255,.12); color: var(--color-accent); }
.q-icon { font-size: 1rem; }

/* 头条滚动 */
.ticker {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  display: flex; align-items: center;
  background: rgba(29, 33, 27, .45);
  backdrop-filter: blur(6px);
  border-top: 1px solid rgba(255, 255, 255, .12);
}
.ticker-label {
  flex: none; padding: 0 18px; height: 34px; display: flex; align-items: center;
  font-weight: 700; font-size: 14px; color: #fff;
  background: var(--color-highlight); white-space: nowrap;
}
.ticker-viewport { flex: 1; overflow: hidden; }
.ticker-track {
  display: inline-flex; align-items: center; white-space: nowrap;
  animation: ticker-scroll 40s linear infinite;
}
.ticker-track.paused { animation-play-state: paused; }
.ticker-item {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0 26px; height: 34px; line-height: 34px;
  color: #f5f2ec; font-size: 14px; text-decoration: none;
  border-left: 1px solid rgba(255, 255, 255, .1);
  transition: color var(--transition-fast);
}
a.ticker-item:hover { color: var(--color-accent); }
.ticker-tag {
  font-size: 12px; font-weight: 700; color: #fff;
  background: var(--color-primary); padding: 2px 9px; border-radius: 20px;
}
.ticker-source { color: rgba(245, 242, 236, .55); font-size: 12px; }
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ========== 数据看板 ========== */
.board {
  display: grid; grid-template-columns: repeat(4, 1fr);
  padding: 3.8rem clamp(2rem, 6vw, 6rem) 3rem;
  text-align: center;
  gap: 0;
}
.stat {
  position: relative;
  padding: .5rem 1rem;
}
.stat + .stat::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--color-border), transparent);
}
.stat-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .8rem;
}
.num {
  font-family: var(--sx-serif);
  font-size: clamp(48px, 7vw, 90px);
  font-weight: 800;
  color: var(--color-primary-dark);
  line-height: 1;
  display: inline-flex;
  align-items: baseline;
}
.num .suffix {
  font-size: .4em;
  color: var(--color-highlight);
  margin-left: 2px;
  font-weight: 700;
}
.label {
  font-size: clamp(14px, 1.4vw, 16px);
  color: var(--color-text-secondary);
  margin-top: .5rem;
  letter-spacing: 1px;
  font-weight: 500;
}
.stat-line {
  width: 32px;
  height: 3px;
  border-radius: 3px;
  background: var(--color-accent);
  margin: .8rem auto 0;
  opacity: 0;
  transition: opacity var(--transition), width var(--transition);
}
.stat:hover .stat-line {
  opacity: 1;
  width: 48px;
}

@media (max-width: 720px) {
  .board { grid-template-columns: repeat(2, 1fr); gap: 1.5rem 0; }
  .stat:nth-child(3)::before { display: none; }
}

/* ========== 地图区域 ========== */
.map-section { padding-top: 0; }
.map-head { text-align: center; margin-bottom: 1.6rem; }
.map-head h2 { font-size: clamp(22px, 3vw, 32px); color: var(--color-primary-dark); }
.map-head p { color: var(--color-text-secondary); margin-top: .5rem; }

.section-kicker {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-highlight);
  letter-spacing: .08em;
  margin: 0 0 .6rem;
}

.dashboard {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 360px;
  gap: 1.2rem;
  padding: 0 clamp(1.5rem, 4vw, 3.5rem) 2rem;
  margin: 0 auto;
}
.panel-left, .panel-right {
  background: var(--color-card);
  min-width: 0;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}
.panel-map { min-width: 0; overflow: hidden; }
.panel-map :deep(.chart) { height: 72vh; }

/* ========== 六大栏目 ========== */
.modules { padding-top: 3.4rem; padding-bottom: 3.4rem; }
.modules-head { text-align: center; max-width: 640px; margin: 0 auto 2.4rem; }
.modules-head h2 { font-size: clamp(22px, 3vw, 32px); color: var(--color-primary-dark); }
.modules-sub {
  margin-top: .9rem;
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.4rem;
}

@media (max-width: 860px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }

/* ========== CTA ========== */
.cta {
  padding: 4.5rem clamp(1rem, 4vw, 2rem) 5rem;
  background:
    radial-gradient(ellipse at 15% 20%, rgba(232, 201, 155, .3), transparent 50%),
    radial-gradient(ellipse at 85% 80%, rgba(224, 122, 95, .25), transparent 50%),
    var(--gradient-cta);
}
.cta-inner { max-width: 1040px; margin: 0 auto; }
.cta-head { text-align: center; color: #fff; margin-bottom: 2.6rem; }
.cta-kicker {
  font-size: 13px; font-weight: 700; letter-spacing: .1em;
  color: var(--color-accent); margin: 0 0 .6rem; text-transform: uppercase;
}
.cta-head h2 { font-size: clamp(21px, 3vw, 30px); line-height: 1.4; }
.cta-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.6rem; }
.cta-card {
  position: relative; overflow: hidden;
  background: var(--color-card); border-radius: var(--radius-lg);
  padding: 2.2rem 2rem 2.4rem;
  box-shadow: var(--shadow-lg);
  transition: transform var(--transition), box-shadow var(--transition);
}
.cta-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}
.cta-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
}
.cta-card.village::before { background: var(--color-primary); }
.cta-card.youth::before { background: var(--color-highlight); }
.cta-top {
  display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;
}
.cta-ic {
  display: grid; place-items: center;
  width: 56px; height: 56px; flex-shrink: 0;
  font-size: 1.8rem; border-radius: 14px;
  background: var(--color-bg);
  box-shadow: var(--shadow-sm);
}
.cta-role {
  font-size: .82rem; font-weight: 600; color: var(--color-text-light);
  margin: 0 0 .2rem;
}
.cta-title {
  font-size: 1.15rem; font-weight: 700; color: var(--color-primary-dark);
  margin: 0; line-height: 1.4;
}
.cta-sub {
  font-size: .9rem; line-height: 1.7;
  color: var(--color-text-secondary); margin: 0 0 1.6rem;
}
.cta-btn {
  display: inline-block; padding: .75rem 2rem; border-radius: 50px;
  color: #fff; font-weight: 600; font-size: .95rem;
  transition: filter var(--transition-fast), transform var(--transition-fast);
}
.cta-btn.green { background: var(--color-primary); }
.cta-btn.coral { background: var(--color-highlight); }
.cta-btn:hover { filter: brightness(1.08); transform: translateX(3px); }

@media (max-width: 640px) {
  .cta-cards { grid-template-columns: 1fr; }
}

/* ========== 响应式地图 ========== */
@media (max-width: 900px) {
  .dashboard { grid-template-columns: 1fr; }
}

/* ========== 减少动画偏好 ========== */
@media (prefers-reduced-motion: reduce) {
  .hero-slide { transition: none; }
  .ticker-track { animation: none; }
}
</style>
