<template>
  <section class="guide">
    <section class="guide-hero">
      <div class="container hero-layout">
        <div class="hero-copy">
          <p class="kicker">实践攻略</p>
          <h1>{{ data.intro.title }}</h1>
          <p class="hero-subtitle">{{ data.intro.subtitle }}</p>
          <p class="hero-lead">{{ data.intro.desc }}</p>

          <form class="hero-search" role="search" @submit.prevent="scrollToResources">
            <label class="sr-only" for="guide-search">搜索实践攻略资源</label>
            <input
              id="guide-search"
              v-model.trim="filters.keyword"
              type="search"
              placeholder="搜索联系村庄、策划书、访谈、调研报告..."
              aria-describedby="guide-search-hint"
            />
            <button type="submit">搜索</button>
          </form>
          <p id="guide-search-hint" class="sr-only">搜索范围包括资源标题、简介、关键词和正文摘要。</p>

          <div class="hot-keywords" aria-label="热门关键词">
            <span>热门：</span>
            <button v-for="word in HOT_KEYWORDS" :key="word" type="button" @click="applyKeyword(word)">
              {{ word }}
            </button>
          </div>
        </div>

        <aside class="hero-note" aria-label="资源中心概览">
          <p class="note-label">随用随取</p>
          <p class="note-main">从组队立项到结项答辩，先找到能直接派上用场的内容。</p>
          <div class="note-stats">
            <div v-for="s in data.heroStats" :key="s.label" class="note-stat">
              <strong>{{ s.value }}</strong>
              <span>{{ s.label }}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <main>
      <section class="stage-entry section-block" aria-labelledby="stage-entry-title">
        <div class="container">
          <div class="section-head">
            <p class="section-kicker">按实践阶段进入</p>
            <h2 id="stage-entry-title">先选择你现在卡在哪一步</h2>
            <p>阶段入口不是流程系统，只是帮助团队快速缩小资源范围。</p>
          </div>

          <div class="stage-grid">
            <button
              v-for="stage in GUIDE_STAGES"
              :key="stage.id"
              class="stage-entry-card"
              type="button"
              @click="applyStage(stage.id)"
            >
              <span class="stage-name">{{ stage.name }}</span>
              <strong>{{ stage.cta }}</strong>
              <span class="stage-desc">{{ stage.desc }}</span>
              <span class="stage-count">{{ countByStage(stage.id) }} 项资源</span>
              <span class="stage-topics">{{ representatives(stage.id).join(' · ') }}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="featured section-block" aria-labelledby="featured-title">
        <div class="container">
          <div class="section-head compact">
            <p class="section-kicker">高频工具</p>
            <h2 id="featured-title">实践队最常用的八项资源</h2>
            <p>优先展示可直接照着用的模板、清单和写作参考。</p>
          </div>

          <div class="featured-grid">
            <article v-for="item in featuredResources" :key="item.id" class="featured-card">
              <div class="resource-meta">
                <span>{{ stageName(item.stage) }}</span>
                <span>{{ item.type }}</span>
              </div>
              <h3>{{ item.featuredName || item.title }}</h3>
              <p>{{ item.summary }}</p>
              <div class="featured-actions">
                <router-link class="text-link" :to="{ name: 'guide-detail', params: { slug: item.slug } }">
                  查看详情
                </router-link>
                <a
                  v-if="hasDownloadableAttachments(item)"
                  class="download-link"
                  :href="item.attachments[0].href"
                  download
                >
                  下载
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="resource-center" class="resource-center section-block" aria-labelledby="resource-title">
        <div class="container">
          <div class="resource-head">
            <div>
              <p class="section-kicker">资源中心</p>
              <h2 id="resource-title">按关键词、阶段和类型查找</h2>
              <p>{{ resultText }}</p>
            </div>
            <button class="clear-btn" type="button" :disabled="!hasActiveFilters" @click="resetFilters">
              清除全部条件
            </button>
          </div>

          <div class="filter-panel" aria-label="资源筛选条件">
            <label class="filter-search">
              <span>关键词搜索</span>
              <input v-model.trim="filters.keyword" type="search" placeholder="标题、简介、关键词、正文摘要" />
            </label>

            <div class="filter-group">
              <span class="filter-label">实践阶段</span>
              <div class="chip-row" role="group" aria-label="按实践阶段筛选">
                <button
                  v-for="option in stageOptions"
                  :key="option.id"
                  class="filter-chip"
                  :class="{ active: filters.stage === option.id }"
                  type="button"
                  @click="filters.stage = option.id"
                >
                  {{ option.name }}
                </button>
              </div>
            </div>

            <div class="filter-group">
              <span class="filter-label">资源类型</span>
              <div class="chip-row" role="group" aria-label="按资源类型筛选">
                <button
                  v-for="option in typeOptions"
                  :key="option.id"
                  class="filter-chip"
                  :class="{ active: filters.type === option.id }"
                  type="button"
                  @click="filters.type = option.id"
                >
                  {{ option.name }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="filteredResources.length" class="resource-grid">
            <article v-for="item in filteredResources" :key="item.id" class="resource-card">
              <div class="resource-meta">
                <span>{{ stageName(item.stage) }}</span>
                <span>{{ item.type }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.summary }}</p>
              <dl class="resource-facts">
                <div>
                  <dt>格式</dt>
                  <dd>{{ hasDownloadableAttachments(item) ? item.format : '在线阅读' }}</dd>
                </div>
                <div>
                  <dt>阅读</dt>
                  <dd>{{ item.readingTime }}</dd>
                </div>
                <div>
                  <dt>更新</dt>
                  <dd>{{ item.updatedAt }}</dd>
                </div>
              </dl>
              <div class="resource-actions">
                <router-link class="detail-btn" :to="{ name: 'guide-detail', params: { slug: item.slug } }">
                  查看详情
                </router-link>
                <a
                  v-if="hasDownloadableAttachments(item)"
                  class="download-link"
                  :href="item.attachments[0].href"
                  download
                >
                  下载
                </a>
              </div>
            </article>
          </div>

          <div v-else class="empty" role="status">
            <strong>没有找到匹配资源</strong>
            <p>可以减少关键词，或清除阶段、类型筛选后重新查找。</p>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import data from './guide-data.json'
