<template>
  <section class="practice-page museum-public-page">
    <MuseumPageHero
      archive-no="PRACTICE ARCHIVE · OUTCOMES"
      kicker="乡村实践 / 成果档案"
      title="乡村实践 —— 用脚步丈量，用实践记录"
      description="汇聚实践中的人物、影像与成果，让每一次青年行动都有清晰来源、过程和可继续复用的经验。"
      icon="practice"
      :metric="results.length"
      metric-label="份当前演示成果"
      demo
    >
      <template #actions>
        <button class="museum-action-primary" type="button" @click="onUpload">
          <AppIcon name="upload" :size="16" />上传我的成果
        </button>
      </template>
    </MuseumPageHero>
    <div class="museum-content-shell">
      <!-- 头条轮播 -->
      <div
        class="hero-carousel"
        @mouseenter="pauseAuto"
        @mouseleave="resumeAuto"
        aria-roledescription="carousel"
      >
        <p class="hero-kicker"><span>CURATOR'S PICKS</span>精选成果 · 本周热门</p>
        <div class="hero-stage">
          <button class="hero-arrow left" aria-label="上一张" @click="prevSlide"><AppIcon name="chevron-left" :size="19" /></button>
          <transition :name="slideDir" mode="out-in">
            <article
              :key="activeHighlight.id"
              class="hero-card"
              role="button"
              tabindex="0"
              @click="goResults"
              @keydown.enter="goResults"
            >
              <img class="hero-cover" :src="activeHighlight.cover" :alt="activeHighlight.title" loading="lazy" />
              <div class="hero-body">
                <span class="hero-tag">{{ activeHighlight.tag }}</span>
                <h2 class="hero-title">{{ activeHighlight.title }}</h2>
                <p class="hero-school">{{ activeHighlight.school }}｜{{ activeHighlight.village }}·{{ activeHighlight.province }}</p>
                <p class="hero-oneline">“{{ activeHighlight.oneLine }}”</p>
              </div>
            </article>
          </transition>
          <button class="hero-arrow right" aria-label="下一张" @click="nextSlide"><AppIcon name="chevron-right" :size="19" /></button>
        </div>
        <div class="hero-dots">
          <button
            v-for="(h, i) in highlights"
            :key="h.id"
            class="dot"
            :class="{ active: i === slideIndex }"
            :aria-label="`第 ${i + 1} 张`"
            @click="goSlide(i)"
          />
        </div>
      </div>

      <!-- 模块一：实践概况 --><section class="overview section-alt">
        <MuseumSectionHeader index="01" kicker="DEMO IMPACT OVERVIEW" title="实践概况" icon="chart">
          <p>以下统计均为演示数据，用于验证数据看板和档案组织方式。</p>
        </MuseumSectionHeader>
        <div class="ov-grid">
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.days" /></span><span class="ov-label">总实践天数</span></div>
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.teams" /></span><span class="ov-label">参与团队</span></div>
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.villagers" /></span><span class="ov-label">受益村民</span></div>
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.demands" /></span><span class="ov-label">已完成需求</span></div>
        </div>
        <p class="ov-rotating" aria-live="polite">{{ rotatingText }}</p>
      </section>

      <!-- 模块二：乡村人物 -->
      <section class="people">
        <MuseumSectionHeader index="02" kicker="ORAL HISTORY" title="乡村人物 · 实践中的遇见" icon="user">
          <p>那些在实践过程中遇到的乡村守护人，听听他们的故事。</p>
        </MuseumSectionHeader>
        <div class="chips" role="tablist" aria-label="人物标签筛选">
          <button
            v-for="t in peopleTags"
            :key="t"
            class="chip"
            :class="{ active: peopleTag === t }"
            @click="peopleTag = t"
          >{{ t }}</button>
        </div>
        <div class="people-grid">
          <article
            v-for="p in filteredPeople"
            :key="p.id"
            class="person-card"
            role="button"
            tabindex="0"
            @click="openPerson(p)"
            @keydown.enter="openPerson(p)"
          >
            <div class="avatar" :style="{ background: p.avatarColor }">{{ p.name.charAt(0) }}</div>
            <h3 class="person-name">{{ p.name }}</h3>
            <p class="person-role">{{ p.role }}</p>
            <p class="person-village"><AppIcon name="map-pin" :size="13" />{{ p.village }}</p>
            <div class="person-tags">
              <span v-for="t in p.tags" :key="t" class="mini-tag">{{ t }}</span>
            </div>
            <p class="person-oneline">“{{ p.oneLine }}”</p>
            <span class="btn-read">阅读采访故事 ›</span>
          </article>
        </div>
        <p v-if="!filteredPeople.length" class="empty">该标签下暂无人物。</p>
      </section>

      <!-- 模块三：乡土视频 --><section class="videos section-alt">
        <MuseumSectionHeader index="03" kicker="FIELD VIDEO" title="乡土视频 · 镜头下的乡村" icon="play">
          <p>用影像记录乡村的点点滴滴；当前封面与视频内容均为演示素材。</p>
        </MuseumSectionHeader>
        <div class="video-grid">
          <article
            v-for="v in videos"
            :key="v.id"
            class="video-card"
            role="button"
            tabindex="0"
            @click="openVideo(v)"
            @keydown.enter="openVideo(v)"
          >
            <div class="video-cover">
              <img :src="v.cover" :alt="v.title" loading="lazy" />
              <span class="play-badge"><AppIcon name="play" :size="22" /></span>
              <span class="video-dur">{{ v.duration }}</span>
            </div>
            <h3 class="video-title">{{ v.title }}</h3>
            <p class="video-team">{{ v.team }}</p>
          </article>
        </div>
      </section>

      <!-- 模块四：成果列表 -->
      <section ref="resultsSection" class="results">
        <MuseumSectionHeader index="04" kicker="PRACTICE COLLECTION" title="实践成果" icon="folder">
          <p>按类型、形式和年份检索当前演示成果档案。</p>
        </MuseumSectionHeader>
      <div class="filter-panel">
        <div class="search-bar">
          <AppIcon class="search-ic" name="search" :size="16" />
          <input v-model="keyword" type="text" placeholder="搜索成果标题、团队名称、关键词..." aria-label="搜索成果" />
        </div>
        <div class="chips" role="tablist" aria-label="排序方式">
          <button v-for="o in sortOptions" :key="o.value" class="chip" :class="{ active: sortBy === o.value }" @click="sortBy = o.value">{{ o.label }}</button>
        </div>
        <div class="filters">
          <div class="filter-group">
            <span class="filter-label">实践类型</span>
            <div class="tags">
              <button v-for="t in typeOptions" :key="t" class="tag" :class="{ active: typeFilter === t }" @click="typeFilter = t">{{ t }}</button>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">成果形式</span>
            <div class="tags">
              <button v-for="f in formOptions" :key="f" class="tag" :class="{ active: formFilter === f }" @click="formFilter = f">{{ f }}</button>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">年份</span>
            <div class="tags">
              <button v-for="y in yearOptions" :key="y" class="tag" :class="{ active: String(yearFilter) === String(y) }" @click="yearFilter = y">{{ y }}</button>
            </div>
          </div>
        </div>
        <div class="filter-path">
          <span>当前筛选：{{ typeFilter }} · {{ formFilter }} · {{ yearFilter }} · {{ sortLabel }}<template v-if="keyword">· 关键词“{{ keyword }}”</template></span>
          <button v-if="hasActiveFilter" class="btn-clear" @click="clearFilters">清除筛选</button>
        </div>
      </div>
        <p class="result-count">筛选到 {{ visibleResults.length }} 份成果</p>
        <div v-if="visibleResults.length" class="result-grid">
          <article v-for="r in visibleResults" :key="r.id" class="result-card" role="button" tabindex="0" @click="openResult(r)" @keydown.enter="openResult(r)">
            <div class="result-cover"><img :src="r.cover" :alt="r.title" loading="lazy" /><span class="result-year">{{ r.year }}</span></div>
            <div class="result-body">
              <h3 class="result-title">{{ r.title }}</h3>
              <p class="result-school">{{ r.school }}</p>
              <p class="result-team">{{ r.team }} · <AppIcon name="map-pin" :size="13" />{{ r.village }}·{{ r.province }}</p>
              <div class="result-tags"><span class="mini-tag">{{ r.type }}</span><span class="mini-tag">{{ r.form }}</span></div>
              <span class="cert-badge">✓ {{ r.cert }}</span>
              <div class="result-stats"><span><AppIcon name="eye" :size="13" />{{ r.views }}</span><span><AppIcon name="heart" :size="13" />{{ r.likes }}</span><span><AppIcon name="download" :size="13" />{{ r.downloads }}</span></div>
            </div>
          </article>
        </div>
        <MuseumState v-else type="empty" title="没有匹配的成果" description="试试调整筛选条件或搜索关键词。" />
      </section>
    </div>

    <!-- 人物采访弹窗 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="activePerson" class="modal-mask" @click.self="closePerson">
          <div class="modal" role="dialog" aria-modal="true" :aria-label="activePerson.name">
            <button class="modal-close" aria-label="关闭" @click="closePerson">×</button>
            <div class="modal-person-head">
              <div class="avatar lg" :style="{ background: activePerson.avatarColor }">{{ activePerson.name.charAt(0) }}</div>
              <div>
                <h2 class="modal-title">{{ activePerson.name }}</h2>
                <p class="modal-sub"><AppIcon name="map-pin" :size="13" />{{ activePerson.role }} · {{ activePerson.village }}</p>
                <div class="person-tags"><span v-for="t in activePerson.tags" :key="t" class="mini-tag">{{ t }}</span></div>
              </div>
            </div>
            <h3 class="modal-h3">采访故事</h3>
            <p v-for="(para, i) in personStoryParas" :key="i" class="modal-desc story-para">{{ para }}</p>
            <div class="modal-actions">
              <div class="modal-counts">
                <button class="count-btn" @click="toggleLike(activePerson)"><AppIcon name="heart" :size="14" />{{ likedIds.has(activePerson.id) ? '已点赞' : '点赞' }}</button>
                <button class="count-btn" @click="toggleFav(activePerson)"><AppIcon name="star" :size="14" />{{ favIds.has(activePerson.id) ? '已收藏' : '收藏' }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 视频播放弹窗 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="activeVideo" class="modal-mask" @click.self="closeVideo">
          <div class="modal" role="dialog" aria-modal="true" :aria-label="activeVideo.title">
            <button class="modal-close" aria-label="关闭" @click="closeVideo">×</button>
            <div class="video-player" :style="{ backgroundImage: `url(${activeVideo.cover})` }">
              <span class="play-badge lg"><AppIcon name="play" :size="28" /></span>
              <p class="player-hint">视频播放占位（示例数据，暂无真实视频源）</p>
            </div>
            <h2 class="modal-title">{{ activeVideo.title }}</h2>
            <p class="modal-sub">{{ activeVideo.team }}　·　时长 {{ activeVideo.duration }}</p>
          </div>
        </div>
      </transition>
    </Teleport>

    <AppToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import CountUp from '@/components/CountUp.vue'
import AppToast from '@/components/AppToast.vue'
import AppIcon from '@/components/AppIcon.vue'
import MuseumPageHero from '@/components/MuseumPageHero.vue'
import MuseumSectionHeader from '@/components/MuseumSectionHeader.vue'
import MuseumState from '@/components/MuseumState.vue'
import data from './practice-data.json'
import { filterPeople, filterResults, sortResults } from './practice-filters'

// —— 静态数据 ——
const highlights = data.highlights
const overview = data.overview
const videos = data.videos
const people = data.people
const results = data.results

// —— Toast ——
const toastRef = ref(null)
const toast = (t) => toastRef.value?.show(t)

// —— 头条轮播 ——
const slideIndex = ref(0)
const slideDir = ref('slide-next')
const activeHighlight = computed(() => highlights[slideIndex.value])
let autoTimer = null
const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
function goSlide(i) { slideDir.value = i >= slideIndex.value ? 'slide-next' : 'slide-prev'; slideIndex.value = (i + highlights.length) % highlights.length }
function nextSlide() { slideDir.value = 'slide-next'; slideIndex.value = (slideIndex.value + 1) % highlights.length }
function prevSlide() { slideDir.value = 'slide-prev'; slideIndex.value = (slideIndex.value - 1 + highlights.length) % highlights.length }
function startAuto() { if (reduceMotion) return; stopAuto(); autoTimer = setInterval(nextSlide, 5000) }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null } }
const pauseAuto = stopAuto
const resumeAuto = startAuto

