<template>
  <section v-if="village" class="vd">
    <div class="container">
      <router-link to="/villages" class="back">← 返回乡村列表</router-link>

      <!-- 模块1：大图轮播 -->
      <div class="gallery" @mouseenter="pauseAuto" @mouseleave="resumeAuto">
        <button v-if="gallery.length > 1" class="g-arrow left" aria-label="上一张" @click="prevImg">‹</button>
        <transition name="fade" mode="out-in">
          <div :key="galleryIndex" class="g-stage" :style="{ backgroundImage: `url(${gallery[galleryIndex]})` }">
            <img class="g-probe" :src="gallery[galleryIndex]" alt="" @error="onImgError" />
          </div>
        </transition>
        <button v-if="gallery.length > 1" class="g-arrow right" aria-label="下一张" @click="nextImg">›</button>
        <div v-if="gallery.length > 1" class="g-dots">
          <button v-for="(g, i) in gallery" :key="i" class="dot" :class="{ active: i === galleryIndex }" @click="galleryIndex = i" />
        </div>
      </div>

      <!-- 感受 ▍模块2：基本信息 + 认证信息条 -->
      <header class="head">
        <h1>{{ village.name }}</h1>
        <p class="loc">{{ village.province }} · {{ village.city }} · {{ village.district }}<template v-if="village.town"> · {{ village.town }}</template></p>
        <div class="honors">
          <span v-for="h in village.honors" :key="h" class="honor-badge">{{ h }}</span>
        </div>
        <!-- 认证 / 负责人 / 社媒压缩为一行小信息条 -->
        <div class="info-bar">
          <span class="cert" :class="certClass">✓ {{ village.certLabel }}</span>
          <span v-if="village.manager" class="manager">
            <span class="m-avatar">{{ village.manager.name.charAt(0) }}</span>
            <span class="m-text">{{ village.manager.name }} · {{ village.manager.role }}</span>
          </span>
          <span class="socials">
            <span v-for="s in socialList" :key="s.key" class="social" :class="{ off: !s.on }" :title="s.on ? s.label : `${s.label}（未关联）`">{{ s.icon }}</span>
          </span>
        </div>
      </header>

      <!-- 了解 ▍模块3：村庄详述 -->
      <section class="block section-alt">
        <h3 class="b-title">村庄详述</h3>
        <p class="intro">{{ village.intro }}</p>
      </section>

      <!-- 了解 ▍模块4：六大类标签（点击跳分类浏览） -->
      <section class="block">
        <h3 class="b-title">特色标签</h3>
        <div v-for="(items, cat) in village.tags" :key="cat" class="tag-cat">
          <span class="cat-name">{{ cat }}</span>
          <div class="cat-tags">
            <router-link v-for="t in items" :key="t" class="mini-tag" :to="{ path: '/villages/tags', query: { tag: t } }">{{ t }}</router-link>
          </div>
        </div>
      </section>

      <!-- 了解 ▍模块5：导览点位 -->
      <section class="block section-alt">
        <h3 class="b-title">导览点位</h3>
        <ol class="guide">
          <li v-for="(g, i) in village.guide" :key="i">
            <span class="g-idx">{{ i + 1 }}</span>
            <div><p class="g-name">{{ g.name }}</p><p class="g-note">{{ g.note }}</p></div>
          </li>
        </ol>
      </section>

      <!-- 了解 ▍模块6：乡村人物（有数据则列出，无则显示引导录入占位） -->
      <section class="block">
        <h3 class="b-title">乡村人物</h3>
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

      <!-- 关联 ▍该村实践成果 -->
      <section v-if="relatedResults.length" class="block section-alt">
        <h3 class="b-title">该村实践成果</h3>
        <div class="res-grid">
          <article v-for="r in relatedResults" :key="r.id" class="res-card" @click="goPractice">
            <div class="res-cover" :style="{ backgroundImage: `url(${r.cover})` }"></div>
            <div class="res-body"><p class="res-title">{{ r.title }}</p><p class="res-school">{{ r.school }}</p></div>
          </article>
        </div>
      </section>

      <!-- 行动 ▍工具条（去掉与上方重复的“查看实践成果”按钮） -->
      <section class="block actions">
        <button class="act-btn" @click="soon">🗺️ 生成导览地图</button>
        <button class="act-btn" @click="soon">📤 分享本页</button>
        <button class="act-btn" @click="soon">🎨 生成海报</button>
      </section>
    </div>

    <!-- 模块8：点赞 + 收藏 -->
    <div class="float-actions">
      <button class="fa-btn" :class="{ on: liked }" @click="liked = !liked">{{ liked ? '❤️' : '🤍' }}<span>点赞</span></button>
      <button class="fa-btn" :class="{ on: faved }" @click="faved = !faved">{{ faved ? '⭐' : '☆' }}<span>收藏</span></button>
    </div>

    <AppToast ref="toastRef" />
  </section>
  <section v-else class="vd empty-page">
    <p>未找到该村庄。<router-link to="/villages">返回乡村列表</router-link></p>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import villages from '@/data/encyclopedia-villages.json'
