<template>
  <section class="page-scaffold">
    <div class="container">
      <header class="page-head">
        <p class="kicker">{{ kicker }}</p>
        <h1>{{ title }}</h1>
        <p class="desc">{{ desc }}</p>
        <p v-if="stat" class="stat">{{ stat }}</p>
      </header>

      <div class="sections">
        <article v-for="(s, i) in sections" :key="i" class="section-card">
          <div class="section-ic">{{ s.icon }}</div>
          <div class="section-body">
            <h2>{{ s.name }}</h2>
            <p>{{ s.hint }}</p>
          </div>
          <span class="soon">规划中</span>
        </article>
      </div>

      <p class="foot-note">本栏目内容将分批填充 · 结构参照《设计风格与配色》文档</p>
    </div>
  </section>
</template>

<script setup>
// 一级栏目骨架页：统一的页面头部 + 核心模块占位卡，供 6 个栏目复用。
// 后续逐个栏目把 sections 换成真实功能组件。
defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  stat: { type: String, default: '' },
  sections: { type: Array, default: () => [] },
})
</script>

<style scoped>
.page-scaffold { padding: 2.6rem 0 3rem; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }
.page-head { margin-bottom: 2rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(28px, 4vw, 40px); color: var(--color-primary-dark); }
.desc { max-width: 720px; margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }
.stat { margin: .8rem 0 0; font-size: 14px; color: var(--color-text-light); }

.sections { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.section-card {
  position: relative; display: flex; gap: 1rem; align-items: flex-start;
  padding: 1.4rem 1.5rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); transition: transform var(--transition), box-shadow var(--transition);
}
.section-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.section-ic { font-size: 1.8rem; line-height: 1; }
.section-body h2 { font-size: 1.15rem; color: var(--color-primary-dark); }
.section-body p { margin: .4rem 0 0; font-size: .9rem; color: var(--color-text-secondary); }
.soon {
  position: absolute; top: 1rem; right: 1rem;
  font-size: .7rem; padding: .15rem .6rem; border-radius: 50px;
  color: var(--color-primary-dark); background: var(--color-accent);
}
.foot-note { margin-top: 2rem; text-align: center; font-size: 13px; color: var(--color-text-light); }
</style>
