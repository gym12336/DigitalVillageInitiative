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
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 180px;
  padding: 1.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-card);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    border-color var(--transition);
  text-decoration: none;
}
.mod-card:not(.is-building):hover {
  transform: translateY(-6px);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
}
.card-top {
  display: flex;
  align-items: center;
  gap: .8rem;
}
.icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex: none;
  font-size: 1.6rem;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-accent-soft) 100%);
  box-shadow: var(--shadow-sm);
}
.name {
  font-family: var(--sx-serif);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-primary-dark);
}
.hook {
  flex: 1;
  margin: 1.1rem 0 .9rem;
  font-size: .9rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.metric {
  font-size: .8rem;
  font-weight: 600;
  color: var(--color-highlight);
  background: rgba(224, 122, 95, .1);
  padding: .3rem .8rem;
  border-radius: 50px;
}
.go {
  font-size: 1.2rem;
  color: var(--color-primary);
  transition: transform var(--transition-fast);
}
.mod-card:not(.is-building):hover .go { transform: translateX(4px); }

/* 建设中占位 */
.is-building {
  opacity: .55;
  cursor: default;
  background: #f0ebe4;
}
.badge {
  margin-left: auto;
  font-size: .72rem;
  padding: .15rem .6rem;
  border-radius: var(--radius-full);
  color: #fff;
  background: var(--color-secondary);
}
</style>