import {
  GUIDE_STAGES,
  GUIDE_TYPES,
  GUIDE_STAGE_ALL,
  GUIDE_TYPE_ALL,
  HOT_KEYWORDS,
  stageName,
} from './guide-schema.js'
import {
  clearGuideFilters,
  defaultGuideFilters,
  filterGuideResources,
  hasDownloadableAttachments,
} from './guide-utils.js'

const resources = data.resources
const filters = reactive({ ...defaultGuideFilters })

const stageOptions = computed(() => [
  { id: GUIDE_STAGE_ALL, name: '全部阶段' },
  ...GUIDE_STAGES.map((stage) => ({ id: stage.id, name: stage.name })),
])

const typeOptions = computed(() => [
  { id: GUIDE_TYPE_ALL, name: '全部类型' },
  ...GUIDE_TYPES.map((type) => ({ id: type, name: type })),
])

const filteredResources = computed(() => filterGuideResources(resources, filters))
const featuredResources = computed(() => resources.filter((item) => item.featured).slice(0, 8))
const hasActiveFilters = computed(() =>
  filters.keyword !== '' || filters.stage !== GUIDE_STAGE_ALL || filters.type !== GUIDE_TYPE_ALL,
)
const resultText = computed(() => `当前显示 ${filteredResources.value.length} / ${resources.length} 项资源`)

function countByStage(stageId) {
  return resources.filter((item) => item.stage === stageId).length
}

function representatives(stageId) {
  return resources
    .filter((item) => item.stage === stageId)
    .slice(0, 3)
    .map((item) => item.title.replace(/^如何/, ''))
}

function scrollToResources() {
  requestAnimationFrame(() => {
    document.querySelector('#resource-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function applyKeyword(word) {
  filters.keyword = word
  filters.stage = GUIDE_STAGE_ALL
  filters.type = GUIDE_TYPE_ALL
  scrollToResources()
}

function applyStage(stageId) {
  filters.stage = stageId
  filters.keyword = ''
  filters.type = GUIDE_TYPE_ALL
  scrollToResources()
}

function resetFilters() {
  Object.assign(filters, clearGuideFilters())
}
</script>

<style scoped>
.guide {
  min-height: 100%;
  background: var(--color-bg);
}

.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.guide-hero {
  padding: 4.5rem 0 4rem;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(77, 107, 62, 0.98), rgba(107, 140, 92, 0.92)),
    var(--color-primary-dark);
}

.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: clamp(2rem, 6vw, 4.5rem);
  align-items: center;
}

.kicker,
.section-kicker {
  margin: 0 0 0.65rem;
  color: var(--color-highlight);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.guide-hero .kicker {
  color: var(--color-accent);
}

.hero-copy h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(38px, 5vw, 62px);
  line-height: 1.1;
}

.hero-subtitle {
  margin: 0.8rem 0 0;
  color: rgba(255, 255, 255, 0.94);
  font-family: var(--sx-serif);
  font-size: clamp(20px, 2.7vw, 30px);
  font-weight: 700;
}

.hero-lead {
  max-width: 760px;
  margin: 1rem 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1.02rem;
  line-height: 1.85;
}

.hero-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;
  max-width: 720px;
  margin-top: 1.8rem;
  padding: 0.35rem;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
}

.hero-search input,
.filter-search input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  font-family: inherit;
}

.hero-search input {
  padding: 0.8rem 1rem;
  color: #fff;
  background: transparent;
  font-size: 0.96rem;
}

.hero-search input::placeholder {
  color: rgba(255, 255, 255, 0.72);
}

.hero-search button,
.clear-btn,
.filter-chip,
.stage-entry-card {
  font-family: inherit;
  cursor: pointer;
}

.hero-search button {
  min-width: 86px;
  border: none;
  border-radius: 999px;
  color: var(--color-primary-dark);
  background: var(--color-accent);
  font-weight: 800;
}

.hot-keywords {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-top: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.88rem;
}

