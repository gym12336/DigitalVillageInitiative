<template>
  <section v-if="village" class="vd">
    <!-- ▍感受：全宽大图轮播 -->
    <div class="gallery" @mouseenter="pauseAuto" @mouseleave="resumeAuto">
      <button v-if="gallery.length > 1" class="g-arrow left" aria-label="上一张" @click="prevImg">‹</button>
      <transition name="fade" mode="out-in">
        <div :key="galleryIndex" class="g-stage" :style="{ backgroundImage: `url(${gallery[galleryIndex]})` }">
          <img class="g-probe" :src="gallery[galleryIndex]" alt="" @error="onImgError" />
        </div>
      </transition>
      <div class="gallery-overlay">
        <div class="archive-label">
          <span>DIGITAL VILLAGE CHRONICLE</span>
          <strong>{{ archiveNo }}</strong>
        </div>
        <div class="cover-title">
          <p>{{ village.province }} · {{ village.city }}</p>
          <div class="cover-name">{{ village.name }}</div>
        </div>
        <div v-if="village.coord?.length" class="cover-coord">
          <span>{{ village.coord[1] }}° N</span>
          <span>{{ village.coord[0] }}° E</span>
        </div>
      </div>
      <button v-if="gallery.length > 1" class="g-arrow right" aria-label="下一张" @click="nextImg">›</button>
      <div v-if="gallery.length > 1" class="g-dots">
        <button v-for="(g, i) in gallery" :key="i" class="dot" :class="{ active: i === galleryIndex }" @click="galleryIndex = i" />
      </div>
    </div>

    <div class="container">
      <router-link to="/villages" class="back">← 返回乡村列表</router-link>

      <!-- ▍感受：基本信息 + 荣誉 -->
      <header class="head">
        <p class="head-kicker">ARCHIVE METADATA / 档案信息</p>
        <h1>{{ village.name }}</h1>
        <p class="loc">{{ village.province }} · {{ village.city }} · {{ village.district }}<template v-if="village.town"> · {{ village.town }}</template></p>
        <div class="honors">
          <span v-for="h in village.honors" :key="h" class="honor-badge">{{ h }}</span>
        </div>
        <div class="info-bar">
          <span class="cert" :class="certClass">✓ {{ village.certLabel }}</span>
          <span v-if="village.manager && village.manager.name" class="manager">
            <span class="m-avatar">{{ village.manager.name.charAt(0) }}</span>
            <span class="m-text">{{ village.manager.name }} · {{ village.manager.role }}</span>
          </span>
          <span class="socials">
            <span v-for="s in socialList" :key="s.key" class="social" :class="{ off: !s.on }" :title="s.on ? s.label : `${s.label}（未关联）`">{{ s.icon }}</span>
          </span>
        </div>
      </header>

      <!-- ▍感受：速览信息卡 facts -->
      <section v-if="village.facts" class="facts-strip">
        <div class="fact-card">
          <span class="fact-icon">01</span>
          <span class="fact-label">海拔</span>
          <span class="fact-value">{{ village.facts.elevation }}</span>
        </div>
        <div class="fact-card">
          <span class="fact-icon">02</span>
          <span class="fact-label">建村年代</span>
          <span class="fact-value">{{ village.facts.founded }}</span>
        </div>
        <div class="fact-card">
          <span class="fact-icon">03</span>
          <span class="fact-label">村落规模</span>
          <span class="fact-value">{{ village.facts.scale }}</span>
        </div>
        <div class="fact-card">
          <span class="fact-icon">04</span>
          <span class="fact-label">最佳季节</span>
          <span class="fact-value">{{ village.facts.bestSeason }}</span>
        </div>
        <div class="fact-card">
          <span class="fact-icon">05</span>
          <span class="fact-label">到达方式</span>
          <span class="fact-value">{{ village.facts.access }}</span>
        </div>
      </section>

      <!-- ▍了解：分段正文 sections（双列卡片） -->
      <section v-if="village.sections" class="block">
        <h2 class="b-title">深入了解</h2>
        <div class="sec-grid">
          <div v-for="(text, title) in village.sections" :key="title" class="sec-part">
            <h3 class="sec-title">{{ title }}</h3>
            <p class="sec-text">{{ text }}</p>
          </div>
        </div>
      </section>
      <!-- 兜底：无 sections 时展示原 intro -->
      <section v-else class="block section-alt">
        <h2 class="b-title">村庄详述</h2>
        <p class="intro">{{ village.intro }}</p>
      </section>

      <!-- ▍了解：历史沿革时间线 timeline -->
      <section v-if="village.timeline && village.timeline.length" class="block section-alt">
        <h2 class="b-title">历史沿革</h2>
        <div class="timeline">
          <div v-for="(node, i) in village.timeline" :key="i" class="tl-node" :class="{ 'tl-first': i === 0, 'tl-last': i === village.timeline.length - 1 }">
            <div class="tl-dot"></div>
            <div class="tl-card">
              <span class="tl-year">{{ node.year }}</span>
              <h3 class="tl-title">{{ node.title }}</h3>
              <p class="tl-desc">{{ node.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ▍了解：特色标签（卡片式） -->
      <section class="block">
        <h2 class="b-title">特色标签</h2>
        <div class="tag-grid">
          <div v-for="(items, cat) in village.tags" :key="cat" class="tag-card">
            <span class="cat-name">{{ cat }}</span>
            <div class="cat-tags">
              <router-link v-for="t in items" :key="t" class="mini-tag" :to="{ path: '/villages/tags', query: { tag: t } }">{{ t }}</router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- ▍了解：特产 & 美食 specialties -->
      <section v-if="village.specialties && village.specialties.length" class="block section-alt">
        <h2 class="b-title">特产 & 美食</h2>
        <div class="sp-grid">
          <div v-for="(sp, i) in village.specialties" :key="i" class="sp-card">
            <span class="sp-icon">{{ sp.icon }}</span>
            <div class="sp-body">
              <h3 class="sp-name">{{ sp.name }}</h3>
              <p class="sp-desc">{{ sp.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ▍了解：民俗节庆 festivals -->
      <section v-if="village.festivals && village.festivals.length" class="block">
        <h2 class="b-title">民俗节庆</h2>
        <div class="fe-grid">
          <div v-for="(fe, i) in village.festivals" :key="i" class="fe-card">
            <span class="fe-time">{{ fe.time }}</span>
            <h3 class="fe-name">{{ fe.name }}</h3>
            <p class="fe-desc">{{ fe.description }}</p>
          </div>
        </div>
      </section>

      <!-- ▍了解：导览点位 -->
      <section class="block section-alt">
        <h2 class="b-title">导览点位</h2>
        <ol class="guide">
          <li v-for="(g, i) in village.guide" :key="i">
            <span class="g-idx">{{ i + 1 }}</span>
            <div><p class="g-name">{{ g.name }}</p><p class="g-note">{{ g.note }}</p></div>
          </li>
        </ol>
      </section>

      <!-- ▍了解：乡村人物 -->
      <section class="block">
        <h2 class="b-title">乡村人物</h2>
        <div v-if="people.length" class="people-grid">
          <article v-for="(p, i) in people" :key="i" class="person-card">
            <div class="p-avatar">{{ (p.name || '人').slice(0, 1) }}</div>
            <div class="p-body">
              <p class="p-name">{{ p.name || '待采集' }}</p>
              <p class="p-role">{{ p.role || '乡村人物' }}</p>
            </div>
          </article>
        </div>
        <div v-else class="people-empty">
          <p class="pe-title">人物故事待实地采集录入</p>
          <p class="pe-note">队员完成走访后，可为本村录入驻村干部、返乡青年、手艺人等核心人物。</p>
        </div>
      </section>

      <!-- ▍关联：该村实践成果 -->
      <section v-if="relatedResults.length" class="block section-alt">
        <h2 class="b-title">该村实践成果</h2>
        <div class="res-grid">
          <article v-for="r in relatedResults" :key="r.id" class="res-card" @click="goPractice">
            <div class="res-cover" :style="{ backgroundImage: `url(${r.cover})` }"></div>
            <div class="res-body"><p class="res-title">{{ r.title }}</p><p class="res-school">{{ r.school }}</p></div>
          </article>
        </div>
      </section>

      <!-- ▍关联：工具条 -->
      <section class="block actions">
        <button class="act-btn" @click="soon">生成导览地图</button>
        <button class="act-btn" @click="soon">分享本页</button>
        <button class="act-btn" @click="soon">生成海报</button>
      </section>
    </div>

    <!-- 浮动：点赞 + 收藏 -->
    <div class="float-actions">
      <button class="fa-btn" :class="{ on: liked }" @click="liked = !liked">{{ liked ? '已赞' : '赞' }}<span>点赞</span></button>
      <button class="fa-btn" :class="{ on: faved }" @click="faved = !faved">{{ faved ? '已藏' : '藏' }}<span>收藏</span></button>
    </div>

    <AppToast ref="toastRef" />
  </section>
  <section v-else-if="error" class="vd empty-page">
    <p>{{ error }}。<router-link to="/villages">返回乡村列表</router-link></p>
  </section>
  <section v-else class="vd empty-page">
    <div class="skeleton" aria-label="正在加载乡村档案">
      <div class="sk-banner" />
      <div class="sk-container">
        <div class="sk-line sk-title" />
        <div class="sk-line sk-sub" />
        <div class="sk-line sk-sub short" />
        <div class="sk-row"><div class="sk-card" /><div class="sk-card" /><div class="sk-card" /></div>
        <div class="sk-line sk-text" />
        <div class="sk-line sk-text" />
        <div class="sk-line sk-text short" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { fetchVillage } from '@/api/villages.js'
import practiceData from '@/modules/practice/practice-data.json'

const route = useRoute()
const village = ref(null)
const loading = ref(true)
const error = ref('')
const archiveNo = computed(() => `CN-${String(village.value?.id || '000').toUpperCase().slice(0, 12)}`)

async function loadVillage(id) {
  loading.value = true
  error.value = ''
  village.value = null
  galleryIndex.value = 0
  try {
    village.value = await fetchVillage(id)
    if (!village.value) error.value = '未找到该村庄'
  } catch (reason) {
    error.value = reason.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const toastRef = ref(null)
const soon = () => toastRef.value?.show('功能即将上线')

/* ---- 大图轮播 ---- */
const gallery = computed(() => (village.value?.gallery && village.value.gallery.length ? village.value.gallery : [village.value?.cover].filter(Boolean)))
const galleryIndex = ref(0)
let autoTimer = null
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
function nextImg() { galleryIndex.value = (galleryIndex.value + 1) % gallery.value.length }
function prevImg() { galleryIndex.value = (galleryIndex.value - 1 + gallery.value.length) % gallery.value.length }
function startAuto() { if (reduceMotion || gallery.value.length < 2) return; stopAuto(); autoTimer = setInterval(nextImg, 5000) }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null } }
const pauseAuto = stopAuto
const resumeAuto = startAuto
function onImgError(e) {
  const stage = e.target.parentElement
  if (stage) { stage.style.backgroundImage = 'none'; stage.classList.add('g-fallback') }
}

/* ---- 认证配色 ---- */
const certClass = computed(() => {
  const lvl = village.value?.certLevel
  return lvl === 'province' ? 'cert-province' : lvl === 'county' ? 'cert-county' : 'cert-township'
})

/* ---- 社交平台 ---- */
const SOCIAL_META = [
  { key: 'wechat', icon: '视', label: '微信视频号' },
  { key: 'douyin', icon: '抖', label: '抖音' },
  { key: 'kuaishou', icon: '快', label: '快手' },
  { key: 'xiaohongshu', icon: '书', label: '小红书' },
  { key: 'bilibili', icon: 'B', label: 'B站' },
  { key: 'gzh', icon: '微', label: '微信公众号' },
]
const socialList = computed(() => SOCIAL_META.map((s) => ({ ...s, on: !!(village.value?.socials && village.value.socials[s.key]) })))

/* ---- 乡村人物 ---- */
const people = computed(() => village.value?.people || [])

/* ---- 该村实践成果 ---- */
const relatedResults = computed(() => {
  if (!village.value) return []
  return (practiceData.results || []).filter((r) => r.village === village.value.name).slice(0, 3)
})

function goPractice() { window.location.hash = '#/practice' }

/* ---- 点赞收藏 ---- */
const liked = ref(false)
const faved = ref(false)

onMounted(async () => {
  await loadVillage(route.params.id)
  startAuto()
})
watch(() => route.params.id, async (id) => {
  stopAuto()
  await loadVillage(id)
  startAuto()
})
onBeforeUnmount(stopAuto)
</script>

<style scoped>
/* ===== 基础布局 ===== */
.vd { padding-bottom: 4rem; position: relative; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 clamp(1.5rem, 4vw, 3rem); }
.back { display: inline-block; margin: 1.6rem 0 .4rem; color: var(--color-primary); font-size: .9rem; }
.back:hover { color: var(--color-primary-dark); }
.empty-page { text-align: center; padding: 4rem 1rem; color: var(--color-text-light); }

/* 骨架屏 */
.skeleton { width: 100%; text-align: left; }
.sk-banner, .sk-line, .sk-card {
  background: linear-gradient(90deg, var(--paper-deep) 25%, var(--paper-light) 50%, var(--paper-deep) 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.5s infinite;
}
.sk-banner { width: 100%; height: 280px; }
.sk-container { max-width: 1120px; margin: 1.5rem auto; padding: 0 clamp(1.5rem,4vw,3rem); display: flex; flex-direction: column; gap: .8rem; }
.sk-line { height: 14px; }.sk-title { width: 40%; height: 38px; }.sk-sub { width: 60%; }.sk-sub.short { width: 30%; }.sk-text { width: 100%; }.sk-text.short { width: 70%; }
.sk-row { display: flex; gap: 1px; margin: .7rem 0; background: var(--color-border); }.sk-card { flex: 1; height: 100px; }
@keyframes sk-shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }

/* ===== 通用 block ===== */
.block { margin-top: 2rem; padding-top: 1.8rem; border-top: 1px solid var(--color-border); }
.b-title {
  font-size: clamp(1.15rem, 2vw, 1.35rem); color: var(--color-primary-dark);
  font-family: var(--sx-serif); margin: 0 0 1.2rem;
  display: flex; align-items: center; gap: .65rem;
}
.b-title::before {
  content: ''; width: 4px; height: 1.2em;
  background: var(--color-primary); border-radius: 2px; flex-shrink: 0;
}
.section-alt {
  background: var(--gradient-section-odd); border-radius: var(--radius-lg);
  padding: 1.8rem 2rem; margin: 0 -0.5rem; border-top: none;
}
@media (max-width: 760px) {
  .section-alt { padding: 1.4rem 1.2rem; margin: 0; border-radius: var(--radius); }
}

/* ===== 模块1 全宽大图轮播 ===== */
.gallery {
  position: relative; overflow: hidden; margin-bottom: 2rem;
  width: 100vw; margin-left: 50%; transform: translateX(-50%);
}
.g-stage {
  width: 100%; aspect-ratio: 21 / 8;
  background-size: cover; background-position: center; background-color: var(--color-primary);
}
.g-stage.g-fallback { background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary)); }
.g-probe { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.g-arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
  width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(0,0,0,.35); color: #fff; font-size: 2rem; line-height: 1;
  transition: background var(--transition-fast);
}
.g-arrow.left { left: clamp(.8rem, 3vw, 2rem); }
.g-arrow.right { right: clamp(.8rem, 3vw, 2rem); }
.g-arrow:hover { background: rgba(0,0,0,.55); }
.g-dots { position: absolute; bottom: 1.2rem; left: 50%; transform: translateX(-50%); display: flex; gap: .5rem; z-index: 2; }
.g-dots .dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgba(255,255,255,.6); cursor: pointer; padding: 0; background: transparent; transition: all var(--transition-fast); }
.g-dots .dot.active { background: #fff; border-color: #fff; width: 28px; border-radius: 50px; }
.fade-enter-active, .fade-leave-active { transition: opacity var(--transition); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 600px) { .g-stage { aspect-ratio: 16 / 9; } }

/* ===== 模块2 基本信息 ===== */
.head { margin-bottom: 1.2rem; }
.head h1 { font-size: clamp(34px, 5vw, 52px); font-weight: 700; color: var(--color-primary-dark); font-family: var(--sx-serif); }
.loc { margin: .5rem 0 .8rem; color: var(--color-text-secondary); font-size: 1rem; }
.honors { display: flex; flex-wrap: wrap; gap: .5rem; }
.honor-badge { padding: .3rem .9rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); font-size: .82rem; font-weight: 600; }
.info-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
.cert { padding: .35rem .9rem; border-radius: 50px; font-size: .82rem; font-weight: 700; background: #e8f5e9; }
.cert-township { color: var(--color-primary); }
.cert-county { color: #4a8fbf; background: #e3f2fd; }
.cert-province { color: #b8860b; background: #fdf3d8; }
.manager { display: inline-flex; align-items: center; gap: .5rem; }
.m-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--color-secondary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: .9rem; }
.m-text { font-size: .85rem; color: var(--color-text-secondary); }
.socials { display: inline-flex; gap: .5rem; margin-left: auto; }
.social { width: 32px; height: 32px; border-radius: 50%; background: var(--color-accent); display: inline-flex; align-items: center; justify-content: center; font-size: 1rem; cursor: pointer; transition: opacity var(--transition-fast); }
.social.off { opacity: .35; cursor: not-allowed; filter: grayscale(1); }

/* ===== 速览信息卡 facts ===== */
.facts-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: .8rem;
  margin: 1.6rem 0 0;
}
.fact-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.2rem .8rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .35rem;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.fact-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); }
.fact-icon { font-size: 1.8rem; line-height: 1; }
.fact-label { font-size: .74rem; color: var(--color-text-light); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.fact-value { font-size: .84rem; color: var(--color-text-secondary); font-weight: 500; line-height: 1.4; }
@media (max-width: 700px) { .facts-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 420px) { .facts-strip { grid-template-columns: repeat(2, 1fr); } }

/* ===== 分段正文 sections（双列） ===== */
.sec-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.2rem;
}
.sec-part {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.3rem 1.3rem 1.1rem;
  transition: box-shadow var(--transition-fast);
}
.sec-part:hover { box-shadow: var(--shadow-sm); }
.sec-title {
  font-size: .98rem; font-weight: 700; color: var(--color-primary-dark);
  font-family: var(--sx-serif); margin: 0 0 .5rem;
  padding-bottom: .4rem; border-bottom: 2px solid var(--color-accent);
}
.sec-text { font-size: .9rem; line-height: 1.8; color: var(--color-text-secondary); text-indent: 2em; }
@media (max-width: 640px) { .sec-grid { grid-template-columns: 1fr; } }

