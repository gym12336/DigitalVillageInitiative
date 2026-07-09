<template>
  <section class="module-page">
    <header class="mod-hero">
      <div class="hero-copy">
        <p class="kicker">乡村好物</p>
        <h1>把村庄里的好产品，带到更多人面前</h1>
        <p class="lead">
          以电商平台的浏览体验承载乡村振兴主题：看见产品，也看见产地、手艺人和一份可持续的支持。
        </p>
        <div class="hero-badges" aria-label="好物主题">
          <span>合作社直供</span>
          <span>非遗手作</span>
          <span>消费帮扶</span>
        </div>
      </div>

      <aside class="hero-panel" aria-label="演示版数据概览">
        <p class="panel-label">演示版好物库</p>
        <div class="hero-metrics">
          <div v-for="item in heroMetrics" :key="item.label" class="metric">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
        <p class="panel-note">正式版本可接入合作社店铺、公益采购登记表与产品溯源信息。</p>
      </aside>
    </header>

    <section class="support-strip" aria-label="消费帮扶链路">
      <div class="support-item">
        <span class="support-index">01</span>
        <strong>好物上架</strong>
        <p>用图片、规格和卖点把乡村产品讲清楚。</p>
      </div>
      <div class="support-item">
        <span class="support-index">02</span>
        <strong>故事背书</strong>
        <p>展示产地、守护人和背后的乡土工艺。</p>
      </div>
      <div class="support-item">
        <span class="support-index">03</span>
        <strong>助力转化</strong>
        <p>为正式购买、众筹或公益采购预留入口。</p>
      </div>
    </section>

    <section id="goods-list" class="goods-toolbar" aria-label="好物筛选">
      <div class="toolbar-top">
        <div class="search-bar">
          <span class="search-icon" aria-hidden="true">搜索</span>
          <input
            v-model="keyword"
            class="search-input"
            type="search"
            placeholder="搜索好物名称、产地、守护人或关键词"
            aria-label="搜索好物"
          />
        </div>
        <div class="result-box">
          <strong>{{ shownGoods.length }}</strong>
          <span>当前好物</span>
        </div>
      </div>

      <div class="sort-pills" role="group" aria-label="排序方式">
        <button
          v-for="s in sortOptions"
          :key="s.value"
          class="pill"
          :class="{ active: sortBy === s.value }"
          type="button"
          @click="sortBy = s.value"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="filter-row">
        <span class="filter-label">分类</span>
        <div class="tag-group">
          <button
            v-for="c in categories"
            :key="c"
            class="tag"
            :class="{ active: category === c }"
            type="button"
            @click="category = c"
          >
            {{ c }}
          </button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-label">状态</span>
        <div class="tag-group">
          <button
            v-for="st in statuses"
            :key="st"
            class="tag"
            :class="{ active: status === st }"
            type="button"
            @click="status = st"
          >
            {{ st }}
          </button>
        </div>
      </div>

      <div class="filter-summary">
        <span>{{ summaryText }}</span>
        <button v-if="hasActiveFilter" class="clear-btn" type="button" @click="clearFilters">
          清除筛选
        </button>
      </div>
    </section>

    <div v-if="shownGoods.length" class="goods-grid">
      <article
        v-for="g in shownGoods"
        :key="g.id"
        class="goods-card"
        tabindex="0"
        role="button"
        :aria-label="`查看 ${g.name} 详情`"
        @click="openDetail(g)"
        @keydown.enter="openDetail(g)"
        @keydown.space.prevent="openDetail(g)"
      >
        <div class="thumb" :style="coverStyle(g)">
          <img
            v-if="imageSrc(g)"
            :src="imageSrc(g)"
            :alt="`${g.name}展示图`"
            loading="lazy"
            @error="onImageError(g)"
          />
          <span v-else class="thumb-ph">{{ g.name.slice(0, 1) }}</span>
          <span class="status-badge" :class="statusClass(g.status)">{{ g.status }}</span>
          <span class="demo-badge">展示图</span>
        </div>
        <div class="goods-body">
          <div class="goods-kv">
            <span>{{ g.category }}</span>
            <span>{{ g.origin }}</span>
          </div>
          <h3 class="goods-name">{{ g.name }}</h3>
          <p class="goods-desc">{{ g.shortDesc }}</p>
          <div class="mini-tags" aria-label="好物标签">
            <span v-for="tag in g.tags.slice(0, 2)" :key="tag">{{ tag }}</span>
          </div>
          <p class="impact-line">{{ g.impact.metric }}</p>
          <div class="goods-foot">
            <span class="goods-price">¥{{ g.price }}<span class="unit">/{{ g.unit }}</span></span>
            <span class="story-link">查看故事</span>
          </div>
        </div>
      </article>
    </div>
    <p v-else class="empty">没有找到匹配的好物，试试换个关键词或清除筛选。</p>

    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="active"
          class="modal-mask"
          @click.self="closeDetail"
        >
          <div
            class="modal-dialog"
            role="dialog"
            aria-modal="true"
            :aria-label="`${active.name} 详情`"
          >
            <button class="modal-close" type="button" aria-label="关闭" @click="closeDetail">×</button>

            <div class="modal-layout">
              <aside class="modal-media">
                <div class="modal-hero" :style="coverStyle(active)">
                  <img
                    v-if="imageSrc(active)"
                    :src="imageSrc(active)"
                    :alt="`${active.name}展示图`"
                    @error="onImageError(active)"
                  />
                  <span v-else class="modal-hero-ph">{{ active.name.slice(0, 1) }}</span>
                  <span class="status-badge modal-status" :class="statusClass(active.status)">
                    {{ active.status }}
                  </span>
                </div>
                <div class="impact-card">
                  <span class="impact-label">帮扶价值</span>
                  <strong>{{ active.impact.metric }}</strong>
                  <p>{{ active.impact.text }}</p>
                </div>
              </aside>

              <div class="modal-body">
                <div class="modal-head">
                  <div>
                    <p class="modal-origin">{{ active.origin }} · {{ active.village }}</p>
                    <h2 class="modal-name">{{ active.name }}</h2>
                  </div>
                  <span class="modal-cat">{{ active.category }}</span>
                </div>

                <p class="modal-meta">
                  守护人 <b>{{ active.guardian }}</b>
                  <span class="dot">·</span>
                  {{ active.purchaseNote }}
                </p>

                <p class="modal-short">{{ active.shortDesc }}</p>

                <div class="detail-tags">
                  <span v-for="tag in active.tags" :key="tag">{{ tag }}</span>
                </div>

                <section class="detail-section">
                  <h3>产品信息</h3>
                  <dl class="spec-grid">
                    <div v-for="spec in active.specs" :key="spec.label" class="spec-item">
                      <dt>{{ spec.label }}</dt>
                      <dd>{{ spec.value }}</dd>
                    </div>
                  </dl>
                </section>

                <section class="detail-section">
                  <h3>好物故事</h3>
                  <p class="modal-story">{{ active.story }}</p>
                </section>

                <div class="modal-foot">
                  <div class="price-block">
                    <span class="modal-price">¥{{ active.price }}</span>
                    <span class="modal-unit">/ {{ active.unit }}</span>
                  </div>
                  <div class="modal-actions">
                    <button class="ghost-btn" type="button" @click="toggleLike">
                      {{ liked ? '已点赞' : '点赞' }}
                    </button>
                    <button class="ghost-btn" type="button" @click="toggleFav">
                      {{ faved ? '已收藏' : '收藏' }}
                    </button>
                    <button class="buy-btn" type="button" @click="onBuy">助力购买</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <GoodsToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import goodsData from './goods-data.json'