// —— 动态文案轮换 ——
const rotatingIndex = ref(0)
const rotatingText = computed(() => data.rotatingTexts[rotatingIndex.value])
let rotTimer = null

// —— 头部/头条动作 ——
const resultsSection = ref(null)
function goResults() { resultsSection.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }) }
function onUpload() { toast('请登录后上传成果') }

// —— 人物筛选 ——
const peopleTags = ['全部', '非遗传承人', '村干部', '乡村教师', '手工艺人', '生态守护者', '致富带头人', '返乡青年', '老村民']
const peopleTag = ref('全部')
const filteredPeople = computed(() => filterPeople(people, peopleTag.value))

// —— 成果筛选/排序 ——
const keyword = ref('')
const sortBy = ref('latest')
const typeFilter = ref('全部')
const formFilter = ref('全部')
const yearFilter = ref('全部')
const sortOptions = [
  { value: 'latest', label: '最新上传' },
  { value: 'views', label: '最热浏览' },
  { value: 'favorites', label: '最多收藏' }, // 无 favorites 字段时映射到 likes，见 visibleResults
  { value: 'likes', label: '最多点赞' },
]
const typeOptions = ['全部', '产业调研', '文化挖掘', '教育帮扶', '乡村规划', '科技助农', '健康帮扶', '数字赋能']
const formOptions = ['全部', '调研报告', '影像记录', '设计方案', '文创产品', '数据可视化', '口述史']
const yearOptions = ['全部', 2026, 2025, 2024]
const sortLabel = computed(() => sortOptions.find((o) => o.value === sortBy.value)?.label ?? '')
const hasActiveFilter = computed(() =>
  keyword.value || typeFilter.value !== '全部' || formFilter.value !== '全部' || yearFilter.value !== '全部' || sortBy.value !== 'latest')
