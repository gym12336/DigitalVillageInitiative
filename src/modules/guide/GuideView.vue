<template>
  <section class="guide museum-public-page">
    <MuseumPageHero
      archive-no="FIELD MANUAL · GUIDE"
      kicker="实践攻略 / 田野工具箱"
      title="从行前准备到成果归档，一本通关"
      description="把调研方法、采访规范、素材整理和成果提交标准变成可直接执行的任务说明书。"
      icon="guide"
      :metric="resourceCount"
      metric-label="项演示攻略资源"
      demo
    />

    <div class="museum-content-shell">
      <MuseumFilterBar title="RESOURCE SEARCH / 攻略检索">
        <div class="search-bar">
          <AppIcon class="search-ic" name="search" :size="17" />
          <input
            v-model.trim="keyword"
            class="search-input"
            type="search"
            placeholder="搜索攻略名称、关键词..."
            aria-label="搜索攻略"
          />
        </div>
      </MuseumFilterBar>

      <section v-if="!keyword" class="featured">
        <MuseumSectionHeader index="01" kicker="CURATOR'S PICKS" title="热门攻略" icon="book">
          <p>优先阅读实践前最容易遗漏、也最影响成果质量的准备内容。</p>
        </MuseumSectionHeader>
        <div class="featured-grid">
          <article v-for="(item, index) in data.featured" :key="index" class="featured-card museum-card">
            <span class="featured-tag">{{ item.tag }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </article>
        </div>
      </section>

      <section class="resource-section">
        <MuseumSectionHeader index="02" kicker="FIELD RESOURCE INDEX" title="全流程资源" icon="folder">
          <p>按阶段展开查看模板与说明；当前下载按钮为功能占位。</p>
        </MuseumSectionHeader>

        <div class="panels">
          <article v-for="category in filteredCategories" :key="category.id" class="panel archive-panel">
            <button
              class="panel-head"
              type="button"
              :aria-expanded="isOpen(category.id)"
              @click="toggle(category.id)"
            >
              <span class="panel-label">
                <AppIcon :name="categoryIcon(category.id)" :size="20" />
                <span class="panel-name">{{ category.name }}</span>
                <span class="panel-count">{{ category.items.length }} 项</span>
              </span>
              <AppIcon class="panel-arrow" :class="{ open: isOpen(category.id) }" name="chevron-down" :size="18" />
            </button>

            <div class="panel-body-wrap" :style="{ maxHeight: isOpen(category.id) ? bodyMaxHeight(category) : '0px' }">
              <div class="panel-body">
                <div v-for="(item, index) in category.items" :key="index" class="res-item">
                  <AppIcon class="res-icon" :name="itemIcon(item.name)" :size="20" />
                  <div class="res-info">
                    <p class="res-name">{{ item.name }}</p>
                    <p class="res-desc">{{ item.desc }}</p>
                  </div>
                  <button class="res-btn" type="button" @click="onDownload">
                    <AppIcon name="download" :size="15" />下载
                  </button>
                </div>
              </div>
            </div>
          </article>

          <MuseumState
            v-if="keyword && filteredCategories.length === 0"
            type="empty"
            title="没有匹配的攻略资源"
            :description="`没有找到与「${keyword}」相关的资源，换个关键词试试。`"
          />
        </div>
      </section>
    </div>

    <GuideToast ref="toastRef" />
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import rawData from './guide-data.json'
import GuideToast from './GuideToast.vue'
import AppIcon from '@/components/AppIcon.vue'
import MuseumPageHero from '@/components/MuseumPageHero.vue'
import MuseumFilterBar from '@/components/MuseumFilterBar.vue'
import MuseumSectionHeader from '@/components/MuseumSectionHeader.vue'
import MuseumState from '@/components/MuseumState.vue'

const data = rawData
const resourceCount = data.categories.reduce((sum, category) => sum + category.items.length, 0)
const keyword = ref('')
const openIds = ref(new Set([data.categories[0]?.id]))
const toastRef = ref(null)

function isOpen(id) {
  return keyword.value ? true : openIds.value.has(id)
}

function toggle(id) {
  const next = new Set(openIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}

const filteredCategories = computed(() => {
  const value = keyword.value.toLowerCase()
  if (!value) return data.categories
  return data.categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        `${item.name} ${item.desc}`.toLowerCase().includes(value)
      ),
    }))
    .filter((category) => category.items.length)
})

