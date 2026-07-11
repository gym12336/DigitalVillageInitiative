<template>
  <section class="guide">
    <section class="guide-hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="kicker">实践攻略</p>
          <h1>数乡实践方法手册</h1>
          <p class="hero-lead">
            面向学生团队、高校老师、乡镇村庄与社会公众，公开一套负责任的乡村实践方法：
            有准备地进入村庄，有边界地开展调研，有证据地形成成果，有回响地沉淀价值。
          </p>
          <div class="hero-actions" aria-label="实践攻略入口">
            <router-link class="btn primary" to="/practice/mine">创建实践档案</router-link>
            <a class="btn ghost" href="#toolbox">查找工具资源</a>
          </div>
        </div>

        <aside class="hero-note" aria-label="方法手册摘要">
          <p class="note-label">公共承诺</p>
          <p class="note-main">让每一次下乡都有准备、有记录、有成果、有回响。</p>
          <div class="note-stats">
            <div v-for="s in data.heroStats" :key="s.label" class="note-stat">
              <strong>{{ s.value }}</strong>
              <span>{{ s.label }}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <div class="container">
      <section class="audience-section" aria-labelledby="audience-title">
        <div class="section-head">
          <p class="section-kicker">谁会使用</p>
          <h2 id="audience-title">这不是队员内部资料，而是社会可读的方法标准</h2>
          <p>
            一套好的实践攻略，应同时让学生知道怎么做，让老师知道怎么指导，
            让村庄知道团队会留下什么，也让公众看见成果为何可信。
          </p>
        </div>
        <div class="audience-grid">
          <article v-for="item in data.audiences" :key="item.role" class="audience-card">
            <span class="audience-role">{{ item.role }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </article>
        </div>
      </section>

      <section class="principles" aria-labelledby="principles-title">
        <div class="section-head compact">
          <p class="section-kicker">实践原则</p>
          <h2 id="principles-title">先把边界讲清楚，再把事情做扎实</h2>
        </div>
        <div class="principle-row">
          <article v-for="p in data.principles" :key="p.name" class="principle-item">
            <h3>{{ p.name }}</h3>
            <p>{{ p.desc }}</p>
          </article>
        </div>
      </section>

      <section class="method-section" aria-labelledby="method-title">
        <div class="section-head">
          <p class="section-kicker">实践路线</p>
          <h2 id="method-title">一次负责任的乡村实践应该怎么走</h2>
          <p>
            这里展示的是公共版路线图；真正执行时，团队可以进入「我的实践」把每一步落成档案、
            材料清单和成果卡。
          </p>
        </div>

        <div class="method-timeline">
          <article v-for="stage in data.methodStages" :key="stage.id" class="stage-card">
            <div class="stage-index">
              <span>{{ stage.no }}</span>
              <strong>{{ stage.name }}</strong>
            </div>
            <div class="stage-body">
              <h3>{{ stage.title }}</h3>
              <p class="stage-summary">{{ stage.summary }}</p>
              <ul class="action-list">
                <li v-for="action in stage.actions" :key="action">{{ action }}</li>
              </ul>
              <div class="stage-foot">
                <span class="deliverable">交付：{{ stage.deliverable }}</span>
                <div class="tool-chips">
                  <button
                    v-for="tool in stage.tools"
                    :key="tool"
                    class="tool-chip"
                    type="button"
                    @click="searchTool(tool)"
                  >
                    {{ tool }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section id="toolbox" class="toolbox">
      <div class="container">
        <div class="toolbox-head">
          <div>
            <p class="section-kicker">工具资源</p>
            <h2>把方法落到清单、模板和指南</h2>
            <p>搜索或按阶段筛选，找到团队当前最需要的工具。</p>
          </div>
          <div class="search-bar">
            <span class="search-ic" aria-hidden="true">🔍</span>
            <input
              v-model.trim="keyword"
              class="search-input"
              type="search"
              placeholder="搜索模板、清单、访谈、成果..."
              aria-label="搜索实践工具资源"
            />
          </div>
        </div>

        <div class="stage-filter" role="tablist" aria-label="按阶段筛选资源">
          <button
            v-for="option in stageOptions"
            :key="option"
            class="filter-chip"
            :class="{ active: activeStage === option }"
            type="button"
            @click="activeStage = option"
          >
            {{ option }}
          </button>
        </div>

        <div v-if="filteredResources.length" class="resource-grid">
          <article v-for="item in filteredResources" :key="item.id" class="resource-card">
            <div class="resource-meta">
              <span class="resource-stage">{{ item.stage }}</span>
              <span class="resource-type">{{ item.type }}</span>
            </div>
            <h3>{{ item.name }}</h3>
            <p>{{ item.desc }}</p>
            <button class="resource-btn" type="button" @click="onResource(item)">
              查看资源
            </button>
          </article>
        </div>

        <p v-else class="empty">
          没有找到与「{{ keyword }}」相关的资源，换个关键词或切换阶段试试。
        </p>
      </div>
    </section>

    <section class="guide-cta">
      <div class="container cta-inner">
        <div>
          <p class="section-kicker">开始行动</p>
          <h2>从公共方法进入团队实践档案</h2>
          <p>
            当团队准备真正执行时，把路线图转化为可保存、可协作、可复盘的实践档案。
          </p>
        </div>
        <router-link class="btn primary" to="/practice/mine">进入我的实践</router-link>
      </div>
    </section>

    <GuideToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import rawData from './guide-data.json'
import GuideToast from './GuideToast.vue'

const data = rawData
const keyword = ref('')
const activeStage = ref('全部')
const toastRef = ref(null)

const resources = computed(() =>
  data.categories.flatMap((cat) =>
    (cat.items || []).map((item, index) => ({
      ...item,
      id: `${cat.id}-${index}`,
      category: cat.name,
    })),
  ),
)

const stageOptions = computed(() => [
  '全部',
  ...new Set(resources.value.map((item) => item.stage).filter(Boolean)),
])

const filteredResources = computed(() => {
  const kw = keyword.value.toLowerCase()
  return resources.value.filter((item) => {
    const stageMatched = activeStage.value === '全部' || item.stage === activeStage.value
    const text = [item.name, item.desc, item.stage, item.type, item.category].join(' ').toLowerCase()
    return stageMatched && (!kw || text.includes(kw))
  })
})

function searchTool(tool) {
  keyword.value = tool
  activeStage.value = '全部'
  requestAnimationFrame(() => {
    document.querySelector('#toolbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function onResource(item) {
  toastRef.value?.show(`「${item.name}」资源内容即将上线`)
}
</script>

<style scoped>
.guide {
  background:
    linear-gradient(180deg, rgba(250, 248, 245, 0.96), rgba(250, 248, 245, 1)),
    var(--color-bg);
}

.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}

.guide-hero {
  padding: 4.2rem 0 3.8rem;
  background:
    linear-gradient(135deg, rgba(77, 107, 62, 0.96), rgba(107, 140, 92, 0.9)),
    var(--color-primary-dark);
  color: #fff;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: clamp(2rem, 6vw, 5rem);
  align-items: center;
}

.kicker,
.section-kicker {
  margin: 0 0 0.7rem;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-highlight);
}

.guide-hero .kicker { color: var(--color-accent); }

.hero-copy h1 {
  max-width: 720px;
  margin: 0;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.12;
  color: #fff;
}

.hero-lead {
  max-width: 780px;
  margin: 1.3rem 0 0;
  font-size: clamp(16px, 2vw, 20px);
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.9);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0.7rem 1.5rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.92rem;
  transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.btn:hover { transform: translateY(-1px); }

.btn.primary {
  color: #fff;
  background: var(--color-highlight);
  box-shadow: 0 10px 28px rgba(224, 122, 95, 0.24);
}

.btn.ghost {
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.38);
  background: rgba(255, 255, 255, 0.08);
}

.hero-note {
  padding: 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
}

.note-label {
  margin: 0 0 0.8rem;
  color: var(--color-accent);
  font-weight: 700;
  font-size: 0.85rem;
}

.note-main {
  margin: 0;
  font-family: var(--sx-serif);
  font-size: clamp(22px, 3vw, 32px);
  line-height: 1.45;
  font-weight: 700;
}

.note-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  margin-top: 1.5rem;
}

.note-stat {
  padding-top: 0.9rem;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
}

.note-stat strong {
  display: block;
  font-size: 2rem;
  line-height: 1;
}

.note-stat span {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.78);
}