function clearFilters() { keyword.value = ''; typeFilter.value = '全部'; formFilter.value = '全部'; yearFilter.value = '全部'; sortBy.value = 'latest' }

const visibleResults = computed(() => {
  const filtered = filterResults(results, {
    keyword: keyword.value, type: typeFilter.value, form: formFilter.value, year: yearFilter.value,
  })
  // 「最多收藏」在数据无 favorites 字段时统一走 likes（点赞≈收藏热度）
  const key = sortBy.value === 'favorites' ? 'likes' : sortBy.value
  return sortResults(filtered, key)
})

// —— 人物弹窗 ——
const activePerson = ref(null)
const likedIds = reactive(new Set())
const favIds = reactive(new Set())
const personStoryParas = computed(() => (activePerson.value?.story ?? '').split('\n\n').filter(Boolean))
function openPerson(p) { activePerson.value = p }
function closePerson() { activePerson.value = null }
function toggleLike(p) { likedIds.has(p.id) ? likedIds.delete(p.id) : likedIds.add(p.id) }
function toggleFav(p) { favIds.has(p.id) ? favIds.delete(p.id) : favIds.add(p.id) }

// —— 视频弹窗 ——
const activeVideo = ref(null)
function openVideo(v) { activeVideo.value = v }
function closeVideo() { activeVideo.value = null }

