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
        想要更自由的图表编排、主题与导出？「成果搭建台」提供意图 → Spec → 渲染的深度可视化能力，
        作为独立项目单独推进，本期为占位入口。
      </p>
    </section>

    <AppToast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ResultCards from './ResultCards.vue'
import AppToast from '@/components/AppToast.vue'

defineProps({
  dossier: { type: Object, required: true },
})

const toastRef = ref(null)
function onDiy() {
  toastRef.value?.show('成果搭建台为独立项目，敬请期待 🚧')
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
