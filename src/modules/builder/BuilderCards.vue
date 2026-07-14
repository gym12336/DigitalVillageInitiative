<template>
  <div class="hub-cards">
    <article class="hub-card" tabindex="0" role="button" @click="goEditor" @keydown.enter="goEditor">
      <div class="hc-icon">🧩</div>
      <div class="hc-body">
        <h2>大组件编辑台 <span class="hc-badge">🤖 AI</span></h2>
        <p>自然语言描述想要的模块，AI 用基础组件组合出可复用的「大组件」，保存后供展示台调用。</p>
      </div>
      <button class="btn primary">进入编辑</button>
    </article>

    <article class="hub-card" tabindex="0" role="button" @click="goDisplay" @keydown.enter="goDisplay">
      <div class="hc-icon">🖥️</div>
      <div class="hc-body">
        <h2>大屏展示工作台 <span class="hc-badge">🤖 AI</span></h2>
        <p>AI 自动选用已有组件 + 绑定实践中采集的真实数据，生成完整成果页，支持微调与导出。</p>
      </div>
      <button class="btn primary">进入展示</button>
    </article>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  dossierId: { type: [String, Number], default: '' },
})

const router = useRouter()

function goEditor() {
  router.push(props.dossierId ? `/builder/editor/${props.dossierId}` : '/builder/editor')
}
function goDisplay() {
  router.push(props.dossierId ? `/builder/display/${props.dossierId}` : '/builder/display')
}
</script>

<style scoped>
.hub-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
.hub-card {
  display: flex; flex-direction: column; gap: 1rem; align-items: center; text-align: center;
  padding: 2.5rem 2rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.hub-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
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
