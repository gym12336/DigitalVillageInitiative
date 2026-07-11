<template>
  <header class="museum-page-hero museum-grid">
    <div class="museum-hero-inner">
      <div class="museum-hero-copy">
        <p class="museum-archive-no"><span />{{ archiveNo }}</p>
        <div class="museum-hero-kicker">
          <AppIcon :name="icon" :size="18" />
          <span>{{ kicker }}</span>
        </div>
        <h1>{{ title }}</h1>
        <p class="museum-hero-desc">{{ description }}</p>
        <div v-if="$slots.actions" class="museum-hero-actions"><slot name="actions" /></div>
      </div>

      <aside class="museum-signal-panel" :aria-label="`${kicker}展厅信息`">
        <div class="signal-corners" aria-hidden="true"><i /><i /><i /><i /></div>
        <p class="signal-label">DIGITAL FIELD COLLECTION</p>
        <slot name="aside">
          <AppIcon :name="icon" :size="42" />
          <strong>{{ metric }}</strong>
          <span>{{ metricLabel }}</span>
          <small v-if="demo">DEMO DATA · 演示信息</small>
        </slot>
      </aside>
    </div>
  </header>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  archiveNo: { type: String, default: 'DIGITAL FIELD ARCHIVE · SX-2026' },
  kicker: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'archive' },
  metric: { type: [String, Number], default: 'OPEN' },
  metricLabel: { type: String, default: '持续建设中' },
  demo: { type: Boolean, default: false },
})
</script>

<style scoped>
.museum-page-hero { position: relative; overflow: hidden; color: #f5efe3; background-color: var(--museum-black); border-bottom: 1px solid var(--museum-line-bright); }
.museum-page-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 78% 35%, rgba(118,216,188,.13), transparent 28%), linear-gradient(110deg, rgba(5,15,12,.1), rgba(5,15,12,.78)); pointer-events: none; }
.museum-hero-inner { position: relative; display: grid; grid-template-columns: minmax(0,1.35fr) minmax(260px,.65fr); gap: clamp(2rem,6vw,6rem); align-items: center; width: min(100%,1240px); margin: 0 auto; padding: clamp(4rem,7vw,6.5rem) clamp(1.2rem,4vw,3rem); }
.museum-archive-no { display: flex; align-items: center; gap: 10px; color: var(--data-glow); font-family: var(--font-mono); font-size: 10px; letter-spacing: .15em; }
.museum-archive-no span { width: 30px; height: 1px; background: currentColor; }
.museum-hero-kicker { display: flex; align-items: center; gap: 10px; margin-top: 1.6rem; color: var(--bronze-light); font-size: 13px; letter-spacing: .16em; }
.museum-hero-copy h1 { max-width: 800px; margin-top: .7rem; color: #f7f1e5; font-size: clamp(2.35rem,5vw,4.8rem); font-weight: 600; line-height: 1.12; }
.museum-hero-desc { max-width: 760px; margin-top: 1.15rem; color: rgba(243,238,228,.62); font-size: clamp(.92rem,1.5vw,1.03rem); line-height: 1.85; }
.museum-hero-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.6rem; }
.museum-signal-panel { position: relative; display: grid; align-content: center; min-height: 230px; padding: 2rem; color: var(--jade-light); border: 1px solid var(--museum-line-bright); background: rgba(10,29,24,.42); }
.signal-corners i { position: absolute; width: 15px; height: 15px; border-color: var(--bronze-light); opacity: .8; }
.signal-corners i:nth-child(1) { top: 9px; left: 9px; border-top: 1px solid; border-left: 1px solid; }
.signal-corners i:nth-child(2) { top: 9px; right: 9px; border-top: 1px solid; border-right: 1px solid; }
.signal-corners i:nth-child(3) { bottom: 9px; left: 9px; border-bottom: 1px solid; border-left: 1px solid; }
.signal-corners i:nth-child(4) { right: 9px; bottom: 9px; border-right: 1px solid; border-bottom: 1px solid; }
.signal-label { margin-bottom: 1.2rem; color: rgba(243,238,228,.42); font-family: var(--font-mono); font-size: 9px; letter-spacing: .15em; }
.museum-signal-panel strong { display: block; margin-top: 1rem; color: var(--data-glow); font-family: var(--font-mono); font-size: clamp(2.2rem,5vw,4rem); font-weight: 400; line-height: 1; }
.museum-signal-panel > span { margin-top: .55rem; color: rgba(243,238,228,.62); font-size: 12px; }
.museum-signal-panel small { margin-top: 1.4rem; color: var(--bronze); font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; }
@media (max-width: 760px) {
  .museum-hero-inner { grid-template-columns: 1fr; padding-top: 3.4rem; padding-bottom: 3.4rem; }
  .museum-signal-panel { min-height: 170px; }
}
</style>
