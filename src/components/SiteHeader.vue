<template>
  <header class="site-header">
    <router-link to="/" class="brand">数乡计划</router-link>
    <nav class="nav">
      <router-link to="/">首页</router-link>
      <router-link to="/villages">村庄列表</router-link>
    </nav>
  </header>
</template>

<script setup></script>

<style scoped>
.site-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.9rem 1.6rem;
  border-bottom: 1px solid var(--sx-border);
  background: var(--sx-bg-soft);
}
.brand { font-weight: 700; font-size: 1.15rem; color: var(--sx-gold); }
.nav a { margin-left: 1.2rem; color: var(--sx-text-dim); }
.nav a.router-link-active { color: var(--sx-gold-soft); }
</style>