// —— 成果卡（详情页下期做） ——
function openResult() { toast('详情页即将上线') }

// —— 生命周期 ——
function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (activePerson.value) closePerson()
  else if (activeVideo.value) closeVideo()
}
onMounted(() => {
  startAuto()
  if (!reduceMotion) rotTimer = setInterval(() => { rotatingIndex.value = (rotatingIndex.value + 1) % data.rotatingTexts.length }, 3000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  stopAuto()
  if (rotTimer) clearInterval(rotTimer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.practice-page { padding: 0; }

/* —— 头条轮播 —— */
.hero-carousel { margin-bottom: 3rem; }
.hero-kicker { display: flex; align-items: center; gap: .8rem; font-size: 14px; font-weight: 700; color: var(--color-highlight); margin: 0 0 .8rem; }
.hero-kicker span { color: var(--jade-deep); font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em; }
.hero-stage { display: flex; align-items: center; gap: .6rem; }
.hero-card {
  position: relative; flex: 1; display: grid; grid-template-columns: 1.1fr 1fr; gap: 0; overflow: hidden;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.hero-card::after,
.video-cover::after,
.result-cover::after {
  content: 'DEMO IMAGE';
  position: absolute;
  z-index: 2;
  right: .55rem;
  bottom: .55rem;
  padding: .15rem .45rem;
  color: rgba(255,255,255,.9);
  background: rgba(7,17,15,.62);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .08em;
}
.hero-card::after { top: .55rem; right: auto; bottom: auto; left: .55rem; }
.hero-card:hover, .hero-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.hero-cover { width: 100%; height: 100%; min-height: 240px; aspect-ratio: 16/9; object-fit: cover; }
.hero-body { padding: 1.6rem 1.8rem; display: flex; flex-direction: column; justify-content: center; }
.hero-tag {
  align-self: flex-start; padding: .25rem .8rem; border-radius: 50px; margin-bottom: .8rem;
  background: var(--color-accent); color: var(--color-primary-dark); font-size: .78rem; font-weight: 600;
}
.hero-title { font-size: 1.4rem; font-weight: 700; color: var(--color-primary-dark); line-height: 1.4; }
.hero-school { margin: .7rem 0 .5rem; font-size: .9rem; color: var(--color-primary); font-weight: 600; }
.hero-oneline { font-size: .95rem; color: var(--color-text-secondary); font-style: italic; }
.hero-arrow {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-primary-dark);
  font-size: 1.6rem; line-height: 1; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition);
}
.hero-arrow:hover { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.hero-dots { display: flex; justify-content: center; gap: .5rem; margin-top: 1rem; }
.dot {
  width: 9px; height: 9px; border-radius: 50%; border: none; cursor: pointer; padding: 0;
  background: var(--color-border); transition: all var(--transition);
}
.dot.active { background: var(--color-primary); width: 22px; border-radius: 50px; }
.slide-next-enter-active, .slide-next-leave-active,
.slide-prev-enter-active, .slide-prev-leave-active { transition: opacity var(--transition), transform var(--transition); }
.slide-next-enter-from { opacity: 0; transform: translateX(24px); }
.slide-next-leave-to { opacity: 0; transform: translateX(-24px); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-24px); }
.slide-prev-leave-to { opacity: 0; transform: translateX(24px); }

/* —— 页面头部（同 voice） —— */
.page-head { margin-bottom: 1.8rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
.head-text h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; color: var(--color-primary-dark); }
.desc { max-width: 720px; margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }
.stat { margin: .7rem 0 0; font-size: 14px; color: var(--color-text-light); }
.btn-publish {
  flex-shrink: 0; margin-top: .3rem;
  padding: .7rem 1.6rem; border: none; border-radius: 50px; cursor: pointer;
  background: var(--color-highlight); color: #fff; font-size: .95rem; font-weight: 600;
  transition: transform var(--transition), box-shadow var(--transition);
}
.btn-publish:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(224, 122, 95, .3); }

/* —— 通用 section 标题 —— */
.sec-title { font-size: 1.5rem; color: var(--color-primary-dark); margin: 0; }
.sec-desc { margin: .5rem 0 1.2rem; color: var(--color-text-secondary); font-size: .95rem; }

/* —— 模块一：实践概况 —— */
.overview { margin: 2.6rem 0; }
.ov-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.ov-card {
  display: flex; flex-direction: column; align-items: center; gap: .4rem; text-align: center;
  padding: 1.6rem 1rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);
}
.ov-num { font-size: 3.2rem; font-weight: 700; color: var(--color-primary); line-height: 1; }
.ov-label { font-size: 14px; color: var(--color-text-secondary); }
.ov-rotating { margin: 1.4rem 0 0; text-align: center; font-size: .95rem; color: var(--color-text-light); min-height: 1.4em; }

/* —— 胶囊 / 标签 / 搜索（同 voice） —— */
.chips { display: flex; flex-wrap: wrap; gap: .6rem; margin-bottom: 1.2rem; }
.chip {
  padding: .45rem 1.1rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-card); color: var(--color-text-secondary); font-size: .88rem; cursor: pointer;
  transition: all var(--transition);
}
.chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.search-bar {
  display: flex; align-items: center; gap: .6rem;
  padding: .3rem 1.2rem; margin-bottom: 1.2rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);
}
.search-ic { color: var(--jade); }
.search-bar input { flex: 1; border: none; outline: none; background: transparent; padding: .6rem 0; font-size: .95rem; color: var(--color-text); }
.filters { display: flex; flex-direction: column; gap: .9rem; margin-bottom: 1rem; }
.filter-group { display: flex; align-items: baseline; gap: .8rem; flex-wrap: wrap; }
.filter-label { flex-shrink: 0; font-size: .85rem; font-weight: 600; color: var(--color-text); }
.tags { display: flex; flex-wrap: wrap; gap: .5rem; }
.tag {
  padding: .3rem .85rem; border: 1px solid var(--color-border); border-radius: 50px;
  background: var(--color-bg); color: var(--color-text-secondary); font-size: .82rem; cursor: pointer;
  transition: all var(--transition);
}
.tag:hover { border-color: var(--color-secondary); }
.tag.active { background: var(--color-accent); border-color: var(--color-secondary); color: var(--color-primary-dark); font-weight: 600; }
.filter-path {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  font-size: .85rem; color: var(--color-text-light); margin-bottom: .4rem;
}
.btn-clear {
  border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-highlight);
  padding: .25rem .8rem; border-radius: 50px; font-size: .8rem; cursor: pointer;
}
.btn-clear:hover { border-color: var(--color-highlight); }
.result-count { font-size: .82rem; color: var(--color-text-light); margin: 0 0 1rem; }
.cert-badge {
  display: inline-block; padding: .2rem .7rem; border-radius: 50px;
  background: #e8f5e9; color: var(--color-primary); font-size: .78rem; font-weight: 600;
}
.mini-tag {
  display: inline-block; padding: .18rem .6rem; border-radius: 50px;
  background: var(--color-accent); color: var(--color-primary-dark); font-size: .74rem;
}
.empty { padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
/* —— 筛选面板容器 —— */
.filter-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.2rem 1.4rem 0.8rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
}
.filter-panel .search-bar { margin-bottom: 0.8rem; }
.filter-panel .chips { margin-bottom: 0.9rem; }
.filter-panel .filters { margin-bottom: 0.2rem; }
.filter-panel .filter-path { margin-bottom: 0; }

