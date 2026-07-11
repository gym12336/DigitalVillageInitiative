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
      </div>
    </section>

    <ResultCards :dossier="dossier" />
  </div>
</template>

<script setup>
import ResultCards from './ResultCards.vue'

defineProps({
  dossier: { type: Object, required: true },
})
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0; font-size: .88rem; color: var(--color-text-secondary); }
.result-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
</style>