.hot-keywords button {
  padding: 0.25rem 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  font: inherit;
  cursor: pointer;
}

.hot-keywords button:hover,
.hot-keywords button:focus-visible {
  background: rgba(255, 255, 255, 0.18);
}

.hero-note {
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.12);
}

.note-label {
  margin: 0 0 0.75rem;
  color: var(--color-accent);
  font-weight: 700;
}

.note-main {
  margin: 0;
  font-family: var(--sx-serif);
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 700;
  line-height: 1.45;
}

.note-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1.4rem;
}

.note-stat {
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
}

.note-stat strong {
  display: block;
  font-size: 1.8rem;
  line-height: 1;
}

.note-stat span {
  display: block;
  margin-top: 0.3rem;
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.78rem;
}

.section-block {
  padding: 3.4rem 0;
}

.section-head {
  max-width: 760px;
  margin-bottom: 1.4rem;
}

.section-head.compact {
  margin-bottom: 1.2rem;
}

.section-head h2,
.resource-head h2 {
  margin: 0;
  color: var(--color-primary-dark);
  font-size: clamp(24px, 3.2vw, 36px);
}

.section-head p,
.resource-head p {
  margin: 0.7rem 0 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.stage-entry-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 260px;
  padding: 1.35rem;
  text-align: left;
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.stage-entry-card:hover,
.stage-entry-card:focus-visible {
  border-color: rgba(107, 140, 92, 0.45);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.stage-name {
  color: var(--color-highlight);
  font-size: 0.8rem;
  font-weight: 800;
}

.stage-entry-card strong {
  margin-top: 0.45rem;
  color: var(--color-primary-dark);
  font-family: var(--sx-serif);
  font-size: 1.35rem;
}

.stage-desc {
  margin-top: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.stage-count {
  margin-top: auto;
  padding-top: 1rem;
  color: var(--color-primary-dark);
  font-weight: 800;
}

.stage-topics {
  margin-top: 0.35rem;
  color: var(--color-text-light);
  font-size: 0.84rem;
  line-height: 1.6;
}

.featured {
  background: var(--gradient-section-odd);
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
}

.featured-grid,
.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.featured-card,
.resource-card,
.filter-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.featured-card {
  display: flex;
  flex-direction: column;
  min-height: 230px;
  padding: 1.15rem;
  border-top: 4px solid var(--color-accent);
}

.resource-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.resource-meta span {
  padding: 0.12rem 0.62rem;
  border-radius: 999px;
  color: var(--color-primary-dark);
  background: var(--color-accent-soft);
  font-size: 0.74rem;
  font-weight: 800;
}

.featured-card h3,
.resource-card h3 {
  margin: 0.75rem 0 0;
  color: var(--color-text);
  font-size: 1.08rem;
}

.featured-card p,
.resource-card p {
  margin: 0.55rem 0 0;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.featured-card p {
  flex: 1;
}

.featured-actions,
.resource-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1rem;
}

.text-link,
.detail-btn,
.download-link,
.clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0.42rem 0.9rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.84rem;
}

.text-link,
.detail-btn {
  color: #fff;
  background: var(--color-primary);
}

.download-link {
  color: var(--color-primary-dark);
  background: var(--color-accent);
}

.resource-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.1rem;
}

.clear-btn {
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  color: var(--color-primary-dark);
  background: var(--color-card);
}

.clear-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 1rem;
  margin-bottom: 1.2rem;
  padding: 1rem;
}

.filter-search {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--color-text);
  font-weight: 800;
  font-size: 0.85rem;
}

.filter-search input {
  padding: 0.7rem 0.85rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.92rem;
}

.filter-search input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(107, 140, 92, 0.12);
}

.filter-group {
  min-width: 0;
}

.filter-label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 800;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.filter-chip {
  padding: 0.38rem 0.82rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text-secondary);
  background: var(--color-card);
}

.filter-chip.active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.resource-card {
  display: flex;
  flex-direction: column;
  padding: 1.15rem;
}

.resource-card p {
  flex: 1;
}

.resource-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin: 1rem 0 0;
}

.resource-facts div {
  min-width: 0;
  padding-top: 0.65rem;
  border-top: 1px solid var(--color-border-light);
}

.resource-facts dt {
  color: var(--color-text-light);
  font-size: 0.74rem;
}

.resource-facts dd {
  margin: 0.18rem 0 0;
  color: var(--color-text);
  font-size: 0.82rem;
  font-weight: 700;
}

.empty {
  padding: 2.4rem;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
}

.empty strong {
  display: block;
  color: var(--color-primary-dark);
  font-size: 1.1rem;
}

.empty p {
  margin: 0.5rem 0 0;
}

@media (max-width: 980px) {
  .hero-layout,
  .filter-panel {
    grid-template-columns: 1fr;
  }

  .stage-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .guide-hero {
    padding: 3rem 0;
  }

  .hero-search {
    grid-template-columns: 1fr;
    border-radius: var(--radius);
  }

  .hero-search button {
    min-height: 42px;
  }

  .note-stats,
  .resource-facts {
    grid-template-columns: 1fr;
  }

  .resource-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
