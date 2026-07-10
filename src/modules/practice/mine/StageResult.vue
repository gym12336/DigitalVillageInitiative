<template>
  <div class="stage">
    <section class="block">
      <div class="result-head">
        <div>
          <h2 class="block-title">🎉 实践成果</h2>
          <p class="block-desc">
            以下成果卡由档案里的结构化数据自动生成。
            <template v-if="dossier.plan?.targetVillage">目标村：{{ dossier.plan.targetVillage }}。</template>
          </p>
        </div>
        <button class="btn ghost" @click="onDiy">进入成果搭建台 DIY ↗</button>
      </div>
    </section>

    <ResultCards :dossier="dossier" />

    <section class="block diy-note">
      <p>
        想要更自由的图表编排、主题与导出？「成果搭建台」支持拖拽组件、自由组合图表、一键导出静态展示页。
      </p>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import ResultCards from './ResultCards.vue'

defineProps({
  dossier: { type: Object, required: true },
})

const router = useRouter()
function onDiy() {
  router.push('/builder/display/' + props.dossier.id)
}
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0; font-size: .88rem; color: var(--color-text-secondary); }
.result-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.btn.ghost {
  flex-shrink: 0; padding: .6rem 1.3rem; border-radius: 50px; cursor: pointer; font-weight: 600; font-size: .88rem;
  background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); transition: all var(--transition);
}
.btn.ghost:hover { background: var(--color-primary); color: #fff; }
.diy-note { padding: 1.2rem 1.4rem; background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.diy-note p { margin: 0; font-size: .86rem; color: var(--color-text-secondary); line-height: 1.7; }
</style>