.audience-section,
.principles,
.method-section {
  padding: 3.4rem 0 0;
}

.section-head {
  max-width: 780px;
  margin-bottom: 1.6rem;
}

.section-head.compact { margin-bottom: 1rem; }

.section-head h2,
.toolbox-head h2,
.guide-cta h2 {
  margin: 0;
  color: var(--color-primary-dark);
  font-size: clamp(24px, 3.4vw, 36px);
}

.section-head p,
.toolbox-head p,
.guide-cta p {
  margin: 0.8rem 0 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.audience-card,
.principle-item,
.stage-card,
.resource-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.audience-card {
  padding: 1.2rem 1.25rem;
}

.audience-role {
  display: inline-flex;
  padding: 0.16rem 0.7rem;
  border-radius: 50px;
  color: var(--color-primary-dark);
  background: var(--color-accent);
  font-size: 0.76rem;
  font-weight: 700;
}

.audience-card h3,
.principle-item h3,
.stage-body h3,
.resource-card h3 {
  margin: 0.8rem 0 0;
  color: var(--color-text);
  font-size: 1.08rem;
}

.audience-card p,
.principle-item p,
.resource-card p {
  margin: 0.55rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
}

.principle-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.principle-item {
  padding: 1.3rem 1.4rem;
  border-left: 4px solid var(--color-primary);
}

.method-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.stage-card {
  display: grid;
  grid-template-columns: 156px minmax(0, 1fr);
  overflow: hidden;
}

.stage-index {
  padding: 1.4rem;
  color: #fff;
  background: var(--gradient-cta);
}

.stage-index span {
  display: block;
  font-family: var(--sx-serif);
  font-size: 2.7rem;
  font-weight: 800;
  line-height: 1;
}

.stage-index strong {
  display: block;
  margin-top: 0.8rem;
  font-size: 1rem;
}

.stage-body {
  padding: 1.35rem 1.5rem;
}

.stage-body h3 {
  margin-top: 0;
  color: var(--color-primary-dark);
  font-size: 1.28rem;
}

.stage-summary {
  margin: 0.55rem 0 0;
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.action-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem 1.4rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.action-list li {
  position: relative;
  padding-left: 1rem;
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.65;
}

.action-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.72em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-highlight);
}

