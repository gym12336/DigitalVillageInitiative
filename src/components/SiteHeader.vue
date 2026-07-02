<template>
  <header class="site-header">
    <router-link to="/" class="brand">
      <span class="brand-mark">数</span>
      <span class="brand-text">数乡计划</span>
    </router-link>
    <nav class="site-nav">
      <router-link to="/">首页</router-link>
      <router-link to="/villages">村庄列表</router-link>
    </nav>
  </header>
</template>

<script setup></script>

<style scoped>
.site-header {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  min-height: 68px; padding: 0 clamp(1.2rem, 4vw, 40px);
  color: var(--sx-white);
  background: rgba(24, 60, 47, 0.82);
  border-bottom: 1px solid rgba(255, 250, 240, 0.16);
  backdrop-filter: blur(18px);
}
.brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 700; }
.brand-mark {
  display: grid; place-items: center; width: 40px; height: 40px;
  border: 1px solid rgba(255, 250, 240, 0.55);
  font-family: var(--sx-serif); font-size: 15px;
}
.brand-text { font-family: var(--sx-serif); font-size: 18px; }
.site-nav { display: flex; align-items: center; gap: 28px; font-size: 14px; }
.site-nav a { opacity: 0.84; transition: opacity 200ms ease, color 200ms ease; }
.site-nav a:hover, .site-nav a.router-link-active { color: var(--sx-gold-bright); opacity: 1; }
</style>