import practiceData from '@/modules/practice/practice-data.json'

const route = useRoute()
const village = computed(() => villages.find((v) => v.id === route.params.id) || null)

// —— Toast ——
const toastRef = ref(null)
const soon = () => toastRef.value?.show('功能即将上线')

// —— 大图轮播 ——
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
  // 图片加载失败时用暖绿渐变兜底，避免裂图
  const stage = e.target.parentElement
  if (stage) { stage.style.backgroundImage = 'none'; stage.classList.add('g-fallback') }
}

// —— 认证配色 ——
const certClass = computed(() => {
  const lvl = village.value?.certLevel
  return lvl === 'province' ? 'cert-province' : lvl === 'county' ? 'cert-county' : 'cert-township'
})

// —— 社交平台 ——
const SOCIAL_META = [
  { key: 'wechat', icon: '💬', label: '微信视频号' },
  { key: 'douyin', icon: '🎵', label: '抖音' },
  { key: 'kuaishou', icon: '⚡', label: '快手' },
  { key: 'xiaohongshu', icon: '📕', label: '小红书' },
  { key: 'bilibili', icon: '📺', label: 'B站' },
  { key: 'gzh', icon: '📰', label: '微信公众号' },
]
const socialList = computed(() => SOCIAL_META.map((s) => ({ ...s, on: !!(village.value?.socials && village.value.socials[s.key]) })))

// —— 乡村人物（读村庄 people 字段；12 村暂无数据时模板显示引导录入占位） ——
const people = computed(() => village.value?.people || [])

// —— 该村实践成果（从 practice-data 按村名匹配） ——
const relatedResults = computed(() => {
  if (!village.value) return []
  return (practiceData.results || []).filter((r) => r.village === village.value.name).slice(0, 3)
})

// —— 操作 ——
function goPractice() { window.location.hash = '#/practice' }

// —— 点赞收藏 ——
const liked = ref(false)
const faved = ref(false)

onMounted(startAuto)
onBeforeUnmount(stopAuto)
</script>

<style scoped>
.vd { padding: 2.2rem 0 4rem; position: relative; }
.container { max-width: 920px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }
.back { display: inline-block; margin-bottom: 1.2rem; color: var(--color-primary); font-size: .9rem; }
.back:hover { color: var(--color-primary-dark); }
.empty-page { text-align: center; padding: 4rem 1rem; color: var(--color-text-light); }

