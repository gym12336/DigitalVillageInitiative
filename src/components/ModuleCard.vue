<template>
  <component
    :is="module.enabled ? 'router-link' : 'div'"
    class="mod-card"
    :class="{ 'is-building': !module.enabled }"
    :to="module.enabled ? module.path : undefined"
  >
    <div class="card-index">
      <span>HALL {{ hallNo }}</span>
      <span class="index-line" />
      <span v-if="!module.enabled" class="badge">建设中</span>
    </div>
    <div class="card-top">
      <span class="icon"><AppIcon :name="module.icon" :size="26" /></span>
      <span class="name">{{ module.name }}</span>
    </div>
    <p class="hook">{{ module.hook || module.desc }}</p>
    <div class="card-foot">
      <span v-if="module.metric" class="metric">{{ module.metric }}</span>
      <span class="go" aria-hidden="true"><AppIcon name="arrow-right" :size="18" /></span>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  module: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
const hallNo = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<style scoped>
.mod-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 250px;
  padding: 1.45rem 1.55rem 1.55rem;
  overflow: hidden;
  color: rgba(243, 238, 228, .78);
  background: var(--museum-panel);
  border: 1px solid var(--museum-line);
  box-shadow: none;
  transition: border-color var(--transition), background var(--transition);
}
.mod-card::before {
  content: '';
  position: absolute;
  top: -35%;
  right: -25%;
  width: 210px;
  aspect-ratio: 1;
  border: 1px solid var(--museum-line);
  border-radius: 50%;
  box-shadow: 0 0 0 24px rgba(118, 216, 188, .025), 0 0 0 50px rgba(118, 216, 188, .018);
  transition: transform var(--transition-slow), border-color var(--transition);
}
.mod-card:not(.is-building):hover { color: #fff; background: #143029; border-color: rgba(218, 194, 141, .56); }
.mod-card:not(.is-building):hover::before { transform: scale(1.08); border-color: rgba(118, 216, 188, .34); }
.card-index { position: relative; display: flex; align-items: center; gap: 10px; color: var(--bronze); font-family: var(--font-mono); font-size: 9px; letter-spacing: .16em; }
.index-line { width: 36px; height: 1px; background: currentColor; opacity: .5; }
.badge { margin-left: auto; padding: 2px 6px; color: var(--paper); border: 1px solid var(--museum-line); font-size: 8px; }
.card-top { position: relative; display: flex; align-items: center; gap: 14px; margin-top: 2.2rem; }
.icon { display: grid; place-items: center; width: 50px; height: 50px; color: var(--data-glow); border: 1px solid var(--museum-line-bright); }
.name { color: #f5efe2; font-family: var(--font-display); font-size: 1.45rem; font-weight: 700; letter-spacing: .05em; }
.hook { position: relative; flex: 1; margin: 1.25rem 0 1.3rem; color: rgba(243, 238, 228, .55); font-size: .84rem; line-height: 1.8; }
.card-foot { position: relative; display: flex; align-items: center; justify-content: space-between; padding-top: .9rem; border-top: 1px solid var(--museum-line); }
.metric { color: var(--bronze-light); font-family: var(--font-mono); font-size: .7rem; }
.go { color: var(--jade-light); transition: transform var(--transition-fast), color var(--transition-fast); }
.mod-card:not(.is-building):hover .go { color: var(--data-glow); transform: translateX(4px); }
.is-building { opacity: .48; cursor: default; }
</style>