import GoodsToast from './GoodsToast.vue'

const keyword = ref('')
const sortBy = ref('newest')
const category = ref('全部')
const status = ref('全部')
const brokenImages = ref(new Set())

const sortOptions = [
  { value: 'newest', label: '最新上架' },
  { value: 'hot', label: '最受关注' },
  { value: 'fav', label: '最多收藏' },
  { value: 'priceAsc', label: '价格低-高' },
]
const categories = ['全部', ...new Set(goodsData.map((g) => g.category))]
const statuses = ['全部', ...new Set(goodsData.map((g) => g.status))]

const totalFamilies = computed(() =>
  goodsData.reduce((sum, g) => sum + (g.impact?.families ?? 0), 0)
)
const heroMetrics = computed(() => [
  { value: goodsData.length, label: '件演示好物' },
  { value: new Set(goodsData.map((g) => g.origin)).size, label: '个产地区域' },
  { value: totalFamilies.value, label: '户示例受益' },
])

const shownGoods = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = goodsData.filter((g) => {
    const specText = (g.specs ?? []).map((spec) => `${spec.label} ${spec.value}`).join(' ')
    const matchKw =
      !kw ||
      [
        g.name,
        g.origin,
        g.village,
        g.category,
        g.guardian,
        g.shortDesc,
        g.story,
        g.impact?.metric,
        g.impact?.text,
        ...(g.tags ?? []),
        specText,
      ]
        .join(' ')
        .toLowerCase()
        .includes(kw)
    const matchCat = category.value === '全部' || g.category === category.value
    const matchStatus = status.value === '全部' || g.status === status.value
    return matchKw && matchCat && matchStatus
  })

  const sorted = [...list]
  switch (sortBy.value) {
    case 'hot':
      sorted.sort((a, b) => b.views - a.views)
      break
    case 'fav':
      sorted.sort((a, b) => b.favorites - a.favorites)
      break
    case 'priceAsc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'newest':
    default:
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return sorted
})