.intro { font-size: .98rem; line-height: 2; color: var(--color-text-secondary); text-indent: 2em; }

/* ===== 历史时间线 timeline ===== */
.timeline { position: relative; padding-left: 2.2rem; }
.timeline::before {
  content: ''; position: absolute; left: .7rem; top: 0; bottom: 0;
  width: 2px; background: linear-gradient(180deg, var(--color-primary), var(--color-secondary-soft)); border-radius: 1px;
}
.tl-node { position: relative; padding-bottom: 1.6rem; }
.tl-node:last-child { padding-bottom: 0; }
.tl-dot {
  position: absolute; left: calc(-2.2rem + .14rem); top: .5rem;
  width: 15px; height: 15px; border-radius: 50%;
  background: var(--color-card); border: 3px solid var(--color-primary); z-index: 1;
}
.tl-first .tl-dot {
  background: var(--color-highlight); border-color: var(--color-highlight);
  box-shadow: 0 0 0 5px var(--color-highlight-soft);
}
.tl-card {
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); padding: 1rem 1.1rem;
  transition: box-shadow var(--transition-fast);
}
.tl-card:hover { box-shadow: var(--shadow-sm); }
.tl-year {
  display: inline-block; font-size: .76rem; font-weight: 700;
  padding: .15rem .65rem; border-radius: 50px;
  background: var(--color-accent-soft); color: var(--color-primary-dark); margin-bottom: .4rem;
}
.tl-title { font-size: .96rem; font-weight: 700; color: var(--color-text); margin: 0 0 .3rem; font-family: var(--sx-serif); }
.tl-desc { font-size: .86rem; color: var(--color-text-secondary); line-height: 1.65; margin: 0; }

