<template>
  <section class="module-page">
    <!-- 页面头部 -->
    <header class="mod-hero">
      <p class="kicker">乡村好物</p>
      <h1>乡村好物 —— 每一件好物背后，都有一个村庄的故事</h1>
      <p class="lead">农副产品、手工艺品、非遗作品、文创设计，以消费帮扶助力乡村振兴。</p>
      <p class="stat">共 48 件好物</p>
    </header>

    <!-- 筛选面板 -->
    <div class="filter-panel">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input
        v-model="keyword"
        class="search-input"
        type="search"
        placeholder="搜索好物名称、产地、关键词..."
        aria-label="搜索好物"
      />
    </div>

    <!-- 排序胶囊 -->
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

    <!-- 分类 / 状态 标签筛选 -->
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

    <!-- 当前筛选路径 + 清除 -->
    <div class="filter-summary">
      <span>{{ summaryText }}</span>
      <button v-if="hasActiveFilter" class="clear-btn" type="button" @click="clearFilters">
        清除筛选
      </button>
    </div>
    </div>

    <!-- 好物列表 -->
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
        <!-- 产品图 1:1 首字母渐变占位 -->
        <div class="thumb" :style="thumbStyle(g)">
          <span class="thumb-ph">{{ g.name.slice(0, 1) }}</span>
          <span class="status-badge" :class="statusClass(g.status)">{{ g.status }}</span>
        </div>
        <div class="goods-body">
          <h3 class="goods-name">{{ g.name }}</h3>
          <p class="goods-origin">📍 {{ g.origin }}</p>
          <div class="goods-foot">
            <span class="goods-price">¥{{ g.price }}<span class="unit">/{{ g.unit }}</span></span>
            <span class="story-tag">好物故事</span>
          </div>
        </div>
      </article>
    </div>
    <p v-else class="empty">没有找到匹配的好物，试试换个关键词或清除筛选。</p>

    <!-- 好物详情模态框 -->
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
            <button class="modal-close" type="button" aria-label="关闭" @click="closeDetail">✕</button>

            <!-- 产品大图 -->
            <div class="modal-hero" :style="thumbStyle(active)">
              <span class="modal-hero-ph">{{ active.name.slice(0, 1) }}</span>
            </div>

            <div class="modal-body">
              <div class="modal-head">
                <h2 class="modal-name">{{ active.name }}</h2>
                <span class="modal-cat">{{ active.category }}</span>
              </div>
              <p class="modal-meta">
                📍 {{ active.origin }}
                <span class="dot">·</span>
                守护人 <b>{{ active.guardian }}</b>
              </p>

              <p class="modal-story">{{ active.story }}</p>

              <div class="modal-foot">
                <div class="price-block">
                  <span class="modal-price">¥{{ active.price }}</span>
                  <span class="modal-unit">/ {{ active.unit }}</span>
                </div>
                <div class="modal-actions">
                  <button class="ghost-btn" type="button" @click="toggleLike">
                    {{ liked ? '❤️' : '🤍' }} 点赞
                  </button>
                  <button class="ghost-btn" type="button" @click="toggleFav">
                    {{ faved ? '⭐' : '☆' }} 收藏
                  </button>
                  <button class="buy-btn" type="button" @click="onBuy">助力购买</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 模块内自建 Toast -->
    <GoodsToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import goodsData from './goods-data.json'
import GoodsToast from './GoodsToast.vue'

// —— 筛选 / 搜索 / 排序状态 —— //
const keyword = ref('')
const sortBy = ref('newest')
const category = ref('全部')
const status = ref('全部')

const sortOptions = [
  { value: 'newest', label: '最新上架' },
  { value: 'hot', label: '最热浏览' },
  { value: 'fav', label: '最多收藏' },
  { value: 'priceAsc', label: '价格低-高' },
]
const categories = ['全部', '农副产品', '手工艺品', '非遗作品', '文创设计']
const statuses = ['全部', '可购买', '预售中', '众筹中']

// —— 计算：搜索 → 筛选 → 排序 —— //
const shownGoods = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = goodsData.filter((g) => {
    // 关键词匹配名称 / 产地 / 分类 / 守护人 / 故事
    const matchKw =
      !kw ||
      [g.name, g.origin, g.category, g.guardian, g.story]
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

// —— 当前筛选路径展示 —— //
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

// —— 首字母渐变占位图，色相取自数据 hue —— //
function thumbStyle(g) {
  const h = g.hue ?? 100
  return {
    background: `linear-gradient(135deg, hsl(${h} 42% 62%), hsl(${(h + 40) % 360} 48% 46%))`,
  }
}
function statusClass(st) {
  return {
    可购买: 'st-buy',
    预售中: 'st-pre',
    众筹中: 'st-crowd',
  }[st]
}

// —— 详情模态框 —— //
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
  toastRef.value?.show('购买链接开发中，敬请期待')
}

// —— ESC 关闭 + 打开时锁定背景滚动 —— //
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
  padding: 2.4rem clamp(1rem, 4vw, 2rem);
}

/* 头部 */
.mod-hero { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-secondary); margin: 0 0 0.5rem; }
.mod-hero h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); color: var(--color-primary-dark); line-height: 1.3; }
.lead { color: var(--color-text-secondary); max-width: 680px; margin: 0.6rem 0 0; }
.stat { color: var(--color-text-light); font-size: 0.9rem; margin: 0.4rem 0 0; }

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 50px;
  padding: 0.7rem 1.2rem;
  margin: 1.4rem 0 1rem;
  box-shadow: var(--shadow-card);
}
.search-icon { font-size: 1rem; opacity: 0.7; }
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: var(--color-text);
}
.search-input::placeholder { color: var(--color-text-light); }

