<template>
  <section class="museum-public-page">
    <MuseumPageHero
      archive-no="ARCHIVE ROUTE · 404"
      kicker="档案索引 / 未找到"
      title="这份数字档案尚未建立"
      description="你访问的地址不存在、已经移动，或对应模块仍在整理中。"
      icon="archive"
      metric="404"
      metric-label="archive not found"
    />
    <div class="museum-content-shell not-found-shell">
      <MuseumState type="empty" title="没有找到对应页面" description="返回序厅，从现有展厅与乡村档案继续浏览。">
        <RouterLink class="back-home" to="/"><AppIcon name="home" :size="15" />返回首页</RouterLink>
      </MuseumState>
    </div>
  </section>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
import MuseumPageHero from '@/components/MuseumPageHero.vue'
import MuseumState from '@/components/MuseumState.vue'
</script>

<style scoped>
.not-found-shell { max-width: 860px; }
.back-home { display: inline-flex; align-items: center; gap: .45rem; margin-top: 1rem; color: var(--jade-deep); font-size: 13px; font-weight: 700; }
</style>