const hasActiveFilter = computed(
  () => !!keyword.value.trim() || category.value !== '全部' || status.value !== '全部'
)
const summaryText = computed(() => {
  const parts = []
  if (category.value !== '全部') parts.push(category.value)
  if (status.value !== '全部') parts.push(status.value)
  if (keyword.value.trim()) parts.push(`“${keyword.value.trim()}”`)
  const scope = parts.length ? parts.join(' / ') : '全部好物'
  return `当前：${scope}，共 ${shownGoods.value.length} 件`
})

function clearFilters() {
  keyword.value = ''
  category.value = '全部'
  status.value = '全部'
}

function coverStyle(g) {
  const h = g.hue ?? 100
  return {
    background: `linear-gradient(135deg, hsl(${h} 42% 72%), hsl(${(h + 42) % 360} 44% 48%))`,
  }
}
function imageSrc(g) {
  return brokenImages.value.has(g.id) ? '' : g.image
}
function onImageError(g) {
  const next = new Set(brokenImages.value)
  next.add(g.id)
  brokenImages.value = next
}
function statusClass(st) {
  return {
    可购买: 'st-buy',
    预售中: 'st-pre',
    众筹中: 'st-crowd',
  }[st]
}

const active = ref(null)
const liked = ref(false)
const faved = ref(false)
const toastRef = ref(null)

function openDetail(g) {
  active.value = g
  liked.value = false
  faved.value = false
}
function closeDetail() {
  active.value = null
}
function toggleLike() {
  liked.value = !liked.value
}
function toggleFav() {
  faved.value = !faved.value
}
function onBuy() {
  if (!active.value) return
  toastRef.value?.show(`已记录对「${active.value.name}」的助力意向，正式版可对接合作社购买渠道`)
}

function onKeydown(e) {
  if (e.key === 'Escape' && active.value) closeDetail()
}
watch(active, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.module-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 2.4rem clamp(1rem, 4vw, 2rem) 3.4rem;
}

.mod-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: clamp(1.2rem, 4vw, 2rem);
  align-items: stretch;
  margin-bottom: 1.2rem;
}
.hero-copy {
  padding: clamp(1.4rem, 4vw, 2rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(250, 248, 245, 0.72)),
    radial-gradient(circle at 88% 18%, rgba(224, 122, 95, 0.14), transparent 30%);
  box-shadow: var(--shadow-card);
}
.kicker {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-secondary);
  margin: 0 0 0.5rem;
}
.mod-hero h1 {
  max-width: 680px;
  font-size: clamp(1.8rem, 4vw, 2.65rem);
  color: var(--color-primary-dark);
  line-height: 1.25;
}
.lead {
  color: var(--color-text-secondary);
  max-width: 720px;
  margin: 0.8rem 0 0;
}
.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1.2rem;
}
.hero-badges span {
  border: 1px solid rgba(107, 140, 92, 0.18);
  background: rgba(107, 140, 92, 0.08);
  color: var(--color-primary-dark);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
}
.hero-panel {
  border: 1px solid rgba(212, 163, 115, 0.38);
  border-radius: var(--radius);
  background: linear-gradient(145deg, #fffaf3, #ffffff);
  box-shadow: var(--shadow-card);
  padding: 1.3rem;
}
.panel-label {
  margin: 0 0 0.8rem;
  color: var(--color-text-light);
  font-size: 0.84rem;
  font-weight: 700;
}
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.metric {
  min-height: 78px;
  border-radius: 12px;
  background: rgba(232, 201, 155, 0.18);
  padding: 0.75rem 0.6rem;
  display: grid;
  align-content: center;
  gap: 0.1rem;
  text-align: center;
}
.metric strong {
  color: var(--color-highlight);
  font-size: 1.55rem;
  line-height: 1;
}
.metric span {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}
.panel-note {
  margin: 1rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  line-height: 1.75;
}

.support-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  margin: 0 0 1.2rem;
}
.support-item {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 1rem;
}
.support-index {
  display: inline-block;
  color: var(--color-secondary);
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}
.support-item strong {
  display: block;
  color: var(--color-primary-dark);
  font-size: 0.98rem;
}
.support-item p {
  margin: 0.25rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.65;
}

