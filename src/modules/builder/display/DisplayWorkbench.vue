<template>
  <section class="dw-placeholder">
    <div class="dw-card">
      <p class="dw-emoji">🖥️</p>
      <h1>大屏展示工作台</h1>
      <p>排版所有组件，生成展示页面并一键导出。</p>
      <span class="dw-badge">即将开放</span>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.dw-placeholder {
  display: flex; align-items: center; justify-content: center;
  min-height: calc(100vh - 60px); padding: 3rem;
}
.dw-card {
  text-align: center; padding: 3rem 4rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.dw-emoji { font-size: 3rem; margin: 0 0 1rem; }
.dw-card h1 { font-size: 1.6rem; color: var(--color-primary-dark); margin: 0 0 .6rem; }
.dw-card p { color: var(--color-text-secondary); margin: 0 0 1.2rem; }
.dw-badge {
  display: inline-block; padding: .25rem 1rem;
  background: var(--color-accent); color: var(--color-primary-dark);
  border-radius: 50px; font-size: .82rem; font-weight: 600;
}
</style>
