<template>
  <router-link class="mod-card" :to="module.path">
    <div class="icon">{{ module.icon }}</div>
    <div class="name">{{ module.name }}</div>
    <div class="desc">{{ module.desc }}</div>
  </router-link>
</template>

<script setup>
defineProps({ module: { type: Object, required: true } })
</script>

<style scoped>
.mod-card {
  display: block; padding: 1.1rem; border: 1px solid var(--sx-border);
  border-radius: 10px; background: var(--sx-bg-soft); color: var(--sx-text);
  transition: transform .15s, border-color .15s; text-decoration: none;
}
.mod-card:hover { transform: translateY(-3px); border-color: var(--sx-gold); }
.icon { font-size: 1.8rem; }
.name { margin-top: .5rem; font-weight: 600; color: var(--sx-gold-soft); }
.desc { margin-top: .25rem; font-size: .82rem; color: var(--sx-text-dim); }
</style>
