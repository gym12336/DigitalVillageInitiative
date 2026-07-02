<template>
  <component
    :is="module.enabled ? 'router-link' : 'div'"
    class="mod-card"
    :class="{ 'is-building': !module.enabled }"
    :to="module.enabled ? module.path : undefined"
  >
    <div class="icon">{{ module.icon }}</div>
    <div class="name">{{ module.name }}</div>
    <div class="desc">{{ module.desc }}</div>
    <span v-if="!module.enabled" class="badge">建设中</span>
  </component>
</template>

<script setup>
defineProps({ module: { type: Object, required: true } })
</script>

<style scoped>
.mod-card {
  position: relative; display: block; min-height: 128px; padding: 1.3rem;
  border: 1px solid var(--sx-line); border-radius: 14px;
  background: var(--sx-white); color: var(--sx-ink);
  box-shadow: 0 8px 24px rgba(32, 29, 22, 0.06);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  text-decoration: none;
}
.mod-card:not(.is-building):hover {
  transform: translateY(-4px);
  border-color: var(--sx-gold);
  box-shadow: var(--sx-shadow);
}
.icon { font-size: 1.9rem; }
.name { margin-top: .6rem; font-family: var(--sx-serif); font-weight: 700; font-size: 1.15rem; color: var(--sx-green); }
.desc { margin-top: .35rem; font-size: .85rem; color: var(--sx-muted); }
.is-building { opacity: .55; cursor: default; background: var(--sx-paper-deep); }
.badge {
  position: absolute; top: 1rem; right: 1rem;
  font-size: .72rem; padding: .1rem .5rem; border-radius: 999px;
  color: var(--sx-white); background: var(--sx-bamboo);
}
</style>
