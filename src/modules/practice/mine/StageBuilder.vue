<template>
  <div class="stage">
    <section class="block">
      <div class="builder-head">
        <div>
          <h2 class="block-title">🛠️ 成果搭建台</h2>
          <p class="block-desc">
            选择一种方式开始制作成果。
            <template v-if="dossier.plan?.targetVillage">目标村：{{ dossier.plan.targetVillage }}。</template>
          </p>
        </div>
      </div>
    </section>

    <BuilderCards :dossier-id="dossier.id" />

    <section class="block note">
      <p>
        所有成果可视化均在「成果搭建台」中完成。支持拖拽组件、AI智能生成、自由组合图表、一键导出。
      </p>
    </section>
  </div>
</template>

<script setup>
import BuilderCards from '@/modules/builder/BuilderCards.vue'

defineProps({
  dossier: { type: Object, required: true },
})
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0; font-size: .88rem; color: var(--color-text-secondary); }
.builder-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.note { padding: 1.2rem 1.4rem; background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.note p { margin: 0; font-size: .86rem; color: var(--color-text-secondary); line-height: 1.7; }
</style>