/* —— 分区交替背景 —— */
.section-alt {
  background: var(--gradient-section-odd);
  border-radius: var(--radius);
  padding: 2rem 1.6rem;
  margin: 2.6rem -1rem;
}
@media (max-width: 760px) {
  .section-alt { padding: 1.5rem 1rem; margin: 2rem -0.5rem; }
}

/* —— 区块标题左侧色条 —— */
.sec-title {
  display: flex; align-items: center; gap: 0.6rem;
}
.sec-title::before {
  content: '';
  width: 4px; height: 1.2em;
  background: var(--color-primary);
  border-radius: 2px;
}

/* —— 人物卡片增强 —— */
.person-card { border-radius: var(--radius-lg); }
.person-card .avatar { box-shadow: var(--shadow-sm); }

/* —— 视频卡片增强 —— */
.video-card { border-radius: var(--radius-lg); }
.video-card .video-cover img { transition: transform var(--transition-slow); }
.video-card:hover .video-cover img { transform: scale(1.05); }

/* —— 模块二：乡村人物 —— */
.people { margin: 2.6rem 0; }
.people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.2rem; }
.person-card {
  display: flex; flex-direction: column; align-items: center; gap: .4rem; text-align: center;
  padding: 1.6rem 1.2rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
  cursor: pointer; transition: transform var(--transition), box-shadow var(--transition);
}
.person-card:hover, .person-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.avatar {
  width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: .4rem;
}
.avatar.lg { width: 80px; height: 80px; font-size: 2rem; margin: 0; flex-shrink: 0; }
.person-name { font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
.person-role { font-size: .85rem; color: var(--color-primary); font-weight: 600; }
.person-village, .result-team, .result-stats span, .modal-sub, .count-btn { display: inline-flex; align-items: center; gap: .35rem; }
.person-village { font-size: .82rem; color: var(--color-text-light); }
.person-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem; margin: .3rem 0; }
.person-oneline { font-size: .88rem; color: var(--color-text-secondary); font-style: italic; line-height: 1.6; }
.btn-read { margin-top: .4rem; font-size: .85rem; color: var(--color-highlight); font-weight: 600; }

