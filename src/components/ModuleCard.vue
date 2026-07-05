<template>
  <component
    :is="module.enabled ? 'router-link' : 'div'"
    class="mod-card"
    :class="{ 'is-building': !module.enabled }"
    :to="module.enabled ? module.path : undefined"
  >
    <div class="card-top">
      <span class="icon">{{ module.icon }}</span>
      <span class="name">{{ module.name }}</span>
      <span v-if="!module.enabled" class="badge">建设中</span>
    </div>
    <p class="hook">{{ module.hook || module.desc }}</p>
    <div class="card-foot">
      <span v-if="module.metric" class="metric">{{ module.metric }}</span>
      <span class="go" aria-hidden="true">→</span>
    </div>
  </component>
</template>

<script setup>
defineProps({ module: { type: Object, required: true } })
</script>

<style scoped>
.mod-card {
  position: relative; display: flex; flex-direction: column;
  min-height: 172px; padding: 1.5rem;
  border: 1px solid var(--color-border); border-radius: var(--radius);
  background: var(--color-card); color: var(--color-text);
  box-shadow: var(--shadow-card);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  text-decoration: none;
}
.mod-card:not(.is-building):hover {
  transform: translateY(-5px);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
}
.card-top { display: flex; align-items: center; gap: .7rem; }
.icon {
  display: grid; place-items: center; width: 46px; height: 46px; flex: none;
  font-size: 1.5rem; border-radius: 12px; background: var(--color-bg);
}
.name { font-family: var(--sx-serif); font-weight: 700; font-size: 1.2rem; color: var(--color-primary-dark); }
.hook {
  flex: 1; margin: 1rem 0 .8rem; font-size: .9rem; line-height: 1.6;
  color: var(--color-text-secondary);
}
.card-foot { display: flex; align-items: center; justify-content: space-between; }
.metric {
  font-size: .8rem; font-weight: 600; color: var(--color-highlight);
  background: rgba(224, 122, 95, .1); padding: .25rem .7rem; border-radius: 50px;
}
.go {
  font-size: 1.1rem; color: var(--color-primary);
  transition: transform .2s ease;
}
.mod-card:not(.is-building):hover .go { transform: translateX(4px); }

/* 建设中占位 */
.is-building { opacity: .6; cursor: default; background: #f0ebe4; }
.badge {
  margin-left: auto;
  font-size: .72rem; padding: .12rem .55rem; border-radius: 999px;
  color: #fff; background: var(--color-secondary);
}
</style>