.stage-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}

.deliverable {
  color: var(--color-primary-dark);
  font-weight: 700;
  font-size: 0.86rem;
}

.tool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tool-chip,
.filter-chip,
.resource-btn {
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.tool-chip {
  padding: 0.26rem 0.75rem;
  color: var(--color-primary-dark);
  background: var(--color-accent-soft);
  font-size: 0.78rem;
}

.tool-chip:hover {
  background: var(--color-accent);
}

.toolbox {
  margin-top: 3.6rem;
  padding: 3.2rem 0;
  background: var(--gradient-section-odd);
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
}

.toolbox-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 440px);
  gap: 1.5rem;
  align-items: end;
}

.search-bar {
  position: relative;
}

.search-ic {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  opacity: 0.65;
}

.search-input {
  width: 100%;
  padding: 14px 18px 14px 46px;
  font-size: 15px;
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 50px;
  outline: none;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(107, 140, 92, 0.12);
}

.stage-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin: 1.4rem 0 1.2rem;
}

.filter-chip {
  padding: 0.45rem 1rem;
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px solid var(--color-border);
}

.filter-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-chip.active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.resource-card {
  display: flex;
  flex-direction: column;
  min-height: 220px;
  padding: 1.2rem 1.25rem;
}

.resource-meta {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.resource-stage,
.resource-type {
  padding: 0.14rem 0.65rem;
  border-radius: 50px;
  font-size: 0.74rem;
  font-weight: 700;
}

.resource-stage {
  color: var(--color-primary-dark);
  background: var(--color-accent);
}

.resource-type {
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.resource-card p {
  flex: 1;
}

.resource-btn {
  align-self: flex-start;
  margin-top: 1rem;
  padding: 0.5rem 1.05rem;
  color: #fff;
  background: var(--color-primary);
  font-weight: 700;
}

.resource-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.empty {
  margin: 1.2rem 0 0;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-light);
  background: var(--color-card);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
}

.guide-cta {
  padding: 3.2rem 0 3.6rem;
}

.cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-top: 1.6rem;
  border-top: 1px solid var(--color-border);
}

.guide-cta .btn.primary {
  flex-shrink: 0;
}

@media (max-width: 920px) {
  .hero-grid,
  .toolbox-head {
    grid-template-columns: 1fr;
  }

  .audience-grid,
  .principle-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .guide-hero {
    padding: 3rem 0;
  }

  .note-stats,
  .audience-grid,
  .principle-row {
    grid-template-columns: 1fr;
  }

  .stage-card {
    grid-template-columns: 1fr;
  }

  .stage-index {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .stage-index strong {
    margin-top: 0;
  }

  .cta-inner {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