/* —— 模块1 大图轮播 —— */
.gallery { position: relative; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-card); margin-bottom: 1.8rem; }
.g-stage { aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: var(--color-primary); }
.g-stage.g-fallback { background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary)); }
.g-probe { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.g-arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(0, 0, 0, .4); color: #fff; font-size: 1.8rem; line-height: 1;
}
.g-arrow.left { left: .8rem; } .g-arrow.right { right: .8rem; }
.g-arrow:hover { background: rgba(0, 0, 0, .6); }
.g-dots { position: absolute; bottom: .8rem; left: 50%; transform: translateX(-50%); display: flex; gap: .4rem; z-index: 2; }
.g-dots .dot { width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer; padding: 0; background: rgba(255, 255, 255, .5); }
.g-dots .dot.active { background: #fff; width: 20px; border-radius: 50px; }
.fade-enter-active, .fade-leave-active { transition: opacity var(--transition); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* —— 模块2 基本信息 —— */
.head { margin-bottom: 1.6rem; }
.head h1 { font-size: clamp(30px, 5vw, 46px); font-weight: 700; color: var(--color-primary-dark); font-family: var(--sx-serif); }
.loc { margin: .6rem 0 .9rem; color: var(--color-text-secondary); font-size: 1rem; }
.honors { display: flex; flex-wrap: wrap; gap: .5rem; }
.honor-badge { padding: .25rem .8rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); font-size: .8rem; font-weight: 600; }

/* —— 通用 block —— */
.block { margin-top: 1.8rem; padding-top: 1.6rem; border-top: 1px solid var(--color-border); }
.b-title { font-size: 1.2rem; color: var(--color-primary-dark); font-family: var(--sx-serif); margin: 0 0 1rem; }

/* —— 认证信息条（压缩：认证 + 负责人 + 社媒一行） —— */
.info-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
.cert { padding: .35rem .9rem; border-radius: 50px; font-size: .82rem; font-weight: 700; background: #e8f5e9; }
.cert-township { color: var(--color-primary); }
.cert-county { color: #4a8fbf; background: #e3f2fd; }
.cert-province { color: #b8860b; background: #fdf3d8; }
.manager { display: inline-flex; align-items: center; gap: .5rem; }
.m-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--color-secondary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: .85rem; }
.m-text { font-size: .84rem; color: var(--color-text-secondary); }
.socials { display: inline-flex; gap: .45rem; margin-left: auto; }
.social { width: 30px; height: 30px; border-radius: 50%; background: var(--color-accent); display: inline-flex; align-items: center; justify-content: center; font-size: .95rem; cursor: pointer; }
.social.off { opacity: .4; cursor: not-allowed; filter: grayscale(1); }

/* —— 乡村人物 —— */
.people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.person-card { display: flex; align-items: center; gap: .8rem; padding: .9rem 1rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); }
.p-avatar { flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--sx-serif); font-size: 1.2rem; }
.p-name { font-weight: 600; color: var(--color-text); }
.p-role { font-size: .8rem; color: var(--color-text-light); margin-top: .15rem; }
.people-empty { padding: 1.6rem; text-align: center; background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.pe-title { font-weight: 600; color: var(--color-text-secondary); }
.pe-note { font-size: .84rem; color: var(--color-text-light); margin-top: .4rem; }

/* —— 模块4 标签 —— */
.tag-cat { display: flex; align-items: baseline; gap: .8rem; margin-bottom: .7rem; flex-wrap: wrap; }
.cat-name { flex-shrink: 0; font-size: .85rem; font-weight: 700; color: var(--color-text); min-width: 4em; }
.cat-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
.mini-tag { padding: .2rem .7rem; border-radius: 50px; background: var(--sx-paper-deep); color: var(--color-text-secondary); font-size: .78rem; }

/* —— 模块5 详述 —— */
.intro { font-size: .98rem; line-height: 2; color: var(--color-text-secondary); text-indent: 2em; }

/* —— 模块7 导览点位 —— */
.guide { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .9rem; }
.guide li { display: flex; gap: .9rem; align-items: flex-start; }
.g-idx { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .82rem; font-weight: 700; }
.g-name { font-weight: 600; color: var(--color-text); }
.g-note { font-size: .85rem; color: var(--color-text-light); margin-top: .1rem; }

/* —— 该村实践成果 —— */
.res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.res-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; cursor: pointer; box-shadow: var(--shadow-card); transition: transform var(--transition), box-shadow var(--transition); }
.res-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); }
.res-cover { aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: var(--color-primary); }
.res-body { padding: .8rem .9rem; }
.res-title { font-size: .9rem; font-weight: 600; color: var(--color-text); line-height: 1.4; }
.res-school { font-size: .8rem; color: var(--color-primary); font-weight: 600; margin-top: .3rem; }

/* —— 模块6 操作按钮 —— */
.actions { display: flex; flex-wrap: wrap; gap: .8rem; }
.act-btn { padding: .7rem 1.3rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-text-secondary); font-size: .9rem; cursor: pointer; transition: all var(--transition); }
.act-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.act-btn.primary { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.act-btn.primary:hover { background: var(--color-primary-dark); }

/* —— 模块8 点赞收藏浮动 —— */
.float-actions { position: fixed; right: 1.4rem; bottom: 2rem; display: flex; flex-direction: column; gap: .7rem; z-index: 100; }
.fa-btn { display: flex; flex-direction: column; align-items: center; gap: .1rem; width: 58px; height: 58px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-card); box-shadow: var(--shadow-card); cursor: pointer; font-size: 1.2rem; color: var(--color-text-secondary); transition: transform var(--transition); }
.fa-btn span { font-size: .62rem; }
.fa-btn:hover { transform: scale(1.08); }
.fa-btn.on { border-color: var(--color-highlight); }
/* —— 详情页 section-alt —— */
.vd .section-alt {
  background: var(--gradient-section-odd);
  border-radius: var(--radius);
  padding: 1.6rem 1.4rem;
  margin: 0 -0.6rem;
  border-top: none;
}
@media (max-width: 760px) {
  .vd .section-alt { padding: 1.3rem 1rem; margin: 0 -0.3rem; }
}

/* —— 区块标题左侧色条 —— */
.b-title {
  display: flex; align-items: center; gap: 0.6rem;
}
.b-title::before {
  content: '';
  width: 4px; height: 1.15em;
  background: var(--color-primary);
  border-radius: 2px;
  flex-shrink: 0;
}
</style>


