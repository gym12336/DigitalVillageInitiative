<template>
  <section class="guide">
    <div class="container">
      <!-- 页面头部：标题 + 搜索栏 -->
      <header class="guide-head">
        <p class="kicker">实践攻略</p>
        <h1 class="guide-title">实践攻略 —— 从行前到成果，一本通关</h1>
        <p class="guide-desc">
          行前准备、调研工具、报告模板、安全保障，为青年实践提供全流程资源支持。
        </p>
        <div class="search-bar">
          <span class="search-ic" aria-hidden="true">🔍</span>
          <input
            v-model.trim="keyword"
            class="search-input"
            type="search"
            placeholder="搜索攻略名称、关键词..."
            aria-label="搜索攻略"
          />
        </div>
      </header>

      <!-- 头条模块：3 个热门攻略卡片（搜索时隐藏，聚焦结果） -->
      <section v-if="!keyword" class="featured">
        <h2 class="featured-title">📖 热门攻略 · 大家都在看</h2>
        <div class="featured-grid">
          <article
            v-for="(f, i) in data.featured"
            :key="i"
            class="featured-card"
          >
            <span class="featured-tag">{{ f.tag }}</span>
            <h3 class="featured-name">{{ f.title }}</h3>
            <p class="featured-desc">{{ f.desc }}</p>
          </article>
        </div>
      </section>

      <!-- 四大分类折叠面板 -->
      <div class="panels">
        <div
          v-for="cat in filteredCategories"
          :key="cat.id"
          class="panel"
        >
          <!-- 标题区：点击展开/收起 -->
          <button
            class="panel-head"
            type="button"
            :aria-expanded="isOpen(cat.id)"
            @click="toggle(cat.id)"
          >
            <span class="panel-label">
              <span class="panel-ic" aria-hidden="true">{{ cat.icon }}</span>
              <span class="panel-name">{{ cat.name }}</span>
              <span class="panel-count">{{ cat.items.length }} 项</span>
            </span>
            <span class="panel-arrow" aria-hidden="true">
              {{ isOpen(cat.id) ? '▲' : '▼' }}
            </span>
          </button>

          <!-- 内容区：max-height 过渡实现折叠动画 -->
          <div
            class="panel-body-wrap"
            :style="{ maxHeight: isOpen(cat.id) ? bodyMaxHeight(cat) : '0px' }"
          >
            <div class="panel-body">
              <div
                v-for="(item, idx) in cat.items"
                :key="idx"
                class="res-item"
              >
                <div class="res-info">
                  <p class="res-name">{{ item.name }}</p>
                  <p class="res-desc">{{ item.desc }}</p>
                </div>
                <button
                  class="res-btn"
                  type="button"
                  @click="onDownload"
                >
                  下载
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索无结果提示 -->
        <p v-if="keyword && filteredCategories.length === 0" class="empty">
          没有找到与「{{ keyword }}」相关的资源，换个关键词试试。
        </p>
      </div>
    </div>

    <!-- 模块内 Toast -->
    <GuideToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import rawData from './guide-data.json'
import GuideToast from './GuideToast.vue'

// 攻略数据（头条 + 四大分类）
const data = rawData

// 搜索关键词
const keyword = ref('')

// 展开中的分类 id 集合，默认展开第一个分类
const openIds = ref(new Set([data.categories[0]?.id]))

function isOpen(id) {
  // 搜索态下命中的分类一律展开，方便直接查看结果
  if (keyword.value) return true
  return openIds.value.has(id)
}

// 点击标题：展开/收起该分类
function toggle(id) {
  const next = new Set(openIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}

// 根据关键词过滤：匹配资源项的名称或描述，保留命中项
const filteredCategories = computed(() => {
  const kw = keyword.value.toLowerCase()
  if (!kw) return data.categories
  return data.categories
    .map((cat) => {
      const items = cat.items.filter(
        (it) =>
          it.name.toLowerCase().includes(kw) ||
          it.desc.toLowerCase().includes(kw),
      )
      return { ...cat, items }
    })
    .filter((cat) => cat.items.length > 0)
})

// 折叠动画高度：按资源项数量估算，给足高度以完整展开
function bodyMaxHeight(cat) {
  return cat.items.length * 80 + 40 + 'px'
}

// Toast 引用
const toastRef = ref(null)

// 点击下载：提示功能开发中
function onDownload() {
  toastRef.value?.show('📄 资源下载功能开发中')
}
</script>

<style scoped>
.guide { padding: 2.6rem 0 3rem; }
.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}

/* —— 页面头部 —— */
.guide-head { margin-bottom: 2rem; }
.kicker {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-highlight);
  letter-spacing: 0.08em;
  margin: 0 0 0.6rem;
}
.guide-title {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--color-primary-dark);
  margin: 0;
  line-height: 1.2;
}
.guide-desc {
  max-width: 720px;
  margin: 0.8rem 0 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
}
.search-bar {
  position: relative;
  margin-top: 1.4rem;
  width: 100%;
}
.search-ic {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  opacity: 0.7;
}
.search-input {
  width: 100%;
  padding: 14px 20px 14px 48px;
  font-size: 15px;
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 50px;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(107, 140, 92, 0.12);
}

/* —— 头条模块 —— */
.featured { margin-bottom: 2rem; }
.featured-title {
  font-size: 1.2rem;
  color: var(--color-primary-dark);
  margin: 0 0 1rem;
}
.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.featured-card {
  position: relative;
  padding: 1.4rem 1.5rem;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  transition: transform var(--transition), box-shadow var(--transition);
}
.featured-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}
.featured-tag {
  display: inline-block;
  font-size: 0.72rem;
  padding: 0.15rem 0.6rem;
  border-radius: 50px;
  color: var(--color-primary-dark);
  background: var(--color-accent);
}
.featured-name {
  font-size: 1.1rem;
  color: var(--color-text);
  margin: 0.8rem 0 0.4rem;
}
.featured-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* —— 折叠面板 —— */
.panels { margin-top: 0.5rem; }
.panel {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  background: var(--color-card);
}
.panel-head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 16px 20px;
  background: var(--color-bg);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
}
.panel-head:hover { background: #f0ebe4; }
.panel-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.panel-ic { font-size: 18px; line-height: 1; }
.panel-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}
.panel-count {
  font-size: 12px;
  color: var(--color-text-light);
}
.panel-arrow {
  font-size: 12px;
  color: var(--color-primary);
}

/* max-height 过渡实现展开/收起动画 */
.panel-body-wrap {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.panel-body {
  padding: 16px 20px;
  background: var(--color-card);
}
.res-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 10px 0;
  border-bottom: 1px solid #f0ebe4;
}
.res-item:last-child { border-bottom: none; }
.res-info { min-width: 0; }
.res-name {
  font-size: 14px;
  color: var(--color-text);
  margin: 0;
}
.res-desc {
  font-size: 13px;
  color: var(--color-text-light);
  margin: 0.25rem 0 0;
}
.res-btn {
  flex-shrink: 0;
  padding: 7px 18px;
  font-size: 13px;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition);
}
.res-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.empty {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-light);
}

@media (max-width: 600px) {
  .guide-title { font-size: 1.8rem; }
}
</style>