/* —— 模块三：乡土视频 —— */
.videos { margin: 2.6rem 0; }
.video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.2rem; }
.video-card {
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); overflow: hidden; cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.video-card:hover, .video-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.video-cover { position: relative; aspect-ratio: 16/9; overflow: hidden; }
.video-cover img { width: 100%; height: 100%; object-fit: cover; }
.play-badge {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 46px; height: 46px; border-radius: 50%; background: rgba(0, 0, 0, .5); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
}
.play-badge.lg { position: static; transform: none; width: 60px; height: 60px; font-size: 1.5rem; margin-bottom: .8rem; }
.video-dur {
  position: absolute; left: .6rem; bottom: .6rem; padding: .1rem .5rem; border-radius: 50px;
  background: rgba(0, 0, 0, .65); color: #fff; font-size: .72rem;
}
.video-title { padding: .9rem 1rem 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
.video-team { padding: .3rem 1rem 1rem; font-size: .82rem; color: var(--color-text-light); }

/* —— 模块四：成果列表 —— */
.results { margin: 2.6rem 0 0; }
.results .sec-title { margin-bottom: 1.2rem; }
.result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.4rem; }
.result-card {
  display: flex; flex-direction: column; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
  overflow: hidden; cursor: pointer; transition: transform var(--transition), box-shadow var(--transition);
}
.result-card:hover, .result-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.result-cover { position: relative; aspect-ratio: 16/9; overflow: hidden; }
.result-cover img { width: 100%; height: 100%; object-fit: cover; }
.result-year {
  position: absolute; right: .6rem; top: .6rem; padding: .12rem .6rem; border-radius: 50px;
  background: rgba(0, 0, 0, .6); color: #fff; font-size: .74rem;
}
.result-body { display: flex; flex-direction: column; gap: .4rem; padding: 1.1rem 1.2rem 1.3rem; }
.result-title { font-size: 18px; font-weight: 600; color: var(--color-text); line-height: 1.4; }
.result-school { font-size: .95rem; font-weight: 700; color: var(--color-primary); }
.result-team { font-size: .82rem; color: var(--color-text-secondary); }
.result-tags { display: flex; flex-wrap: wrap; gap: .4rem; margin: .2rem 0; }
.result-stats { display: flex; gap: 1rem; margin-top: .4rem; font-size: .8rem; color: var(--color-text-light); }

