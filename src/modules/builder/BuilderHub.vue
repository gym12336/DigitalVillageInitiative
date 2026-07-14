<!-- src/modules/builder/BuilderHub.vue -->
<template>
  <section class="hub">
    <div class="hub-container">
      <header class="hub-head">
        <p class="hub-kicker">成果可视化</p>
        <h1>🛠️ 成果搭建台</h1>
        <p class="hub-desc">两步走：AI 帮你制作大组件 → AI 帮你用组件组装成果展示页。</p>
      </header>

      <BuilderCards :dossier-id="dossierId" />
    </div>
  </section>
</template>

<script setup>
import { useRoute } from 'vue-router'
import BuilderCards from './BuilderCards.vue'

const route = useRoute()
const dossierId = route.query.dossierId || ''
</script>

<style scoped>
.hub { padding: 3rem 0 4rem; min-height: calc(100vh - 60px); }
.hub-container { max-width: 800px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }
.hub-head { text-align: center; margin-bottom: 2.5rem; }
.hub-kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.hub-head h1 { font-size: clamp(28px, 4vw, 40px); color: var(--color-primary-dark); margin: 0; }
.hub-desc { margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }
</style>
