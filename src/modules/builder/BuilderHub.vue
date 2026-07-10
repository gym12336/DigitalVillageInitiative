<!-- src/modules/builder/BuilderHub.vue -->
<template>
  <section class="hub">
    <div class="hub-container">
      <header class="hub-head">
        <p class="hub-kicker">成果可视化</p>
        <h1>🛠️ 成果搭建台</h1>
        <p class="hub-desc">选择你的工作台模式，将实践数据转化为可视化成果。</p>
      </header>

      <div class="hub-cards">
        <article class="hub-card" tabindex="0" role="button" @click="goEditor" @keydown.enter="goEditor">
          <div class="hc-icon">🧩</div>
          <div class="hc-body">
            <h2>大组件编辑台</h2>
            <p>拖拽组合小组件，利用结合规则打造可交互的功能体，保存供展示台使用。</p>
          </div>
          <button class="btn primary">进入编辑</button>
        </article>

        <article class="hub-card" tabindex="0" role="button" @click="goDisplay" @keydown.enter="goDisplay">
          <div class="hc-icon">🖥️</div>
          <div class="hc-body">
            <h2>大屏展示工作台</h2>
            <p>排版所有组件（含自定义大组件），自由调整布局与样式，一键导出纯静态展示网页。</p>
          </div>
          <button class="btn primary">进入展示</button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
function goEditor() {
  router.push('/builder/editor')
}
function goDisplay() {
  router.push('/builder/display')
}
</script>

<style scoped>
.hub { padding: 3rem 0 4rem; min-height: calc(100vh - 60px); }
.hub-container { max-width: 800px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }
.hub-head { text-align: center; margin-bottom: 2.5rem; }
.hub-kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.hub-head h1 { font-size: clamp(28px, 4vw, 40px); color: var(--color-primary-dark); margin: 0; }
.hub-desc { margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }

.hub-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
.hub-card {
  display: flex; flex-direction: column; gap: 1rem; align-items: center; text-align: center;
  padding: 2.5rem 2rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.hub-card:hover:not(.disabled) { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.hub-card.disabled { opacity: .55; cursor: default; }
.hc-icon { font-size: 2.8rem; line-height: 1; }
.hc-body h2 { font-size: 1.3rem; color: var(--color-primary-dark); margin: 0 0 .5rem; }
.hc-body p { font-size: .9rem; color: var(--color-text-secondary); line-height: 1.6; margin: 0; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .65rem 2rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.hc-badge {
  display: inline-block; padding: .35rem 1.2rem; font-size: .82rem; font-weight: 600;
  background: var(--color-accent); color: var(--color-primary-dark); border-radius: 50px;
}
</style>