.goods-toolbar {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  padding: 1rem;
  margin: 0 0 1.35rem;
}
.toolbar-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
  margin-bottom: 0.9rem;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.7rem 1rem;
}
.search-icon {
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 700;
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: var(--color-text);
  font-family: inherit;
}
.search-input::placeholder { color: var(--color-text-light); }
.result-box {
  min-width: 104px;
  border-radius: 14px;
  background: rgba(107, 140, 92, 0.09);
  color: var(--color-primary-dark);
  padding: 0.54rem 0.8rem;
  text-align: center;
}
.result-box strong {
  display: block;
  font-size: 1.15rem;
  line-height: 1.1;
}
.result-box span {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.sort-pills,
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.sort-pills { margin-bottom: 0.9rem; }
.pill,
.tag,
.clear-btn,
.ghost-btn,
.buy-btn,
.modal-close {
  font-family: inherit;
}
.pill {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-secondary);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.84rem;
  cursor: pointer;
  transition: all var(--transition);
}
.pill:hover { border-color: var(--color-primary); color: var(--color-primary); }
.pill.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.65rem;
  flex-wrap: wrap;
}
.filter-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-text-light);
  min-width: 2.6em;
}
.tag {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 10px;
  padding: 0.34rem 0.8rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all var(--transition);
}
.tag:hover { border-color: var(--color-secondary); color: var(--color-secondary); }
.tag.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-primary-dark);
  font-weight: 700;
}
.filter-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 0.2rem;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}
.clear-btn {
  border: none;
  background: transparent;
  color: var(--color-highlight);
  font-size: 0.84rem;
  cursor: pointer;
  text-decoration: underline;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.2rem;
}
.goods-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
  outline: none;
}
.goods-card:hover,
.goods-card:focus-visible {
  transform: translateY(-5px);
  border-color: rgba(107, 140, 92, 0.35);
  box-shadow: var(--shadow-card-hover);
}
.goods-card:focus-visible { border-color: var(--color-primary); }
.thumb {
  position: relative;
  aspect-ratio: 1.16 / 1;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.thumb img,
.modal-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb img,
.thumb-ph {
  transition: transform var(--transition);
}
.goods-card:hover .thumb img,
.goods-card:hover .thumb-ph {
  transform: scale(1.04);
}
.thumb::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 42%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.28), transparent);
}
.thumb-ph {
  font-family: var(--sx-serif);
  font-size: 3.3rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}
.status-badge,
.demo-badge {
  position: absolute;
  z-index: 1;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}
.status-badge {
  top: 0.72rem;
  left: 0.72rem;
  padding: 0.22rem 0.62rem;
  color: #fff;
  backdrop-filter: blur(2px);
}
.demo-badge {
  right: 0.72rem;
  bottom: 0.72rem;
  padding: 0.18rem 0.56rem;
  color: #fff;
  background: rgba(30, 30, 30, 0.42);
}
.st-buy { background: rgba(107, 140, 92, 0.92); }
.st-pre { background: rgba(212, 163, 115, 0.94); }
.st-crowd { background: rgba(224, 122, 95, 0.94); }