/* —— 模态框（同 voice） —— */
.modal-mask {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center; padding: 1.5rem;
  background: rgba(30, 30, 30, .5);
}
.modal {
  position: relative; width: 100%; max-width: 640px; max-height: 88vh; overflow-y: auto;
  padding: 2rem 2.2rem; background: var(--color-card); border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .25);
}
.modal-close {
  position: absolute; top: 1rem; right: 1.2rem; border: none; background: transparent;
  font-size: 1.8rem; line-height: 1; color: var(--color-text-light); cursor: pointer;
}
.modal-close:hover { color: var(--color-text); }
.modal-person-head { display: flex; align-items: center; gap: 1.2rem; margin-bottom: .5rem; }
.modal-title { margin: .2rem 0 .3rem; font-size: 1.5rem; color: var(--color-primary-dark); }
.modal-sub { font-size: .88rem; color: var(--color-text-secondary); }
.modal-h3 { margin: 1.4rem 0 .5rem; font-size: 1rem; color: var(--color-text); }
.modal-desc { font-size: .92rem; color: var(--color-text-secondary); line-height: 1.8; }
.story-para { margin: 0 0 .9rem; text-indent: 0; }
.modal-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  margin-top: 1.8rem; padding-top: 1.4rem; border-top: 1px solid var(--color-border);
}
.modal-counts { display: flex; gap: .7rem; }
.count-btn {
  border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-secondary);
  padding: .45rem 1rem; border-radius: 50px; font-size: .85rem; cursor: pointer; transition: all var(--transition);
}
.count-btn:hover { border-color: var(--color-highlight); color: var(--color-highlight); }
.video-player {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  aspect-ratio: 16/9; border-radius: var(--radius); margin-bottom: 1.2rem;
  background-size: cover; background-position: center; position: relative;
}
.video-player::before { content: ''; position: absolute; inset: 0; background: rgba(0, 0, 0, .45); border-radius: var(--radius); }
.video-player > * { position: relative; z-index: 1; }
.player-hint { color: #fff; font-size: .85rem; }

/* —— 过渡动画 —— */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity var(--transition); }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* —— 响应式 —— */
@media (max-width: 760px) {
  .ov-grid { grid-template-columns: repeat(2, 1fr); }
  .ov-num { font-size: 2.4rem; }
  .hero-card { grid-template-columns: 1fr; }
  .hero-cover { min-height: 180px; }
}
</style>