/* ===== 特产美食 specialties（4列） ===== */
.sp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .9rem;
}
.sp-card {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: .5rem;
  padding: 1.2rem 1rem; border-radius: var(--radius-sm);
  background: var(--color-card); border: 1px solid var(--color-border);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.sp-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); }
.sp-icon { font-size: 2.2rem; line-height: 1; }
.sp-body { min-width: 0; }
.sp-name { font-size: .9rem; font-weight: 700; color: var(--color-primary-dark); margin: 0 0 .25rem; font-family: var(--sx-serif); }
.sp-desc { font-size: .8rem; color: var(--color-text-secondary); line-height: 1.5; margin: 0; }
@media (max-width: 800px) { .sp-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 420px) { .sp-grid { grid-template-columns: 1fr 1fr; } }

/* ===== 民俗节庆 festivals ===== */
.fe-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;
}
.fe-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  display: flex; flex-direction: column; gap: .35rem;
}
.fe-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
.fe-time {
  display: inline-block; align-self: flex-start;
  font-size: .72rem; font-weight: 700;
  padding: .15rem .55rem; border-radius: 50px;
  background: var(--color-highlight-soft); color: var(--color-highlight);
}
.fe-name { font-size: .94rem; font-weight: 700; color: var(--color-text); margin: 0; font-family: var(--sx-serif); }
.fe-desc { font-size: .82rem; color: var(--color-text-secondary); line-height: 1.55; margin: 0; }