function bodyMaxHeight(category) {
  return `${category.items.length * 92 + 40}px`
}

function categoryIcon(id) {
  return { prepare: 'folder', research: 'search', report: 'document', safety: 'alert' }[id] || 'guide'
}

function itemIcon(name) {
  const value = name.toLowerCase()
  if (value.includes('表格') || value.includes('excel') || value.endsWith('.xlsx')) return 'chart'
  if (value.includes('视频') || value.includes('video') || value.endsWith('.mp4')) return 'play'
  if (value.includes('图片') || value.includes('海报') || value.includes('image')) return 'image'
  return 'document'
}

function onDownload() {
  toastRef.value?.show('资源下载功能开发中')
}
</script>

<style scoped>
.guide { padding: 0; }
.search-bar { position: relative; }
.search-ic { position: absolute; top: 50%; left: 16px; z-index: 1; color: var(--jade); transform: translateY(-50%); }
.search-input { width: 100%; min-height: 46px; padding: 11px 16px 11px 48px; color: var(--ink); border: 1px solid var(--color-border); border-radius: var(--radius-sm); outline: none; background: var(--paper-light); }
.search-input:focus { border-color: var(--jade); box-shadow: 0 0 0 3px rgba(95,146,125,.12); }
.featured { margin-top: 4rem; }
.featured-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; }
.featured-card { position: relative; min-height: 180px; padding: 1.4rem; }
.featured-card::after { content: attr(data-index); }
.featured-tag { display: inline-block; padding: .2rem .6rem; color: var(--clay); border: 1px solid rgba(165,87,62,.24); font-family: var(--font-mono); font-size: 9px; letter-spacing: .08em; }
.featured-card h3 { margin-top: 1rem; color: var(--jade-deep); font-size: 1.12rem; }
.featured-card p { margin-top: .6rem; color: var(--ink-soft); font-size: 13px; line-height: 1.7; }
.resource-section { margin-top: 4.5rem; }
.panels { display: grid; gap: .8rem; }
.panel { overflow: hidden; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; padding: 1rem 1.2rem; color: var(--ink); border: 0; background: var(--paper-light); cursor: pointer; text-align: left; }
.panel-head:hover { background: var(--paper-deep); }
.panel-label { display: flex; align-items: center; gap: .7rem; }
.panel-label > .app-icon { color: var(--jade); }
.panel-name { font-weight: 700; }
.panel-count { color: var(--ink-faint); font-family: var(--font-mono); font-size: 10px; }
.panel-arrow { color: var(--jade); transition: transform var(--transition-fast); }
.panel-arrow.open { transform: rotate(180deg); }
.panel-body-wrap { max-height: 0; overflow: hidden; transition: max-height var(--transition); }
.panel-body { padding: .4rem 1.2rem 1rem; border-top: 1px solid var(--color-border-light); }
.res-item { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: .9rem; align-items: center; padding: .9rem 0; border-bottom: 1px solid var(--color-border-light); }
.res-item:last-child { border-bottom: 0; }
.res-icon { color: var(--bronze); }
.res-name { color: var(--ink); font-size: 14px; font-weight: 700; }
.res-desc { margin-top: .25rem; color: var(--ink-faint); font-size: 12px; }
.res-btn { display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .75rem; color: var(--jade-deep); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: transparent; cursor: pointer; font-size: 12px; }
.res-btn:hover { border-color: var(--jade); }
@media (max-width: 780px) { .featured-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .res-item { grid-template-columns: auto minmax(0,1fr); } .res-btn { grid-column: 2; justify-self: start; } }
</style>