.goods-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0.95rem 1rem 1.05rem;
}
.goods-kv {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  color: var(--color-text-light);
  font-size: 0.78rem;
  margin-bottom: 0.35rem;
}
.goods-kv span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-name {
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--color-text);
}
.goods-desc {
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  line-height: 1.65;
  margin: 0.45rem 0 0.65rem;
}
.mini-tags,
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
}
.mini-tags span,
.detail-tags span {
  border-radius: 999px;
  background: rgba(232, 201, 155, 0.24);
  color: var(--color-primary-dark);
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.18rem 0.55rem;
}
.impact-line {
  margin: 0.75rem 0 0;
  color: var(--color-primary);
  font-size: 0.82rem;
  font-weight: 700;
}
.goods-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  margin-top: auto;
  padding-top: 0.9rem;
}
.goods-price {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-highlight);
}
.goods-price .unit {
  font-size: 0.76rem;
  font-weight: 400;
  color: var(--color-text-light);
}
.story-link {
  color: var(--color-primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
}
.empty {
  color: var(--color-text-light);
  text-align: center;
  padding: 3rem 0;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(30, 30, 30, 0.5);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 1.2rem;
}
.modal-dialog {
  position: relative;
  width: min(96vw, 980px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}
.modal-close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 3;
  width: 2.1rem;
  height: 2.1rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  font-size: 1.15rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background var(--transition), transform var(--transition);
}
.modal-close:hover {
  background: #fff;
  transform: translateY(-1px);
}
.modal-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.1fr);
}
.modal-media {
  background: #f7f0e7;
  padding: 1rem;
}
.modal-hero {
  position: relative;
  min-height: 360px;
  border-radius: 14px;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.modal-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.22), transparent 45%);
  pointer-events: none;
}
.modal-status {
  top: 0.85rem;
  left: 0.85rem;
}
.modal-hero-ph {
  font-family: var(--sx-serif);
  font-size: 5.6rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 3px 16px rgba(0, 0, 0, 0.18);
}
.impact-card {
  margin-top: 0.9rem;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--color-border);
  padding: 1rem;
}
.impact-label {
  display: inline-block;
  color: var(--color-secondary);
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 0.35rem;
}
.impact-card strong {
  display: block;
  color: var(--color-primary-dark);
  font-size: 1.05rem;
}
.impact-card p {
  margin: 0.45rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  line-height: 1.75;
}
.modal-body {
  padding: clamp(1.3rem, 4vw, 2rem);
}
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}
.modal-origin {
  margin: 0 0 0.25rem;
  color: var(--color-text-light);
  font-size: 0.86rem;
}
.modal-name {
  font-size: clamp(1.5rem, 3vw, 2rem);
  color: var(--color-primary-dark);
  line-height: 1.25;
}
.modal-cat {
  flex: 0 0 auto;
  background: var(--color-accent);
  color: var(--color-primary-dark);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.22rem 0.7rem;
  border-radius: 999px;
}
.modal-meta {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0.8rem 0 1rem;
}
.modal-meta .dot {
  margin: 0 0.42rem;
  color: var(--color-text-light);
}
.modal-meta b { color: var(--color-primary); }
.modal-short {
  margin: 0 0 0.8rem;
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.8;
}
.detail-section {
  margin-top: 1.25rem;
}
.detail-section h3 {
  color: var(--color-primary-dark);
  font-size: 1.02rem;
  margin-bottom: 0.75rem;
}
.spec-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin: 0;
}
.spec-item {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: rgba(250, 248, 245, 0.62);
  padding: 0.7rem 0.8rem;
}
.spec-item dt {
  color: var(--color-text-light);
  font-size: 0.76rem;
}
.spec-item dd {
  margin: 0.18rem 0 0;
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.55;
}
.modal-story {
  color: var(--color-text);
  line-height: 1.9;
  font-size: 0.94rem;
  margin: 0;
  text-align: justify;
}
.modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border-top: 1px solid var(--color-border);
  padding-top: 1.1rem;
  margin-top: 1.3rem;
}
.price-block {
  display: flex;
  align-items: baseline;
  gap: 0.22rem;
}
.modal-price {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-highlight);
}
.modal-unit {
  font-size: 0.86rem;
  color: var(--color-text-light);
}
.modal-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.ghost-btn {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition);
}
.ghost-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.buy-btn {
  border: none;
  background: var(--color-highlight);
  color: #fff;
  border-radius: 999px;
  padding: 0.62rem 1.45rem;
  font-size: 0.94rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.buy-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(224, 122, 95, 0.38);
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity var(--transition); }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

@media (max-width: 980px) {
  .mod-hero,
  .modal-layout {
    grid-template-columns: 1fr;
  }
  .hero-panel {
    order: -1;
  }
  .goods-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .modal-hero {
    min-height: 280px;
  }
}
@media (max-width: 680px) {
  .module-page {
    padding-top: 1.4rem;
  }
  .support-strip,
  .goods-grid,
  .spec-grid {
    grid-template-columns: 1fr;
  }
  .toolbar-top {
    grid-template-columns: 1fr;
  }
  .hero-metrics {
    grid-template-columns: 1fr;
  }
  .metric {
    min-height: 62px;
  }
  .goods-kv,
  .modal-head,
  .modal-foot {
    align-items: flex-start;
    flex-direction: column;
  }
  .modal-actions {
    width: 100%;
  }
  .buy-btn,
  .ghost-btn {
    flex: 1;
  }
}
</style>