@media (max-width: 700px) {
  .fe-grid { grid-template-columns: 1fr; }
}

/* ===== 特色标签（3列卡片式） ===== */
.tag-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;
}
.tag-card {
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); padding: .9rem 1rem;
}
.cat-name { display: block; font-size: .82rem; font-weight: 700; color: var(--color-primary); margin-bottom: .5rem; }
.cat-tags { display: flex; flex-wrap: wrap; gap: .35rem; }
.mini-tag { padding: .2rem .7rem; border-radius: 50px; background: var(--sx-paper-deep); color: var(--color-text-secondary); font-size: .78rem; transition: background var(--transition-fast); }
.mini-tag:hover { background: var(--color-accent); color: var(--color-primary-dark); }
@media (max-width: 760px) { .tag-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .tag-grid { grid-template-columns: 1fr; } }

/* ===== 导览点位 ===== */
.guide { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
.guide li { display: flex; gap: 1rem; align-items: flex-start; }
.g-idx { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .85rem; font-weight: 700; }
.g-name { font-weight: 600; color: var(--color-text); font-size: .95rem; }
.g-note { font-size: .85rem; color: var(--color-text-light); margin-top: .15rem; }

/* ===== 乡村人物 ===== */
.people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.person-card { display: flex; align-items: center; gap: .8rem; padding: 1rem 1.1rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); }
.p-avatar { flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--sx-serif); font-size: 1.25rem; }
.p-name { font-weight: 600; color: var(--color-text); }
.p-role { font-size: .82rem; color: var(--color-text-light); margin-top: .15rem; }
.people-empty { padding: 1.6rem; text-align: center; background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.pe-title { font-weight: 600; color: var(--color-text-secondary); }
.pe-note { font-size: .84rem; color: var(--color-text-light); margin-top: .4rem; }

/* ===== 实践成果 ===== */
.res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.res-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; cursor: pointer; box-shadow: var(--shadow-card); transition: transform var(--transition), box-shadow var(--transition); }
.res-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.res-cover { aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: var(--color-primary); }
.res-body { padding: .9rem 1rem; }
.res-title { font-size: .92rem; font-weight: 600; color: var(--color-text); line-height: 1.4; }
.res-school { font-size: .82rem; color: var(--color-primary); font-weight: 600; margin-top: .35rem; }