/* 排序胶囊 */
.sort-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.pill {
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text-secondary);
  border-radius: 50px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition);
}
.pill:hover { border-color: var(--color-primary); color: var(--color-primary); }
.pill.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* 标签筛选 */
.filter-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.7rem;
  flex-wrap: wrap;
}
.filter-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text-light); min-width: 2.6em; }
.tag-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 10px;
  padding: 0.35rem 0.85rem;
  font-size: 0.83rem;
  cursor: pointer;
  transition: all var(--transition);
}
.tag:hover { border-color: var(--color-secondary); color: var(--color-secondary); }
.tag.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-primary-dark);
  font-weight: 600;
}

/* 筛选路径 */
.filter-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 0.4rem 0 1.4rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
.clear-btn {
  border: none;
  background: transparent;
  color: var(--color-highlight);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

/* 好物网格：4列2行，移动端1列 */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.2rem;
}
.goods-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform var(--transition), box-shadow var(--transition);
  outline: none;
}
.goods-card:hover,
.goods-card:focus-visible {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
}
.goods-card:hover .thumb-ph {
  transform: scale(1.1);
  transition: transform var(--transition-slow);
}
.thumb-ph {
  transition: transform var(--transition-slow);
}
.goods-card:focus-visible { border-color: var(--color-primary); }

/* 产品图 1:1 */
.thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
}
.thumb-ph {
  font-family: var(--sx-serif);
  font-size: 3.4rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}
.status-badge {
  position: absolute;
  top: 0.7rem;
  left: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #fff;
  backdrop-filter: blur(2px);
}
.st-buy { background: rgba(107, 140, 92, 0.9); }
.st-pre { background: rgba(212, 163, 115, 0.92); }
.st-crowd { background: rgba(224, 122, 95, 0.92); }

.goods-body { padding: 0.9rem 1rem 1.1rem; }
.goods-name { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0; }
.goods-origin { font-size: 0.83rem; color: var(--color-text-light); margin: 0.4rem 0 0.7rem; }
.goods-foot { display: flex; align-items: center; justify-content: space-between; }
.goods-price { font-size: 0.95rem; font-weight: 600; color: var(--color-highlight); }
.goods-price .unit { font-size: 0.75rem; font-weight: 400; color: var(--color-text-light); }
.story-tag {
  background: var(--color-accent);
  color: var(--color-primary-dark);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.goods-card:hover .story-tag {
  background: var(--color-highlight);
  color: #fff;
  transform: translateY(-1px);
}

.empty { color: var(--color-text-light); text-align: center; padding: 3rem 0; }

/* ---- 筛选面板 ---- */
.filter-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem 1.4rem 0.6rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
}
.filter-panel .search-bar { margin-bottom: 0.8rem; }
.filter-panel .sort-pills { margin-bottom: 0.8rem; }
.filter-panel .filter-row { margin-bottom: 0.5rem; }
.filter-panel .filter-summary { margin-bottom: 0; }

/* —— 详情模态框 —— */
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
  width: min(92vw, 640px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}
.modal-close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  z-index: 2;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background var(--transition);
}
.modal-close:hover { background: #fff; }
.modal-hero {
  height: 300px;
  display: grid;
  place-items: center;
}
.modal-hero-ph {
  font-family: var(--sx-serif);
  font-size: 6rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 3px 16px rgba(0, 0, 0, 0.18);
}
.modal-body { padding: 1.6rem clamp(1.2rem, 4vw, 2rem) 2rem; }
.modal-head { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
.modal-name { font-size: 1.6rem; color: var(--color-primary-dark); margin: 0; }
.modal-cat {
  background: var(--color-accent);
  color: var(--color-primary-dark);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.7rem;
  border-radius: 50px;
}
.modal-meta { color: var(--color-text-secondary); font-size: 0.9rem; margin: 0.7rem 0 1.2rem; }
.modal-meta .dot { margin: 0 0.4rem; color: var(--color-text-light); }
.modal-meta b { color: var(--color-primary); }
.modal-story {
  color: var(--color-text);
  line-height: 1.9;
  font-size: 0.95rem;
  margin: 0 0 1.6rem;
  text-align: justify;
}
.modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border-top: 1px solid var(--color-border);
  padding-top: 1.2rem;
}
.price-block { display: flex; align-items: baseline; gap: 0.2rem; }
.modal-price { font-size: 1.25rem; font-weight: 700; color: var(--color-highlight); }
.modal-unit { font-size: 0.85rem; color: var(--color-text-light); }
.modal-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.ghost-btn {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 50px;
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition);
}
.ghost-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.buy-btn {
  border: none;
  background: var(--color-highlight);
  color: #fff;
  border-radius: 50px;
  padding: 0.6rem 1.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.buy-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(224, 122, 95, 0.4);
}

/* 模态框过渡 */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity var(--transition); }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* 响应式 */
@media (max-width: 960px) {
  .goods-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .goods-grid { grid-template-columns: 1fr; }
  .modal-hero { height: 220px; }
  .modal-hero-ph { font-size: 4rem; }
}
</style>