/* ===== 工具条 ===== */
.actions { display: flex; flex-wrap: wrap; gap: .9rem; }
.act-btn { padding: .75rem 1.5rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-text-secondary); font-size: .92rem; cursor: pointer; transition: all var(--transition); }
.act-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: #f8fdf6; }

/* ===== 浮动点赞收藏 ===== */
.float-actions { position: fixed; right: 1.6rem; bottom: 2.5rem; display: flex; flex-direction: column; gap: .8rem; z-index: 100; }
.fa-btn { display: flex; flex-direction: column; align-items: center; gap: .1rem; width: 60px; height: 60px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-card); box-shadow: var(--shadow-card); cursor: pointer; font-size: 1.25rem; color: var(--color-text-secondary); transition: transform var(--transition); }
.fa-btn span { font-size: .64rem; }
.fa-btn:hover { transform: scale(1.08); }
.fa-btn.on { border-color: var(--color-highlight); color: var(--color-highlight); }

/* ===== 数字村志视觉覆盖 ===== */
.gallery { background: var(--museum-black); }
.gallery::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(rgba(151,196,177,.11) 1px,transparent 1px),
    linear-gradient(90deg,rgba(151,196,177,.11) 1px,transparent 1px),
    linear-gradient(180deg,rgba(7,17,15,.08),rgba(7,17,15,.78));
  background-size: 48px 48px,48px 48px,auto;
}
.g-stage { min-height: 440px; filter: saturate(.72) contrast(1.08); }
.gallery-overlay { position: absolute; inset: 0; z-index: 2; display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto 1fr auto; padding: clamp(1.2rem,4vw,3.5rem); color: #f5efe2; pointer-events: none; }
.archive-label { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; color: var(--data-glow); font-family: var(--font-mono); font-size: 8px; letter-spacing: .14em; }
.archive-label strong { color: var(--bronze-light); font-size: 11px; font-weight: 500; }
.cover-title { align-self: end; grid-column: 1; grid-row: 3; }
.cover-title p { margin-bottom: .5rem; color: var(--bronze-light); font-family: var(--font-mono); font-size: 9px; letter-spacing: .16em; }
.cover-name { color: #fff; font-family: var(--font-display); font-size: clamp(3.2rem,8vw,7rem); font-weight: 500; line-height: 1.2; text-shadow: 0 8px 32px rgba(0,0,0,.35); }
.cover-coord { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; color: rgba(243,238,228,.6); font-family: var(--font-mono); font-size: 9px; letter-spacing: .13em; }
.g-arrow, .g-dots { z-index: 3; }.g-arrow { border-radius: 0; border: 1px solid rgba(255,255,255,.32); background: rgba(7,17,15,.54); }
.g-dots .dot, .g-dots .dot.active { width: 24px; height: 2px; border: 0; border-radius: 0; background: rgba(255,255,255,.34); }.g-dots .dot.active { background: var(--data-glow); }
.container { max-width: 1120px; }
.back { margin-top: 2.2rem; color: var(--clay); font-family: var(--font-mono); font-size: 9px; letter-spacing: .1em; }
.head { padding: 2rem 0 1.4rem; border-bottom: 1px solid var(--color-border); }
.head-kicker { margin-bottom: .6rem; color: var(--clay); font-family: var(--font-mono); font-size: 9px; letter-spacing: .14em; }
.head h1 { color: var(--jade-deep); font-size: clamp(2.1rem,4.5vw,3.8rem); font-weight: 600; }
.honor-badge, .cert, .mini-tag, .tl-year, .fe-time { border-radius: 0; }
.info-bar { padding-top: 1rem; border-top: 1px solid var(--color-border-light); }
.social, .m-avatar { border-radius: 0; }.social { color: var(--jade-deep); border: 1px solid var(--color-border); background: transparent; font-size: 10px; font-weight: 700; }
.facts-strip { gap: 1px; background: var(--color-border); border: 1px solid var(--color-border); }
.fact-card { align-items: flex-start; padding: 1rem; text-align: left; border: 0; border-radius: 0; box-shadow: none; }.fact-card:hover { transform: none; box-shadow: none; background: var(--paper-deep); }
.fact-icon { color: var(--bronze); font-family: var(--font-mono); font-size: 9px; letter-spacing: .1em; }
.fact-label { margin-top: .45rem; }.fact-value { margin-top: .2rem; color: var(--ink); font-family: var(--font-display); font-size: .94rem; }
.block { margin-top: 3rem; padding-top: 2.4rem; }.b-title { font-size: clamp(1.35rem,2.5vw,1.8rem); }.b-title::before { width: 28px; height: 1px; border-radius: 0; background: var(--bronze); }
.section-alt { margin-inline: 0; padding: 2rem; border: 1px solid var(--color-border); border-radius: 0; }
.sec-part, .tag-card, .sp-card, .fe-card, .tl-card, .person-card, .people-empty, .res-card { border-radius: 0; box-shadow: none; }
.sec-part:hover, .sp-card:hover, .fe-card:hover, .res-card:hover { transform: none; border-color: var(--bronze); box-shadow: none; }
.actions { padding: 1.4rem; background: var(--museum-deep); border: 1px solid var(--museum-line); }
.act-btn { color: rgba(243,238,228,.78); background: transparent; border-color: var(--museum-line-bright); border-radius: 0; }.act-btn:hover { color: var(--data-glow); background: transparent; border-color: var(--data-glow); }
.float-actions { right: .9rem; }.fa-btn { width: 48px; height: 48px; color: var(--jade-deep); background: var(--paper-light); border-radius: 0; font-family: var(--font-display); font-size: 12px; }.fa-btn:hover { transform: none; border-color: var(--bronze); }
@media (max-width: 600px) {
  .g-stage { min-height: 360px; }
  .gallery-overlay { padding-bottom: 3.5rem; }
  .cover-name { font-size: 3.5rem; }
  .cover-coord { display: none; }
  .float-actions { display: none; }
}
</style>
